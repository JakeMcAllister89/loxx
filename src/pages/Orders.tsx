import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const statusColor: Record<string, string> = {
  paid: "bg-accent-light text-primary",
  processing: "bg-blue-100 text-info",
  shipped: "bg-green-100 text-success",
  delivered: "bg-green-200 text-success",
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").order("created_at", { ascending: false }).then(({ data }) => setOrders(data ?? []));
  }, [user]);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl">
        <h1 className="text-3xl font-semibold tracking-tight">My orders</h1>
        <p className="text-muted-foreground text-sm mt-1">Past purchases and dispatch status.</p>

        <div className="mt-6 rounded-[10px] border bg-card shadow-card overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-10 text-sm text-muted-foreground text-center">No orders yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Order ref</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-3">{new Date(o.created_at).toLocaleDateString("en-GB")}</td>
                    <td className="px-4 py-3 font-mono">£{Number(o.total).toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[o.status] ?? "bg-muted"}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
