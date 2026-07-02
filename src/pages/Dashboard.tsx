import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Plus, ExternalLink, Upload, ArrowRight, Loader2,
  Layers, DoorOpen, KeyRound, AlertTriangle, Clock, FileText, CheckCircle2,
} from "lucide-react";
import { createSystem } from "@/lib/createSystem";
import { ActivityTimeline } from "@/components/ActivityTimeline";

interface Sys { id: string; name: string; reference: string | null; door_count: number; updated_at: string; }
interface Ord { id: string; status: string; total: number; created_at: string; }

const statusColor: Record<string, string> = {
  paid: "bg-accent-light text-primary",
  processing: "bg-blue-100 text-info",
  shipped: "bg-green-100 text-success",
  delivered: "bg-green-200 text-success",
};

const gbp = (n: number) => Number(n).toLocaleString("en-GB", { style: "currency", currency: "GBP" });

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [systems, setSystems] = useState<Sys[]>([]);
  const [orders, setOrders] = useState<Ord[]>([]);
  const [issuedTotal, setIssuedTotal] = useState(0);
  const [lostTotal, setLostTotal] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [pendingQuotes, setPendingQuotes] = useState(0);
  const [systemCounts, setSystemCounts] = useState<Map<string, { issued: number; lost: number }>>(new Map());

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const [s, o, ki, kiSys, q] = await Promise.all([
        supabase.from("key_systems").select("id,name,reference,door_count,updated_at").order("updated_at", { ascending: false }),
        supabase.from("orders").select("id,status,total,created_at").order("created_at", { ascending: false }).limit(3),
        (supabase.from("key_issues" as any) as any).select("status,quantity,expected_return_date").in("status", ["issued", "lost"]),
        (supabase.from("key_issues" as any) as any).select("system_id,status,quantity").in("status", ["issued", "lost"]),
        (supabase.from("quotes" as any) as any).select("id", { count: "exact", head: true }).eq("status", "sent"),
      ]);
      setSystems(s.data ?? []);
      setOrders(o.data ?? []);

      const rows = (ki.data ?? []) as Array<{ status: string; quantity: number | null; expected_return_date: string | null }>;
      let issued = 0, lost = 0, overdue = 0;
      for (const r of rows) {
        const qty = r.quantity ?? 1;
        if (r.status === "issued") {
          issued += qty;
          if (r.expected_return_date && r.expected_return_date < today) overdue += 1;
        } else if (r.status === "lost") {
          lost += qty;
        }
      }
      setIssuedTotal(issued);
      setLostTotal(lost);
      setOverdueCount(overdue);

      const map = new Map<string, { issued: number; lost: number }>();
      for (const r of ((kiSys.data ?? []) as Array<{ system_id: string; status: string; quantity: number | null }>)) {
        if (!r.system_id) continue;
        const qty = r.quantity ?? 1;
        const cur = map.get(r.system_id) ?? { issued: 0, lost: 0 };
        if (r.status === "issued") cur.issued += qty;
        else if (r.status === "lost") cur.lost += qty;
        map.set(r.system_id, cur);
      }
      setSystemCounts(map);

      setPendingQuotes((q as any).count ?? 0);
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

  const totalDoors = systems.reduce((sum, x) => sum + (x.door_count ?? 0), 0);

  const attentionItems = [
    { key: "lost", label: "Lost / unresolved keys", count: lostTotal, Icon: AlertTriangle, tone: "text-destructive" as const },
    { key: "overdue", label: "Overdue returns", count: overdueCount, Icon: Clock, tone: "text-amber-600" as const },
    { key: "quotes", label: "Quotes sent awaiting response", count: pendingQuotes, Icon: FileText, tone: "text-primary" as const },
  ];
  const attentionEmpty = lostTotal === 0 && overdueCount === 0 && pendingQuotes === 0;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Monitor your systems, issued keys, orders and unresolved risks.</p>
          </div>
          <Button onClick={newSystem} disabled={creating} className="bg-primary hover:bg-primary/90">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New system</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-[10px] border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Active systems</div>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-semibold mt-2">{systems.length}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Currently managed in My LOXX</div>
          </div>
          <div className="rounded-[10px] border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Total doors</div>
              <DoorOpen className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-semibold mt-2">{totalDoors}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Across all active systems</div>
          </div>
          <div className="rounded-[10px] border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Issued keys</div>
              <KeyRound className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-semibold mt-2">{issuedTotal}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Currently issued</div>
          </div>
          <div className={`rounded-[10px] border bg-card p-4 shadow-card ${lostTotal > 0 ? "border-destructive/30 bg-destructive/[0.02]" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Lost / unresolved</div>
              {lostTotal > 0 ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-success" />
              )}
            </div>
            <div className="text-2xl font-semibold mt-2">{lostTotal}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{lostTotal > 0 ? "Requires attention" : "All clear"}</div>
          </div>
        </div>

        {/* Action cards */}
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <button onClick={newSystem} className="text-left rounded-[10px] border bg-card p-4 shadow-card hover:border-primary hover:shadow-elevated transition-all group">
            <div className="flex items-start justify-between">
              <div className="inline-flex h-9 w-9 rounded-full bg-accent-light items-center justify-center mb-3">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="font-semibold">Create a new system</div>
            <p className="text-xs text-muted-foreground mt-1">Build a master key system from scratch.</p>
          </button>
          <Link to="/import" className="rounded-[10px] border bg-card p-4 shadow-card hover:border-primary hover:shadow-elevated transition-all block group">
            <div className="flex items-start justify-between">
              <div className="inline-flex h-9 w-9 rounded-full bg-accent-light items-center justify-center mb-3">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="font-semibold">Import existing system</div>
            <p className="text-xs text-muted-foreground mt-1">Upload an existing schedule and convert it into a My LOXX system record.</p>
          </Link>
        </div>

        {/* Needs attention */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Needs attention</h2>
          <div className="rounded-[10px] border bg-card shadow-card p-2">
            {attentionEmpty ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                All clear — no unresolved lost keys or overdue returns.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {attentionItems.filter(i => i.count > 0).map((i) => (
                  <li key={i.key} className="flex items-center justify-between px-3 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <i.Icon className={`h-4 w-4 ${i.tone}`} />
                      <span>{i.label}</span>
                    </div>
                    <span className="font-semibold">{i.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* My systems */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">My systems</h2>
            <Link to="/systems" className="text-sm text-primary hover:underline">View all systems →</Link>
          </div>
          {systems.length === 0 ? (
            <div className="rounded-[10px] border-dashed border-2 bg-card p-10 text-center">
              <p className="text-muted-foreground text-sm">You haven't built a system yet.</p>
              <Button onClick={newSystem} disabled={creating} className="mt-4 bg-primary hover:bg-primary/90">Start your first system</Button>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-3">
                {systems.slice(0, 4).map((s) => {
                  const c = systemCounts.get(s.id) ?? { issued: 0, lost: 0 };
                  return (
                    <div key={s.id} className="rounded-[10px] border bg-card p-4 shadow-card flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-base truncate">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{s.reference} · {s.door_count} doors · Updated {new Date(s.updated_at).toLocaleDateString("en-GB")}</div>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <KeyRound className="h-3.5 w-3.5" /> {c.issued} issued
                          </span>
                          <span className={`inline-flex items-center gap-1 ${c.lost > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            <AlertTriangle className="h-3.5 w-3.5" /> {c.lost} lost
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button size="sm" asChild className="bg-primary hover:bg-primary/90"><Link to={`/builder/${s.id}`}>Open <ExternalLink className="h-3.5 w-3.5" /></Link></Button>
                        <Button size="sm" variant="outline" asChild><Link to={`/builder/${s.id}/keys`}><KeyRound className="h-3.5 w-3.5" /> Key Log</Link></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {systems.length > 4 && (
                <div className="mt-2">
                  <Link to="/systems" className="text-sm text-primary hover:underline">View all systems →</Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Recent key activity */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Recent key activity</h2>
            <Link to="/key-log" className="text-sm text-primary hover:underline">View Key Log →</Link>
          </div>
          <div className="rounded-[10px] border bg-card shadow-card p-4">
            <ActivityTimeline
              limit={4}
              actionTypes={["key_issued", "key_returned", "key_lost_reported", "key_resolved", "key_holder_created", "key_holder_archived"]}
              emptyText="No key activity yet."
            />
          </div>
        </div>

        {/* Recent orders */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Recent orders</h2>
            <Link to="/orders" className="text-sm text-primary hover:underline">View all orders →</Link>
          </div>
          <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">No orders yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-2">Order ref</th><th className="px-4 py-2">Date</th><th className="px-4 py-2">Total</th><th className="px-4 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-t">
                      <td className="px-4 py-3 text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3">{new Date(o.created_at).toLocaleDateString("en-GB")}</td>
                      <td className="px-4 py-3 font-medium">{gbp(Number(o.total))}</td>
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
