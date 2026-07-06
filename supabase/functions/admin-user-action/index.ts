// v5
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

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
    const { data: prof } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!(prof as any)?.is_admin) return json({ error: "Forbidden" }, 403);

    const { action, user_id, email, org_id, from_user_id, to_user_id, reason, log_id } = await req.json();

    if (action === "disable") {
      if (!user_id) return json({ error: "Missing user_id" }, 400);
      if (user_id === user.id) return json({ error: "Cannot disable yourself" }, 400);
      const { error } = await (admin.auth.admin as any).updateUserById(user_id, { ban_duration: "876600h" });
      if (error) { console.error(error); return json({ error: "Something went wrong processing your request" }, 500); }
      await admin.from("org_members").update({ status: "removed" }).eq("user_id", user_id);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      if (!email) return json({ error: "Missing email" }, 400);
      const rl = await checkRateLimit(admin, `reset_password:${email.toLowerCase()}`, 3, 60, corsHeaders);
      if (!rl.allowed) return rl.response;
      const origin = "https://myloxx.co.uk";
      const { data: linkData, error } = await (admin.auth.admin as any).generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${origin}/auth` },
      });
      if (error) { console.error(error); return json({ error: "Something went wrong processing your request" }, 500); }
      const link = (linkData as any)?.properties?.action_link ?? (linkData as any)?.action_link;
      if (!link) return json({ error: "Could not generate link" }, 500);

      if (!RESEND_KEY) {
        // Dev-only fallback: RESEND_API_KEY is not configured, so the email
        // cannot be delivered. Log the recovery link server-side so a developer
        // running locally can still complete the flow. Never returned to the
        // caller in production.
        console.warn(`[admin-user-action] DEV-ONLY FALLBACK — RESEND_API_KEY not set. Recovery link for ${email}: ${link}`);
        return json({ ok: true, sent: false });
      }
      const subject = "Reset your My LOXX password";
      const html = `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
            <tr>
              <td style="vertical-align:middle"><img src="https://wrblvasfekwaaayorccv.supabase.co/storage/v1/object/public/brand/email-logo.png" alt="My LOXX" width="32" height="32" style="display:block;border-radius:6px" /></td>
              <td style="padding-left:10px;font-size:20px;font-weight:700;color:#17171a;font-family:Inter,system-ui,sans-serif;vertical-align:middle">My LOXX</td>
            </tr>
          </table>
          <h2 style="margin:0 0 12px">Reset your password</h2>
          <p>A My LOXX administrator has requested a password reset for your account. Click below to choose a new password.</p>
          <p style="margin:24px 0"><a href="${link}" style="background:#d4820a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Reset password</a></p>
          <p style="font-size:14px;color:#444">This link will expire shortly.</p>
          <p style="font-size:12px;color:#666">If you weren't expecting this email, you can safely ignore it. Your password will not be changed unless you use the link above.</p>
        </div>`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({ from: "My LOXX <noreply@myloxx.co.uk>", to: [email], subject, html }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("[admin-user-action] Resend error:", res.status, txt);
        return json({ ok: false, error: "Could not send password reset email" }, 502);
      }
      return json({ ok: true, sent: true });
    }

    if (action === "suspend_user") {
      if (!user_id) return json({ error: "Missing user_id" }, 400);
      if (user_id === user.id) return json({ error: "Cannot suspend yourself" }, 400);
      await admin.from("org_members").update({ status: "suspended" }).eq("user_id", user_id).eq("status", "active");
      const { error } = await (admin.auth.admin as any).updateUserById(user_id, { ban_duration: "876600h" });
      if (error) { console.error(error); return json({ error: "Something went wrong processing your request" }, 500); }
      return json({ ok: true });
    }
if (action === "enable") {
  if (!user_id) return json({ error: "Missing user_id" }, 400);
  const { error } = await (admin.auth.admin as any).updateUserById(user_id, { ban_duration: "none" });
  if (error) { console.error(error); return json({ error: "Something went wrong processing your request" }, 500); }
  await admin.from("org_members").update({ status: "active" }).eq("user_id", user_id).eq("status", "suspended");
  return json({ ok: true });
}
    if (action === "transfer_master_admin") {
      if (!org_id || !from_user_id || !to_user_id) {
        return json({ error: "Missing org_id, from_user_id or to_user_id" }, 400);
      }
      const { error } = await admin.rpc("transfer_org_master_admin", {
        _org_id: org_id,
        _from_user_id: from_user_id,
        _to_user_id: to_user_id,
        _initiated_by: user.id,
        _reason: reason ?? null,
      });
      if (error) { console.error(error); return json({ error: "Something went wrong processing your request" }, 500); }
      return json({ ok: true });
    }

    if (action === "impersonate") {
      if (!user_id) return json({ error: "Missing user_id" }, 400);
      if (user_id === user.id) return json({ error: "Cannot impersonate yourself" }, 400);
      const { data: targetProf } = await admin.from("profiles").select("is_admin,email").eq("id", user_id).maybeSingle();
      if ((targetProf as any)?.is_admin) return json({ error: "Cannot impersonate another platform admin" }, 400);
      const targetEmail = (targetProf as any)?.email;
      if (!targetEmail) return json({ error: "Target user has no email on file" }, 400);

      const { data: linkData, error } = await (admin.auth.admin as any).generateLink({
        type: "magiclink",
        email: targetEmail,
      });
      if (error) { console.error(error); return json({ error: "Something went wrong processing your request" }, 500); }
      const hashedToken = (linkData as any)?.properties?.hashed_token;
      if (!hashedToken) return json({ error: "Could not generate impersonation token" }, 500);

      const { data: logRow, error: logError } = await admin
        .from("impersonation_log")
        .insert({ admin_id: user.id, target_user_id: user_id, target_email: targetEmail })
        .select("id")
        .single();
      if (logError) { console.error("[admin-user-action] impersonation log insert failed:", logError); return json({ error: "Something went wrong processing your request" }, 500); }

      return json({ ok: true, token_hash: hashedToken, email: targetEmail, log_id: (logRow as any).id });
    }

    if (action === "end_impersonation") {
      if (log_id) {
        await admin.from("impersonation_log").update({ ended_at: new Date().toISOString() }).eq("id", log_id).eq("admin_id", user.id);
      }
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
