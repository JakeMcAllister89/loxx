// v1
// Send a partner invite email so the partner can set their own portal password.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

const esc = (s: string) =>
  s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SR);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { partner_id, email } = await req.json();
    if (!partner_id) return json({ error: "Missing partner_id" }, 400);

    const { data: partner } = await admin
      .from("partners")
      .select("id, name, company, email")
      .eq("id", partner_id)
      .maybeSingle();
    if (!partner) return json({ error: "Partner not found" }, 404);

    const target = String(email || partner.email || "").toLowerCase().trim();
    if (!target) return json({ error: "No email address for this partner" }, 400);

    const token = randToken();
    const { error: iErr } = await admin.from("partner_invites").insert({
      partner_id,
      email: target,
      token,
      invited_by: user.id,
    });
    if (iErr) {
      console.error("insert partner_invite failed:", iErr);
      return json({ error: "Could not create invite" }, 500);
    }

    const origin = "https://myloxx.co.uk";
    const link = `${origin}/accept-partner-invite?token=${token}`;
    const partnerName = esc(partner.name || "there");
    const company = esc(partner.company || "");

    const subject = `Your My LOXX partner portal invitation`;
    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
          <tr>
            <td style="vertical-align:middle"><img src="https://wrblvasfekwaaayorccv.supabase.co/storage/v1/object/public/brand/email-logo.png" alt="My LOXX" width="40" height="40" style="display:block;border-radius:8px" /></td>
            <td style="padding-left:10px;font-size:20px;font-weight:700;color:#17171a;font-family:Inter,system-ui,sans-serif;vertical-align:middle">My LOXX</td>
          </tr>
        </table>
        <h2 style="margin:0 0 12px">You've been invited to the My LOXX partner portal</h2>
        <p>Hi ${partnerName},</p>
        <p>You've been set up as a partner${company ? ` for <strong>${company}</strong>` : ""} on My LOXX. Accept the invitation below to set your password and access your commission dashboard.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#d4820a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Accept invitation</a></p>
        <p style="font-size:14px;color:#444">This invitation link expires in 7 days.</p>
        <p style="font-size:12px;color:#666">If the button doesn't work, copy and paste this link into your browser:<br>${link}</p>
      </div>`;

    if (!RESEND_KEY) {
      console.log(`[send-partner-invite] No RESEND_API_KEY — invite link: ${link}`);
      return json({ ok: true, sent: false });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: "My LOXX <noreply@myloxx.co.uk>",
        to: [target],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend error:", txt);
      return json({ ok: false, error: "Could not send invite email" }, 502);
    }
    return json({ ok: true, sent: true });
  } catch (e) {
    console.error("send-partner-invite error", e);
    return json({ error: "Server error" }, 500);
  }
});
