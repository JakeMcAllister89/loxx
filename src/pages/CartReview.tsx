import { DashboardLayout } from "@/components/DashboardLayout";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Loader2, Building2, CreditCard } from "lucide-react";
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
  const { items, meta, setMeta, cylindersSubtotal, keysSubtotal, subtotal, deliveryCharge, vat, total, clear } = useCart();

  const itemsByDifferRef = useMemo(() => {
    const map = new Map<string, typeof items[0]>();
    items.forEach(i => { if (i.differ_ref) map.set(i.differ_ref, i); });
    return map;
  }, [items]);

  const { user } = useAuth();
  const navigate = useNavigate();
  const [systems, setSystems] = useState<SystemSummary[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<{ name?: string; company?: string }>({});
  const [checkout, setCheckout] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bacsLoading, setBacsLoading] = useState(false);
  const [bacsError, setBacsError] = useState<string | null>(null);

  const handleBacsOrder = async () => {
    setBacsLoading(true);
    setBacsError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in to place an order.");
      const deliveryItem = {
        kind: "delivery" as const,
        product_name: "Delivery Charge",
        quantity: 1,
        unit_price: deliveryCharge,
      };
      const payload = {
        items: [...items, deliveryItem],
        systemId: systemIds[0] ?? null,
        customer: profile,
        customerPoRef: meta.customerPoRef,
        notes: meta.notes,
        delivery: meta.delivery,
      };
      const { data, error } = await supabase.functions.invoke("create-bacs-order", { body: payload });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error ?? error?.message ?? "Failed to create order");
      }
      const ref = (data as any)?.orderRef ?? "";
      clear();
      navigate(`/orders/bacs-confirmed?ref=${encodeURIComponent(ref)}`);
    } catch (e) {
      setBacsError((e as Error).message ?? "Something went wrong");
      setBacsLoading(false);
    }
  };


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
              projectName={meta.projectName}
              deliveryCharge={deliveryCharge}
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
                      <HierarchyView root={sys.tree_data.root} itemsByDifferRef={itemsByDifferRef} />
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
            <div className="rounded-[10px] border bg-card shadow-card p-5 space-y-4">
              <h2 className="font-semibold">Order details</h2>

              {/* Customer */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</div>
                {profile.name && <div className="text-sm font-medium">{profile.name}</div>}
                <div>
                  <input
                    type="text"
                    value={meta.companyName}
                    onChange={(e) => setMeta({ companyName: e.target.value })}
                    placeholder="Company / organisation name *"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
              </div>

              {/* Delivery address */}
              <div className="pt-3 border-t space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deliver to</div>
                  <Link to="/cart" className="text-xs text-primary hover:underline">Edit</Link>
                </div>
                {meta.delivery.line1 && meta.delivery.contact_name && meta.delivery.contact_phone ? (
                  <div className="text-sm space-y-0.5">
                    {(meta.delivery as any).company_name && (
                      <div className="font-medium">{(meta.delivery as any).company_name}</div>
                    )}
                    <div className="font-medium">{meta.delivery.contact_name}</div>
                    <div className="text-muted-foreground text-xs">{meta.delivery.contact_phone}</div>
                    <div className="text-muted-foreground pt-1">{meta.delivery.line1}</div>
                    {meta.delivery.line2 && <div className="text-muted-foreground">{meta.delivery.line2}</div>}
                    <div className="text-muted-foreground">{[meta.delivery.city, meta.delivery.county].filter(Boolean).join(", ")}</div>
                    <div className="text-muted-foreground">{meta.delivery.postcode}</div>
                  </div>
                ) : (
                  <div className="text-destructive text-xs">Delivery contact and address required — <Link to="/cart" className="underline">add in basket</Link></div>
                )}
              </div>

              {/* PO ref */}
              {meta.customerPoRef && (
                <div className="pt-3 border-t">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your PO ref</div>
                  <div className="text-sm mt-0.5">{meta.customerPoRef}</div>
                </div>
              )}

              {/* Special instructions */}
              {meta.notes && (
                <div className="pt-3 border-t">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Special instructions</div>
                  <div className="text-sm mt-0.5 text-amber-700">{meta.notes}</div>
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

            <div className="space-y-3">
              {(() => {
                const d = meta.delivery;
                const ready = !!(d.contact_name && d.contact_phone && d.line1 && d.city && d.postcode);
                const canPay = ready && termsAccepted;
                return <>
                  <label className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed px-1">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 accent-amber-500"
                    />
                    <span>
                      I agree to the{" "}
                      <Link to="/terms" target="_blank" className="text-amber-600 hover:underline">Terms &amp; Conditions</Link>
                      {" "}and{" "}
                      <Link to="/returns" target="_blank" className="text-amber-600 hover:underline">Returns Policy</Link>
                      . I understand that custom-keyed products cannot be returned once production has commenced.
                    </span>
                  </label>

                  <div className="rounded-[10px] border bg-card shadow-card p-5">
                    <h2 className="font-semibold mb-3">How would you like to pay?</h2>
                    <div className="flex flex-col gap-3">
                      {/* Card */}
                      <div className="rounded-md border p-4 flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <div className="font-semibold text-sm">Pay by card</div>
                        </div>
                        <p className="text-xs text-muted-foreground flex-1 mb-3">
                          Pay securely by card via Stripe. Your order is confirmed immediately on payment.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setCheckout(true)}
                          disabled={!canPay}
                          className="w-full"
                        >
                          <CreditCard className="h-4 w-4 mr-1" /> Pay now → £{total.toFixed(2)}
                        </Button>
                      </div>
                      {/* BACS */}
                      <div className="rounded-md border p-4 flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div className="font-semibold text-sm">Pay by bank transfer</div>
                        </div>
                        <p className="text-xs text-muted-foreground flex-1 mb-3">
                          We'll email you a pro-forma invoice with our bank details. Order is placed once payment clears.
                        </p>
                        <Button
                          variant="outline"
                          onClick={handleBacsOrder}
                          disabled={!canPay || bacsLoading}
                          className="w-full"
                        >
                          {bacsLoading
                            ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sending…</>
                            : <><Building2 className="h-4 w-4 mr-1" /> Request pro-forma invoice</>}
                        </Button>
                        {bacsError && (
                          <p className="text-xs text-destructive mt-2">{bacsError}</p>
                        )}
                      </div>
                    </div>
                    {!ready && (
                      <p className="text-xs text-destructive text-center mt-3">Complete delivery contact and address in the basket first.</p>
                    )}
                  </div>

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
  CE:  "bg-sky-100 text-sky-800 border-sky-200",
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

/** Remove CYL/CE leaves not present in the cart, and prune empty branches. */
function filterToCartItems(n: TNode, itemsByDifferRef?: Map<string, any>): TNode | null {
  if (n.type === "CYL") {
    const differRef = n.differ != null ? `D${String(n.differ).padStart(3, "0")}` : null;
    return differRef && itemsByDifferRef?.has(differRef) ? n : null;
  }
  if (n.type === "CE") {
    return n.z_ref && itemsByDifferRef?.has(n.z_ref) ? n : null;
  }
  const kids = n.children
    .map((c) => filterToCartItems(c, itemsByDifferRef))
    .filter(Boolean) as TNode[];
  if (kids.length === 0 && (n.type === "MK" || n.type === "SMK")) return null;
  return { ...n, children: kids };
}

function HierarchyView({ root, itemsByDifferRef }: { root: TNode; itemsByDifferRef?: Map<string, any> }) {
  const flattened = flattenCKForDisplay(root);
  const view = filterToCartItems(flattened, itemsByDifferRef) ?? { ...flattened, children: [] };

  const renderNode = (n: TNode, depth: number) => (
    <div key={n.id}>
      <div className="flex items-center gap-2 py-1 text-sm" style={{ paddingLeft: depth * 18 }}>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${TYPE_PILL[n.type] ?? TYPE_PILL.SMK}`}>{n.type}</span>
        <span className={n.type === "CYL" ? "" : "font-medium"}>{n.label}</span>
        {(n.type === "MK" || n.type === "SMK") && n.location && (
          <span className="text-xs text-muted-foreground">({n.location})</span>
        )}
        {(n.type === "GMK" || n.type === "MK" || n.type === "SMK") && (() => {
          const keysArr = Array.isArray(n.keys) ? n.keys : [];
          const totalKeys = keysArr.reduce((s: number, k: any) => s + (k.qty ?? 0), 0);
          return totalKeys > 0 ? (
            <span className="text-xs text-muted-foreground">· {totalKeys} key{totalKeys === 1 ? "" : "s"}</span>
          ) : null;
        })()}
        {n.type === "CYL" && (() => {
          const differRef = n.differ != null ? `D${String(n.differ).padStart(3, "0")}` : null;
          const item = differRef ? itemsByDifferRef?.get(differRef) : undefined;
          const lockType = item?.cylinder_type ?? null;
          const lockFunction = item?.cylinder_profile ?? null;
          return (
            <span className="text-xs text-muted-foreground ml-1">
              {differRef && <span className="mr-2 text-amber-700 font-medium">{differRef}</span>}
              <span>× {n.quantity ?? 1}</span>
              {n.size && <span> · {n.size}</span>}
              {n.finish && <span> · {n.finish}</span>}
              {lockFunction && <span> · {lockFunction}</span>}
              {lockType && <span> · {lockType}</span>}
            </span>
          );
        })()}
        {n.type === "CE" && (() => {
          const item = n.z_ref ? itemsByDifferRef?.get(n.z_ref) : undefined;
          const lockType = item?.cylinder_type ?? null;
          const lockFunction = item?.cylinder_profile ?? null;
          return (
            <span className="text-xs text-muted-foreground ml-1">
              {n.z_ref && <span className="mr-2 text-sky-700 font-medium">{n.z_ref}</span>}
              <span>× {n.quantity ?? 1}</span>
              {n.size && <span> · {n.size}</span>}
              {n.finish && <span> · {n.finish}</span>}
              {lockFunction && <span> · {lockFunction}</span>}
              {lockType && <span> · {lockType}</span>}
            </span>
          );
        })()}
      </div>
      {n.children.map(c => renderNode(c, depth + 1))}
    </div>
  );
  return <div>{renderNode(view, 0)}</div>;
}
