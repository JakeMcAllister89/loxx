import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_BADGE, STATUS_LABEL } from "@/lib/quote";
import { FileText } from "lucide-react";

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
  items: { product_code?: string; quantity: number; unit_price: number }[] | null;
}

const gbp = (n: number | null) => `£${(n ?? 0).toFixed(2)}`;

export default function AdminQuotes() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [systems, setSystems] = useState<Record<string, { name: string; reference: string | null }>>({});
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [costMap, setCostMap] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data: prods } = await supabase.from("products").select("code,cost_price").eq("is_active", true);
      const cMap: Record<string, number> = {};
      (prods ?? []).forEach((p: any) => { if (p.code) cMap[p.code] = Number(p.cost_price ?? 0); });
      setCostMap(cMap);
      const { data } = await (supabase.from("quotes" as any) as any)
        .select("id,quote_number,status,valid_until,total,created_at,customer_name,company,system_id,items")
        .order("created_at", { ascending: false });
      const list = (data ?? []) as QuoteRow[];
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
  }, []);

  const isStuck = (r: QuoteRow) => {
    if (r.status !== "sent" && r.status !== "draft") return false;
    const days = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 14;
  };

  const filtered = useMemo(() => {
    let out = filter === "all" ? rows : filter === "stuck" ? rows.filter(isStuck) : rows.filter((r) => r.status === filter);
    const s = search.trim().toLowerCase();
    if (s) {
      out = out.filter((r) =>
        (r.quote_number ?? "").toLowerCase().includes(s) ||
        (r.customer_name ?? "").toLowerCase().includes(s) ||
        (r.company ?? "").toLowerCase().includes(s) ||
        (systems[r.system_id ?? ""]?.reference ?? "").toLowerCase().includes(s) ||
        (systems[r.system_id ?? ""]?.name ?? "").toLowerCase().includes(s)
      );
    }
    return out;
  }, [rows, filter, search, systems]);

  const quoteCost = (r: QuoteRow) =>
    (r.items ?? []).reduce((s, it) => s + Number(it.quantity ?? 0) * (costMap[it.product_code ?? ""] ?? 0), 0);

  const quoteProfit = (r: QuoteRow) => Number(r.total ?? 0) - quoteCost(r);

  const outstanding = useMemo(
    () => rows.filter((r) => r.status === "sent" || r.status === "draft"),
    [rows]
  );
  const outstandingValue = useMemo(
    () => outstanding.reduce((s, r) => s + Number(r.total ?? 0), 0),
    [outstanding]
  );
  const outstandingProfit = useMemo(
    () => outstanding.reduce((s, r) => s + quoteProfit(r), 0),
    [outstanding, costMap]
  );
  const converted = useMemo(() => rows.filter((r) => r.status === "converted"), [rows]);
  const convertedValue = useMemo(
    () => converted.reduce((s, r) => s + Number(r.total ?? 0), 0),
    [converted]
  );
  const stuck = useMemo(() => rows.filter(isStuck), [rows]);

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Quotes</h1>
            <p className="text-muted-foreground text-sm mt-1">All quotations across every customer.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl">
          <div className="rounded-[10px] border bg-card p-4 shadow-card">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding quotes</div>
            <div className="text-2xl font-semibold mt-1">{outstanding.length}</div>
          </div>
          <div className="rounded-[10px] border bg-card p-4 shadow-card">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding revenue</div>
            <div className="text-2xl font-semibold mt-1">{gbp(outstandingValue)}</div>
          </div>
          <div className="rounded-[10px] border bg-card p-4 shadow-card">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding profit</div>
            <div className="text-2xl font-semibold mt-1 text-emerald-700">{gbp(outstandingProfit)}</div>
          </div>
          <div className="rounded-[10px] border bg-card p-4 shadow-card">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Converted to order</div>
            <div className="text-2xl font-semibold mt-1">{gbp(convertedValue)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{converted.length} quote{converted.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="rounded-[10px] border bg-card p-4 shadow-card">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Stuck (14+ days)</div>
            <div className={`text-2xl font-semibold mt-1 ${stuck.length > 0 ? "text-destructive" : ""}`}>{stuck.length}</div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {[
              "all", "draft", "sent", "accepted", "converted",
              ...(rows.some(r => r.status === "expired") ? ["expired"] : []),
              ...(rows.some(r => r.status === "declined") ? ["declined"] : []),
            ].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 text-xs rounded-full border ${filter === s ? "bg-foreground text-background border-foreground" : "bg-card hover:border-foreground/40"}`}
              >
                {s === "all" ? "All" : STATUS_LABEL[s] ?? s}
              </button>
            ))}
            {stuck.length > 0 && (
              <button onClick={() => setFilter("stuck")}
                className={`px-3 py-1 text-xs rounded-full border ${filter === "stuck" ? "bg-destructive text-destructive-foreground border-destructive" : "bg-destructive/10 text-destructive border-destructive/30 hover:border-destructive/60"}`}>
                Stuck ({stuck.length})
              </button>
            )}
          </div>
          <Input
            placeholder="Search quote #, customer, system…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="mt-4 rounded-[10px] border bg-card shadow-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-muted-foreground text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 font-medium">No quotes found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Quote #</th>
                  <th className="text-left px-4 py-2 font-medium">Customer</th>
                  <th className="text-left px-4 py-2 font-medium">Company</th>
                  <th className="text-left px-4 py-2 font-medium">System</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => {
                  const sys = r.system_id ? systems[r.system_id] : undefined;
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium text-amber-700">{r.quote_number ?? "—"}</td>
                      <td className="px-4 py-3">{r.customer_name ?? "—"}</td>
                      <td className="px-4 py-3">{r.company ?? "—"}</td>
                      <td className="px-4 py-3">
                        {sys ? (
                          <div>
                            <div className="text-sm">{sys.name}</div>
                            {sys.reference && <div className="text-[11px] text-muted-foreground">{sys.reference}</div>}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-GB")}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[r.status] ?? ""}`}>
                            {STATUS_LABEL[r.status] ?? r.status}
                          </Badge>
                          {isStuck(r) && (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-destructive">Stuck</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{gbp(r.total)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/quotes/${r.id}`} className="text-xs text-primary hover:underline">View</Link>
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
