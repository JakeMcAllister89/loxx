import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadInvoice, invoiceRef, orderRef } from "@/lib/invoice";
import { AuditRow, describeAction, timeAgo, formatTableTimestamp } from "@/lib/audit";
import { Link } from "react-router-dom";

const ACTION_TYPES = [
  "system_created", "system_renamed", "system_saved", "system_imported",
  "node_added", "node_deleted", "node_renamed",
  "cylinder_assigned", "cylinder_finish_changed", "keys_count_changed",
  "validation_run", "exported_to_cart", "order_placed",
];

export default function Account() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [addrCompany, setAddrCompany] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrCounty, setAddrCounty] = useState("");
  const [addrPostcode, setAddrPostcode] = useState("");

  // Audit log state
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Invoices
  const [invoiceOrders, setInvoiceOrders] = useState<any[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [sysRefMap, setSysRefMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setName(data.name ?? "");
        setCompany(data.company ?? "");
        setPhone(data.phone ?? "");
        const addr = (data as any).default_address ?? {};
        setAddrCompany(addr.company_name ?? "");
        setAddrLine1(addr.line1 ?? "");
        setAddrLine2(addr.line2 ?? "");
        setAddrCity(addr.city ?? "");
        setAddrCounty(addr.county ?? "");
        setAddrPostcode(addr.postcode ?? "");
      }
    });
    supabase.from("key_systems").select("id,name").order("name").then(({ data }) => setSystems(data ?? []));
    (supabase.from("audit_log" as any) as any)
      .select("*")
      .not("action", "eq", "system_autosaved")
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data }: any) => {
        const rows = ((data as AuditRow[]) ?? []).filter(
          (r) => !(r.action === "node_added" && r.node_type === "CYL"),
        );
        setRows(rows);
      });

    supabase.from("orders").select("id,created_at,status,total,system_id,customer_po_ref").order("created_at", { ascending: false }).then(async ({ data }) => {
      const orders = data ?? [];
      setInvoiceOrders(orders);
      const ids = orders.map((o: any) => o.id);
      if (ids.length) {
        const { data: its } = await supabase.from("order_items").select("order_id,quantity").in("order_id", ids);
        const counts: Record<string, number> = {};
        (its ?? []).forEach((r: any) => { counts[r.order_id] = (counts[r.order_id] ?? 0) + Number(r.quantity || 0); });
        setItemCounts(counts);
      }
      const sysIds = Array.from(new Set(orders.map((o: any) => o.system_id).filter(Boolean)));
      if (sysIds.length) {
        const { data: sys } = await supabase.from("key_systems").select("id,reference").in("id", sysIds);
        const m: Record<string, string | null> = {};
        (sys ?? []).forEach((r: any) => { m[r.id] = r.reference; });
        setSysRefMap(m);
      }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const default_address = {
      company_name: addrCompany,
      contact_name: name,
      contact_phone: phone,
      line1: addrLine1,
      line2: addrLine2,
      city: addrCity,
      county: addrCounty,
      postcode: addrPostcode,
    };
    const { error } = await supabase.from("profiles").update({ name, company, phone, default_address }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const systemName = useMemo(() => new Map(systems.map((s) => [s.id, s.name])), [systems]);

  const filtered = rows.filter((r) => {
    if (systemFilter !== "all" && r.system_id !== systemFilter) return false;
    if (actionFilter !== "all" && r.action !== actionFilter) return false;
    return true;
  });

  const exportCsv = () => {
    const header = ["timestamp", "system", "action", "node_type", "node_label", "old_value", "new_value"];
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      lines.push([
        new Date(r.created_at).toISOString(),
        systemName.get(r.system_id ?? "") ?? "",
        r.action,
        r.node_type ?? "",
        r.node_label ?? "",
        r.old_value ?? "",
        r.new_value ?? "",
      ].map(escape).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `loxx-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile and review system activity.</p>

        <Tabs defaultValue="profile" className="mt-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="mt-4 rounded-[10px] border bg-card p-6 shadow-card space-y-4 max-w-2xl">
              <div><Label>Email</Label><Input value={user?.email ?? ""} disabled className="bg-muted/40" /></div>
              <div><Label htmlFor="name">Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label htmlFor="company">Company</Label><Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} /></div>
              <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <Button onClick={save} disabled={busy} className="bg-primary hover:bg-primary/90">Save</Button>
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <div className="mt-4 rounded-[10px] border bg-card shadow-card overflow-hidden">
              {invoiceOrders.length === 0 ? (
                <div className="p-10 text-sm text-muted-foreground text-center">
                  <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  No orders yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Invoice ref</th>
                      <th className="px-4 py-2">Order date</th>
                      <th className="px-4 py-2">System</th>
                      <th className="px-4 py-2">Items</th>
                      <th className="px-4 py-2">Total inc VAT</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2 text-right">Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceOrders.map((o) => {
                      const ready = ["processing", "shipped", "delivered"].includes(o.status);
                      return (
                        <tr key={o.id} className="border-t">
                          <td className="px-4 py-2 font-mono text-amber-700 text-xs">{invoiceRef(o.id)}</td>
                          <td className="px-4 py-2 text-xs">{new Date(o.created_at).toLocaleDateString("en-GB")}</td>
                          <td className="px-4 py-2 text-xs font-mono">{o.system_id ? (sysRefMap[o.system_id] ?? "—") : "—"}</td>
                          <td className="px-4 py-2 text-xs">{itemCounts[o.id] ?? 0}</td>
                          <td className="px-4 py-2 font-mono text-xs">£{Number(o.total).toFixed(2)}</td>
                          <td className="px-4 py-2 text-xs">
                            {ready ? (
                              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">{o.status}</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {ready ? (
                              <Button size="sm" variant="outline" onClick={() => downloadInvoice(o.id)}>
                                <Download className="h-3.5 w-3.5" /> Download
                              </Button>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block">
                                      <Button size="sm" variant="outline" disabled className="opacity-50">
                                        <Download className="h-3.5 w-3.5" /> Download
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Invoice available once order is confirmed</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <div className="mt-4 rounded-[10px] border bg-card shadow-card overflow-hidden">
              <div className="p-4 border-b flex flex-wrap items-center gap-3">
                <Select value={systemFilter} onValueChange={setSystemFilter}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="System" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All systems</SelectItem>
                    {systems.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Action" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {ACTION_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">{filtered.length} entries</div>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> Export CSV</Button>
              </div>

              {filtered.length === 0 ? (
                <div className="p-8 text-sm text-muted-foreground text-center">No audit entries match these filters.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">When</th>
                      <th className="px-4 py-2">User</th>
                      <th className="px-4 py-2">System</th>
                      <th className="px-4 py-2">Action</th>
                      <th className="px-4 py-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const isMe = user && r.user_id === user.id;
                      const displayUser = isMe ? "You" : (r.user_name ?? "Unknown user");
                      return (
                        <tr key={r.id} className="border-t align-top">
                          <td
                            className="px-4 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap"
                            title={new Date(r.created_at).toISOString()}
                          >
                            <div>{formatTableTimestamp(r.created_at)}</div>
                            <div className="text-[10px] opacity-70">{timeAgo(r.created_at)}</div>
                          </td>
                          <td className="px-4 py-2 text-xs whitespace-nowrap">{displayUser}</td>
                          <td className="px-4 py-2 text-xs">
                            {r.system_id ? (
                              <Link className="text-primary hover:underline" to={`/builder/${r.system_id}`}>
                                {systemName.get(r.system_id) ?? r.system_id.slice(0, 8)}
                              </Link>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-2">{describeAction(r)}</td>
                          <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{r.new_value ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Audit logs are retained permanently for compliance purposes.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
