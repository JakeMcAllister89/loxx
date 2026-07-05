// Sends an approval confirmation email to the master admin of a newly
// approved organisation. Only callable by platform admins.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SR);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Platform-admin only
    const { data: prof } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!(prof as any)?.is_admin) return json({ error: "Forbidden" }, 403);

    const { org_id } = await req.json();
    if (!org_id || typeof org_id !== "string") return json({ error: "Missing org_id" }, 400);

    const { data: org } = await admin
      .from("organisations")
      .select("id, name")
      .eq("id", org_id)
      .maybeSingle();
    if (!org) return json({ error: "Organisation not found" }, 404);

    const { data: member } = await admin
      .from("org_members")
      .select("email, first_name")
      .eq("org_id", org_id)
      .eq("org_role", "master_admin")
      .eq("status", "active")
      .maybeSingle();
    const recipient = (member as any)?.email;
    if (!recipient) return json({ error: "No master admin contact for org" }, 404);

    const firstName = esc((member as any)?.first_name || "there");
    const orgName = esc((org as any).name ?? "your organisation");
    const link = "https://myloxx.co.uk/auth";
    const subject = `Your My LOXX account has been approved`;
    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
          <tr>
            <td style="vertical-align:middle"><img src="https://wrblvasfekwaaayorccv.supabase.co/storage/v1/object/public/brand/email-logo.png" alt="My LOXX" width="40" height="40" style="display:block;border-radius:8px" /></td>
            <td style="padding-left:10px;font-size:20px;font-weight:700;color:#17171a;font-family:Inter,system-ui,sans-serif;vertical-align:middle">My LOXX</td>
          </tr>
        </table>
        <h2 style="margin:0 0 12px">You're approved 🎉</h2>
        <p>Hi ${firstName},</p>
        <p>Good news — your organisation <strong>${orgName}</strong> has been approved on My LOXX. You now have full access to design, manage and order master key systems.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#d4820a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Sign in to My LOXX</a></p>
        <p style="font-size:12px;color:#666">If the button doesn't work, copy and paste this link into your browser:<br>${link}</p>
      </div>`;

    if (!RESEND_KEY) {
      console.log(`[send-approval-email] No RESEND_API_KEY — would email ${recipient}`);
      return json({ ok: true, sent: false });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: "My LOXX <hello@myloxx.co.uk>",
        to: [recipient],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend error:", txt);
      return json({ ok: false, error: "Could not send approval email" }, 502);
    }
    return json({ ok: true, sent: true });
  } catch (e) {
    console.error("send-approval-email error", e);
    return json({ error: "Server error" }, 500);
  }
});
