// Marks a partner_payments row as paid and emails the partner a confirmation.
// Admin-only (verified via check_is_admin).
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

const gbp = (n: number) => `£${Number(n ?? 0).toFixed(2)}`;

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
};

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

    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { payment_id } = await req.json();
    if (!payment_id || typeof payment_id !== "string") return json({ error: "Missing payment_id" }, 400);

    const { data: payment, error: pErr } = await admin
      .from("partner_payments")
      .select("id, partner_id, period_start, period_end, total_revenue, total_commission, status")
      .eq("id", payment_id)
      .maybeSingle();
    if (pErr || !payment) return json({ error: "Payment not found" }, 404);

    // Mark paid (idempotent — only flip if not already paid)
    if (payment.status !== "paid") {
      const { error: uErr } = await admin
        .from("partner_payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", payment_id);
      if (uErr) return json({ error: uErr.message }, 500);
    }

    // Look up partner
    const { data: partner } = await admin
      .from("partners")
      .select("id, name, email, company")
      .eq("id", payment.partner_id)
      .maybeSingle();

    const recipient = (partner as any)?.email;
    if (!recipient) {
      return json({ ok: true, sent: false, reason: "no_email" });
    }

    const firstName = esc((partner as any)?.name?.split(" ")?.[0] || "there");
    const periodStart = fmtDate(payment.period_start);
    const periodEnd = fmtDate(payment.period_end);
    const rev = gbp(Number(payment.total_revenue));
    const com = gbp(Number(payment.total_commission));

    const subject = `Your My LOXX commission payment for ${periodStart} – ${periodEnd}`;
    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
          <tr>
            <td style="vertical-align:middle"><img src="https://wrblvasfekwaaayorccv.supabase.co/storage/v1/object/public/brand/email-logo.png" alt="My LOXX" width="40" height="40" style="display:block;border-radius:8px" /></td>
            <td style="padding-left:10px;font-size:20px;font-weight:700;color:#17171a;font-family:Inter,system-ui,sans-serif;vertical-align:middle">My LOXX</td>
          </tr>
        </table>
        <h2 style="margin:0 0 12px">Commission paid ✓</h2>
        <p>Hi ${firstName},</p>
        <p>This is confirmation that your My LOXX partner commission for the period below has been paid.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#fff;border:1px solid #e4e2db;border-radius:8px;margin:16px 0">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e4e2db;color:#6b6a65;font-size:13px">Period</td><td style="padding:12px 16px;border-bottom:1px solid #e4e2db;text-align:right;font-weight:600">${esc(periodStart)} – ${esc(periodEnd)}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e4e2db;color:#6b6a65;font-size:13px">Total revenue (ex VAT)</td><td style="padding:12px 16px;border-bottom:1px solid #e4e2db;text-align:right;font-family:'IBM Plex Mono',ui-monospace,monospace">${esc(rev)}</td></tr>
          <tr><td style="padding:12px 16px;color:#6b6a65;font-size:13px">Commission paid</td><td style="padding:12px 16px;text-align:right;font-family:'IBM Plex Mono',ui-monospace,monospace;color:#d4820a;font-weight:700">${esc(com)}</td></tr>
        </table>
        <p style="margin:24px 0"><a href="https://myloxx.co.uk/partner-portal" style="background:#d4820a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">View partner portal</a></p>
        <p style="font-size:12px;color:#666">Thanks for partnering with us. If you have any questions about this payment, just reply to this email.</p>
      </div>`;

    if (!RESEND_KEY) {
      console.log(`[mark-partner-payment-paid] No RESEND_API_KEY — would email ${recipient}`);
      return json({ ok: true, sent: false, reason: "no_resend_key" });
    }

    try {
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
        console.error("[mark-partner-payment-paid] Resend error:", txt);
        return json({ ok: true, sent: false, reason: "email_failed" });
      }
    } catch (e) {
      console.error("[mark-partner-payment-paid] Email send exception:", e);
      return json({ ok: true, sent: false, reason: "email_exception" });
    }

    return json({ ok: true, sent: true });
  } catch (e) {
    console.error("mark-partner-payment-paid error", e);
    return json({ error: "Server error" }, 500);
  }
});
