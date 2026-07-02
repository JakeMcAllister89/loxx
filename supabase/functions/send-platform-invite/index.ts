// v4
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SR);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: prof } = await admin.from("profiles").select("is_admin,first_name,name").eq("id", user.id).maybeSingle();
    if (!(prof as any)?.is_admin) return json({ error: "Forbidden" }, 403);

    const { invite_id } = await req.json();
    if (!invite_id) return json({ error: "Missing invite_id" }, 400);

    const { data: invite } = await admin.from("platform_invites").select("*").eq("id", invite_id).maybeSingle();
    if (!invite) return json({ error: "Invite not found" }, 404);

    const inviterFirst = (prof as any)?.first_name || ((prof as any)?.name?.split(" ")[0]) || "The My LOXX team";

    const orgName = (invite as any).company ?? "your organisation";

    const origin = "https://myloxx.co.uk";
    const link = `${origin}/accept-platform-invite?token=${(invite as any).token}`;

    const subject = `You're invited to set up ${orgName} on My LOXX`;
    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
          <tr>
            <td style="background:#d4820a;border-radius:6px;width:32px;height:32px;text-align:center;vertical-align:middle;padding:4px">
              <span style="font-size:16px;line-height:24px;color:#ffffff">🔑</span>
            </td>
            <td style="padding-left:10px;font-size:20px;font-weight:700;color:#17171a;font-family:Inter,system-ui,sans-serif;vertical-align:middle">My LOXX</td>
          </tr>
        </table>
        <h2 style="margin:0 0 12px">Welcome to My LOXX</h2>
        <p>${inviterFirst} has invited you to create an account for your organisation.</p>
        <p>My LOXX gives you one secure place to manage your master key system, including buildings, keys, cylinders, orders and system records.</p>
        <p>No subscription. No software fee. No card required. You only pay when you order hardware.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#d4820a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Create your account</a></p>
        <p style="font-size:12px;color:#666">If the button doesn't work, copy and paste this link into your browser:<br>${link}</p>
      </div>`;

    if (!RESEND_KEY) {
      console.log(`[send-platform-invite] No RESEND_API_KEY — invite link: ${link}`);
      return json({ ok: true, sent: false, link });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: "My LOXX <noreply@myloxx.co.uk>",
        to: [(invite as any).email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend error:", txt);
      return json({ ok: false, error: txt, link }, 502);
    }
    return json({ ok: true, sent: true, link });
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
