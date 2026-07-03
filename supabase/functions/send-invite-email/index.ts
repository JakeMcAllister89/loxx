// v5
// Sends an invite email via Resend if RESEND_API_KEY is set.
// Falls back to logging the invite URL if no key configured.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

const esc = (s: string) =>
  s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

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

    // Authorization: the caller must be an admin/master_admin of the SAME
    // org this invite belongs to. Being merely authenticated is not enough —
    // otherwise any signed-in user could trigger an invite email for any
    // org by guessing/enumerating invite_id.
    const { data: membership } = await admin
      .from("org_members")
      .select("org_role")
      .eq("user_id", user.id)
      .eq("org_id", (invite as any).org_id)
      .eq("status", "active")
      .maybeSingle();
    const callerRole = (membership as any)?.org_role;
    if (callerRole !== "master_admin" && callerRole !== "admin") {
      return json({ error: "Forbidden" }, 403);
    }

    // Inviter first name
    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("first_name,name")
      .eq("id", invite.invited_by)
      .maybeSingle();
    const inviterFirst = esc((inviterProfile as any)?.first_name || ((inviterProfile as any)?.name?.split(" ")[0]) || "A colleague");

    const origin = "https://myloxx.co.uk";
    const link = `${origin}/accept-invite?token=${invite.token}`;
    const orgName = esc((invite as any).organisations?.name ?? "their organisation");
    const role = esc(roleLabel[invite.org_role] ?? invite.org_role);

    const subject = `You've been invited to join ${orgName} on My LOXX`;
    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
          <tr>
            <td style="vertical-align:middle">
  <img src="https://wrblvasfekwaaayorccv.supabase.co/storage/v1/object/public/brand/email-logo.png" alt="My LOXX" width="40" height="40" style="display:block;border-radius:8px" />
</td>
  
            </td>
            <td style="padding-left:10px;font-size:20px;font-weight:700;color:#17171a;font-family:Inter,system-ui,sans-serif;vertical-align:middle">My LOXX</td>
          </tr>
        </table>
        <h2 style="margin:0 0 12px">You've been invited to My LOXX</h2>
        <p>${inviterFirst} has invited you to access ${orgName}'s master key system on My LOXX. Your role: <strong>${role}</strong>.</p>
        <p>My LOXX gives your organisation one secure place to manage buildings, keys, cylinders, orders and system records.</p>
        <p>Accept your invitation to create your account and join ${orgName}.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#d4820a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Accept invitation</a></p>
        <p style="font-size:14px;color:#444">This invitation link expires in 7 days.</p>
        <p style="font-size:12px;color:#666">If the button doesn't work, copy and paste this link into your browser:<br>${link}</p>
      </div>`;

    if (!RESEND_KEY) {
      console.log(`[send-invite-email] No RESEND_API_KEY — invite link: ${link}`);
      return json({ ok: true, sent: false });
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
      return json({ ok: false, error: "Could not send invite email" }, 502);
    }
    return json({ ok: true, sent: true });
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
