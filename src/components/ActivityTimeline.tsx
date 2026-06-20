import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuditRow, describeAction, actionIcon, actionColor, timeAgo } from "@/lib/audit";

export function ActivityTimeline({ systemId, limit = 20, refreshMs = 30000 }: { systemId?: string; limit?: number; refreshMs?: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      let q = (supabase.from("audit_log" as any) as any).select("*").order("created_at", { ascending: false }).limit(limit);
      if (systemId) q = q.eq("system_id", systemId);
      const { data } = await q;
      const filtered = ((data as AuditRow[]) ?? []).filter((r) => r.action !== "system_autosaved");
      if (active) { setRows(filtered); setLoading(false); }
    };
    load();
    const iv = setInterval(load, refreshMs);
    return () => { active = false; clearInterval(iv); };
  }, [systemId, limit, refreshMs]);

  if (loading) return <div className="text-xs text-muted-foreground">Loading activity…</div>;
  if (rows.length === 0) return <div className="text-xs text-muted-foreground">No activity yet</div>;

  return (
    <ol className="relative border-l border-border ml-2 space-y-3 mt-2">
      {rows.map((r) => (
        <li key={r.id} className="ml-4">
          <span
            className="absolute -left-[5px] h-2.5 w-2.5 rounded-full ring-2 ring-card"
            style={{ background: actionColor(r.action) }}
          />
          <div className="flex items-start gap-2 text-sm">
            <span aria-hidden>{actionIcon(r.action)}</span>
            <div className="min-w-0">
              <div className="leading-tight">{describeAction(r)}</div>
              <div className="text-[11px] text-muted-foreground" title={new Date(r.created_at).toLocaleString("en-GB")}>
                {timeAgo(r.created_at)}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
