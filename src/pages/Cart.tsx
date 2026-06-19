import { DashboardLayout } from "@/components/DashboardLayout";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StripeCheckout } from "@/components/StripeCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export default function Cart() {
  const { items, remove, updateQty, subtotal, clear } = useCart();
  const { user } = useAuth();
  const [checkout, setCheckout] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name,company").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setName(data.name ?? ""); setCompany(data.company ?? ""); }
    });
  }, [user]);

  // Note: VAT and shipping are finalised by Stripe at checkout; this is an indicative pre-tax total.
  const vatEstimate = +(subtotal * 0.2).toFixed(2);
  const totalEstimate = +(subtotal + vatEstimate).toFixed(2);

  const returnUrl = `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

  if (checkout) {
    return (
      <DashboardLayout>
        <PaymentTestModeBanner />
        <div className="p-8 max-w-3xl mx-auto">
          <Button variant="ghost" onClick={() => { setCheckout(false); setErr(null); }} className="mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to cart
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
          <p className="text-muted-foreground text-sm mt-1">VAT and shipping calculated at the next step.</p>
          {err && <div className="mt-4 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-sm text-destructive">{err}</div>}
          <div className="mt-6">
            <StripeCheckout
              items={items}
              returnUrl={returnUrl}
              customer={{ name, company }}
              onError={(m) => setErr(m)}
            />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl">
        <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
        <p className="text-muted-foreground text-sm mt-1">Review your order, then continue to secure checkout.</p>

        {items.length === 0 ? (
          <div className="mt-10 rounded-[10px] border-dashed border-2 bg-card p-12 text-center">
            <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">Your cart is empty.</p>
            <Button asChild className="mt-4 bg-primary hover:bg-primary/90"><Link to="/catalogue">Browse catalogue</Link></Button>
          </div>
        ) : (
          <div className="mt-6 grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-[10px] border bg-card shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Differ</th>
                    <th className="px-4 py-2">Item</th>
                    <th className="px-4 py-2 w-24">Qty</th>
                    <th className="px-4 py-2 w-24 text-right">Unit</th>
                    <th className="px-4 py-2 w-24 text-right">Total</th>
                    <th className="px-4 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-3 font-mono text-xs">{it.differ_ref ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{it.room_label || it.key_reference || it.product_code || it.kind}</div>
                        <div className="text-xs text-muted-foreground font-mono">{[it.product_code, it.cylinder_type, it.finish].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="px-4 py-3"><Input type="number" min={1} value={it.quantity} onChange={(e) => updateQty(i, parseInt(e.target.value) || 1)} className="h-8 w-20" /></td>
                      <td className="px-4 py-3 text-right font-mono">£{it.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono">£{(it.unit_price * it.quantity).toFixed(2)}</td>
                      <td className="px-4 py-3"><Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t p-4 flex justify-between">
                <Button variant="outline" size="sm" onClick={clear}>Clear cart</Button>
                <Button asChild variant="ghost" size="sm"><Link to="/catalogue">Add more items</Link></Button>
              </div>
            </div>

            <aside className="rounded-[10px] border bg-card shadow-card p-5 h-fit">
              <h2 className="font-semibold">Order summary</h2>
              <div className="mt-4 space-y-1 text-sm font-mono">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>£{subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>VAT (est. 20%)</span><span>£{vatEstimate.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>Calculated at checkout</span></div>
                <div className="flex justify-between text-base font-semibold pt-2 border-t mt-2"><span>Estimated total</span><span>£{totalEstimate.toFixed(2)}</span></div>
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <Label className="text-xs">Name on order</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <Label className="text-xs">Company (optional)</Label>
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
              </div>

              <Button onClick={() => setCheckout(true)} className="w-full mt-5 bg-primary hover:bg-primary/90">
                Proceed to checkout
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">Secure payment · UK VAT calculated on next step</p>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
