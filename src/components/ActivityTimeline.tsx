import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuditRow, describeAction, actionIcon, actionColor, timeAgo, formatPreciseTimestamp, actorDisplayName } from "@/lib/audit";
import { toast } from "sonner";

export function ActivityTimeline({
  systemId,
  limit = 20,
  refreshMs = 30000,
  showClear = false,
  actionTypes,
  emptyText = "No activity yet",
}: {
  systemId?: string;
  limit?: number;
  refreshMs?: number;
  showClear?: boolean;
  actionTypes?: string[];
  emptyText?: string;
}) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const actionKey = actionTypes ? actionTypes.join(",") : "";

  const load = useCallback(async () => {
    let q = (supabase.from("audit_log" as any) as any)
      .select("*")
      .not("action", "eq", "system_autosaved")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (systemId) q = q.eq("system_id", systemId);
    if (actionTypes && actionTypes.length) q = q.in("action", actionTypes);
    const { data } = await q;
    const filtered = ((data as AuditRow[]) ?? []).filter(
      (r) => !(r.action === "node_added" && r.node_type === "CYL"),
    );
    setRows(filtered);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemId, limit, actionKey]);

  useEffect(() => {
    let active = true;
    (async () => { await load(); if (!active) return; })();
    const iv = setInterval(load, refreshMs);
    return () => { active = false; clearInterval(iv); };
  }, [load, refreshMs, nonce]);

  const clearAll = async () => {
    if (!systemId) return;
    if (!window.confirm("Clear all activity for this system? This cannot be undone.")) return;
    const { error } = await (supabase.from("audit_log" as any) as any).delete().eq("system_id", systemId);
    if (error) { toast.error("Failed to clear activity"); return; }
    toast.success("Activity cleared");
    setNonce((n) => n + 1);
  };

  if (loading) return <div className="text-xs text-muted-foreground">Loading activity…</div>;

  return (
    <div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">No activity yet</div>
      ) : (
        <ol className="relative border-l border-border ml-2 space-y-3 mt-2">
          {rows.map((r) => {
            const meta = (r.metadata ?? {}) as any;
            const specParts = [meta.profile, meta.finish, meta.size].filter(Boolean).join(" · ");
            return (
              <li key={r.id} className="ml-4">
                <span
                  className="absolute -left-[5px] h-2.5 w-2.5 rounded-full ring-2 ring-card"
                  style={{ background: actionColor(r.action) }}
                />
                <div className="flex items-start gap-2 text-sm">
                  <span aria-hidden>{actionIcon(r.action)}</span>
                  <div className="min-w-0">
                    <div className="leading-tight">{describeAction(r)}</div>
                    {r.action === "cylinder_configured" && specParts && (
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{specParts}</div>
                    )}
                    <div
                      className="text-[11px] text-muted-foreground mt-0.5"
                      title={timeAgo(r.created_at)}
                    >
                      {actorDisplayName(r)} · {formatPreciseTimestamp(r.created_at)}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {showClear && systemId && rows.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <button
            onClick={clearAll}
            className="text-[11px] text-muted-foreground hover:text-destructive underline-offset-2 hover:underline"
          >
            Clear activity
          </button>
        </div>
      )}
    </div>
  );
}
