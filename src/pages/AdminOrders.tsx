import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { presetRange, RangePreset } from "@/lib/dateRanges";
import { toast } from "sonner";
import { Send, Download, X, ExternalLink, Loader2, Check, Trash2 } from "lucide-react";

interface OrderRow {
  id: string;
  user_id: string;
  status: string;
  total: number;
  subtotal: number;
  vat: number;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  company: string | null;
  po_number: string | null;
  po_sent_at: string | null;
  po_sent_to: string | null;
  customer_po_ref: string | null;
  system_id: string | null;
  delivery_address: any;
  notes: string | null;
  payment_status: string;
  paid_at: string | null;
  payment_method: string | null;
}

interface ItemRow {
  id: string;
  order_id: string;
  item_type: string;
  differ_ref: string | null;
  room_label: string | null;
  product_code: string | null;
  cylinder_type: string | null;
  finish: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  pending_bacs: "bg-purple-100 text-purple-800 border-purple-300",
  paid: "bg-blue-100 text-blue-800 border-blue-300",
  processing: "bg-indigo-100 text-indigo-800 border-indigo-300",
  shipped: "bg-teal-100 text-teal-800 border-teal-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};
const statusLabel: Record<string, string> = {
  pending: "pending",
  pending_bacs: "Awaiting BACS",
  paid: "Paid ✓",
  processing: "processing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
};
const STATUS_OPTIONS = ["pending_bacs", "processing", "shipped", "delivered", "cancelled"];


const fmtPaidAt = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const gbp = (n: number) => `£${n.toFixed(2)}`;

interface SendProgress {
  orderId: string;
  ref: string;
  status: "pending" | "sending" | "done" | "error";
  poNumber?: string | null;
  error?: string;
}

export default function AdminOrders() {
  const initial = presetRange("month");
  const [from, setFrom] = useState<Date>(initial.from);
  const [to, setTo] = useState<Date>(initial.to);
  const [preset, setPreset] = useState<RangePreset>("month");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [costMap, setCostMap] = useState<Record<string, number>>({});
  const [profileMap, setProfileMap] = useState<Record<string, { name: string | null; company: string | null; email: string | null; phone: string | null }>>({});
  const [systemMap, setSystemMap] = useState<Record<string, { name: string; reference: string | null }>>({});
  const [productMap, setProductMap] = useState<Record<string, { description: string; profile: string | null; size: string | null }>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [supplierEmail, setSupplierEmail] = useState<string>("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progress, setProgress] = useState<SendProgress[]>([]);
  const [singleSending, setSingleSending] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reload = async () => {
    let q = supabase
      .from("orders")
      .select("*")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    const { data } = await q;
    const list = (data ?? []) as OrderRow[];
    setOrders(list);
    if (list.length) {
      const ids = list.map((o) => o.id);
      const { data: it } = await supabase.from("order_items").select("*").in("order_id", ids);
      setItems((it ?? []) as ItemRow[]);
      const uids = Array.from(new Set(list.map((o) => o.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id,name,company,email,phone").in("id", uids);
      const pm: Record<string, any> = {}; (profs ?? []).forEach((p: any) => (pm[p.id] = p));
      setProfileMap(pm);
      const sids = Array.from(new Set(list.map((o) => o.system_id).filter(Boolean))) as string[];
      if (sids.length) {
        const { data: sys } = await supabase.from("key_systems").select("id,name,reference").in("id", sids);
        const sm: Record<string, any> = {}; (sys ?? []).forEach((s: any) => (sm[s.id] = s));
        setSystemMap(sm);
      }
    } else {
      setItems([]);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: prodsData } = await supabase.functions.invoke("admin-catalogue", {
        body: { action: "list" },
      });
      const prods = prodsData?.products ?? [];
      const cMap: Record<string, number> = {};
      const dMap: Record<string, any> = {};
      (prods ?? []).forEach((p: any) => {
        if (p.code) {
          cMap[p.code] = Number(p.cost_price ?? 0);
          dMap[p.code] = { description: p.product_description ?? p.name ?? p.code, profile: p.cylinder_profile, size: p.size };
        }
      });
      setCostMap(cMap);
      setProductMap(dMap);
      const { data: se } = await supabase.from("admin_settings").select("value").eq("key", "supplier_email").maybeSingle();
      setSupplierEmail((se?.value as string) ?? "");
    })();
  }, []);

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [from, to, status]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter((o) =>
      o.id.toLowerCase().includes(s) ||
      (o.customer_name ?? "").toLowerCase().includes(s) ||
      (o.company ?? "").toLowerCase().includes(s),
    );
  }, [orders, search]);

