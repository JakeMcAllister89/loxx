import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, FileText, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { downloadInvoice } from "@/lib/invoice";
import { logAction } from "@/lib/audit";

const statusVariant: Record<string, { className: string; label: string }> = {
  pending:    { className: "bg-muted text-foreground", label: "Pending payment" },
  paid:       { className: "bg-accent-light text-primary", label: "Paid" },
  processing: { className: "bg-blue-100 text-info", label: "Processing" },
  shipped:    { className: "bg-green-100 text-success", label: "Shipped" },
  delivered:  { className: "bg-green-200 text-success", label: "Delivered" },
  cancelled:  { className: "bg-red-100 text-destructive", label: "Cancelled" },
};

interface Order {
  id: string; created_at: string; status: string; total: number; subtotal: number; vat: number;
  customer_name: string | null; customer_email: string | null; company: string | null;
  delivery_address: any; purchase_order_ref: string | null; notes: string | null;
}
interface OrderItem {
  id: string; item_type: string; product_code: string | null; cylinder_type: string | null;
  finish: string | null; room_label: string | null; differ_ref: string | null;
  quantity: number; unit_price: number; line_total: number;
}

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase.from("orders").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setOrders((data ?? []) as Order[]); setLoading(false);
    });
  }, [user]);

  const open = async (o: Order) => {
    setSelected(o);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", o.id);
    setItems((data ?? []) as OrderItem[]);
  };

  const reorder = async (o: Order) => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const { data: src } = await supabase.from("orders").select("tree_snapshot, system_id").eq("id", o.id).single();
      if (!src?.tree_snapshot) { toast.error("No system snapshot on this order"); setBusy(false); return; }
      let origName = "Order";
      if (src.system_id) {
        const { data: sys } = await supabase.from("key_systems").select("name").eq("id", src.system_id).single();
        if (sys?.name) origName = sys.name;
      }
      const today = new Date().toLocaleDateString("en-GB");
      const ref = `SYS-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: prof } = await supabase.from("profiles").select("org_id").eq("id", user.id).maybeSingle();
      const orgId = (prof as any)?.org_id ?? null;
      const { data: created, error } = await supabase.from("key_systems").insert({
        user_id: user.id,
        org_id: orgId,
        name: `Re-order — ${origName} (${today})`,
        reference: ref,
        tree_data: src.tree_snapshot,
      } as any).select("id").single();
      if (error || !created) { toast.error("Could not create system"); setBusy(false); return; }
      try { logAction({ system_id: created.id, action: "system_created", node_label: `Re-order from ${o.id.slice(0, 8)}` }); } catch {}
      toast.success("System loaded — review and export to basket when ready");
      navigate(`/builder/${created.id}?reorder=1`);
    } finally {
      setBusy(false);
    }
  };

  const invoice = async (o: Order) => {
    try { await downloadInvoice(o.id); } catch (e: any) { toast.error(e.message || "Could not generate invoice"); }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl">
        <h1 className="text-3xl font-semibold tracking-tight">My orders</h1>
        <p className="text-muted-foreground text-sm mt-1">Past purchases and dispatch status.</p>

        <div className="mt-6 rounded-[10px] border bg-card shadow-card overflow-hidden">
          {loading ? (
            <div className="p-10 text-sm text-muted-foreground text-center">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground" />
              <div className="mt-3 text-sm text-muted-foreground">No orders yet.</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Order ref</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 w-32" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const s = statusVariant[o.status] ?? { className: "bg-muted", label: o.status };
                  return (
                    <tr key={o.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3">{new Date(o.created_at).toLocaleDateString("en-GB")}</td>
                      <td className="px-4 py-3 font-medium">£{Number(o.total).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${s.className}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => open(o)}>View</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Order #{selected.id.slice(0, 8).toUpperCase()}</SheetTitle>
                <SheetDescription>
                  {new Date(selected.created_at).toLocaleString("en-GB")} ·{" "}
                  <Badge className={statusVariant[selected.status]?.className ?? ""}>
                    {statusVariant[selected.status]?.label ?? selected.status}
                  </Badge>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5 text-sm">
                <section>
                  <div className="text-xs font-medium text-muted-foreground mb-2">Items</div>
                  <div className="rounded-md border divide-y">
                    {items.map((it) => (
                      <div key={it.id} className="p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {it.room_label || it.product_code || it.item_type}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            {[it.differ_ref, it.product_code, it.finish].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <div className="text-xs text-muted-foreground">{it.quantity} × £{Number(it.unit_price).toFixed(2)}</div>
                          <div>£{Number(it.line_total).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && <div className="p-4 text-xs text-muted-foreground">No line items.</div>}
                  </div>
                </section>

                <section className="space-y-1 font-mono text-sm pt-2 border-t">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>£{Number(selected.subtotal).toFixed(2)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>VAT</span><span>£{Number(selected.vat).toFixed(2)}</span></div>
                  <div className="flex justify-between text-base font-semibold pt-1"><span>Total</span><span>£{Number(selected.total).toFixed(2)}</span></div>
                </section>

                {selected.delivery_address && (
                  <section>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Delivery</div>
                    <div className="rounded-md border p-3 text-sm">
                      {selected.customer_name && <div>{selected.customer_name}</div>}
                      {selected.company && <div className="text-muted-foreground">{selected.company}</div>}
                      {typeof selected.delivery_address === "object" && Object.values(selected.delivery_address).filter(Boolean).map((line, i) => (
                        <div key={i} className="text-muted-foreground">{String(line)}</div>
                      ))}
                    </div>
                  </section>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => invoice(selected)}>
                    <FileText className="h-4 w-4" /> Download invoice
                  </Button>
                  <Button variant="outline" className="flex-1" disabled={busy} onClick={() => reorder(selected)}>
                    <RotateCw className="h-4 w-4" /> Re-order
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
