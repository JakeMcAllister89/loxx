// v2
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SR);
    const ip = getClientIp(req);
    const rl = await checkRateLimit(admin, `accept-platform-invite:${ip}`, 10, 60, corsHeaders);
    if (!rl.allowed) return rl.response;

    const body = await req.json();
    const { action, token } = body ?? {};
    if (!token) return json({ error: "Missing token" }, 400);

    const { data: invite } = await admin.from("platform_invites").select("*").eq("token", token).maybeSingle();
    if (!invite) return json({ error: "Invitation not found" }, 404);
    if ((invite as any).accepted_at) return json({ error: "Invitation already accepted" }, 410);
    if (new Date((invite as any).expires_at) < new Date()) return json({ error: "Invitation expired" }, 410);

    if (action === "lookup") {
      const { first_name, last_name, email, company } = invite as any;
      return json({ invite: { first_name, last_name, email, company } });
    }

    if (action === "accept") {
      const { first_name, last_name, company, password } = body ?? {};
      if (!password || password.length < 8) return json({ error: "Password too short" }, 400);
      if (typeof first_name === "string" && first_name.length > 100) return json({ error: "Field first_name is too long (max 100 characters)" }, 400);
      if (typeof last_name === "string" && last_name.length > 100) return json({ error: "Field last_name is too long (max 100 characters)" }, 400);
      if (typeof company === "string" && company.length > 100) return json({ error: "Field company is too long (max 100 characters)" }, 400);

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: (invite as any).email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: first_name ?? (invite as any).first_name,
          last_name: last_name ?? (invite as any).last_name,
          company: company ?? (invite as any).company,
          name: `${first_name ?? (invite as any).first_name} ${last_name ?? (invite as any).last_name}`.trim(),
        },
      });
      if (cErr || !created.user) {
        console.error("[accept-platform-invite] createUser failed:", cErr);
        const msg = cErr?.message ?? "";
        const safe = /already registered|already been registered|user already exists/i.test(msg)
          ? "An account with this email already exists"
          : /password/i.test(msg)
          ? "Password does not meet requirements"
          : "Could not create user";
        return json({ error: safe }, 400);
      }

      // Platform-invited customers were vetted by an admin before the
      // invite was sent — auto-approve their organisation rather than
      // dropping them into the manual approval queue meant for organic signups.
      const { data: newProfile } = await admin.from("profiles").select("org_id").eq("id", created.user.id).maybeSingle();

      if ((newProfile as any)?.org_id) {
        await admin.from("organisations").update({ is_approved: true }).eq("id", (newProfile as any).org_id);
      }

      await admin.from("platform_invites").update({ accepted_at: new Date().toISOString() }).eq("id", (invite as any).id);
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
