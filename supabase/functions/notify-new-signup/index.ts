// v1 — fires from a Supabase Database Webhook on organisations INSERT
// Sends an email notification to hello@myloxx.co.uk when a new org
// is created with is_approved = false (organic signup, not platform invite).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (s: unknown) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const record = payload.record ?? payload;

    // Only notify for unapproved orgs (organic signups).
    // Platform-invited customers are auto-approved so is_approved = true.
    if (record.is_approved !== false) return json({ skipped: true });

    const orgName = record.name ?? "Unknown organisation";
    const orgId = record.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: member } = await admin
      .from("org_members")
      .select("user_id, profiles:user_id(first_name, last_name, email)")
      .eq("org_id", orgId)
      .eq("org_role", "master_admin")
      .maybeSingle();

    const profile = (member as any)?.profiles ?? {};
    const contactName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unknown";
    const contactEmail = profile.email ?? "Unknown";

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY not set" }, 500);

    const html = `<!doctype html>
<html>
  <body style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#f5f5f4; padding:24px; color:#111;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e7e5e4;">
      <div style="font-weight:600;font-size:14px;color:#78716c;margin-bottom:16px;">My LOXX</div>
      <h1 style="font-size:20px;margin:0 0 8px;">New account awaiting approval</h1>
      <p style="margin:0 0 20px;color:#44403c;">A new organisation has signed up and is waiting for your approval before they can access My LOXX.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
        <tr><td style="padding:6px 0;color:#78716c;">Organisation</td><td style="padding:6px 0;font-weight:600;">${esc(orgName)}</td></tr>
        <tr><td style="padding:6px 0;color:#78716c;">Contact name</td><td style="padding:6px 0;font-weight:600;">${esc(contactName)}</td></tr>
        <tr><td style="padding:6px 0;color:#78716c;">Email</td><td style="padding:6px 0;font-weight:600;">${esc(contactEmail)}</td></tr>
      </table>
      <a href="https://myloxx.co.uk/admin/approvals" style="display:inline-block;background:#d4820a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">Review in My LOXX</a>
      <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;">This email was sent automatically when a new account was created on myloxx.co.uk.</p>
    </div>
  </body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "My LOXX <hello@myloxx.co.uk>",
        to: ["hello@myloxx.co.uk"],
        subject: `New signup awaiting approval — ${orgName}`,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Resend failed", res.status, await res.text());
      return json({ error: "Email send failed" }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "Server error" }, 500);
  }
});
