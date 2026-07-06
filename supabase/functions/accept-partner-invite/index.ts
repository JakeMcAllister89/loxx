// v1
// Public — accepts a partner invite by token. Lookup + accept actions.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(admin, `accept-partner-invite:${ip}`, 10, 60, corsHeaders);
    if (!rl.allowed) return rl.response;

    const { action, token, password } = await req.json();
    if (!token) return json({ error: "Missing token" }, 400);

    const { data: invite } = await admin
      .from("partner_invites")
      .select("*, partners(id, name, company, is_active)")
      .eq("token", token)
      .maybeSingle();

    if (!invite) return json({ error: "Invitation not found" }, 404);
    if (invite.accepted_at) return json({ error: "Invitation already used" }, 410);
    if (new Date(invite.expires_at).getTime() < Date.now()) return json({ error: "Invitation expired" }, 410);
    const partner = (invite as any).partners;
    if (!partner || partner.is_active === false) return json({ error: "Partner account is inactive" }, 403);

    if (action === "lookup") {
      return json({
        invite: {
          email: invite.email,
          partner_name: partner.name,
          partner_company: partner.company,
        },
      });
    }

    if (action === "accept") {
      if (!password || password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
      const hash = await bcrypt.hash(password, 10);
      const email = String(invite.email).toLowerCase().trim();

      const { data: existing } = await admin
        .from("partner_logins")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        await admin
          .from("partner_logins")
          .update({ password_hash: hash, partner_id: invite.partner_id })
          .eq("id", existing.id);
      } else {
        const { error: insErr } = await admin
          .from("partner_logins")
          .insert({ partner_id: invite.partner_id, email, password_hash: hash });
        if (insErr) {
          console.error("[accept-partner-invite] partner_logins insert failed:", insErr);
          return json({ error: "Could not create login" }, 500);
        }
      }

      await admin
        .from("partner_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      return json({ ok: true, email });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("accept-partner-invite error", e);
    return json({ error: "Server error" }, 500);
  }
});