  const costFor = (oid: string) => items.filter((i) => i.order_id === oid).reduce((s, i) => s + Number(i.quantity) * (costMap[i.product_code ?? ""] ?? 0), 0);

  const totals = useMemo(() => {
    const countableStatuses = ["paid", "processing", "shipped", "delivered"];
    const countable = filtered.filter(o => countableStatuses.includes(o.status));
    const rev = countable.reduce((s, o) => s + Number(o.total), 0);
    const cost = countable.reduce((s, o) => s + costFor(o.id), 0);
    const profit = rev - cost;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    return { rev, cost, profit, margin };
  }, [filtered, items, costMap]);

  const selectableIds = filtered.filter((o) => o.status === "paid" && !o.po_number).map((o) => o.id);
  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(selectableIds) : new Set());
  const toggle = (id: string) => {
    const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n);
  };

  const onChange = (f: Date, t: Date, p: RangePreset) => { setFrom(f); setTo(t); setPreset(p); };

  const open = openId ? orders.find((o) => o.id === openId) ?? null : null;
  const openItems = open ? items.filter((i) => i.order_id === open.id) : [];
  const openCost = open ? costFor(open.id) : 0;
  const openProfit = open ? Number(open.total) - openCost : 0;

  const updateStatus = async (id: string, s: string) => {
    const { error } = await supabase.from("orders").update({ status: s }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked as ${s}`);
    reload();
  };

  const deleteItem = async (itemId: string) => {
    await supabase.from("order_items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const refLabel = (o: OrderRow) => o.id.slice(0, 8).toUpperCase();

  const sendOne = async (orderId: string): Promise<{ ok: boolean; po_number?: string | null; error?: string }> => {
    const { data, error } = await supabase.functions.invoke("send-purchase-order", { body: { order_id: orderId } });
    if (error || (data as any)?.error) return { ok: false, error: (data as any)?.error ?? error?.message ?? "Failed" };
    return { ok: true, po_number: (data as any)?.po_number };
  };

  const runBulkSend = async () => {
    const list: SendProgress[] = Array.from(selected).map((id) => {
      const o = orders.find((x) => x.id === id)!;
      return { orderId: id, ref: refLabel(o), status: "pending" };
    });
    setProgress(list);
    setConfirmOpen(false);
    setProgressOpen(true);
    let sent = 0;
    for (let i = 0; i < list.length; i++) {
      setProgress((p) => p.map((x, idx) => idx === i ? { ...x, status: "sending" } : x));
      const res = await sendOne(list[i].orderId);
      setProgress((p) => p.map((x, idx) => idx === i ? {
        ...x,
        status: res.ok ? "done" : "error",
        poNumber: res.po_number,
        error: res.error,
      } : x));
      if (res.ok) sent++;
    }
    toast.success(`${sent} of ${list.length} purchase orders sent to ${supplierEmail}`);
    setSelected(new Set());
    reload();
  };

  const retryOne = async (idx: number) => {
    setProgress((p) => p.map((x, i) => i === idx ? { ...x, status: "sending", error: undefined } : x));
    const res = await sendOne(progress[idx].orderId);
    setProgress((p) => p.map((x, i) => i === idx ? {
      ...x,
      status: res.ok ? "done" : "error",
      poNumber: res.po_number,
      error: res.error,
    } : x));
    if (res.ok) reload();
  };

  const runDownload = async (ids: string[]) => {
    for (const id of ids) {
      const { data, error } = await supabase.functions.invoke("send-purchase-order", { body: { order_id: id, download_only: true } });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error ?? error?.message ?? "Failed to generate PO");
        continue;
      }
      const html = (data as any)?.html as string;
      if (html) {
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    }
  };

  const sendSingle = async (orderId: string) => {
    setSingleSending(orderId);
    const res = await sendOne(orderId);
    setSingleSending(null);
    if (!res.ok) return toast.error(res.error ?? "Failed");
    toast.success(`Sent as ${res.po_number}`);
    reload();
  };

  const doDeleteOrder = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("orders").delete().eq("id", deleteId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDeleteId(null);
    setOpenId(null);
    toast.success("Order deleted");
    reload();
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-[1400px]">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">All orders</h1>
          <p className="text-muted-foreground text-sm">Manage customer orders, costs and POs.</p>
        </div>

        <div className="mb-4"><DateRangePicker from={from} to={to} preset={preset} onChange={onChange} /></div>

        <div className="rounded-[10px] border bg-card p-4 shadow-card flex flex-wrap items-center gap-3 mb-4">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pending_bacs">Awaiting BACS</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>

          </Select>
          <Input placeholder="Search order ref, customer, company…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </div>

        {selected.size > 0 && (
          <div className="rounded-[10px] border bg-amber-50 border-amber-200 p-3 mb-4 flex items-center gap-3">
            <span className="text-sm font-medium">{selected.size} orders selected</span>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => setConfirmOpen(true)}><Send className="h-3.5 w-3.5" /> Generate & send POs</Button>
            <Button size="sm" variant="outline" onClick={() => runDownload(Array.from(selected))}><Download className="h-3.5 w-3.5" /> Download POs</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="h-3.5 w-3.5" /> Clear</Button>
          </div>
        )}

        <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectableIds.length > 0 && selected.size === selectableIds.length}
                    onCheckedChange={(c) => toggleAll(!!c)}
                  />
                </TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Revenue (ex VAT)</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PO</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => {
                const oItems = items.filter((i) => i.order_id === o.id);
                const qty = oItems.reduce((s, i) => s + Number(i.quantity), 0);
                const cost = costFor(o.id);
                const profit = Number(o.total) - cost;
                const margin = Number(o.total) > 0 ? (profit / Number(o.total)) * 100 : 0;
                const marginCls = margin < 30 ? "text-red-600" : margin < 40 ? "text-amber-600" : "text-green-600";
                const canSelect = o.status === "paid" && !o.po_number;
                const sending = singleSending === o.id;
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      {canSelect ? (
                        <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggle(o.id)} />
                      ) : (
                        <Tooltip><TooltipTrigger asChild><span><Checkbox disabled /></span></TooltipTrigger><TooltipContent>{o.po_number ? "PO already sent" : "Not eligible"}</TooltipContent></Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-amber-700">{refLabel(o)}</TableCell>
                    <TableCell>{o.customer_name ?? profileMap[o.user_id]?.name ?? "—"}</TableCell>
                    <TableCell>{o.company ?? profileMap[o.user_id]?.company ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {o.payment_status === "paid" ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge className="bg-green-100 text-green-800 border-green-300 w-fit">Paid ✓</Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">{fmtPaidAt(o.paid_at)}</span>
                        </div>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">Unpaid</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.system_id ? (
                        <div>
                          <div>{systemMap[o.system_id]?.name ?? "—"}</div>
                          <Badge variant="outline" className="font-mono text-[10px]">{systemMap[o.system_id]?.reference ?? "—"}</Badge>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{new Date(o.created_at).toLocaleString("en-GB")}</TableCell>
                    <TableCell>{qty}</TableCell>
                    <TableCell className="text-green-600 font-semibold">{gbp(Number(o.total))}</TableCell>
                    <TableCell className="text-muted-foreground">{gbp(cost)}</TableCell>
                    <TableCell className="text-green-600 font-bold">{gbp(profit)}</TableCell>
                    <TableCell className={`font-semibold ${marginCls}`}>{margin.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                        <SelectTrigger className={`h-7 text-xs px-2 py-0 w-auto min-w-[100px] border ${statusColor[o.status] ?? ""}`}>
                          <SelectValue>{statusLabel[o.status] ?? o.status}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{statusLabel[s] ?? s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-amber-700">{o.po_number ?? "—"}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setOpenId(o.id)}>View</Button>
                      {o.po_number ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                              Sent {o.po_sent_at ? new Date(o.po_sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="left">PO already sent — click View to see details</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={sending} onClick={() => sendSingle(o.id)}>
                              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Send purchase order to supplier</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground text-sm py-8">No orders match the filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <StatBox label="Total revenue" value={gbp(totals.rev)} cls="text-green-600" />
            <StatBox label="Total cost" value={gbp(totals.cost)} cls="text-muted-foreground" />
            <StatBox label="Total profit" value={gbp(totals.profit)} cls="text-green-600" />
            <StatBox label="Avg margin" value={`${totals.margin.toFixed(1)}%`} cls={totals.margin < 30 ? "text-red-600" : "text-green-600"} />
          </div>
        )}
      </div>

      {/* Bulk confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {selected.size} purchase orders to {supplierEmail || "(no supplier email set)"}?</DialogTitle>
            <DialogDescription>
              Each order will be sent as a separate email. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <ul className="text-xs font-mono max-h-48 overflow-auto bg-muted/30 rounded p-2 space-y-0.5">
            {Array.from(selected).map((id) => {
              const o = orders.find((x) => x.id === id); if (!o) return null;
              return <li key={id}>{refLabel(o)}</li>;
            })}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" disabled={!supplierEmail} onClick={runBulkSend}>Send all {selected.size} orders</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress dialog */}
      <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sending purchase orders</DialogTitle>
            <DialogDescription>Live progress — do not close until all complete.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5 max-h-72 overflow-auto">
            {progress.map((p, i) => (
              <li key={p.orderId} className="flex items-center gap-2 text-sm">
                <span className="font-mono w-20">{p.ref}</span>
                {p.status === "pending" && <span className="text-muted-foreground">Queued…</span>}
                {p.status === "sending" && <span className="inline-flex items-center gap-1 text-amber-700"><Loader2 className="h-3 w-3 animate-spin" /> Sending…</span>}
                {p.status === "done" && <span className="inline-flex items-center gap-1 text-green-700"><Check className="h-3 w-3" /> Sent as {p.poNumber}</span>}
                {p.status === "error" && (
                  <span className="inline-flex items-center gap-2 text-red-600">
                    {p.error ?? "Failed"}
                    <Button size="sm" variant="outline" onClick={() => retryOne(i)}>Retry</Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-amber-700">{refLabel(open)}</span>
                  <Badge className={statusColor[open.status] ?? ""}>{open.status}</Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-4 text-sm">
                <Block title="Customer">
                  <div>{open.customer_name ?? profileMap[open.user_id]?.name ?? "—"}</div>
                  <div className="text-muted-foreground">{open.company ?? profileMap[open.user_id]?.company ?? ""}</div>
                  <div className="text-muted-foreground">{open.customer_email ?? profileMap[open.user_id]?.email ?? ""}</div>
                  <div className="text-muted-foreground">{profileMap[open.user_id]?.phone ?? ""}</div>
                  <div className="pt-2 flex items-center gap-2">
                    {open.payment_status === "paid"
                      ? <Badge className="bg-green-100 text-green-800 border-green-300">Paid ✓</Badge>
                      : <Badge className="bg-amber-100 text-amber-800 border-amber-300">Unpaid</Badge>}
                    {open.payment_method === "bacs"
                      ? <Badge className="bg-purple-100 text-purple-800 border-purple-300">BACS transfer</Badge>
                      : <Badge className="bg-gray-100 text-gray-800 border-gray-300">Card (Stripe)</Badge>}
                  </div>
                </Block>


                {open.system_id && (
                  <Block title="System">
                    <div className="flex items-center gap-2">
                      <span>{systemMap[open.system_id]?.name}</span>
                      <Badge variant="outline" className="font-mono">{systemMap[open.system_id]?.reference}</Badge>
                      <Link to={`/builder/${open.system_id}`} className="text-primary text-xs inline-flex items-center gap-1 hover:underline"><ExternalLink className="h-3 w-3" /> Open</Link>
                    </div>
                  </Block>
                )}

                {open.customer_po_ref && <Block title="Customer reference">{open.customer_po_ref}</Block>}
                {open.delivery_address && (
                  <Block title="Delivery">
                    {(() => {
                      const d = open.delivery_address as any;
                      if (typeof d === "string") return <pre className="text-xs whitespace-pre-wrap font-sans">{d}</pre>;
                      const contact = d.contact_name ?? d.name;
                      const phone = d.contact_phone;
                      const addr = [d.line1, d.line2, d.city, d.county, d.postcode].filter(Boolean).join(", ");
                      return <>
                        {(contact || phone) && (
                          <div className="font-semibold">
                            Contact: {contact ?? "—"}{phone ? ` · ${phone}` : ""}
                          </div>
                        )}
                        <div className="text-muted-foreground mt-1">{addr || "—"}</div>
                      </>;
                    })()}
                  </Block>
                )}
                {open.notes && <Block title="Notes">{open.notes}</Block>}

                <Block title="Cylinders">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Differ</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Profile</TableHead>
                        <TableHead>Finish</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openItems.filter((i) => i.item_type === "cylinder").map((i) => {
                        const pd = productMap[i.product_code ?? ""];
                        return (
                          <TableRow key={i.id}>
                            <TableCell className="font-mono text-xs">{i.differ_ref ?? "—"}</TableCell>
                            <TableCell>{i.room_label ?? "—"}</TableCell>
                            <TableCell className="text-xs">{pd?.description ?? i.product_code}</TableCell>
                            <TableCell className="text-xs">{pd?.profile ?? "—"}</TableCell>
                            <TableCell className="text-xs">{i.finish ?? "—"}</TableCell>
                            <TableCell className="text-xs">{pd?.size ?? "—"}</TableCell>
                            <TableCell>{i.quantity}</TableCell>
                            <TableCell>{gbp(Number(i.unit_price))}</TableCell>
                            <TableCell>{gbp(Number(i.line_total))}</TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                onClick={() => deleteItem(i.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Block>

                <Block title="Keys">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openItems.filter((i) => i.item_type === "key").map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-mono text-xs">{i.differ_ref ?? "—"}</TableCell>
                          <TableCell className="text-xs">{i.product_code ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground italic">{i.room_label ?? "—"}</TableCell>
                          <TableCell>{i.quantity}</TableCell>
                          <TableCell>{gbp(Number(i.unit_price))}</TableCell>
                          <TableCell>{gbp(Number(i.line_total))}</TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:bg-destructive/10"
                              onClick={() => deleteItem(i.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Block>

                <Block title="Totals">
                  <div className="flex justify-between"><span>Subtotal ex VAT</span><span className="font-mono">{gbp(Number(open.subtotal))}</span></div>
                  <div className="flex justify-between"><span>VAT</span><span className="font-mono">{gbp(Number(open.vat))}</span></div>
                  <div className="flex justify-between font-semibold"><span>Total inc VAT</span><span className="font-mono">{gbp(Number(open.total))}</span></div>
                  <div className="border-t mt-2 pt-2 grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-xs text-muted-foreground">Revenue (ex VAT)</div><div className="font-mono font-semibold text-green-600">{gbp(Number(open.total))}</div></div>
                    <div><div className="text-xs text-muted-foreground">Cost</div><div className="font-mono text-muted-foreground">{gbp(openCost)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Profit</div><div className="font-mono font-semibold text-green-600">{gbp(openProfit)}</div></div>
                  </div>
                </Block>

                <Block title="Purchase order">
                  {open.po_number ? (
                    <div className="text-xs">PO <span className="font-mono text-amber-700">{open.po_number}</span> sent {open.po_sent_at ? new Date(open.po_sent_at).toLocaleString("en-GB") : ""} {open.po_sent_to ? `to ${open.po_sent_to}` : ""}</div>
                  ) : (
                    <div className="text-xs text-muted-foreground">PO not yet sent</div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={!!open.po_number || singleSending === open.id} onClick={() => sendSingle(open.id)}>
                      {singleSending === open.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send PO
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => runDownload([open.id])}>
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                </Block>

                <div className="flex gap-2 flex-wrap">
                  {open.status === "pending_bacs" && (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={async () => {
                        await supabase.from('orders').update({
                          status: 'processing',
                          payment_status: 'paid',
                          paid_at: new Date().toISOString(),
                          payment_method: 'bacs',
                        }).eq('id', open.id);
                        toast.success('Order marked as paid — status set to processing');
                        setOpenId(null);
                        reload();
                      }}
                    >
                      <Check className="h-3.5 w-3.5" /> Mark paid (BACS)
                    </Button>
                  )}
                  {open.status === "paid" && <Button size="sm" variant="outline" onClick={() => updateStatus(open.id, "processing")}>Mark processing</Button>}
                  {open.status !== "shipped" && open.status !== "delivered" && <Button size="sm" variant="outline" onClick={() => updateStatus(open.id, "shipped")}>Mark shipped</Button>}
                  {open.status !== "delivered" && <Button size="sm" variant="outline" onClick={() => updateStatus(open.id, "delivered")}>Mark delivered</Button>}

                  <Button size="sm" variant="outline" className="ml-auto text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setDeleteId(open.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete order
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete order {deleteId ? (orders.find((o) => o.id === deleteId) ? refLabel(orders.find((o) => o.id === deleteId)!) : "") : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the order and all its line items. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDeleteOrder} className="bg-destructive hover:bg-destructive/90 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function StatBox({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-[10px] border bg-card p-4 shadow-card">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className={`text-xl font-semibold font-mono mt-1 ${cls ?? ""}`}>{value}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">{title}</div>
      <div className="rounded-[10px] border bg-card p-3 space-y-1">{children}</div>
    </div>
  );
}
