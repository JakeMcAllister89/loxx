// v2
// Partner portal authentication & data endpoint.
// Actions: login, me, data, set_password (admin only)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

const esc = (s: string) =>
  s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

function randToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);

const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // reuse for HMAC signing

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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
async function signToken(partnerId: string, email: string, role: string): Promise<string> {
  const payload = { pid: partnerId, email, role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(body);
  return `${body}.${sig}`;
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
  } catch {
    return null;
  }
}


function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      action, email, password, token: clientToken, partnerId, newPassword,
      from: fromIso, to: toIso,
      first_name, last_name, phone,
      bank_account_name, bank_sort_code, bank_account_number,
      current_password,
    } = body;


    if (action === "request_reset") {
      const target = String(email || "").toLowerCase().trim();
      if (!target) return json({ ok: true }); // don't leak
      const rl = await checkRateLimit(supabase, `partner-reset:${target}`, 5, 60, corsHeaders);
      if (!rl.allowed) return rl.response;

      const { data: login } = await supabase
        .from("partner_logins")
        .select("id, partner_id")
        .eq("email", target)
        .maybeSingle();
      if (!login) return json({ ok: true }); // don't reveal

      const { data: partner } = await supabase
        .from("partners")
        .select("id, name, company, is_active")
        .eq("id", login.partner_id)
        .maybeSingle();
      if (!partner || partner.is_active === false) return json({ ok: true });

      const tok = randToken();
      const { error: iErr } = await supabase.from("partner_invites").insert({
        partner_id: partner.id,
        email: target,
        token: tok,
      });
      if (iErr) {
        console.error("[partner-auth request_reset] insert failed:", iErr);
        return json({ ok: true });
      }

      const origin = "https://myloxx.co.uk";
      const link = `${origin}/accept-partner-invite?token=${tok}`;
      const partnerName = esc(partner.name || "there");

      if (!RESEND_KEY) {
        console.log(`[partner-auth request_reset] No RESEND_API_KEY — reset link: ${link}`);
        return json({ ok: true });
      }

      const html = `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;background:#f5f4f1;color:#17171a">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
            <tr>
              <td style="vertical-align:middle"><img src="https://wrblvasfekwaaayorccv.supabase.co/storage/v1/object/public/brand/email-logo.png" alt="My LOXX" width="40" height="40" style="display:block;border-radius:8px" /></td>
              <td style="padding-left:10px;font-size:20px;font-weight:700;color:#17171a;font-family:Inter,system-ui,sans-serif;vertical-align:middle">My LOXX</td>
            </tr>
          </table>
          <h2 style="margin:0 0 12px">Reset your partner portal password</h2>
          <p>Hi ${partnerName},</p>
          <p>We received a request to reset the password on your My LOXX partner portal account. Click below to choose a new password.</p>
          <p style="margin:24px 0"><a href="${link}" style="background:#d4820a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Set a new password</a></p>
          <p style="font-size:14px;color:#444">This link expires in 7 days. If you didn't request this, you can safely ignore this email.</p>
          <p style="font-size:12px;color:#666">If the button doesn't work, copy and paste this link into your browser:<br>${link}</p>
        </div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: "My LOXX <noreply@myloxx.co.uk>",
          to: [target],
          subject: "Reset your My LOXX partner portal password",
          html,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("[partner-auth request_reset] Resend error:", txt);
      }
      return json({ ok: true });
    }

    if (action === "login") {
      if (!email || !password) return json({ error: "Email and password required" }, 400);
      const lower = String(email).toLowerCase().trim();
      const { data: login } = await supabase
        .from("partner_logins")
        .select("id, partner_id, password_hash")
        .eq("email", lower)
        .maybeSingle();
      if (!login) return json({ error: "Invalid credentials" }, 401);
      const ok = await bcrypt.compare(password, login.password_hash);
      if (!ok) return json({ error: "Invalid credentials" }, 401);
      const { data: partner } = await supabase
        .from("partners")
        .select("id, name, company, partner_type, is_active")
        .eq("id", login.partner_id)
        .single();
      if (!partner || partner.is_active === false) {
        return json({ error: "Account is inactive, please contact support" }, 403);
      }
      // Check membership + role
      const { data: member } = await supabase
        .from("partner_members")
        .select("role, status")
        .eq("partner_id", login.partner_id)
        .eq("email", lower)
        .maybeSingle();
      if (!member || member.status !== "active") {
        return json({ error: "Your access to this partner account has been removed" }, 403);
      }
      await supabase
        .from("partner_logins")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", login.id);
      const tok = await signToken(login.partner_id, lower, member.role);
      return json({ token: tok, partner, role: member.role, email: lower });
    }

    if (action === "list_team") {
      if (!clientToken) return json({ error: "Unauthorized" }, 401);
      const verified = await verifyToken(clientToken);
      if (!verified) return json({ error: "Invalid token" }, 401);
      const { data: members } = await supabase
        .from("partner_members")
        .select("id, email, first_name, last_name, role, status, created_at")
        .eq("partner_id", verified.pid)
        .neq("status", "removed")
        .order("created_at", { ascending: true });
      return json({ members: members ?? [], me: { email: verified.email, role: verified.role } });
    }

    if (action === "remove_member") {
      if (!clientToken) return json({ error: "Unauthorized" }, 401);
      const verified = await verifyToken(clientToken);
      if (!verified) return json({ error: "Invalid token" }, 401);
      if (verified.role !== "master_admin") return json({ error: "Only master admins can remove members" }, 403);
      const targetEmail = String(email || "").toLowerCase().trim();
      if (!targetEmail) return json({ error: "Missing email" }, 400);

      // Prevent removing the last master_admin
      if (targetEmail === verified.email) {
        const { data: admins } = await supabase
          .from("partner_members")
          .select("id")
          .eq("partner_id", verified.pid)
          .eq("role", "master_admin")
          .eq("status", "active");
        if ((admins?.length ?? 0) <= 1) {
          return json({ error: "You cannot remove yourself as the last master admin" }, 400);
        }
      }

      await supabase
        .from("partner_members")
        .update({ status: "removed" })
        .eq("partner_id", verified.pid)
        .eq("email", targetEmail);
      await supabase
        .from("partner_logins")
        .delete()
        .eq("partner_id", verified.pid)
        .eq("email", targetEmail);
      return json({ ok: true });
    }

    if (action === "me" || action === "data") {
      if (!clientToken) return json({ error: "Unauthorized" }, 401);
      const verified = await verifyToken(clientToken);
      if (!verified) return json({ error: "Invalid token" }, 401);
      const pid = verified.pid;
      const { data: partner } = await supabase
        .from("partners")
        .select("id, name, first_name, last_name, phone, company, partner_type, default_commission_pct, bank_account_name, bank_sort_code, bank_account_number")
        .eq("id", pid)
        .single();
      if (!partner) return json({ error: "Partner not found" }, 404);
      if (action === "me") return json({ partner, role: verified.role, email: verified.email });




      // data: aggregate revenue & commission per system and quarterly breakdown.
      // Range-filtered stats respect from/to; systemsList & quarterly stay lifetime.
      const rangeFrom = fromIso ? new Date(fromIso) : null;
      const rangeTo = toIso ? new Date(toIso) : null;

      const { data: systems } = await supabase
        .from("key_systems")
        .select("id, name, reference, commission_pct, created_at")
        .eq("partner_id", pid);
      const sysIds = (systems ?? []).map((s) => s.id);
      let orders: any[] = [];
      let items: any[] = [];
      if (sysIds.length) {
        const { data: o } = await supabase
          .from("orders")
          .select("id, system_id, created_at, status, payment_status, company, customer_name, total")
          .in("system_id", sysIds)
          .neq("status", "cancelled");
        orders = o ?? [];
        const orderIds = orders.map((x) => x.id);
        if (orderIds.length) {
          const { data: it } = await supabase
            .from("order_items")
            .select("order_id, item_type, quantity, line_total, commission_pct, commission_amount")
            .in("order_id", orderIds);
          items = it ?? [];
        }
      }
      const orderToSystem: Record<string, string> = {};
      orders.forEach((o) => (orderToSystem[o.id] = o.system_id));
      const orderToDate: Record<string, string> = {};
      orders.forEach((o) => (orderToDate[o.id] = o.created_at));

      // Range predicate
      const inRange = (iso: string) => {
        const d = new Date(iso);
        if (rangeFrom && d < rangeFrom) return false;
        if (rangeTo && d > rangeTo) return false;
        return true;
      };
      const rangeOrders = orders.filter((o) => inRange(o.created_at));
      const rangeOrderIds = new Set(rangeOrders.map((o) => o.id));
      const rangeItems = items.filter((it) => rangeOrderIds.has(it.order_id));

      // Aggregate per system (lifetime — powers Referred systems table)
      const sysAgg = new Map<string, { revenue: number; commission: number; firstDate: string | null; company: string | null }>();
      (systems ?? []).forEach((s) => sysAgg.set(s.id, { revenue: 0, commission: 0, firstDate: null, company: null }));
      items.forEach((it) => {
        const sid = orderToSystem[it.order_id];
        if (!sid) return;
        const a = sysAgg.get(sid)!;
        a.revenue += Number(it.line_total ?? 0);
        a.commission += Number(it.commission_amount ?? 0);
      });
      orders.forEach((o) => {
        const a = sysAgg.get(o.system_id);
        if (!a) return;
        if (!a.firstDate || o.created_at < a.firstDate) {
          a.firstDate = o.created_at;
          a.company = o.company;
        }
      });

      // Quarterly breakdown (lifetime)
      const quarters = new Map<string, { period_start: string; period_end: string; revenue: number; commission: number }>();
      items.forEach((it) => {
        const d = orderToDate[it.order_id];
        if (!d) return;
        const date = new Date(d);
        const q = Math.floor(date.getMonth() / 3);
        const key = `${date.getFullYear()}-Q${q + 1}`;
        if (!quarters.has(key)) {
          const start = new Date(date.getFullYear(), q * 3, 1);
          const end = new Date(date.getFullYear(), q * 3 + 3, 0);
          quarters.set(key, {
            period_start: start.toISOString().slice(0, 10),
            period_end: end.toISOString().slice(0, 10),
            revenue: 0,
            commission: 0,
          });
        }
        const qq = quarters.get(key)!;
        qq.revenue += Number(it.line_total ?? 0);
        qq.commission += Number(it.commission_amount ?? 0);
      });

      const { data: payments } = await supabase
        .from("partner_payments")
        .select("period_start, period_end, status, total_commission")
        .eq("partner_id", pid);
      const payMap = new Map<string, string>();
      (payments ?? []).forEach((p) => payMap.set(`${p.period_start}|${p.period_end}`, p.status));

      const quarterly = Array.from(quarters.entries())
        .map(([key, q]) => ({
          key,
          ...q,
          status: payMap.get(`${q.period_start}|${q.period_end}`) ?? "pending",
          commission_pct: q.revenue > 0 ? Number(((q.commission / q.revenue) * 100).toFixed(2)) : 0,
        }))
        .sort((a, b) => (a.key < b.key ? 1 : -1));

      // Range-scoped figures
      const revenue = rangeItems.reduce((s, it) => s + Number(it.line_total ?? 0), 0);
      const commission = rangeItems.reduce((s, it) => s + Number(it.commission_amount ?? 0), 0);
      const cylindersSupplied = rangeItems
        .filter((it) => it.item_type === "cylinder")
        .reduce((s, it) => s + Number(it.quantity ?? 0), 0);
      const keysSupplied = rangeItems
        .filter((it) => it.item_type === "key")
        .reduce((s, it) => s + Number(it.quantity ?? 0), 0);
      const activeSystems = new Set(rangeOrders.map((o) => o.system_id).filter(Boolean)).size;

      const pendingCommission = quarterly
        .filter((q) => q.status !== "paid")
        .reduce((s, q) => s + q.commission, 0);

      const systemsList = (systems ?? []).map((s) => {
        const a = sysAgg.get(s.id)!;
        return {
          id: s.id,
          name: s.name,
          reference: s.reference,
          firstOrderDate: a.firstDate,
          customerCompany: a.company,
          revenue: a.revenue,
          commission: a.commission,
        };
      });

      // Recent orders — scoped to partner systems + selected range
      const sysNameMap = new Map<string, { name: string; reference: string | null }>();
      (systems ?? []).forEach((s) => sysNameMap.set(s.id, { name: s.name, reference: s.reference }));
      const recentOrders = rangeOrders
        .slice()
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 50)
        .map((o) => ({
          id: o.id,
          reference: o.id.slice(0, 8).toUpperCase(),
          customer: o.customer_name ?? o.company ?? "—",
          system: sysNameMap.get(o.system_id)?.reference ?? sysNameMap.get(o.system_id)?.name ?? "—",
          created_at: o.created_at,
          total: Number(o.total ?? 0),
          status: o.status,
          payment_status: o.payment_status,
        }));

      return json({
        partner,
        summary: {
          revenue,
          commission,
          cylindersSupplied,
          keysSupplied,
          activeSystems,
          systemsCount: systemsList.filter((s) => s.revenue > 0).length,
          pendingCommission,
        },
        quarterly,
        systems: systemsList,
        recentOrders,
      });
    }

    if (action === "set_password") {
      // admin-only: requires user JWT
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const { data: claims } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (!claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: claims.claims.sub });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      if (!partnerId || !email || !newPassword) return json({ error: "Missing fields" }, 400);
      const hash = await bcrypt.hash(newPassword, 10);
      // upsert by email
      const lower = String(email).toLowerCase().trim();
      const { data: existing } = await supabase
        .from("partner_logins")
        .select("id")
        .eq("email", lower)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("partner_logins")
          .update({ password_hash: hash, partner_id: partnerId })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("partner_logins")
          .insert({ partner_id: partnerId, email: lower, password_hash: hash });
      }
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("partner-auth error", e);
    return json({ error: "Server error" }, 500);
  }
});
