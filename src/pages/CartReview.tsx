import { DashboardLayout } from "@/components/DashboardLayout";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StripeCheckout } from "@/components/StripeCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { TreeData, TNode } from "@/lib/keytree";

interface SystemSummary {
  id: string;
  name: string;
  reference: string | null;
  tree_data: TreeData | null;
}

export default function CartReview() {
  const { items, meta, setMeta, cylindersSubtotal, keysSubtotal, subtotal, deliveryCharge, vat, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [systems, setSystems] = useState<SystemSummary[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<{ name?: string; company?: string }>({});
  const [checkout, setCheckout] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) navigate("/cart");
  }, [items.length, navigate]);

  const systemIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach(i => { if (i.system_id) ids.add(i.system_id); });
    return Array.from(ids);
  }, [items]);

  useEffect(() => {
    if (systemIds.length === 0) return;
    supabase.from("key_systems").select("id,name,reference,tree_data").in("id", systemIds)
      .then(({ data }) => setSystems((data ?? []) as any));
  }, [systemIds]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name,company").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile({ name: data.name ?? "", company: data.company ?? "" });
    });
  }, [user]);

  const cylinderCount = items.filter(i => i.kind === "cylinder").reduce((s, i) => s + i.quantity, 0);
  const extraKeys = items.filter(i => i.kind === "key").reduce((s, i) => s + i.quantity, 0);

  if (checkout) {
    const returnUrl = `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
    return (
      <DashboardLayout>
        <PaymentTestModeBanner />
        <div className="p-8 max-w-3xl mx-auto">
          <Button variant="ghost" onClick={() => { setCheckout(false); setErr(null); }} className="mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to basket
          </Button>
          <Stepper step={2} />
          <h1 className="text-2xl font-semibold tracking-tight mt-4">Payment</h1>
          {err && <div className="mt-4 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive">{err}</div>}
          <div className="mt-6">
            <StripeCheckout
              items={items}
              returnUrl={returnUrl}
              customer={profile}
              meta={meta}
              systemId={systemIds[0] ?? null}
              onError={(m) => setErr(m)}
            />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <Stepper step={1} />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Review your order</h1>
            <p className="text-muted-foreground text-sm mt-1">Confirm everything looks right before proceeding to payment.</p>
          </div>
        </div>

        <div className="mt-6 grid lg:grid-cols-[1fr_380px] gap-6">
          {/* LEFT — hierarchy summary */}
          <div className="space-y-4">
            {systems.map((sys) => {
              const isCollapsed = collapsed.has(sys.id);
              return (
                <div key={sys.id} className="rounded-[10px] border bg-card shadow-card overflow-hidden">
                  <button
                    onClick={() => setCollapsed(c => { const n = new Set(c); n.has(sys.id) ? n.delete(sys.id) : n.add(sys.id); return n; })}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/60 text-left"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <div className="flex-1">
                      <div className="font-semibold">{sys.name}</div>
                    </div>
                    {sys.reference && <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">{sys.reference}</span>}
                  </button>
                  {!isCollapsed && sys.tree_data?.root && (
                    <div className="p-4">
                      <HierarchyView root={sys.tree_data.root} />
                      <HierarchyFooter root={sys.tree_data.root} />
                    </div>
                  )}
                </div>
              );
            })}
            {systems.length === 0 && systemIds.length > 0 && (
              <div className="rounded-[10px] border bg-card p-8 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            )}
            {systemIds.length === 0 && (
              <div className="rounded-[10px] border bg-card p-6">
                <div className="text-sm text-muted-foreground">Ad-hoc catalogue items (no system attached).</div>
                <ul className="mt-3 space-y-1 text-sm">
                  {items.map((i, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{i.product_name ?? i.product_code} × {i.quantity}</span>
                      <span>£{(i.unit_price * i.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* RIGHT — confirmation summary */}
          <aside className="space-y-4">
            <div className="rounded-[10px] border bg-card shadow-card p-5">
              <h2 className="font-semibold mb-3">Customer</h2>
              <div className="text-sm space-y-2">
                {profile.name && <div>{profile.name}</div>}
                <div>
                  <label className="text-xs text-muted-foreground">Company name *</label>
                  <input
                    type="text"
                    value={meta.companyName}
                    onChange={(e) => setMeta({ companyName: e.target.value })}
                    placeholder="Your company / organisation"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="text-muted-foreground text-xs">{user?.email}</div>
              </div>
            </div>

            <div className="rounded-[10px] border bg-card shadow-card p-5 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-semibold text-sm">Delivery address</h2>
                  <Link to="/cart" className="text-xs text-primary hover:underline">Edit</Link>
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  {meta.delivery.line1 && meta.delivery.contact_name && meta.delivery.contact_phone ? (
                    <>
                      <div className="text-foreground font-medium">{meta.delivery.contact_name}</div>
                      <div className="text-xs">{meta.delivery.contact_phone}</div>
                      <div className="pt-1">{meta.delivery.line1}</div>
                      {meta.delivery.line2 && <div>{meta.delivery.line2}</div>}
                      <div>{[meta.delivery.city, meta.delivery.county].filter(Boolean).join(", ")}</div>
                      <div>{meta.delivery.postcode}</div>
                    </>
                  ) : <div className="text-destructive text-xs">Delivery contact and address required</div>}
                </div>
              </div>

              {meta.customerPoRef && (
                <div className="pt-3 border-t">
                  <div className="text-xs text-muted-foreground">Your PO ref</div>
                  <div className="text-sm">{meta.customerPoRef}</div>
                </div>
              )}

              {meta.notes && (
                <div className="pt-3 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Special instructions</div>
                  <div className="text-sm whitespace-pre-wrap">{meta.notes}</div>
                </div>
              )}
            </div>

            <div className="rounded-[10px] border bg-card shadow-card p-5">
              <h2 className="font-semibold mb-3">Pricing</h2>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Cylinders ×{cylinderCount}</span><span>£{cylindersSubtotal.toFixed(2)}</span></div>
                {keysSubtotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Keys ×{extraKeys}</span><span>£{keysSubtotal.toFixed(2)}</span></div>}
                <div className="flex justify-between border-t pt-2 mt-2"><span>Subtotal (ex VAT)</span><span>£{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Delivery Charge</span><span>£{deliveryCharge.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>VAT (20%)</span><span>£{vat.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold text-amber-600 border-t pt-2 mt-2"><span>Total inc VAT</span><span>£{total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              {(() => {
                const d = meta.delivery;
                const ready = !!(d.contact_name && d.contact_phone && d.line1 && d.city && d.postcode);
                return <>
                  <Button onClick={() => setCheckout(true)} disabled={!ready} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-base h-12">
                    Confirm and pay → £{total.toFixed(2)} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                  {!ready && (
                    <p className="text-xs text-destructive text-center">Complete delivery contact and address in the basket first.</p>
                  )}
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/cart"><ArrowLeft className="h-4 w-4" /> Edit basket</Link>
                  </Button>
                </>;
              })()}
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Stepper({ step }: { step: 0 | 1 | 2 }) {
  const labels = ["Basket", "Review", "Payment"];
  return (
    <div className="flex items-center gap-2 text-sm">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-2">
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${i <= step ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
          <span className={i === step ? "font-semibold" : "text-muted-foreground"}>{l}</span>
          {i < labels.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
        </div>
      ))}
    </div>
  );
}

const TYPE_PILL: Record<string, string> = {
  GMK: "bg-violet-100 text-violet-800 border-violet-200",
  MK:  "bg-teal-100 text-teal-800 border-teal-200",
  SMK: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CK:  "bg-sky-100 text-sky-800 border-sky-200",
  CYL: "bg-amber-100 text-amber-900 border-amber-200",
};

/** Visually flatten legacy CK nodes when summarising for the customer. */
function flattenCKForDisplay(n: TNode): TNode {
  const kids: TNode[] = [];
  for (const c of n.children) {
    const fc = flattenCKForDisplay(c);
    if ((fc.type as string) === "CK") kids.push(...fc.children);
    else kids.push(fc);
  }
  return { ...n, children: kids };
}

function HierarchyView({ root }: { root: TNode }) {
  const view = flattenCKForDisplay(root);
  const renderNode = (n: TNode, depth: number) => (
    <div key={n.id}>
      <div className="flex items-center gap-2 py-1 text-sm" style={{ paddingLeft: depth * 18 }}>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${TYPE_PILL[n.type] ?? TYPE_PILL.SMK}`}>{n.type}</span>
        <span className={n.type === "CYL" ? "" : "font-medium"}>{n.label}</span>
        {(n.type === "MK" || n.type === "SMK") && n.location && (
          <span className="text-xs text-muted-foreground">({n.location})</span>
        )}
        {n.type === "CYL" && (
          <span className="text-xs text-muted-foreground ml-1">
            {n.differ != null && <span className="mr-2 text-amber-700 font-medium">D{String(n.differ).padStart(3, "0")}</span>}
            {n.cylinder_type && <span className="text-muted-foreground">{n.cylinder_type}</span>}
            {n.finish && <span> · {n.finish}</span>}
          </span>
        )}
      </div>
      {n.children.map(c => renderNode(c, depth + 1))}
    </div>
  );
  return <div>{renderNode(view, 0)}</div>;
}

function HierarchyFooter({ root }: { root: TNode }) {
  let mk = 0, smk = 0, cyl = 0;
  const walk = (n: TNode) => {
    if (n.type === "MK") mk++;
    if (n.type === "SMK") smk++;
    if (n.type === "CYL") cyl++;
    n.children.forEach(walk);
  };
  walk(root);
  return (
    <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
      {mk} master key{mk === 1 ? "" : "s"} · {smk} sub master{smk === 1 ? "" : "s"} · {cyl} cylinder{cyl === 1 ? "" : "s"}
    </div>
  );
}
