import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoxxLogo } from "@/components/LoxxLogo";
import { LogOut, Loader2, Handshake } from "lucide-react";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { presetRange, RangePreset } from "@/lib/dateRanges";

const STORAGE_KEY = "loxx_partner_session";
const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/partner-auth`;

interface PartnerInfo { id: string; name: string; company: string; partner_type: string; }
interface TeamMember {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "master_admin" | "member";
  status: "active" | "pending" | "removed";
  created_at: string;
}
interface PortalData {
  partner: PartnerInfo;
  summary: {
    revenue: number;
    commission: number;
    cylindersSupplied: number;
    keysSupplied: number;
    activeSystems: number;
    systemsCount: number;
    pendingCommission: number;
  };
  quarterly: { key: string; period_start: string; period_end: string; revenue: number; commission: number; commission_pct: number; status: string }[];
  systems: { id: string; name: string; reference: string | null; firstOrderDate: string | null; customerCompany: string | null; revenue: number; commission: number }[];
  recentOrders: { id: string; reference: string; customer: string; system: string; created_at: string; total: number; status: string; payment_status: string }[];
}


const gbp = (n: number) => `£${Number(n ?? 0).toFixed(2)}`;
const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString("en-GB") : "—";
const quarterLabel = (key: string) => {
  const [y, q] = key.split("-");
  return `${q} ${y}`;
};

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  paid: "bg-blue-100 text-blue-800 border-blue-300",
  processing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  shipped: "bg-teal-100 text-teal-800 border-teal-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

export default function PartnerPortal() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [data, setData] = useState<PortalData | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [me, setMe] = useState<{ email: string; role: "master_admin" | "member" } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", first_name: "", last_name: "" });
  const [inviteBusy, setInviteBusy] = useState(false);


  const initial = presetRange("month");
  const [from, setFrom] = useState<Date>(initial.from);
  const [to, setTo] = useState<Date>(initial.to);
  const [preset, setPreset] = useState<RangePreset>("month");

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = forgotEmail.trim();
    if (!target) return;
    setForgotBusy(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_reset", email: target }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 429) { toast.error(j.error ?? "Too many attempts, please try again later."); return; }
      toast.success("If that account exists, a reset link is on its way.");
      setForgotOpen(false);
      setForgotEmail("");
    } finally {
      setForgotBusy(false);
    }
  };

  const fetchData = async (tok: string, f: Date, t: Date) => {
    setLoading(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "data", token: tok, from: f.toISOString(), to: t.toISOString() }),
      });
      const j = await res.json();
      if (!res.ok) {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        toast.error(j.error ?? "Session expired");
        return;
      }
      setData(j);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchData(token, from, to); }, [token, from, to]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const j = await res.json();
      if (!res.ok) { toast.error(j.error ?? "Login failed"); return; }
      localStorage.setItem(STORAGE_KEY, j.token);
      setToken(j.token);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setData(null);
  };

  const onRangeChange = (f: Date, t: Date, p: RangePreset) => { setFrom(f); setTo(t); setPreset(p); };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6"><LoxxLogo size="lg" /></div>
          <div className="bg-card rounded-[10px] border shadow-card p-8">
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#d4820a]/10 text-[#d4820a]">
                <Handshake className="h-6 w-6" />
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-center">Partner portal</h1>
            <p className="text-sm text-muted-foreground text-center mt-1">Sign in to view your commission statements.</p>
            <form onSubmit={login} className="space-y-3 mt-6">
              <div><Label htmlFor="pp-email">Email</Label><Input id="pp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="pp-password">Password</Label>
                  <button type="button" onClick={() => { setForgotOpen(true); setForgotEmail(email); }} className="text-xs text-[#d4820a] hover:underline">
                    Forgot password?
                  </button>
                </div>
                <Input id="pp-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#d4820a] hover:bg-[#b86d08] text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
          </div>
          <div className="text-center mt-6">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
          </div>
        </div>

        {forgotOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50" onClick={() => setForgotOpen(false)}>
            <div className="w-full max-w-sm bg-card rounded-[10px] border shadow-card p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold">Reset your password</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your partner portal email and we'll send you a link to set a new password.</p>
              <form onSubmit={sendReset} className="space-y-3 mt-4">
                <div>
                  <Label htmlFor="pp-forgot-email">Email</Label>
                  <Input id="pp-forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required autoFocus />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={forgotBusy} className="bg-[#d4820a] hover:bg-[#b86d08] text-white">
                    {forgotBusy ? "Sending…" : "Send reset link"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#17171a] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <LoxxLogo />
          <div className="text-sm">
            <div className="font-semibold">{data.partner.name}</div>
            <div className="text-white/60 text-xs">{data.partner.company}</div>
          </div>
        </div>
        <Button variant="ghost" onClick={logout} className="text-white hover:bg-white/10">
          <LogOut className="h-4 w-4 mr-1" /> Logout
        </Button>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Partner dashboard</h1>
          <p className="text-muted-foreground text-sm">Your commissions and referred activity{loading ? " · refreshing…" : ""}.</p>
        </div>

        <div className="mb-6">
          <DateRangePicker from={from} to={to} preset={preset} onChange={onRangeChange} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Revenue (ex VAT)" value={gbp(data.summary.revenue)} />
          <StatCard label="Commission" value={gbp(data.summary.commission)} accent />
          <StatCard label="Active systems" value={data.summary.activeSystems} sub="with orders in range" />
          <StatCard label="Pending commission" value={gbp(data.summary.pendingCommission)} sub="across all periods" />
          <StatCard label="Cylinders supplied" value={data.summary.cylindersSupplied} />
          <StatCard label="Keys supplied" value={data.summary.keysSupplied} />
          <StatCard label="Systems referred" value={data.summary.systemsCount} sub="lifetime" />
        </div>

        <Section title="Your signup link">
          <div className="p-5">
            <p className="text-xs text-muted-foreground mb-3">
              Share this with your clients — anyone who signs up through it is automatically credited to you, with instant access.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/auth?mode=signup&ref=${data.partner.id}`}
                className="font-mono text-xs bg-muted/40"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/auth?mode=signup&ref=${data.partner.id}`);
                  toast.success("Link copied");
                }}
                className="bg-[#d4820a] hover:bg-[#b86d08] text-white shrink-0"
              >
                Copy
              </Button>
            </div>
          </div>
        </Section>

        <Section title="Recent orders">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="text-sm text-amber-700 font-mono">{o.reference}</TableCell>
                  <TableCell>{o.customer}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.system}</TableCell>
                  <TableCell className="text-xs">{fmtDate(o.created_at)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{gbp(o.total)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge className={statusColor[o.status] ?? ""}>{o.status}</Badge>
                      {o.payment_status === "paid" ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">Paid ✓</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">Unpaid</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data.recentOrders.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No orders in this period.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Section>

        <Section title="Quarterly breakdown">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Revenue (ex VAT)</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.quarterly.map((q) => (
                <TableRow key={q.key}>
                  <TableCell className="font-mono">{quarterLabel(q.key)}</TableCell>
                  <TableCell className="text-right font-mono">{gbp(q.revenue)}</TableCell>
                  <TableCell className="text-right font-mono">{q.commission_pct.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{gbp(q.commission)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={q.status === "paid" ? "bg-green-100 text-green-800 border-green-300" : "bg-amber-100 text-amber-800 border-amber-300"}>
                      {q.status === "paid" ? "Paid" : "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {data.quarterly.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No earnings yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Section>

        <Section title="Referred systems">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>System</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>First order</TableHead>
                <TableHead className="text-right">Revenue (ex VAT)</TableHead>
                <TableHead className="text-right">Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.systems.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>{s.name}</div>
                    {s.reference && <div className="text-xs font-mono text-muted-foreground">{s.reference}</div>}
                  </TableCell>
                  <TableCell>{s.customerCompany ?? "—"}</TableCell>
                  <TableCell>{fmtDate(s.firstOrderDate)}</TableCell>
                  <TableCell className="text-right font-mono">{gbp(s.revenue)}</TableCell>
                  <TableCell className="text-right font-mono">{gbp(s.commission)}</TableCell>
                </TableRow>
              ))}
              {data.systems.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No referred systems yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Section>

        <footer className="text-xs text-muted-foreground text-center py-6">
          LOXX Partner Portal · Read-only commission view
        </footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-[10px] border bg-card p-5 shadow-card ${accent ? "border-[#d4820a]" : ""}`}>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold mt-2 ${accent ? "text-[#d4820a]" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border bg-card shadow-card mb-8 overflow-hidden">
      <div className="px-5 py-4 border-b">
        <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}
