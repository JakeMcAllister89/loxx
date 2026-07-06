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

const STORAGE_KEY = "loxx_partner_session";
const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/partner-auth`;

interface PartnerInfo { id: string; name: string; company: string; partner_type: string; }
interface PortalData {
  partner: PartnerInfo;
  summary: { lifetimeRevenue: number; lifetimeCommission: number; systemsCount: number; pendingCommission: number };
  quarterly: { key: string; period_start: string; period_end: string; revenue: number; commission: number; commission_pct: number; status: string }[];
  systems: { id: string; name: string; reference: string | null; firstOrderDate: string | null; customerCompany: string | null; revenue: number; commission: number }[];
}

const gbp = (n: number) => `£${Number(n ?? 0).toFixed(2)}`;
const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString("en-GB") : "—";
const quarterLabel = (key: string) => {
  const [y, q] = key.split("-");
  return `${q} ${y}`;
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
      // Do not reveal whether the email exists.
      toast.success("If that account exists, a reset link is on its way.");
      setForgotOpen(false);
      setForgotEmail("");
    } finally {
      setForgotBusy(false);
    }
  };

  const fetchData = async (tok: string) => {
    setLoading(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "data", token: tok }),
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

  useEffect(() => { if (token) fetchData(token); }, [token]);

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



  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#f5f4f1] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f4f1]">
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

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card label="Lifetime revenue (ex VAT)" value={gbp(data.summary.lifetimeRevenue)} />
          <Card label="Lifetime commission" value={gbp(data.summary.lifetimeCommission)} accent />
          <Card label="Systems referred" value={String(data.summary.systemsCount)} />
          <Card label="Pending commission" value={gbp(data.summary.pendingCommission)} />
        </div>

        <div className="rounded-[10px] border bg-white shadow-card p-4">
          <h2 className="text-sm font-semibold">Your signup link</h2>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">
            Share this with your clients — anyone who signs up through it is automatically credited to you, with instant access (no approval wait).
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

        <section>
          <h2 className="text-lg font-semibold mb-2">Quarterly breakdown</h2>
          <div className="rounded-[10px] border bg-white shadow-card overflow-hidden">
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
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Referred systems</h2>
          <div className="rounded-[10px] border bg-white shadow-card overflow-hidden">
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
          </div>
        </section>

        <footer className="text-xs text-muted-foreground text-center py-6">
          LOXX Partner Portal · Read-only commission view
        </footer>
      </main>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-[10px] border bg-white p-4 shadow-card ${accent ? "border-[#d4820a]" : ""}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 font-mono ${accent ? "text-[#d4820a]" : ""}`}>{value}</div>
    </div>
  );
}
