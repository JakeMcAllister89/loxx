import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { presetRange, previousPeriod, RangePreset } from "@/lib/dateRanges";
import { ArrowDownRight, ArrowUpRight, ShoppingBag, Send, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface OrderRow {
  id: string;
  user_id: string;
  status: string;
  total: number;
  subtotal: number;
  created_at: string;
  customer_name: string | null;
  company: string | null;
  po_number: string | null;
  system_id: string | null;
  payment_status: string;
  paid_at: string | null;
}
interface ItemRow {
  order_id: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_code: string | null;
}

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  paid: "bg-blue-100 text-blue-800 border-blue-300",
  processing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  shipped: "bg-teal-100 text-teal-800 border-teal-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

const gbp = (n: number) => `£${n.toFixed(2)}`;

export default function AdminDashboard() {
  const initial = presetRange("month");
  const [from, setFrom] = useState<Date>(initial.from);
  const [to, setTo] = useState<Date>(initial.to);
  const [preset, setPreset] = useState<RangePreset>("month");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [prevOrders, setPrevOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [costMap, setCostMap] = useState<Record<string, number>>({});
  const [activeSystems, setActiveSystems] = useState(0);
  const [recent, setRecent] = useState<OrderRow[]>([]);
  const [lowMargin, setLowMargin] = useState<{ id: string; desc: string; margin: number }[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, { name: string | null; company: string | null }>>({});
  const [systemMap, setSystemMap] = useState<Record<string, { name: string; reference: string | null }>>({});

  useEffect(() => {
    (async () => {
      // products → cost map
      const { data: prods } = await supabase.from("products").select("id,code,product_description,name,cost_price,price_gbp").eq("is_active", true);
      const cMap: Record<string, number> = {};
      const low: { id: string; desc: string; margin: number }[] = [];
      (prods ?? []).forEach((p: any) => {
        if (p.code) cMap[p.code] = Number(p.cost_price ?? 0);
        if (p.price_gbp > 0 && p.cost_price != null) {
          const margin = (p.price_gbp - p.cost_price) / p.price_gbp;
          if (margin < 0.3) low.push({ id: p.id, desc: p.product_description ?? p.name ?? p.code, margin: margin * 100 });
        }
      });
      setCostMap(cMap);
      setLowMargin(low.sort((a, b) => a.margin - b.margin));

      const { count: sysCount } = await supabase.from("key_systems").select("*", { count: "exact", head: true });
      setActiveSystems(sysCount ?? 0);

      const { data: rec } = await supabase
        .from("orders")
        .select("id,user_id,status,total,subtotal,created_at,customer_name,company,po_number,system_id,payment_status,paid_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecent((rec ?? []) as OrderRow[]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: cur } = await supabase
        .from("orders")
        .select("id,user_id,status,total,subtotal,created_at,customer_name,company,po_number,system_id")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .order("created_at", { ascending: false });
      const curr = (cur ?? []) as OrderRow[];
      setOrders(curr);

      const prev = previousPeriod(from, to);
      const { data: pr } = await supabase
        .from("orders")
        .select("id,total")
        .gte("created_at", prev.from.toISOString())
        .lte("created_at", prev.to.toISOString());
      setPrevOrders((pr ?? []) as OrderRow[]);

      if (curr.length) {
        const ids = curr.map((o) => o.id);
        const { data: it } = await supabase
          .from("order_items")
          .select("order_id,item_type,quantity,unit_price,line_total,product_code")
          .in("order_id", ids);
        setItems((it ?? []) as ItemRow[]);

        const uids = Array.from(new Set(curr.map((o) => o.user_id)));
        const { data: profs } = await supabase.from("profiles").select("id,name,company").in("id", uids);
        const pm: Record<string, any> = {};
        (profs ?? []).forEach((p: any) => (pm[p.id] = { name: p.name, company: p.company }));
        setProfileMap(pm);

        const sids = Array.from(new Set(curr.map((o) => o.system_id).filter(Boolean))) as string[];
        if (sids.length) {
          const { data: sys } = await supabase.from("key_systems").select("id,name,reference").in("id", sids);
          const sm: Record<string, any> = {};
          (sys ?? []).forEach((s: any) => (sm[s.id] = { name: s.name, reference: s.reference }));
          setSystemMap(sm);
        }
      } else {
        setItems([]);
      }
    })();
  }, [from, to]);

  const activeOrders = useMemo(
    () => orders.filter((o) => ["paid", "processing", "shipped", "delivered"].includes(o.status)),
    [orders],
  );

  const stats = useMemo(() => {
    const activeItems = items.filter((i) => activeOrders.some((o) => o.id === i.order_id));
    const revenue = activeOrders.reduce((s, o) => s + Number(o.total), 0);
    const cost = activeItems.reduce((s, i) => s + Number(i.quantity) * (costMap[i.product_code ?? ""] ?? 0), 0);
    const profit = revenue - cost;
    const aov = activeOrders.length ? revenue / activeOrders.length : 0;
    const cylQty = activeItems.filter((i) => i.item_type === "cylinder").reduce((s, i) => s + Number(i.quantity), 0);
    const keyQty = activeItems.filter((i) => i.item_type === "key").reduce((s, i) => s + Number(i.quantity), 0);
    const prevRev = prevOrders.filter((o) => ["paid", "processing", "shipped", "delivered"].includes(o.status)).reduce((s, o) => s + Number(o.total), 0);
    const revChange = prevRev > 0 ? ((revenue - prevRev) / prevRev) * 100 : null;
    return { revenue, cost, profit, aov, cylQty, keyQty, revChange };
  }, [activeOrders, items, costMap, prevOrders]);

  const actionOrders = orders.filter((o) => o.status === "paid" && !o.po_number);

  const onChange = (f: Date, t: Date, p: RangePreset) => { setFrom(f); setTo(t); setPreset(p); };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="text-muted-foreground text-sm">Business overview across all customers.</p>
        </div>

        <div className="mb-6">
          <DateRangePicker from={from} to={to} preset={preset} onChange={onChange} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Orders" value={activeOrders.length} sub={`${gbp(stats.revenue)} total`} />
          <StatCard
            label="Revenue"
            value={gbp(stats.revenue)}
            extra={stats.revChange != null ? (
              <span className={`text-xs inline-flex items-center gap-1 ${stats.revChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                {stats.revChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(stats.revChange).toFixed(1)}% vs prev
              </span>
            ) : null}
          />
          <StatCard label="Profit" value={gbp(stats.profit)} sub={`Cost ${gbp(stats.cost)}`} />
          <StatCard label="Avg order value" value={gbp(stats.aov)} />
          <StatCard label="Cylinders supplied" value={stats.cylQty} />
          <StatCard label="Keys supplied" value={stats.keyQty} />
          <StatCard label="Active systems" value={activeSystems} sub="all customers" />
        </div>

        {/* Orders requiring action */}
        <Section title="Orders requiring action" icon={<ShoppingBag className="h-4 w-4 text-amber-600" />}>
          {actionOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No paid orders awaiting POs.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ref</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionOrders.map((o) => {
                  const it = items.filter((i) => i.order_id === o.id);
                  const qty = it.reduce((s, x) => s + Number(x.quantity), 0);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-amber-700">{o.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell>{o.customer_name ?? profileMap[o.user_id]?.name ?? "—"}</TableCell>
                      <TableCell>{o.company ?? profileMap[o.user_id]?.company ?? "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString("en-GB")}</TableCell>
                      <TableCell>{qty}</TableCell>
                      <TableCell className="font-semibold">{gbp(Number(o.total))}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" asChild><Link to="/admin/orders"><Eye className="h-3.5 w-3.5" /> View</Link></Button>
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => toast("Send PO coming soon")}><Send className="h-3.5 w-3.5" /> Send PO</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Section>

        {/* Recent orders */}
        <Section title="Recent orders">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-amber-700">{o.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell>{o.customer_name ?? "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{o.system_id ? systemMap[o.system_id]?.reference ?? "—" : "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(o.created_at).toLocaleDateString("en-GB")}</TableCell>
                  <TableCell className="font-semibold">{gbp(Number(o.total))}</TableCell>
                  <TableCell><Badge className={statusColor[o.status] ?? ""}>{o.status}</Badge></TableCell>
                  <TableCell><Link to="/admin/orders" className="text-primary text-xs hover:underline">View</Link></TableCell>
                </TableRow>
              ))}
              {recent.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm">No orders yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Section>

        {/* Low margin alert */}
        <Section title="Low margin products" icon={<AlertTriangle className="h-4 w-4 text-red-600" />}>
          {lowMargin.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">All products have healthy margins (≥30%).</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowMargin.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.desc}</TableCell>
                    <TableCell className="font-mono text-red-600 font-semibold">{p.margin.toFixed(1)}%</TableCell>
                    <TableCell><Link to="/admin/products" className="text-primary text-xs hover:underline">Edit pricing</Link></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, sub, extra }: { label: string; value: React.ReactNode; sub?: string; extra?: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border bg-card p-5 shadow-card">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-2 font-mono">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border bg-card shadow-card mb-8 overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}
