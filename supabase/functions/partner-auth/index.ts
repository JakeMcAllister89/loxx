// Partner portal authentication & data endpoint.
// Actions: login, me, data, set_password (admin only)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

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
async function signToken(partnerId: string): Promise<string> {
  const payload = { pid: partnerId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}
async function verifyToken(token: string): Promise<string | null> {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = await hmac(body);
    if (expected !== sig) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (!payload.pid || payload.exp < Date.now()) return null;
    return payload.pid as string;
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
    const { action, email, password, token: clientToken, partnerId, newPassword } =
      await req.json();

    if (action === "login") {
      if (!email || !password) return json({ error: "Email and password required" }, 400);
      const { data: login } = await supabase
        .from("partner_logins")
        .select("id, partner_id, password_hash")
        .eq("email", String(email).toLowerCase().trim())
        .maybeSingle();
      if (!login) return json({ error: "Invalid credentials" }, 401);
      const ok = await bcrypt.compare(password, login.password_hash);
      if (!ok) return json({ error: "Invalid credentials" }, 401);
      await supabase
        .from("partner_logins")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", login.id);
      const { data: partner } = await supabase
        .from("partners")
        .select("id, name, company, partner_type")
        .eq("id", login.partner_id)
        .single();
      const tok = await signToken(login.partner_id);
      return json({ token: tok, partner });
    }

    if (action === "me" || action === "data") {
      if (!clientToken) return json({ error: "Unauthorized" }, 401);
      const pid = await verifyToken(clientToken);
      if (!pid) return json({ error: "Invalid token" }, 401);
      const { data: partner } = await supabase
        .from("partners")
        .select("id, name, company, partner_type, default_commission_pct")
        .eq("id", pid)
        .single();
      if (!partner) return json({ error: "Partner not found" }, 404);
      if (action === "me") return json({ partner });

      // data: aggregate revenue & commission per system and quarterly breakdown
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
          .select("id, system_id, created_at, status, payment_status, company")
          .in("system_id", sysIds)
          .neq("status", "cancelled");
        orders = o ?? [];
        const orderIds = orders.map((x) => x.id);
        if (orderIds.length) {
          const { data: it } = await supabase
            .from("order_items")
            .select("order_id, line_total, commission_pct, commission_amount")
            .in("order_id", orderIds);
          items = it ?? [];
        }
      }
      const orderToSystem: Record<string, string> = {};
      orders.forEach((o) => (orderToSystem[o.id] = o.system_id));
      const orderToDate: Record<string, string> = {};
      orders.forEach((o) => (orderToDate[o.id] = o.created_at));
      const orderToPaid: Record<string, boolean> = {};
      orders.forEach((o) => (orderToPaid[o.id] = o.payment_status === "paid"));

      // Aggregate per system
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

      // Quarterly breakdown
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

      // Fetch payment statuses for these quarters
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

      const lifetimeRevenue = items.reduce((s, it) => s + Number(it.line_total ?? 0), 0);
      const lifetimeCommission = items.reduce((s, it) => s + Number(it.commission_amount ?? 0), 0);
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

      return json({
        partner,
        summary: {
          lifetimeRevenue,
          lifetimeCommission,
          systemsCount: systemsList.filter((s) => s.revenue > 0).length,
          pendingCommission,
        },
        quarterly,
        systems: systemsList,
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
    return json({ error: (e as Error).message ?? "Server error" }, 500);
  }
});
