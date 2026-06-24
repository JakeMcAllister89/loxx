// Master admins remove an org member. Sets status=removed, removed_by, removed_at.
// Also signs the target out of all sessions via Auth admin API.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SR);

    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);

    const { member_id } = await req.json();
    if (!member_id) return json({ error: "Missing member_id" }, 400);

    // Verify caller is master_admin in same org as target
    const { data: target } = await admin.from("org_members").select("*").eq("id", member_id).maybeSingle();
    if (!target) return json({ error: "Member not found" }, 404);

    const { data: caller } = await admin
      .from("org_members")
      .select("org_role,status,org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!caller || caller.org_role !== "master_admin" || caller.org_id !== target.org_id) {
      return json({ error: "Forbidden" }, 403);
    }

    // Prevent removing the last master admin
    if (target.org_role === "master_admin") {
      const { count } = await admin
        .from("org_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", target.org_id)
        .eq("status", "active")
        .eq("org_role", "master_admin");
      if ((count ?? 0) <= 1) return json({ error: "Cannot remove the last Master Admin" }, 400);
    }

    await admin.from("org_members").update({
      status: "removed",
      removed_by: user.id,
      removed_at: new Date().toISOString(),
    }).eq("id", member_id);

    // Invalidate sessions for the removed user
    if (target.user_id) {
      try { await admin.auth.admin.signOut(target.user_id); } catch { /* best effort */ }
    }

    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e.message ?? "Server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
