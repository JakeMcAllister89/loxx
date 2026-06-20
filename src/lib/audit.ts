import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  system_id?: string | null;
  action: string;
  node_type?: string;
  node_label?: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, unknown>;
}

/** Fire-and-forget audit log writer. Never throws. */
export function logAction(entry: AuditEntry): void {
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      const userName = (profile as any)?.name || user.email || "Unknown user";
      await (supabase.from("audit_log" as any) as any).insert({
        user_id: user.id,
        user_name: userName,
        system_id: entry.system_id ?? null,
        action: entry.action,
        node_type: entry.node_type ?? null,
        node_label: entry.node_label ?? null,
        old_value: entry.old_value ?? null,
        new_value: entry.new_value ?? null,
        metadata: entry.metadata ?? null,
      });
    } catch {
      /* swallow */
    }
  })();
}

export interface AuditRow {
  id: string;
  user_id: string;
  user_name: string | null;
  system_id: string | null;
  action: string;
  node_type: string | null;
  node_label: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 86400 * 2) return "yesterday";
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}

/** "14 Jun 2025 at 09:47:23" */
export function formatPreciseTimestamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return `${date} at ${time}`;
}

/** "14 Jun 2025 09:47:23" (table column) */
export function formatTableTimestamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return `${date} ${time}`;
}

export function describeAction(r: AuditRow): string {
  const meta = (r.metadata ?? {}) as any;
  switch (r.action) {
    case "system_created":     return `System created`;
    case "system_imported":    return `System imported from ${meta.source ?? "file"} — ${meta.node_count ?? 0} nodes${meta.cylinder_count != null ? `, ${meta.cylinder_count} cylinders` : ""}`;
    case "system_renamed":     return `System renamed from "${r.old_value ?? ""}" to "${r.new_value ?? ""}"`;
    case "system_saved":       return `System saved${meta.door_count != null ? ` — ${meta.door_count} doors` : ""}`;
    case "node_added": {
      if (r.node_type === "GMK") return `Grand master key node created`;
      if (r.node_type === "MK")  return `Master key added: ${r.node_label ?? ""}`;
      if (r.node_type === "SMK") return `Sub master added: ${r.node_label ?? ""}`;
      return `Added ${r.node_type} node: ${r.node_label ?? ""}`;
    }
    case "node_deleted":       return `Deleted ${r.node_type} node: ${r.node_label ?? ""}`;
    case "node_renamed":       return `Renamed "${r.old_value ?? ""}" → "${r.new_value ?? ""}"`;
    case "cylinder_configured": {
      const parts = [meta.profile, meta.finish, meta.size].filter(Boolean).join(" · ");
      return `Configured ${meta.differ_ref ?? r.node_label ?? ""} — ${meta.room_name ?? r.node_label ?? ""}${parts ? ` · ${parts}` : ""}${meta.product ? ` (${meta.product})` : ""}`;
    }
    case "cylinder_assigned":         return `Assigned ${r.new_value} to ${r.node_label}`;
    case "cylinder_finish_changed":   return `Changed finish on ${r.node_label}: ${r.old_value ?? "—"} → ${r.new_value ?? "—"}`;
    case "keys_count_changed":        return `Key copies updated for ${r.node_label}: ${r.old_value} → ${r.new_value}`;
    case "validation_run":            return `Validation run — ${meta.errors ?? 0} error(s), ${meta.warnings ?? 0} warning(s)`;
    case "exported_to_cart":          return `Exported to basket — ${meta.line_count ?? 0} lines${meta.cylinder_count != null ? `, ${meta.cylinder_count} cylinders` : ""}`;
    case "order_placed":              return `Order placed — £${Number(meta.total ?? 0).toFixed(2)}`;
    default:                          return r.action;
  }
}

export function actionIcon(action: string): string {
  if (action.startsWith("node_") || action === "cylinder_assigned" || action === "cylinder_finish_changed" || action === "keys_count_changed" || action === "cylinder_configured") return "🔑";
  if (action === "system_saved" || action === "system_created" || action === "system_renamed" || action === "system_imported") return "💾";
  if (action === "validation_run") return "✅";
  if (action === "exported_to_cart" || action === "order_placed") return "🛒";
  return "•";
}

export function actionColor(action: string): string {
  if (action.startsWith("cylinder_") || action === "keys_count_changed") return "hsl(var(--node-cyl))";
  if (action.startsWith("node_")) return "hsl(var(--node-ck))";
  if (action === "system_saved" || action === "exported_to_cart" || action === "order_placed") return "hsl(var(--success))";
  if (action === "validation_run") return "hsl(var(--muted-foreground))";
  return "hsl(var(--node-gmk))";
}
