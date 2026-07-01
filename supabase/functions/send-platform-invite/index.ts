// v2
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

    const inviterFirst = (prof as any)?.first_name || ((prof as any)?.name?.split(" ")[0]) || "The LOXX team";

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const link = `${origin}/accept-platform-invite?token=${(invite as any).token}`;

    const subject = "You've been invited to try LOXX";
    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
        <h2 style="margin:0 0 12px">Welcome to LOXX</h2>
        <p>${inviterFirst} has invited you to manage your master key system on LOXX — free to use, no card required.</p>
        <p>Click below to create your account and get started.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#d4820a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Create your account</a></p>
        <p style="font-size:12px;color:#666">If the button doesn't work, paste this link into your browser:<br>${link}</p>
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
    return json({ error: e.message ?? "Server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
