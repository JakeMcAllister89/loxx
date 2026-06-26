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
    const { data: prof } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!(prof as any)?.is_admin) return json({ error: "Forbidden" }, 403);

    const { action, user_id, email } = await req.json();

    if (action === "disable") {
      if (!user_id) return json({ error: "Missing user_id" }, 400);
      if (user_id === user.id) return json({ error: "Cannot disable yourself" }, 400);
      const { error } = await (admin.auth.admin as any).updateUserById(user_id, { ban_duration: "876600h" });
      if (error) return json({ error: error.message }, 500);
      await admin.from("org_members").update({ status: "removed" }).eq("user_id", user_id);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      if (!email) return json({ error: "Missing email" }, 400);
      const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
      const { data: linkData, error } = await (admin.auth.admin as any).generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${origin}/auth` },
      });
      if (error) return json({ error: error.message }, 500);
      const link = (linkData as any)?.properties?.action_link ?? (linkData as any)?.action_link;
      if (!link) return json({ error: "Could not generate link" }, 500);

      if (!RESEND_KEY) {
        console.log(`[admin-user-action] No RESEND_API_KEY — recovery link for ${email}: ${link}`);
        return json({ ok: true, sent: false, link });
      }
      const subject = "Reset your LOXX password";
      const html = `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
          <h2 style="margin:0 0 12px">Reset your password</h2>
          <p>A LOXX administrator has initiated a password reset for your account.</p>
          <p style="margin:24px 0"><a href="${link}" style="background:#d4820a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Reset password</a></p>
          <p style="font-size:12px;color:#666">If you didn't expect this email, you can safely ignore it.</p>
        </div>`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({ from: "LOXX <onboarding@resend.dev>", to: [email], subject, html }),
      });
      if (!res.ok) {
        const txt = await res.text();
        return json({ ok: false, error: txt, link }, 502);
      }
      return json({ ok: true, sent: true });
    }

    if (action === "suspend_user") {
      if (!user_id) return json({ error: "Missing user_id" }, 400);
      if (user_id === user.id) return json({ error: "Cannot suspend yourself" }, 400);
      await admin.from("org_members").update({ status: "suspended" }).eq("user_id", user_id).eq("status", "active");
      const { error } = await (admin.auth.admin as any).updateUserById(user_id, { ban_duration: "876600h" });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "transfer_master_admin") {
      const { org_id, from_user_id, to_user_id, reason } = await (async () => ({} as any))();
      const body = arguments as any; // unused
      const parsed = { org_id: (arguments as any), from_user_id: undefined, to_user_id: undefined, reason: undefined } as any;
      return json({ error: "internal-routing-error" }, 500);
    }

    return json({ error: "Unknown action" }, 400);
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
