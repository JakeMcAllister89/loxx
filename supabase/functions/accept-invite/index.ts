// v2
// Accepts and looks up org invites. Public — no JWT required.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(admin, `accept-invite:${ip}`, 10, 60, corsHeaders);
    if (!rl.allowed) return rl.response;

    const { action, token, first_name, last_name, password } = await req.json();
    if (!token) return json({ error: "Missing token" }, 400);

    const { data: invite } = await admin
      .from("org_invites")
      .select("*, organisations(name)")
      .eq("token", token)
      .maybeSingle();

    if (!invite) return json({ error: "Invitation not found" }, 404);
    if (invite.accepted_at) return json({ error: "Invitation already used" }, 410);
    if (new Date(invite.expires_at).getTime() < Date.now()) return json({ error: "Invitation expired" }, 410);

    if (action === "lookup") {
      return json({
        invite: {
          first_name: invite.first_name,
          last_name: invite.last_name,
          email: invite.email,
          org_role: invite.org_role,
          org_name: (invite as any).organisations?.name ?? "your organisation",
        },
      });
    }

    if (action === "accept") {
      if (!password || password.length < 8) return json({ error: "Password too short" }, 400);
      if (typeof first_name === "string" && first_name.length > 100) return json({ error: "Field first_name is too long (max 100 characters)" }, 400);
      if (typeof last_name === "string" && last_name.length > 100) return json({ error: "Field last_name is too long (max 100 characters)" }, 400);
      // Create auth user (auto-confirmed)
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: first_name ?? invite.first_name,
          last_name: last_name ?? invite.last_name,
          name: `${first_name ?? invite.first_name} ${last_name ?? invite.last_name}`.trim(),
        },
      });
      if (cErr || !created.user) {
        console.error("[accept-invite] createUser failed:", cErr);
        // Preserve only known-safe, user-actionable messages; hide raw internals.
        const msg = cErr?.message ?? "";
        const safe = /already registered|already been registered|user already exists/i.test(msg)
          ? "An account with this email already exists"
          : /password/i.test(msg)
          ? "Password does not meet requirements"
          : "Could not create user";
        return json({ error: safe }, 400);
      }
      const uid = created.user.id;

      // Ensure profile points to the invited org (handle_new_user normally creates a fresh org; override)
      await admin.from("profiles").upsert({
        id: uid,
        email: invite.email,
        first_name: first_name ?? invite.first_name,
        last_name: last_name ?? invite.last_name,
        name: `${first_name ?? invite.first_name} ${last_name ?? invite.last_name}`.trim(),
        org_id: invite.org_id,
      } as any);

      // Delete the orphan org created by the trigger (the one that has no other members)
      const { data: orphanMember } = await admin
        .from("org_members")
        .select("org_id")
        .eq("user_id", uid)
        .neq("org_id", invite.org_id)
        .maybeSingle();

      if (orphanMember?.org_id) {
        await admin.from("organisations").delete().eq("id", orphanMember.org_id);
      }

      // Clean up any org auto-created by the trigger and create proper member row
      await admin.from("org_members").delete().eq("user_id", uid);
      await admin.from("org_members").insert({
        org_id: invite.org_id,
        user_id: uid,
        first_name: first_name ?? invite.first_name,
        last_name: last_name ?? invite.last_name,
        email: invite.email,
        org_role: invite.org_role,
        status: "active",
        invited_by: invite.invited_by,
      } as any);

      // System grants
      if (invite.system_ids && invite.system_ids.length > 0) {
        await admin.from("system_access").insert(
          invite.system_ids.map((sid: string) => ({ system_id: sid, user_id: uid, granted_by: invite.invited_by })),
        );
      }

      await admin.from("org_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: "Server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
