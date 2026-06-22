import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/lib/auth";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Copy, ExternalLink, Upload, Shield, ArrowRight, Loader2 } from "lucide-react";
import { logAction } from "@/lib/audit";
import { createSystem } from "@/lib/createSystem";

interface Sys { id: string; name: string; reference: string | null; door_count: number; updated_at: string; }
interface Ord { id: string; status: string; total: number; created_at: string; }

const statusColor: Record<string, string> = {
  paid: "bg-accent-light text-primary",
  processing: "bg-blue-100 text-info",
  shipped: "bg-green-100 text-success",
  delivered: "bg-green-200 text-success",
};

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [systems, setSystems] = useState<Sys[]>([]);
  const [orders, setOrders] = useState<Ord[]>([]);
  const [totalSpend, setTotalSpend] = useState(0);
  const [totalCyl, setTotalCyl] = useState(0);
  const [catStats, setCatStats] = useState<{ avg: number; high: { name: string; m: number } | null; low: { name: string; m: number } | null; lowCount: number } | null>(null);

  useEffect(() => {
    if (!isAdmin) { setCatStats(null); return; }
    supabase.from("products").select("name,cost_price,price_gbp").eq("is_active", true).then(({ data }) => {
      const items = (data ?? []).map((p: any) => ({ name: p.name, m: p.cost_price && p.price_gbp ? ((p.price_gbp - p.cost_price) / p.price_gbp) * 100 : null })).filter(x => x.m != null) as { name: string; m: number }[];
      if (!items.length) { setCatStats({ avg: 0, high: null, low: null, lowCount: 0 }); return; }
      const avg = items.reduce((s, x) => s + x.m, 0) / items.length;
      const high = items.reduce((a, b) => (b.m > a.m ? b : a));
      const low = items.reduce((a, b) => (b.m < a.m ? b : a));
      const lowCount = items.filter(x => x.m < 30).length;
      setCatStats({ avg, high, low, lowCount });
    });
  }, [isAdmin]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [s, o] = await Promise.all([
        supabase.from("key_systems").select("id,name,reference,door_count,updated_at").order("updated_at", { ascending: false }),
        supabase.from("orders").select("id,status,total,created_at").order("created_at", { ascending: false }).limit(3),
      ]);
      setSystems(s.data ?? []);
      setOrders(o.data ?? []);
      setTotalSpend((o.data ?? []).reduce((sum, x) => sum + Number(x.total), 0));
      setTotalCyl((s.data ?? []).reduce((sum, x) => sum + (x.door_count ?? 0), 0));
    })();
  }, [user]);


  const [creating, setCreating] = useState(false);
  const newSystem = async () => {
    if (!user || creating) return;
    setCreating(true);
    const id = await createSystem(user.id);
    setCreating(false);
    if (id) navigate(`/builder/${id}`);
  };


  const dup = async (s: Sys) => {
    if (!user) return;
    const { data: src } = await supabase.from("key_systems").select("*").eq("id", s.id).single();
    if (!src) return;
    const ref = `SYS-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data } = await supabase.from("key_systems").insert({
      user_id: user.id, name: `Copy of ${src.name}`, reference: ref, tree_data: src.tree_data, door_count: src.door_count,
    }).select("id,name").single();
    if (data) {
      logAction({ system_id: data.id, action: "system_created", node_label: data.name, metadata: { source: "duplicate", from: s.id } });
      navigate(`/builder/${data.id}`);
    }
  };

  const stats = [
    { label: "Total doors", value: totalCyl },
    { label: "Active systems", value: systems.length },
    { label: "Orders placed", value: orders.length },
    { label: "Total spend", value: `£${totalSpend.toFixed(2)}` },
  ];


  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Your master key systems and recent activity.</p>
          </div>
          <Button onClick={newSystem} className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4" /> New system</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[10px] border bg-card p-5 shadow-card">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</div>
              <div className="text-2xl font-semibold mt-2 font-mono">{s.value}</div>
            </div>
          ))}
        </div>


        {/* Start options */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <button onClick={newSystem} className="text-left rounded-[10px] border bg-card p-5 shadow-card hover:border-primary transition-colors">
            <div className="inline-flex h-9 w-9 rounded-full bg-accent-light items-center justify-center mb-3">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div className="font-semibold">Start from scratch</div>
            <p className="text-xs text-muted-foreground mt-1">Build a new master key system step by step.</p>
          </button>
          <Link to="/import" className="rounded-[10px] border bg-card p-5 shadow-card hover:border-primary transition-colors block">
            <div className="inline-flex h-9 w-9 rounded-full bg-accent-light items-center justify-center mb-3">
              <Upload className="h-4 w-4 text-primary" />
            </div>
            <div className="font-semibold">Import existing system</div>
            <p className="text-xs text-muted-foreground mt-1">Upload a lockchart PDF or CSV and we'll build the hierarchy.</p>
          </Link>
        </div>

        {/* Recent systems */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Your systems</h2>
          {systems.length === 0 ? (
            <div className="rounded-[10px] border-dashed border-2 bg-card p-10 text-center">
              <p className="text-muted-foreground text-sm">You haven't built a system yet.</p>
              <Button onClick={newSystem} className="mt-4 bg-primary hover:bg-primary/90">Start your first system</Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {systems.map((s) => (
                <div key={s.id} className="rounded-[10px] border bg-card p-5 shadow-card flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">{s.reference} · {s.door_count} doors</div>
                    <div className="text-xs text-muted-foreground mt-1">Updated {new Date(s.updated_at).toLocaleDateString("en-GB")}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => dup(s)}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" asChild className="bg-primary hover:bg-primary/90"><Link to={`/builder/${s.id}`}>Open <ExternalLink className="h-3.5 w-3.5" /></Link></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent orders</h2>
          <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-2">Order ref</th><th className="px-4 py-2">Date</th><th className="px-4 py-2">Total</th><th className="px-4 py-2">Status</th></tr>
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
      </div>
    </DashboardLayout>
  );
}
