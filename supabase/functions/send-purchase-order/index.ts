// Generates a Purchase Order HTML for an order and (optionally) emails it to the supplier.
// POST { order_id: string, download_only?: boolean }
// Returns { success: true, po_number, html? }

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const fmt = (n: number) => `£${(Math.round(n * 100) / 100).toFixed(2)}`;

interface SendBody { order_id?: string; download_only?: boolean }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: userRes, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userRes.user) return json({ error: "Unauthorized" }, 401);

    // Require admin
    const { data: prof } = await supabase
      .from("profiles").select("is_admin").eq("id", userRes.user.id).maybeSingle();
    if (!prof?.is_admin) return json({ error: "Admin only" }, 403);

    const body = (await req.json().catch(() => ({}))) as SendBody;
    if (!body.order_id) return json({ error: "order_id required" }, 400);
    const downloadOnly = !!body.download_only;

    // Load settings
    const { data: settingsRows } = await supabase.from("admin_settings").select("key,value");
    const S: Record<string, string> = {};
    (settingsRows ?? []).forEach((r: any) => (S[r.key] = r.value ?? ""));

    if (!downloadOnly && !S.supplier_email) {
      return json({ error: "Supplier email not configured. Please add it in Admin → Settings." }, 400);
    }

    // Load order + items
    const { data: order, error: oErr } = await supabase
      .from("orders").select("*").eq("id", body.order_id).maybeSingle();
    if (oErr || !order) return json({ error: "Order not found" }, 404);

    const { data: items } = await supabase
      .from("order_items").select("*").eq("order_id", order.id);

    // Load product catalogue for cost prices + descriptions
    const codes = Array.from(new Set((items ?? []).map((i: any) => i.product_code).filter(Boolean)));
    const productMap: Record<string, any> = {};
    if (codes.length) {
      const { data: prods } = await supabase
        .from("products")
        .select("code,cost_price,product_description,name,cylinder_profile,size,finish")
        .in("code", codes as string[]);
      (prods ?? []).forEach((p: any) => (productMap[p.code] = p));
    }

    // System reference
    let systemRef = "—", systemName = "";
    if (order.system_id) {
      const { data: sys } = await supabase
        .from("key_systems").select("name,reference").eq("id", order.system_id).maybeSingle();
      if (sys) { systemRef = sys.reference ?? "—"; systemName = sys.name ?? ""; }
    }

    // Assign PO number if missing
    let poNumber = order.po_number as string | null;
    if (!poNumber && !downloadOnly) {
      const { data: poRes, error: poErr } = await supabase.rpc("assign_po_number");
      if (poErr) return json({ error: `Could not assign PO number: ${poErr.message}` }, 500);
      poNumber = poRes as string;
    }
    const displayPo = poNumber ?? "(preview)";

    // Build hierarchy refs from order_items.notes is not present; rely on differ + system
    const cyls = (items ?? []).filter((i: any) => i.item_type === "cylinder");
    const keys = (items ?? []).filter((i: any) => i.item_type === "key");

    const lineCost = (i: any) => {
      const cost = Number(productMap[i.product_code]?.cost_price ?? 0);
      return { cost, total: cost * Number(i.quantity) };
    };
    const cylSubtotal = cyls.reduce((s: number, i: any) => s + lineCost(i).total, 0);
    const keySubtotal = keys.reduce((s: number, i: any) => s + lineCost(i).total, 0);
    const exVat = cylSubtotal + keySubtotal;
    const vatRate = Number(S.vat_rate || "20");
    const vat = +(exVat * (vatRate / 100)).toFixed(2);
    const inc = +(exVat + vat).toFixed(2);

    const d = (order.delivery_address ?? {}) as any;
    const contactName = d.contact_name ?? d.name ?? "—";
    const contactPhone = d.contact_phone ?? "—";
    const addrLine = [d.line1, d.line2, d.city, d.county, d.postcode].filter(Boolean).join(", ") || "—";

    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    const cylRows = cyls.map((i: any) => {
      const p = productMap[i.product_code] ?? {};
      const { cost, total } = lineCost(i);
      const hierarchy = [systemRef !== "—" ? systemRef : null, i.differ_ref].filter(Boolean).join(" · ");
      return `<tr>
        <td style="font-family:monospace">${esc(i.differ_ref ?? "—")}</td>
        <td>${esc(i.room_label ?? "—")}</td>
        <td style="font-family:monospace;font-size:11px;color:#92400e">${esc(hierarchy)}</td>
        <td>${esc(p.product_description ?? p.name ?? i.product_code ?? "—")}</td>
        <td>${esc(p.cylinder_profile ?? "—")}</td>
        <td>${esc(i.finish ?? p.finish ?? "—")}</td>
        <td>${esc(p.size ?? "—")}</td>
        <td style="text-align:right">${i.quantity}</td>
        <td style="text-align:right;font-family:monospace">${fmt(cost)}</td>
        <td style="text-align:right;font-family:monospace">${fmt(total)}</td>
      </tr>`;
    }).join("");

    const keyRows = keys.map((i: any) => {
      const { cost, total } = lineCost(i);
      return `<tr>
        <td style="font-family:monospace">${esc(i.differ_ref ?? i.product_code ?? "—")}</td>
        <td>${esc(i.product_code ?? "Key")}</td>
        <td>${esc(i.room_label ?? "—")}</td>
        <td style="text-align:right">${i.quantity}</td>
        <td style="text-align:right;font-family:monospace">${fmt(cost)}</td>
        <td style="text-align:right;font-family:monospace">${fmt(total)}</td>
      </tr>`;
    }).join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(displayPo)}</title>
