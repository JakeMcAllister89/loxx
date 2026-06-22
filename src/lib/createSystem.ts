import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/lib/audit";

export async function createSystem(userId: string): Promise<string | null> {
  const ref = `SYS-${Math.floor(1000 + Math.random() * 9000)}`;
  const { data, error } = await supabase
    .from("key_systems")
    .insert({ user_id: userId, name: "Untitled system", reference: ref, tree_data: { root: null } })
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
