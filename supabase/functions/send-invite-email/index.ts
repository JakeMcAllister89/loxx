// v2
// Sends an invite email via Resend if RESEND_API_KEY is set.
// Falls back to logging the invite URL if no key configured.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

const roleLabel: Record<string, string> = {
  admin: "Admin",
  standard: "Standard User",
  view_only: "View Only",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SR);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { invite_id } = await req.json();
    if (!invite_id) return json({ error: "Missing invite_id" }, 400);

    const { data: invite } = await admin
      .from("org_invites")
      .select("*, organisations(name)")
      .eq("id", invite_id)
      .maybeSingle();
    if (!invite) return json({ error: "Invite not found" }, 404);

    // Inviter first name
    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("first_name,name")
      .eq("id", invite.invited_by)
      .maybeSingle();
    const inviterFirst = (inviterProfile as any)?.first_name || ((inviterProfile as any)?.name?.split(" ")[0]) || "A colleague";

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const link = `${origin}/accept-invite?token=${invite.token}`;
    const orgName = (invite as any).organisations?.name ?? "their organisation";
    const role = roleLabel[invite.org_role] ?? invite.org_role;

    const subject = `You've been invited to join ${orgName} on LOXX`;
    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
        <h2 style="margin:0 0 12px">You're invited to LOXX</h2>
        <p>${inviterFirst} has invited you to access their master key system on LOXX as <strong>${role}</strong>.</p>
        <p>Click below to accept your invitation and create your account. This link expires in 7 days.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#d4820a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Accept invitation</a></p>
        <p style="font-size:12px;color:#666">If the button doesn't work, paste this link into your browser:<br>${link}</p>
      </div>`;

    if (!RESEND_KEY) {
      console.log(`[send-invite-email] No RESEND_API_KEY — invite link: ${link}`);
      return json({ ok: true, sent: false, link });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: "My LOXX <noreply@myloxx.co.uk>",
        to: [invite.email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend error:", txt);
      return json({ ok: false, error: txt, link }, 502);
    }
    return json({ ok: true, sent: true });
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
