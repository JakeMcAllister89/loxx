import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle, Package } from "lucide-react";
import { logAction } from "@/lib/audit";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const navigate = useNavigate();
  const { clear } = useCart();
  const [state, setState] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [order, setOrder] = useState<{ id: string; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) { setState("error"); setError("Missing session id"); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("verify-checkout", {
        body: { sessionId, environment: getStripeEnvironment() },
      });
      if (error || !data) { setState("error"); setError(error?.message ?? "Verification failed"); return; }
      if ((data as any).error) { setState("error"); setError((data as any).error); return; }
      setOrder({ id: data.orderId, total: data.total });
      if (data.paid) { setState("paid"); clear(); } else { setState("pending"); }
    })();
  }, [sessionId]);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-xl mx-auto mt-12">
        <div className="rounded-[10px] border bg-card p-10 text-center shadow-card">
          {state === "loading" && (
            <>
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
              <h1 className="text-xl font-semibold mt-4">Confirming your payment…</h1>
            </>
          )}
          {state === "paid" && order && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
              <h1 className="text-2xl font-semibold mt-4">Order confirmed</h1>
              <p className="text-muted-foreground text-sm mt-2">
                Reference <span className="font-mono">#{order.id.slice(0, 8).toUpperCase()}</span> · £{order.total.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                Thanks for your order. We've passed your key codes and shipping details to the manufacturer.
                You'll receive dispatch updates by email.
              </p>
              <div className="flex gap-2 justify-center mt-6">
                <Button variant="outline" asChild><Link to="/orders"><Package className="h-4 w-4" /> View orders</Link></Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={() => navigate("/dashboard")}>Back to dashboard</Button>
              </div>
            </>
          )}
          {state === "pending" && (
            <>
              <Loader2 className="h-10 w-10 mx-auto text-warning" />
              <h1 className="text-xl font-semibold mt-4">Payment pending</h1>
              <p className="text-sm text-muted-foreground mt-2">We'll update your order as soon as the payment clears.</p>
              <Button asChild variant="outline" className="mt-6"><Link to="/orders">View orders</Link></Button>
            </>
          )}
          {state === "error" && (
            <>
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h1 className="text-xl font-semibold mt-4">Something went wrong</h1>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
              <Button asChild variant="outline" className="mt-6"><Link to="/cart">Return to cart</Link></Button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