<style>
body{font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#0f172a;padding:32px;max-width:900px;margin:0 auto}
h1{margin:0;font-size:24px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
th{background:#f8fafc;text-transform:uppercase;font-size:10px;letter-spacing:.5px;color:#475569}
.warn{background:#fef3c7;border:1px solid #fcd34d;padding:8px 12px;border-radius:6px;font-size:12px;color:#92400e;margin:16px 0}
.muted{color:#64748b;font-size:12px}
.po{font-family:monospace;color:#b45309;font-size:18px}
.block{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-top:12px}
.label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:4px}
.totals{margin-top:12px;width:300px;margin-left:auto}
.totals td{border:none;padding:4px 8px}
.totals .grand{border-top:2px solid #0f172a;font-weight:700;font-size:14px}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start">
  <div><h1>${esc(S.company_name || "LOXX")}</h1><div class="muted">${esc(S.company_address || "")}</div></div>
  <div style="text-align:right"><div style="font-size:18px;font-weight:700;letter-spacing:1px">PURCHASE ORDER</div><div class="po">${esc(displayPo)}</div></div>
</div>

<div class="warn"><strong>Internal use only.</strong> Unit costs shown are supplier prices. DO NOT share with end customer.</div>

<div style="display:flex;gap:16px">
  <div class="block" style="flex:1">
    <div class="label">From</div>
    <div><strong>${esc(S.company_name || "LOXX")}</strong></div>
    <div class="muted">${esc(S.company_address || "")}</div>
    <div class="muted">${esc(S.company_email || "")} · ${esc(S.company_phone || "")}</div>
    ${S.vat_number ? `<div class="muted">VAT: ${esc(S.vat_number)}</div>` : ""}
  </div>
  <div class="block" style="flex:1">
    <div class="label">Supplier</div>
    <div><strong>${esc(S.supplier_name || "—")}</strong></div>
    <div class="muted">${esc(S.supplier_email || "")}</div>
    ${S.supplier_account ? `<div class="muted">Account: ${esc(S.supplier_account)}</div>` : ""}
  </div>
</div>

<div style="display:flex;gap:16px">
  <div class="block" style="flex:1">
    <div class="label">Order reference</div>
    <div><strong>PO Number:</strong> <span style="font-family:monospace">${esc(displayPo)}</span></div>
    <div><strong>Date:</strong> ${esc(today)}</div>
    <div><strong>System reference:</strong> <span style="font-family:monospace">${esc(systemRef)}</span>${systemName ? ` <span class="muted">${esc(systemName)}</span>` : ""}</div>
    <div><strong>Customer PO reference:</strong> ${esc(order.customer_po_ref || "—")}</div>
  </div>
  <div class="block" style="flex:1">
    <div class="label">Delivery address</div>
    <div><strong>Contact:</strong> ${esc(contactName)}</div>
    <div><strong>Telephone:</strong> ${esc(contactPhone)}</div>
    <div class="muted" style="margin-top:4px">${esc(addrLine)}</div>
  </div>
</div>

${cyls.length ? `<h3 style="margin-top:24px">Cylinders</h3>
<table>
  <thead><tr>
    <th>Differ</th><th>Room / Door</th><th>System Ref</th><th>Description</th>
    <th>Profile</th><th>Finish</th><th>Size</th>
    <th style="text-align:right">Qty</th><th style="text-align:right">Unit cost</th><th style="text-align:right">Total</th>
  </tr></thead>
  <tbody>${cylRows}</tbody>
</table>` : ""}

${keys.length ? `<h3 style="margin-top:24px">Keys</h3>
<table>
  <thead><tr>
    <th>Key reference</th><th>Type</th><th>Location</th>
    <th style="text-align:right">Qty</th><th style="text-align:right">Unit cost</th><th style="text-align:right">Total</th>
  </tr></thead>
  <tbody>${keyRows}</tbody>
</table>` : ""}

<table class="totals">
  <tr><td>Cylinders subtotal (cost)</td><td style="text-align:right;font-family:monospace">${fmt(cylSubtotal)}</td></tr>
  ${keys.length ? `<tr><td>Keys subtotal (cost)</td><td style="text-align:right;font-family:monospace">${fmt(keySubtotal)}</td></tr>` : ""}
  <tr><td>Subtotal ex VAT</td><td style="text-align:right;font-family:monospace">${fmt(exVat)}</td></tr>
  <tr><td>VAT at ${esc(vatRate)}%</td><td style="text-align:right;font-family:monospace">${fmt(vat)}</td></tr>
  <tr class="grand"><td>Total inc VAT</td><td style="text-align:right;font-family:monospace">${fmt(inc)}</td></tr>
</table>

<div class="block" style="margin-top:24px;background:#f8fafc">
  <div class="label">Differ schedule</div>
  <div>All cylinders must be keyed to the master key system and differ references shown. Please confirm keying schedule matches this order before dispatch.</div>
</div>

${S.po_notes ? `<div class="block" style="margin-top:12px"><div class="label">Notes</div><div>${esc(S.po_notes)}</div></div>` : ""}

</body></html>`;

    if (downloadOnly) {
      return json({ success: true, po_number: poNumber ?? null, html });
    }

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return json({ error: "Email sender not configured. Please add RESEND_API_KEY in project secrets." }, 500);
    }

    const subject = `Purchase Order ${displayPo} — ${S.company_name || "LOXX"} | System ${systemRef}`;
    const emailBody = `Dear ${S.supplier_name || "Supplier"},

Please find attached Purchase Order ${displayPo}.

System reference: ${systemRef}
Customer PO reference: ${order.customer_po_ref || "—"}

Delivery to:
${contactName}
${contactPhone}
${addrLine}

Please key all cylinders to the differ schedule shown on the attached purchase order.

Please confirm receipt and expected dispatch date by return.

${S.company_name || "LOXX"}
${S.company_email || ""}
${S.company_phone || ""}`.trim();

    const fromAddr = `${S.company_name || "LOXX"} <orders@resend.dev>`;
    const attachmentB64 = btoa(unescape(encodeURIComponent(html)));

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddr,
        to: [S.supplier_email],
        subject,
        text: emailBody,
        html: emailBody.replace(/\n/g, "<br>"),
        attachments: [{ filename: `${displayPo}.html`, content: attachmentB64 }],
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return json({ error: `Email send failed: ${txt}` }, 502);
    }

    await supabase.from("orders").update({
      po_number: poNumber,
      po_sent_at: new Date().toISOString(),
      po_sent_to: S.supplier_email,
      status: "processing",
    }).eq("id", order.id);

    return json({ success: true, po_number: poNumber });
  } catch (e) {
    console.error("send-purchase-order error", e);
    return json({ error: (e as Error).message ?? "Server error" }, 500);
  }
});
