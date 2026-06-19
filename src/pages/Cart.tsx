import { DashboardLayout } from "@/components/DashboardLayout";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Cart() {
  const { items, remove, updateQty, subtotal, vat, total, clear } = useCart();

  const checkout = () => {
    toast.info("Stripe checkout will be wired up in the next phase.");
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl">
        <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
        <p className="text-muted-foreground text-sm mt-1">Review your order before checkout.</p>

        {items.length === 0 ? (
          <div className="mt-10 rounded-[10px] border-dashed border-2 bg-card p-12 text-center">
            <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">Your cart is empty.</p>
            <Button asChild className="mt-4 bg-primary hover:bg-primary/90"><Link to="/catalogue">Browse catalogue</Link></Button>
          </div>
        ) : (
          <div className="mt-6 rounded-[10px] border bg-card shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Differ</th>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2">Spec</th>
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
                      <div className="text-xs text-muted-foreground font-mono">{it.product_code}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{[it.cylinder_type, it.finish].filter(Boolean).join(" · ")}</td>
                    <td className="px-4 py-3"><Input type="number" min={1} value={it.quantity} onChange={(e) => updateQty(i, parseInt(e.target.value) || 1)} className="h-8 w-20" /></td>
                    <td className="px-4 py-3 text-right font-mono">£{it.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">£{(it.unit_price * it.quantity).toFixed(2)}</td>
                    <td className="px-4 py-3"><Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t p-5 flex justify-between items-start">
              <Button variant="outline" onClick={clear}>Clear cart</Button>
              <div className="text-right space-y-1 font-mono">
                <div className="text-sm text-muted-foreground">Subtotal: <span className="text-foreground">£{subtotal.toFixed(2)}</span></div>
                <div className="text-sm text-muted-foreground">VAT (20%): <span className="text-foreground">£{vat.toFixed(2)}</span></div>
                <div className="text-xl font-semibold">Total: £{total.toFixed(2)}</div>
                <Button onClick={checkout} className="mt-3 bg-primary hover:bg-primary/90">Proceed to checkout</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
