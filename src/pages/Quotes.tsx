import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Trash2 } from "lucide-react";
import { STATUS_BADGE, STATUS_LABEL } from "@/lib/quote";

interface QuoteRow {
  id: string;
  quote_number: string | null;
  status: string;
  valid_until: string | null;
  total: number | null;
  created_at: string;
  customer_name: string | null;
  company: string | null;
  system_id: string | null;
}

export default function Quotes() {
  const { user } = useAuth();
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [systems, setSystems] = useState<Record<string, { name: string; reference: string | null }>>({});
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase.from("quotes" as any) as any)
        .select("id,quote_number,status,valid_until,total,created_at,customer_name,company,system_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as QuoteRow[];
      // expire stale
      const today = new Date().toISOString().slice(0, 10);
      list.forEach((r) => {
        if (r.status === "sent" && r.valid_until && r.valid_until < today) r.status = "expired";
      });
      setRows(list);
      const sysIds = Array.from(new Set(list.map((r) => r.system_id).filter(Boolean) as string[]));
      if (sysIds.length) {
        const { data: ss } = await supabase.from("key_systems").select("id,name,reference").in("id", sysIds);
        const map: Record<string, { name: string; reference: string | null }> = {};
        (ss ?? []).forEach((s: any) => (map[s.id] = { name: s.name, reference: s.reference }));
        setSystems(map);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this draft quote? This cannot be undone.")) return;
    setDeleting(id);
    await (supabase.from("quotes" as any) as any).delete().eq("id", id);
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeleting(null);
  };

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My Quotes</h1>
            <p className="text-muted-foreground text-sm mt-1">Quotations you can share with procurement before placing an order.</p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link to="/quotes/new"><Plus className="h-4 w-4" /> New quote</Link>
          </Button>
        </div>

        <div className="mt-5 flex gap-2 flex-wrap">
          {[
            "all", "draft", "sent", "accepted", "converted",
            ...(rows.some(r => r.status === "expired") ? ["expired"] : []),
            ...(rows.some(r => r.status === "declined") ? ["declined"] : []),
          ].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 text-xs rounded-full border ${filter === s ? "bg-foreground text-background border-foreground" : "bg-card hover:border-foreground/40"}`}>
              {s === "all" ? "All" : STATUS_LABEL[s] ?? s}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-[10px] border bg-card shadow-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-muted-foreground text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">No quotes yet</p>
              <p className="text-sm text-muted-foreground mt-1">Open a system in the Builder and click <em>Get quote</em> to create one.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Quote #</th>
                  <th className="text-left px-4 py-2 font-medium">System</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Valid until</th>
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => {
                  const sys = r.system_id ? systems[r.system_id] : null;
                  const expired = r.status === "expired";
                  return (
                    <tr key={r.id} className={expired ? "opacity-60" : ""}>
                      <td className="px-4 py-3 font-medium text-amber-700">{r.quote_number ?? "—"}</td>
                      <td className="px-4 py-3">
                        {sys ? (
                          <div>
                            <div className="text-sm">{sys.name}</div>
                            {sys.reference && <div className="text-[11px] text-muted-foreground">{sys.reference}</div>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-GB")}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.valid_until ? new Date(r.valid_until).toLocaleDateString("en-GB") : "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">£{Number(r.total ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[r.status] ?? ""}`}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.status === "draft" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={deleting === r.id}
                              onClick={() => handleDelete(r.id)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/quotes/${r.id}`}>View</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
