import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Key, FileText, BarChart3, Search } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  partner_type: "manufacturer" | "sales_rep" | "broker";
  default_commission_pct: number;
  is_active: boolean;
  notes: string | null;
}

interface Payment {
  id: string;
  partner_id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_commission: number;
  status: "pending" | "paid";
  paid_at: string | null;
}

const typeBadge = (t: string) => {
  if (t === "manufacturer") return "bg-blue-100 text-blue-800 border-blue-300";
  if (t === "sales_rep") return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-zinc-100 text-zinc-800 border-zinc-300";
};
const typeLabel = (t: string) =>
  t === "manufacturer" ? "Manufacturer" : t === "sales_rep" ? "Sales Rep" : "Broker";

const gbp = (n: number) => `£${Number(n ?? 0).toFixed(2)}`;

export default function AdminPartners() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<Partial<Partner>>({});
  const [pwForm, setPwForm] = useState<{ open: boolean; partnerId: string; email: string; password: string }>({
    open: false, partnerId: "", email: "", password: "",
  });

  // System attribution tab
  interface SysRow {
    id: string; name: string; reference: string | null; org_id: string | null;
    partner_id: string | null; commission_pct: number | null;
    organisations: { name: string | null } | null;
    partners: { name: string; company: string } | null;
  }
  const [systems, setSystems] = useState<SysRow[]>([]);
  const [sysSearch, setSysSearch] = useState("");
  const [sysFilter, setSysFilter] = useState<"all" | "attributed" | "unattributed">("all");
  const [attrDrawer, setAttrDrawer] = useState<{ open: boolean; sys: SysRow | null; partnerId: string; pct: string }>({
    open: false, sys: null, partnerId: "", pct: "",
  });

  const load = async () => {
    const { data } = await supabase.from("partners").select("*").order("name");
    setPartners((data as any) ?? []);
    const { data: sys } = await supabase.from("key_systems").select("partner_id").not("partner_id", "is", null);
    const c: Record<string, number> = {};
    (sys ?? []).forEach((s: any) => { c[s.partner_id] = (c[s.partner_id] ?? 0) + 1; });
    setCounts(c);
    const { data: pays } = await supabase.from("partner_payments").select("*").order("period_start", { ascending: false });
    setPayments((pays as any) ?? []);
    const { data: allSys } = await supabase
      .from("key_systems")
      .select("id, name, reference, org_id, partner_id, commission_pct, organisations(name), partners(name, company)")
      .order("created_at", { ascending: false });
    setSystems((allSys as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filteredSystems = useMemo(() => {
    const q = sysSearch.trim().toLowerCase();
    return systems.filter((s) => {
      if (sysFilter === "attributed" && !s.partner_id) return false;
      if (sysFilter === "unattributed" && s.partner_id) return false;
      if (!q) return true;
      return (
        (s.name ?? "").toLowerCase().includes(q) ||
        (s.reference ?? "").toLowerCase().includes(q) ||
        (s.organisations?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [systems, sysSearch, sysFilter]);

  const openAttrDrawer = (s: SysRow) => {
    setAttrDrawer({
      open: true, sys: s,
      partnerId: s.partner_id ?? "",
      pct: s.commission_pct == null ? "" : String(s.commission_pct),
    });
  };
  const saveAttribution = async () => {
    if (!attrDrawer.sys) return;
    const remove = attrDrawer.partnerId === "__remove__" || attrDrawer.partnerId === "";
    const payload = remove
      ? { partner_id: null, commission_pct: null }
      : { partner_id: attrDrawer.partnerId, commission_pct: attrDrawer.pct === "" ? null : Number(attrDrawer.pct) };
    const { error } = await supabase.from("key_systems").update(payload).eq("id", attrDrawer.sys.id);
    if (error) return toast.error(error.message);
    toast.success("Attribution saved");
    setAttrDrawer({ open: false, sys: null, partnerId: "", pct: "" });
    load();
  };


  const openNew = () => {
    setEditing(null);
    setForm({ name: "", company: "", email: "", phone: "", partner_type: "manufacturer", default_commission_pct: 10, is_active: true, notes: "" });
    setDrawerOpen(true);
  };
  const openEdit = (p: Partner) => {
    setEditing(p);
    setForm(p);
    setDrawerOpen(true);
  };
  const save = async () => {
    if (!form.name || !form.company) { toast.error("Name and company required"); return; }
    const payload = {
      name: form.name, company: form.company, email: form.email || null, phone: form.phone || null,
      partner_type: form.partner_type ?? "manufacturer",
      default_commission_pct: Number(form.default_commission_pct ?? 10),
      is_active: form.is_active ?? true, notes: form.notes || null,
    };
    if (editing) {
      const { error } = await supabase.from("partners").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("partners").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Saved");
    setDrawerOpen(false);
    load();
  };
  const toggleActive = async (p: Partner) => {
    await supabase.from("partners").update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  };
  const updatePct = async (p: Partner, val: number) => {
    if (val === p.default_commission_pct) return;
    await supabase.from("partners").update({ default_commission_pct: val }).eq("id", p.id);
    toast.success("Commission updated");
    load();
  };

  const markPaid = async (id: string) => {
    await supabase.from("partner_payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const generateStatements = async () => {
    const yStr = window.prompt("Year (e.g. 2026):", String(new Date().getFullYear()));
    if (!yStr) return;
    const qStr = window.prompt("Quarter (1-4):", String(Math.floor(new Date().getMonth() / 3) + 1));
    if (!qStr) return;
    const y = parseInt(yStr); const q = parseInt(qStr);
    if (!y || q < 1 || q > 4) return toast.error("Invalid period");
    const startMonth = (q - 1) * 3;
    const periodStart = new Date(y, startMonth, 1);
    const periodEnd = new Date(y, startMonth + 3, 0);
    const startIso = periodStart.toISOString();
    const endIso = new Date(y, startMonth + 3, 0, 23, 59, 59).toISOString();

    // For each active partner, sum revenue/commission from order_items within period
    const active = partners.filter((p) => p.is_active);
    let created = 0, skipped = 0;
    for (const p of active) {
      const { data: existing } = await supabase
        .from("partner_payments").select("id")
        .eq("partner_id", p.id)
        .eq("period_start", periodStart.toISOString().slice(0, 10))
        .eq("period_end", periodEnd.toISOString().slice(0, 10))
        .maybeSingle();
      if (existing) { skipped++; continue; }
      const { data: sys } = await supabase.from("key_systems").select("id").eq("partner_id", p.id);
      const sysIds = (sys ?? []).map((s: any) => s.id);
      if (!sysIds.length) continue;
      const { data: ords } = await supabase
        .from("orders").select("id").in("system_id", sysIds)
        .gte("created_at", startIso).lte("created_at", endIso)
        .neq("status", "cancelled");
      const oIds = (ords ?? []).map((o: any) => o.id);
      if (!oIds.length) continue;
      const { data: its } = await supabase
        .from("order_items").select("line_total, commission_amount").in("order_id", oIds);
      const rev = (its ?? []).reduce((s, x: any) => s + Number(x.line_total ?? 0), 0);
      const com = (its ?? []).reduce((s, x: any) => s + Number(x.commission_amount ?? 0), 0);
      if (com <= 0) continue;
      await supabase.from("partner_payments").insert({
        partner_id: p.id,
        period_start: periodStart.toISOString().slice(0, 10),
        period_end: periodEnd.toISOString().slice(0, 10),
        total_revenue: rev, total_commission: com, status: "pending",
      });
      created++;
    }
    toast.success(`Generated ${created} statement(s), skipped ${skipped} existing`);
    load();
  };

  const periodLabel = (start: string, end: string) => {
    const d = new Date(start);
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q} ${d.getFullYear()}`;
  };

  const partnerName = (id: string) => partners.find((p) => p.id === id)?.name ?? "—";

  const openPwDialog = (p: Partner) => {
    setPwForm({ open: true, partnerId: p.id, email: p.email ?? "", password: "" });
  };
  const savePassword = async () => {
    if (!pwForm.email || !pwForm.password) return toast.error("Email and password required");
    const { data: sess } = await supabase.auth.getSession();
    const tok = sess.session?.access_token;
    if (!tok) return toast.error("Sign in required");
    const res = await fetch(
      `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/partner-auth`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify({
          action: "set_password",
          partnerId: pwForm.partnerId,
          email: pwForm.email,
          newPassword: pwForm.password,
        }),
      },
    );
    const j = await res.json();
    if (!res.ok) return toast.error(j.error ?? "Failed");
    toast.success("Portal login set");
    setPwForm({ open: false, partnerId: "", email: "", password: "" });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Partners</h1>
            <p className="text-sm text-muted-foreground">Manage referral partners, commissions, and payments.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/partners/report")}>
              <BarChart3 className="h-4 w-4 mr-1" /> View report
            </Button>
            <Button onClick={openNew} className="bg-[#d4820a] hover:bg-[#b86d08] text-white">
              <Plus className="h-4 w-4 mr-1" /> Add partner
            </Button>
          </div>
        </div>

        <Tabs defaultValue="partners">
          <TabsList>
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="attribution">System Attribution</TabsTrigger>
          </TabsList>

          <TabsContent value="partners" className="mt-4">
            <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Default %</TableHead>
                    <TableHead>Systems</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.company}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeBadge(p.partner_type)}>
                          {typeLabel(p.partner_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number" step="0.01" min="0" max="100"
                          defaultValue={p.default_commission_pct}
                          className="w-20 h-8 font-mono"
                          onBlur={(e) => updatePct(p, Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{counts[p.id] ?? 0}</TableCell>
                      <TableCell>
                        <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openPwDialog(p)} title="Set portal password">
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {partners.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No partners yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <div className="flex justify-end mb-3">
              <Button variant="outline" onClick={generateStatements}>
                <FileText className="h-4 w-4 mr-1" /> Generate statements
              </Button>
            </div>
            <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Revenue (ex VAT)</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{partnerName(p.partner_id)}</TableCell>
                      <TableCell className="font-mono">{periodLabel(p.period_start, p.period_end)}</TableCell>
                      <TableCell className="font-mono">{gbp(p.total_revenue)}</TableCell>
                      <TableCell className="font-mono">{gbp(p.total_commission)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={p.status === "paid" ? "bg-green-100 text-green-800 border-green-300" : "bg-amber-100 text-amber-800 border-amber-300"}>
                          {p.status === "paid" ? "Paid" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {p.status !== "paid" && (
                          <Button size="sm" variant="outline" onClick={() => markPaid(p.id)}>Mark paid</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payment statements yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="attribution" className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search by system, reference, or organisation…"
                  value={sysSearch}
                  onChange={(e) => setSysSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={sysFilter} onValueChange={(v: any) => setSysFilter(v)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All systems</SelectItem>
                  <SelectItem value="attributed">Attributed</SelectItem>
                  <SelectItem value="unattributed">Unattributed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>System</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Commission %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSystems.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.name}</div>
                        {s.reference && <div className="text-xs font-mono text-muted-foreground">{s.reference}</div>}
                      </TableCell>
                      <TableCell>{s.organisations?.name ?? "—"}</TableCell>
                      <TableCell>
                        {s.partners ? (
                          <div>
                            <div className="font-medium">{s.partners.name}</div>
                            <div className="text-xs text-muted-foreground">{s.partners.company}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">— Unattributed —</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{s.commission_pct == null ? "—" : `${s.commission_pct}%`}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openAttrDrawer(s)}>Assign / Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSystems.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No systems match.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Attribution drawer */}
        <Sheet open={attrDrawer.open} onOpenChange={(o) => setAttrDrawer((s) => ({ ...s, open: o }))}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Edit attribution</SheetTitle>
              <SheetDescription>
                {attrDrawer.sys?.name}{attrDrawer.sys?.reference ? ` · ${attrDrawer.sys.reference}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-3 mt-4">
              <div>
                <Label>Partner</Label>
                <Select
                  value={attrDrawer.partnerId || "__none__"}
                  onValueChange={(v) => {
                    if (v === "__remove__") {
                      setAttrDrawer((s) => ({ ...s, partnerId: "__remove__", pct: "" }));
                      return;
                    }
                    const p = partners.find((x) => x.id === v);
                    setAttrDrawer((s) => ({
                      ...s,
                      partnerId: v,
                      pct: p ? String(p.default_commission_pct) : s.pct,
                    }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__remove__">— Remove attribution —</SelectItem>
                    {partners.filter((p) => p.is_active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} · {p.company}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {attrDrawer.partnerId && attrDrawer.partnerId !== "__remove__" && (
                <div>
                  <Label>Commission %</Label>
                  <Input
                    type="number" step="0.01" min="0" max="100"
                    value={attrDrawer.pct}
                    onChange={(e) => setAttrDrawer((s) => ({ ...s, pct: e.target.value }))}
                    className="font-mono"
                  />
                </div>
              )}
              <Button onClick={saveAttribution} className="w-full bg-[#d4820a] hover:bg-[#b86d08] text-white">Save</Button>
            </div>
          </SheetContent>
        </Sheet>


        {/* Partner drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editing ? "Edit partner" : "Add partner"}</SheetTitle>
              <SheetDescription>Manage partner details and default commission.</SheetDescription>
            </SheetHeader>
            <div className="space-y-3 mt-4">
              <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={form.company ?? ""} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div>
                <Label>Partner type</Label>
                <Select value={form.partner_type ?? "manufacturer"} onValueChange={(v: any) => setForm({ ...form, partner_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="sales_rep">Sales Rep</SelectItem>
                    <SelectItem value="broker">Broker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Default commission %</Label><Input type="number" step="0.01" min="0" max="100" value={form.default_commission_pct ?? 10} onChange={(e) => setForm({ ...form, default_commission_pct: Number(e.target.value) })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
              <Button onClick={save} className="w-full bg-[#d4820a] hover:bg-[#b86d08] text-white">Save</Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Portal password drawer */}
        <Sheet open={pwForm.open} onOpenChange={(o) => setPwForm((s) => ({ ...s, open: o }))}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Set partner portal login</SheetTitle>
              <SheetDescription>Create or reset the partner's portal credentials.</SheetDescription>
            </SheetHeader>
            <div className="space-y-3 mt-4">
              <div><Label>Email</Label><Input type="email" value={pwForm.email} onChange={(e) => setPwForm({ ...pwForm, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="text" value={pwForm.password} onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })} /></div>
              <Button onClick={savePassword} className="w-full bg-[#d4820a] hover:bg-[#b86d08] text-white">Save</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
