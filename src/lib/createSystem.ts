import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/lib/audit";

export async function createSystem(userId: string): Promise<string | null> {
  // Fetch the user's org so RLS allows the insert
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, referred_by_partner_id")
    .eq("id", userId)
    .maybeSingle();
  const orgId = (profile as any)?.org_id ?? null;
  const referredPartnerId = (profile as any)?.referred_by_partner_id ?? null;
  if (!orgId) {
    console.error("createSystem failed: user has no org_id");
    return null;
  }
  const ref = `SYS-${Math.floor(1000 + Math.random() * 9000)}`;
  const payload: any = { user_id: userId, org_id: orgId, name: "Untitled system", reference: ref, tree_data: { root: null } };
  if (referredPartnerId) payload.partner_id = referredPartnerId;
  const { data, error } = await supabase
    .from("key_systems")
    .insert(payload)
    .select("id,name")
    .single();
  if (error || !data) {
    console.error("createSystem failed", error);
    return null;
  }
  try {
    logAction({ system_id: data.id, action: "system_created", node_label: data.name });
  } catch {}
  return data.id;
}
