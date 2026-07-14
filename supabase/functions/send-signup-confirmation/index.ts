// Sends a signup confirmation email to a newly-registered customer.
// Public endpoint (no auth required) invoked from the signup flow.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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
    const { email, first_name, organisation_name } = await req.json();
    if (!email || typeof email !== "string") return json({ error: "Missing email" }, 400);

    const firstName = esc(first_name || "there");
    const orgName = esc(organisation_name || "your organisation");
    const subject = "We've received your My LOXX signup request";

    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
          <tr>
            <td style="vertical-align:middle"><img src="https://wrblvasfekwaaayorccv.supabase.co/storage/v1/object/public/brand/email-logo.png" alt="My LOXX" width="40" height="40" style="display:block;border-radius:8px" /></td>
            <td style="padding-left:10px;font-size:20px;font-weight:700;color:#17171a;font-family:Inter,system-ui,sans-serif;vertical-align:middle">My LOXX</td>
          </tr>
        </table>
        <h2 style="margin:0 0 12px">Thanks for signing up, ${firstName}.</h2>
        <p>We've received your request to create a My LOXX account for <strong>${orgName}</strong>.</p>
        <p>Our team will review your account and you'll receive a confirmation email once it's approved — this is usually within one working day.</p>
        <p>If you have any questions in the meantime, get in touch at <a href="mailto:hello@myloxx.co.uk" style="color:#d4820a;text-decoration:none">hello@myloxx.co.uk</a>.</p>
        <p style="margin-top:32px;font-size:12px;color:#666">— The My LOXX team</p>
      </div>`;

    if (!RESEND_KEY) {
      console.log(`[send-signup-confirmation] No RESEND_API_KEY — would email ${email}`);
      return json({ ok: true, sent: false });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: "My LOXX <noreply@myloxx.co.uk>",
        to: [email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend error:", txt);
      return json({ ok: false, error: "Could not send signup confirmation email" }, 502);
    }
    return json({ ok: true, sent: true });
  } catch (e) {
    console.error("send-signup-confirmation error", e);
    return json({ error: "Server error" }, 500);
  }
});
