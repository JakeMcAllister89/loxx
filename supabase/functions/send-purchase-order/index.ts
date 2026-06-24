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

function buildDifferHierarchyMap(root: any): Record<string, { gmk: string; mk: string; smk: string }> {
  const map: Record<string, { gmk: string; mk: string; smk: string }> = {};
  const walk = (node: any, trail: any[]) => {
    if (node.type === "CYL" && node.differ != null) {
      const ref = `D${String(node.differ).padStart(3, "0")}`;
      map[ref] = {
        gmk: trail.find(n => n.type === "GMK")?.label ?? "—",
        mk:  trail.find(n => n.type === "MK")?.label  ?? "—",
        smk: trail.find(n => n.type === "SMK")?.label ?? "—",
      };
    }
    for (const child of node.children ?? []) {
      walk(child, [...trail, node]);
    }
  };
  if (root) walk(root, []);
  return map;
}

function buildDifferExtraKeysMap(items: any[]): Record<string, number> {
  const map: Record<string, number> = {};
  items.filter(i => i.item_type === "key" && i.differ_ref).forEach(i => {
    map[i.differ_ref] = (map[i.differ_ref] ?? 0) + Number(i.quantity);
  });
  return map;
}

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

    // Build hierarchy map from tree snapshot and extra keys map from line items
    const hierarchyMap = buildDifferHierarchyMap((order as any).tree_snapshot?.root ?? null);
    const extraKeysMap = buildDifferExtraKeysMap(items ?? []);

    const combinedSubtotal = (items ?? [])
      .filter((i: any) => i.item_type === "cylinder")
      .reduce((sum: number, i: any) => {
        const unitCost = Number(productMap[i.product_code]?.cost_price ?? 0);
        return sum + unitCost * Number(i.quantity);
      }, 0);
    const exVat = combinedSubtotal;
    const vatRate = Number(S.vat_rate ?? 20);
    const vat = +(exVat * vatRate / 100).toFixed(2);
    const inc = +(exVat + vat).toFixed(2);

    const d = (order.delivery_address ?? {}) as any;
    const contactName = d.contact_name ?? d.name ?? "—";
    const contactPhone = d.contact_phone ?? "—";
    const addrLine = [d.line1, d.line2, d.city, d.county, d.postcode].filter(Boolean).join(", ") || "—";

    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    const cylItemsSorted = (items ?? [])
      .filter((i: any) => i.item_type === "cylinder")
      .sort((a: any, b: any) => (a.differ_ref ?? "").localeCompare(b.differ_ref ?? ""));

    const zoneGroups = new Map<string, { zoneLabel: string; rows: any[] }>();
    cylItemsSorted.forEach((i: any) => {
      const h = hierarchyMap[i.differ_ref ?? ""] ?? { gmk: "—", mk: "—", smk: "—" };
      const zoneKey = h.smk !== "—" ? h.smk : (h.mk !== "—" ? h.mk : "General");
      const existing = zoneGroups.get(zoneKey);
      if (existing) existing.rows.push(i);
      else zoneGroups.set(zoneKey, { zoneLabel: zoneKey, rows: [i] });
    });

    const isGrouped = zoneGroups.size > 1;

    const differRows = Array.from(zoneGroups.values()).map(({ zoneLabel, rows }) => {
      const header = isGrouped
        ? `<tr><td colspan="15" style="background:#f1f5f9;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#475569;font-weight:600">${esc(zoneLabel)}</td></tr>`
        : "";
      const dataRows = rows.map((i: any) => {
        const p = productMap[i.product_code] ?? {};
        const hierarchy = hierarchyMap[i.differ_ref ?? ""] ?? { gmk: "—", mk: "—", smk: "—" };
        const extraKeys = extraKeysMap[i.differ_ref ?? ""] ?? 0;
        const unitCost = Number(p.cost_price ?? 0);
        const totalCost = unitCost * Number(i.quantity);
        return `<tr>
          <td style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-weight:600">${esc(i.differ_ref ?? "—")}</td>
          <td>${esc(i.room_label ?? "—")}</td>
          <td>${esc(hierarchy.gmk)}</td>
          <td>${esc(hierarchy.mk)}</td>
          <td>${esc(hierarchy.smk)}</td>
          <td style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;color:#92400e">${esc(i.product_code ?? "—")}</td>
          <td>${esc(p.product_description ?? p.name ?? (i as any).cylinder_type ?? "—")}</td>
          <td>${esc(p.cylinder_profile ?? "—")}</td>
          <td>${esc(i.finish ?? p.finish ?? "—")}</td>
          <td>${esc(p.size ?? "—")}</td>
          <td style="text-align:right">${i.quantity}</td>
          <td style="text-align:right">2</td>
          <td style="text-align:right">${extraKeys > 0 ? extraKeys : "—"}</td>
          <td style="text-align:right;font-family:'IBM Plex Mono',ui-monospace,monospace">${fmt(unitCost)}</td>
          <td style="text-align:right;font-family:'IBM Plex Mono',ui-monospace,monospace">${fmt(totalCost)}</td>
        </tr>`;
      }).join("");
      return header + dataRows;
    }).join("");


    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(displayPo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>
body{font-family:'Inter',-apple-system,Segoe UI,Arial,sans-serif;color:#0f172a;padding:32px;max-width:960px;margin:0 auto;font-size:13px}
h1{margin:0;font-size:24px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
th{background:#f8fafc;text-transform:uppercase;font-size:10px;letter-spacing:.5px;color:#475569}
.warn{background:#fef3c7;border:1px solid #fcd34d;padding:8px 12px;border-radius:6px;font-size:12px;color:#92400e;margin:16px 0}
.muted{color:#64748b;font-size:12px}
.po{font-family:'IBM Plex Mono',ui-monospace,monospace;color:#b45309;font-size:18px}
.block{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-top:12px}
.label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:4px}
.totals{margin-top:12px;width:300px;margin-left:auto}
.totals td{border:none;padding:4px 8px}
.totals .grand{border-top:2px solid #0f172a;font-weight:700;font-size:14px}
@media print { @page { margin: 16mm; } .noprint { display: none } }
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
    <div><strong>PO Number:</strong> <span style="font-family:'IBM Plex Mono',ui-monospace,monospace">${esc(displayPo)}</span></div>
    <div><strong>Date:</strong> ${esc(today)}</div>
    <div><strong>System reference:</strong> <span style="font-family:'IBM Plex Mono',ui-monospace,monospace">${esc(systemRef)}</span>${systemName ? ` <span class="muted">${esc(systemName)}</span>` : ""}</div>
    <div><strong>Customer PO reference:</strong> ${esc(order.customer_po_ref || "—")}</div>
  </div>
  <div class="block" style="flex:1">
    <div class="label">Delivery address</div>
    <div><strong>Contact:</strong> ${esc(contactName)}</div>
    <div><strong>Telephone:</strong> ${esc(contactPhone)}</div>
    <div class="muted" style="margin-top:4px">${esc(addrLine)}</div>
  </div>
</div>

<h3 style="margin-top:24px;margin-bottom:8px">Differ Schedule</h3>
<table>
  <thead><tr>
    <th>Differ</th>
    <th>Room / Door</th>
    <th>GMK</th>
    <th>MK</th>
    <th>SMK</th>
    <th>Product Code</th>
    <th>Description</th>
    <th>Lock function</th>
    <th>Finish</th>
    <th>Size</th>
    <th style="text-align:right">Qty</th>
    <th style="text-align:right">Keys (inc.)</th>
    <th style="text-align:right">Extra Keys</th>
    <th style="text-align:right">Unit Cost</th>
    <th style="text-align:right">Total Cost</th>
  </tr></thead>
  <tbody>${differRows}</tbody>
</table>

<table class="totals">
  <tr><td>Subtotal (cost)</td><td style="text-align:right;font-family:'IBM Plex Mono',ui-monospace,monospace">${fmt(combinedSubtotal)}</td></tr>
  <tr><td>Subtotal ex VAT</td><td style="text-align:right;font-family:'IBM Plex Mono',ui-monospace,monospace">${fmt(exVat)}</td></tr>
  <tr><td>VAT at ${esc(String(vatRate))}%</td><td style="text-align:right;font-family:'IBM Plex Mono',ui-monospace,monospace">${fmt(vat)}</td></tr>
  <tr class="grand"><td>Total inc VAT</td><td style="text-align:right;font-family:'IBM Plex Mono',ui-monospace,monospace">${fmt(inc)}</td></tr>
</table>

<div class="block" style="margin-top:24px;background:#f8fafc">
  <div class="label">Differ schedule</div>
  <div>All cylinders must be keyed to the master key system and differ references shown. Please confirm keying schedule matches this order before dispatch.</div>
</div>

${S.po_notes ? `<div class="block" style="margin-top:12px"><div class="label">Notes</div><div>${esc(S.po_notes)}</div></div>` : ""}

<div style="margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#64748b">
  LOXX — Master key systems made simple · myloxx.co.uk
</div>

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
