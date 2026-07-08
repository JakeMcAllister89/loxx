// v1
// Sent by a partner master_admin to invite a new team member to their partner account.
// Auth: uses the partner-portal signed token (same as partner-auth), not a Supabase JWT.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const SECRET = SR;

const admin = createClient(SUPABASE_URL, SR);

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

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}
async function verifyToken(token: string): Promise<{ pid: string; email: string; role: string } | null> {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = await hmac(body);
    if (expected !== sig) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (!payload.pid || payload.exp < Date.now()) return null;
    return { pid: payload.pid, email: payload.email ?? "", role: payload.role ?? "member" };
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token: portalToken, email, first_name, last_name } = await req.json();
    if (!portalToken) return json({ error: "Unauthorized" }, 401);
    const verified = await verifyToken(portalToken);
    if (!verified) return json({ error: "Invalid token" }, 401);
    if (verified.role !== "master_admin") return json({ error: "Only master admins can invite team members" }, 403);

    const target = String(email || "").toLowerCase().trim();
    if (!target || !target.includes("@")) return json({ error: "Valid email required" }, 400);

    const rl = await checkRateLimit(admin, `partner-member-invite:${verified.pid}`, 10, 60, corsHeaders);
    if (!rl.allowed) return rl.response;

    const { data: partner } = await admin
      .from("partners")
      .select("id, name, company, is_active")
      .eq("id", verified.pid)
      .maybeSingle();
    if (!partner || partner.is_active === false) return json({ error: "Partner account inactive" }, 403);

    // Upsert partner_members row as pending
    const { error: mErr } = await admin
      .from("partner_members")
      .upsert(
        {
          partner_id: verified.pid,
          email: target,
          first_name: first_name ?? null,
          last_name: last_name ?? null,
          role: "member",
          status: "pending",
        },
        { onConflict: "partner_id,email" },
      );
    if (mErr) {
      console.error("[send-partner-member-invite] upsert member failed:", mErr);
      return json({ error: "Could not create member record" }, 500);
    }

    const tok = randToken();
    const { error: iErr } = await admin.from("partner_invites").insert({
      partner_id: verified.pid,
      email: target,
      token: tok,
    });
    if (iErr) {
      console.error("[send-partner-member-invite] insert invite failed:", iErr);
      return json({ error: "Could not create invitation" }, 500);
    }

    const origin = "https://myloxx.co.uk";
    const link = `${origin}/accept-partner-invite?token=${tok}`;
    const partnerCompany = esc(partner.company || partner.name || "your partner account");
    const firstName = esc(first_name || "there");

    if (!RESEND_KEY) {
      console.log(`[send-partner-member-invite] No RESEND_API_KEY — invite link: ${link}`);
      return json({ ok: true, sent: false });
    }

    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
          <tr>
            <td style="vertical-align:middle"><img src="https://wrblvasfekwaaayorccv.supabase.co/storage/v1/object/public/brand/email-logo.png" alt="My LOXX" width="40" height="40" style="display:block;border-radius:8px" /></td>
            <td style="padding-left:10px;font-size:20px;font-weight:700;color:#17171a;font-family:Inter,system-ui,sans-serif;vertical-align:middle">My LOXX</td>
          </tr>
        </table>
        <h2 style="margin:0 0 12px">You've been invited to the My LOXX partner portal</h2>
        <p>Hi ${firstName},</p>
        <p>You've been invited to join <strong>${partnerCompany}</strong> on the My LOXX partner portal. Accept the invitation below to set your password and get access.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#d4820a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Accept invitation</a></p>
        <p style="font-size:14px;color:#444">This invitation expires in 7 days.</p>
        <p style="font-size:12px;color:#666">If the button doesn't work, copy and paste this link into your browser:<br>${link}</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: "My LOXX <noreply@myloxx.co.uk>",
        to: [target],
        subject: `You've been invited to ${partner.company || partner.name} on My LOXX`,
        html,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("[send-partner-member-invite] Resend error:", txt);
      return json({ ok: false, error: "Could not send invite email" }, 502);
    }
    return json({ ok: true, sent: true });
  } catch (e) {
    console.error("send-partner-member-invite error", e);
    return json({ error: "Server error" }, 500);
  }
});
