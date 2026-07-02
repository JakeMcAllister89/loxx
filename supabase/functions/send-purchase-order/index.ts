// Sends a supplier purchase order email for a confirmed LOXX order. v12
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
        gmk: trail.find(n => n.type === "GMK") ? "GMK" : "—",
        mk:  trail.find(n => n.type === "MK")?.label  ?? "—",
        smk: trail.find(n => n.type === "SMK")?.label ?? "—",
      };
    }
    if (node.type === "CE" && node.z_ref) {
      map[node.z_ref] = {
        gmk: trail.find(n => n.type === "GMK") ? "GMK" : "—",
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
  items.filter(i => i.item_type === "key" && i.differ_ref && i.room_label).forEach(i => {
    const key = `${i.differ_ref}__${i.room_label}`;
    map[key] = (map[key] ?? 0) + Number(i.quantity);
  });
  return map;
}

function buildCEDiffersMap(root: any): Record<string, string[]> {
  // For each CE node (z_ref), find all CYL nodes in the same building group
  // (i.e. CYL nodes that are siblings or cousins under the same primary CE ancestor).
  // Returns { "Z1": ["D001", "D002"], "Z1.1": ["D001", "D002"], "Z2": ["D003"] }
  const map: Record<string, string[]> = {};

  const collectCylDiffers = (node: any): string[] => {
    const differs: string[] = [];
    if (node.type === "CYL" && node.differ != null) {
      differs.push(`D${String(node.differ).padStart(3, "0")}`);
    }
    for (const child of node.children ?? []) {
      differs.push(...collectCylDiffers(child));
    }
    return differs;
  };

  const walkCE = (node: any) => {
    if (node.type === "CE" && node.z_ref) {
      // Collect all CYL differs that are siblings or descendants under this CE's children
      // (CYL children of this CE node directly, or under sub-CE children)
      const differs = collectCylDiffers(node);

      // Also include CYL differs from sub-CE children
      (node.children ?? []).filter((c: any) => c.type === "CE").forEach((sub: any) => {
        differs.push(...collectCylDiffers(sub));
      });

      // Deduplicate and sort
      const unique = Array.from(new Set(differs)).sort();
      map[node.z_ref] = unique;

      // Sub-CEs share the same differs as their primary CE
      (node.children ?? []).filter((c: any) => c.type === "CE" && c.z_ref).forEach((sub: any) => {
        map[sub.z_ref] = unique;
      });
    }

    // Recurse into sub-CE children ONLY if they are primary CEs (no dot in z_ref)
    // Sub-CEs (Z1.1, Z1.2) already had their map entry set above — do not overwrite
    for (const child of node.children ?? []) {
      if (child.type !== "CE") continue;
      if (child.z_ref && !child.z_ref.includes(".")) {
        walkCE(child);
      }
    }
  };

  // Walk from root — handle both CE children of GMK/MK/SMK and nested CEs
  const walkAll = (node: any) => {
    if (node.type === "CE") {
      walkCE(node);
    } else {
      for (const child of node.children ?? []) {
        walkAll(child);
      }
    }
  };

  if (root) walkAll(root);
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
    let systemTreeRoot: any = null;
    if (order.system_id) {
      const { data: sys } = await supabase
        .from("key_systems").select("name,reference,tree_data").eq("id", order.system_id).maybeSingle();
      if (sys) {
        systemRef = sys.reference ?? "—";
        systemName = sys.name ?? "";
        systemTreeRoot = (sys as any).tree_data?.root ?? null;
      }
    }

    // Assign PO number if missing — always save it so downloads reuse the same number
    let poNumber = order.po_number as string | null;
    if (!poNumber) {
      const { data: poRes, error: poErr } = await supabase.rpc("assign_po_number");
      if (poErr) return json({ error: `Could not assign PO number: ${poErr.message}` }, 500);
      poNumber = poRes as string;
      await supabase.from("orders").update({ po_number: poNumber }).eq("id", order.id);
    }
    const displayPo = poNumber ?? "PREVIEW";

    // Build hierarchy map from tree snapshot and extra keys map from line items
    const hierarchyMap = buildDifferHierarchyMap(systemTreeRoot);
    const extraKeysMap = buildDifferExtraKeysMap(items ?? []);

    const cylSubtotal = (items ?? [])
      .filter((i: any) => i.item_type === "cylinder")
      .reduce((sum: number, i: any) => {
        const unitCost = Number(productMap[i.product_code]?.cost_price ?? 0);
        return sum + unitCost * Number(i.quantity);
      }, 0);
    const keySubtotal = (items ?? [])
      .filter((i: any) => i.item_type === "key")
      .reduce((sum: number, i: any) => sum + Number(i.unit_price ?? 0) * Number(i.quantity), 0);
    const combinedSubtotal = cylSubtotal + keySubtotal;
    const deliveryCharge = Number((order as any).delivery_charge ?? 0);
    const exVat = combinedSubtotal + deliveryCharge;
    const vatRate = Number(S.vat_rate ?? 20);
    const vat = +(exVat * vatRate / 100).toFixed(2);
    const inc = +(exVat + vat).toFixed(2);

    const d = (order.delivery_address ?? {}) as any;
    const contactCompany = d.company_name ?? "";
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

    const ceDiffersMap = buildCEDiffersMap(systemTreeRoot);

    const isGrouped = zoneGroups.size > 1;

    const differRows = Array.from(zoneGroups.values()).map(({ zoneLabel, rows }) => {
      const header = isGrouped
        ? `<tr><td colspan="15" style="background:#f1f5f9;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#475569;font-weight:600">${esc(zoneLabel)}</td></tr>`
        : "";
      const dataRows = rows.map((i: any) => {
        const p = productMap[i.product_code] ?? {};
        const hierarchy = hierarchyMap[i.differ_ref ?? ""] ?? { gmk: "—", mk: "—", smk: "—" };
        const extraKeys = extraKeysMap[`${i.differ_ref ?? ""}__${i.room_label ?? ""}`] ?? 0;
        const unitCost = Number(p.cost_price ?? 0);
        const totalCost = unitCost * Number(i.quantity);
        const isCERow = /^Z/i.test(i.differ_ref ?? "");
        const ceDiffers = isCERow ? (ceDiffersMap[i.differ_ref ?? ""] ?? []) : [];
        const ceNote = isCERow && ceDiffers.length > 0
          ? `<tr><td colspan="15" style="padding:2px 10px 8px 10px;font-size:10px;color:#64748b;font-style:italic;border-bottom:1px solid #e2e8f0">Operated by differ keys: ${esc(ceDiffers.join(", "))}</td></tr>`
          : "";
        return `<tr>
          <td style="font-family:ui-monospace,monospace;font-weight:600">${esc(i.differ_ref ?? "—")}</td>
          <td>${esc(i.room_label ?? "—")}</td>
          <td>${esc(hierarchy.gmk)}</td>
          <td>${esc(hierarchy.mk)}</td>
          <td>${esc(hierarchy.smk)}</td>
          <td style="font-size:11px;color:#64748b">${esc(i.product_code ?? "—")}</td>
          <td style="color:#0f172a">${esc(i.cylinder_type ?? p.cylinder_type ?? "—")}</td>
          <td style="color:#0f172a">${esc(p.cylinder_profile ?? "—")}</td>
          <td>${esc(i.finish ?? p.finish ?? "—")}</td>
          <td>${esc(p.size ?? "—")}</td>
          <td style="text-align:right">${i.quantity}</td>
          <td style="text-align:right">${isCERow ? "—" : "2"}</td>
          <td style="text-align:right">${extraKeys > 0 ? extraKeys : "—"}</td>
          <td style="text-align:right;font-family:ui-monospace,monospace">${fmt(unitCost)}</td>
          <td style="text-align:right;font-family:ui-monospace,monospace">${fmt(totalCost)}</td>
        </tr>${ceNote}`;
      }).join("");
      return header + dataRows;
    }).join("");

    const keyItems = (items ?? []).filter((i: any) => i.item_type === "key");
    const masterKeyItems = keyItems.filter((i: any) => !i.differ_ref);
    const extraKeyItems  = keyItems.filter((i: any) => !!i.differ_ref);

    const masterKeyRows = masterKeyItems.map((i: any) => {
      const total = Number(i.unit_price ?? 0) * Number(i.quantity);
      return `<tr>
        <td style="color:#64748b">—</td>
        <td colspan="4" style="font-weight:500">${esc(i.key_reference ?? i.room_label ?? "—")}</td>
        <td colspan="4" style="color:#64748b;font-size:11px">Master / sub-master key</td>
        <td style="text-align:right">${i.quantity}</td>
        <td style="text-align:right;color:#64748b">—</td>
        <td style="text-align:right;color:#64748b">—</td>
        <td style="text-align:right">${fmt(Number(i.unit_price ?? 0))}</td>
        <td style="text-align:right">${fmt(total)}</td>
      </tr>`;
    }).join("");

    const extraKeyRows = extraKeyItems.map((i: any) => {
      const total = Number(i.unit_price ?? 0) * Number(i.quantity);
      return `<tr>
        <td style="color:#b45309;font-weight:500">${esc(i.differ_ref ?? "—")}</td>
        <td colspan="4">${esc(i.key_reference ?? i.room_label ?? "—")}</td>
        <td colspan="4" style="color:#64748b;font-size:11px">Additional differ key</td>
        <td style="text-align:right">${i.quantity}</td>
        <td style="text-align:right;color:#64748b">—</td>
        <td style="text-align:right;color:#64748b">—</td>
        <td style="text-align:right">${fmt(Number(i.unit_price ?? 0))}</td>
        <td style="text-align:right">${fmt(total)}</td>
      </tr>`;
    }).join("");



    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(displayPo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#0f172a;padding:32px;max-width:960px;margin:0 auto;font-size:13px}
h1{margin:0;font-size:24px}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
th{background:#f8fafc;text-transform:uppercase;font-size:10px;letter-spacing:.5px;color:#475569}
.warn{background:#fef3c7;border:1px solid #fcd34d;padding:8px 12px;border-radius:6px;font-size:12px;color:#92400e;margin:16px 0}
.muted{color:#64748b;font-size:12px}
.po{font-family:ui-monospace,monospace;color:#b45309;font-size:18px}
.block{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-top:12px}
.label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:4px}
.totals{margin-top:12px;width:300px;margin-left:auto}
.totals td{border:none;padding:4px 8px}
.totals .grand{border-top:2px solid #0f172a;font-weight:700;font-size:14px}
@media print { @page { margin: 16mm; } .noprint { display: none } }
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #0f172a;margin-bottom:4px">
  <div>
    <div style="display:flex;align-items:center;gap:10px">
      <span style="display:inline-flex;align-items:center;justify-content:center;background:#f59e0b;border-radius:6px;padding:6px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>
        </svg>
      </span>
      <span style="font-size:22px;font-weight:700;letter-spacing:1px">${esc(S.company_name || "LOXX")}</span>
    </div>
    ${S.company_address ? `<div style="font-size:11px;color:#64748b;margin-top:6px;margin-left:38px;white-space:pre-line">${esc(S.company_address)}</div>` : ""}
    ${S.company_email ? `<div style="font-size:11px;color:#64748b;margin-left:38px">${esc(S.company_email)}</div>` : ""}
    ${S.company_phone ? `<div style="font-size:11px;color:#64748b;margin-left:38px">${esc(S.company_phone)}</div>` : ""}
  </div>
  <div style="text-align:right">
    <div style="font-size:28px;font-weight:700;letter-spacing:1px;margin-bottom:8px">PURCHASE ORDER</div>
    <div style="display:grid;grid-template-columns:auto auto;gap:2px 16px;font-size:12px">
      <div style="color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-size:10px">Purchase Order Number</div>
      <div style="font-family:ui-monospace,monospace;font-weight:600;color:#b45309">${esc(displayPo)}</div>
      <div style="color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-size:10px">Date</div>
      <div>${esc(today)}</div>
      <div style="color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.5px;font-size:10px">VAT Number</div>
      <div>${esc(S.vat_number || "—")}</div>
    </div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:16px">
  <div>
    <div class="label">Supplier</div>
    <div style="font-weight:600">${esc(S.supplier_name || "—")}</div>
    ${S.supplier_email ? `<div class="muted">${esc(S.supplier_email)}</div>` : ""}
    ${S.supplier_account ? `<div class="muted">Account: ${esc(S.supplier_account)}</div>` : ""}
  </div>
  <div>
    <div class="label">Order reference</div>
    <div style="margin-bottom:2px"><span class="muted" style="font-size:10px">System</span><br/><span style="font-family:ui-monospace,monospace;font-size:11px">${esc(systemRef)}</span></div>
    <div style="margin-bottom:2px"><span class="muted" style="font-size:10px">Customer Reference</span><br/>${esc(order.customer_po_ref || "—")}</div>
    ${(order as any).project_name ? `<div style="margin-bottom:2px"><span class="muted" style="font-size:10px">Project name</span><br/>${esc((order as any).project_name)}</div>` : ""}
  </div>
  <div>
    <div class="label">Deliver to</div>
    ${contactCompany ? `<div style="font-weight:600">${esc(contactCompany)}</div>` : ""}
    <div style="font-weight:${contactCompany ? "400" : "600"}">${esc(contactName)}</div>
    <div class="muted">${esc(contactPhone)}</div>
    <div class="muted" style="margin-top:4px">${esc(addrLine)}</div>
    ${(order as any).notes ? `<div style="margin-top:8px"><span class="label">Special instructions</span><div style="font-size:12px;color:#0f172a;white-space:pre-wrap;margin-top:2px">${esc((order as any).notes)}</div></div>` : ""}
  </div>
</div>

<div class="warn" style="margin-top:16px"><strong>Internal use only.</strong> Unit costs shown are supplier prices. DO NOT share with end customer.</div>

<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:24px;margin-bottom:8px;border-bottom:2px solid #0f172a;padding-bottom:4px">
  <h3 style="margin:0">Cylinder Schedule</h3>
</div>
<table>
  <thead><tr>
    <th>Differ</th>
    <th>Room / Door</th>
    <th>GMK</th>
    <th>MK</th>
    <th>SMK</th>
    <th>Product Code</th>
    <th>Lock type</th>
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

${(masterKeyRows || extraKeyRows) ? `
<h3 style="margin-top:24px;margin-bottom:8px">Key Schedule</h3>
<table>
  <thead><tr>
    <th>Differ</th>
    <th colspan="4">Key reference / description</th>
    <th colspan="4">Type</th>
    <th style="text-align:right">Qty</th>
    <th style="text-align:right">Keys (inc.)</th>
    <th style="text-align:right">Extra keys</th>
    <th style="text-align:right">Unit cost</th>
    <th style="text-align:right">Total cost</th>
  </tr></thead>
  <tbody>
    ${masterKeyRows ? `<tr><td colspan="15" style="background:#f1f5f9;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#475569;font-weight:600">Master &amp; Sub-Master Keys</td></tr>${masterKeyRows}` : ""}
    ${extraKeyRows ? `<tr><td colspan="15" style="background:#f1f5f9;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#475569;font-weight:600">Additional Differ Keys</td></tr>${extraKeyRows}` : ""}
  </tbody>
</table>` : ""}

<table class="totals">
  <tr><td>Subtotal (cost)</td><td style="text-align:right;font-family:ui-monospace,monospace">${fmt(combinedSubtotal)}</td></tr>
  ${deliveryCharge > 0 ? `<tr><td>Delivery Charge</td><td style="text-align:right;font-family:ui-monospace,monospace">${fmt(deliveryCharge)}</td></tr>` : ""}
  <tr><td>Subtotal ex VAT</td><td style="text-align:right;font-family:ui-monospace,monospace">${fmt(exVat)}</td></tr>
  <tr><td>VAT at ${esc(String(vatRate))}%</td><td style="text-align:right;font-family:ui-monospace,monospace">${fmt(vat)}</td></tr>
  <tr class="grand"><td>Total inc VAT</td><td style="text-align:right;font-family:ui-monospace,monospace">${fmt(inc)}</td></tr>
</table>

<div class="block" style="margin-top:24px;background:#f8fafc">
  <div class="label">Cylinder schedule note</div>
  <div>All cylinders must be keyed to the master key system and differ references shown. Please confirm keying schedule matches this order before dispatch.</div>
</div>

${(order as any).notes ? `
<div class="block" style="margin-top:12px;border-left:3px solid #b45309;background:#fff7ed">
  <div class="label">Special instructions from customer</div>
  <div style="white-space:pre-wrap;color:#0f172a">${esc((order as any).notes)}</div>
</div>` : ""}
${S.po_notes ? `<div class="block" style="margin-top:12px"><div class="label">Standard notes</div><div>${esc(S.po_notes)}</div></div>` : ""}

<div style="margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#64748b">
  LOXX — Master key systems made simple · myloxx.co.uk
</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 800);
  };
</script>
<div class="noprint" style="position:fixed;bottom:24px;right:24px;z-index:999">
  <button onclick="window.print()" style="padding:10px 20px;background:#b45309;color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:13px;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,0.15)">
    🖨 Print / Save as PDF
  </button>
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

    const fromAddr = `${S.company_name || "My LOXX"} <orders@myloxx.co.uk>`;
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
    return json({ error: "Server error" }, 500);
  }
});
