import { supabase } from "@/integrations/supabase/client";

interface OrderRow {
  id: string;
  created_at: string;
  status: string;
  subtotal: number | string;
  vat: number | string;
  total: number | string;
  customer_name: string | null;
  customer_email: string | null;
  company: string | null;
  delivery_address: any;
  purchase_order_ref: string | null;
  customer_po_ref?: string | null;
  notes: string | null;
  system_id?: string | null;
}

interface ItemRow {
  id: string;
  item_type: string;
  product_code: string | null;
  cylinder_type: string | null;
  finish: string | null;
  size?: string | null;
  room_label: string | null;
  differ_ref: string | null;
  key_reference?: string | null;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
}

function esc(s: any): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function fmt(n: number | string) {
  return `£${Number(n || 0).toFixed(2)}`;
}

export function invoiceRef(orderId: string) {
  return `INV-${orderId.slice(0, 8).toUpperCase()}`;
}

export function orderRef(orderId: string) {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

export async function downloadInvoice(orderId: string) {
  const [{ data: order }, { data: items }, { data: settings }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).single(),
    supabase.from("order_items").select("*").eq("order_id", orderId),
    supabase.from("admin_settings").select("key,value"),
  ]);
  if (!order) throw new Error("Order not found");
  const s = Object.fromEntries((settings ?? []).map((r: any) => [r.key, r.value]));

  const codes = Array.from(new Set((items ?? []).map((i: any) => i.product_code).filter(Boolean)));
  const productMap: Record<string, any> = {};
  if (codes.length) {
    const { data: prods } = await supabase
      .from("products")
      .select("code,cylinder_profile,product_description,name,size")
      .in("code", codes as string[]);
    (prods ?? []).forEach((p: any) => (productMap[p.code] = p));
  }

  const hierarchyMap: Record<string, { mk: string; smk: string }> = {};
  const treeRoot = (order as any).tree_snapshot?.root ?? (order as any).tree_snapshot;
  if (treeRoot) {
    const walk = (node: any, trail: any[]) => {
      if (node.type === "CYL" && node.differ != null) {
        const ref = `D${String(node.differ).padStart(3, "0")}`;
        hierarchyMap[ref] = {
          mk:  trail.find((n: any) => n.type === "MK")?.label  ?? "",
          smk: trail.find((n: any) => n.type === "SMK")?.label ?? "",
        };
      }
      for (const child of node.children ?? []) walk(child, [...trail, node]);
    };
    walk(treeRoot, []);
  }

  let systemRef: string | null = null;
  let systemName: string | null = null;

  if ((order as any).system_id) {
    const { data: sys } = await supabase.from("key_systems").select("reference,name").eq("id", (order as any).system_id).single();
    systemRef = sys?.reference ?? null;
    systemName = sys?.name ?? null;
  }

  const html = renderInvoiceHtml(order as OrderRow, (items ?? []) as ItemRow[], s, systemRef, systemName, productMap, hierarchyMap);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function renderInvoiceHtml(
  order: OrderRow,
  items: ItemRow[],
  s: Record<string, string>,
  systemRef: string | null,
  productMap: Record<string, any> = {},
  hierarchyMap: Record<string, { mk: string; smk: string }> = {},
): string {
  const inv = invoiceRef(order.id);
  const ord = orderRef(order.id);
  const date = new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const d = order.delivery_address || {};
  const companyName = s.company_name || "LOXX";
  const companyAddr = s.company_address || "";
  const companyEmail = s.company_email || "";
  const companyPhone = s.company_phone || "";

  const cylItems = items.filter(i => i.item_type === "cylinder");
  const keyItems = items.filter(i => i.item_type === "key");

  const zoneMap = new Map<string, { zone: string; rows: ItemRow[] }>();
  cylItems.forEach(it => {
    const h = hierarchyMap[it.differ_ref ?? ""] ?? { mk: "", smk: "" };
    const zoneKey = h.smk || h.mk || "General";
    const existing = zoneMap.get(zoneKey);
    if (existing) existing.rows.push(it);
    else zoneMap.set(zoneKey, { zone: zoneKey, rows: [it] });
  });
  const zones = Array.from(zoneMap.values());
  const isGrouped = zones.length > 1;

  const groupHeader = (label: string) =>
    `<tr><td colspan="9" style="padding:10px 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:600;background:#f8fafc">${esc(label)}</td></tr>`;

  const cylRows = zones.map(({ zone, rows }) => {
    const header = isGrouped ? groupHeader(zone) : "";
    const dataRows = rows.map(it => {
      const p = productMap[it.product_code ?? ""] ?? {};
      const profile = p.cylinder_profile ?? "—";
      const size = it.size ?? p.size ?? "—";
      return `<tr>
        <td style="color:#b45309;font-weight:500">${esc(it.differ_ref ?? "—")}</td>
        <td>${esc(it.room_label ?? "—")}</td>
        <td class="mono muted">${esc(it.product_code ?? "—")}</td>
        <td>${esc(profile)}</td>
        <td>${esc(it.finish ?? "—")}</td>
        <td>${esc(size)}</td>
        <td class="num">${it.quantity}</td>
        <td class="num">${fmt(it.unit_price)}</td>
        <td class="num">${fmt(it.line_total)}</td>
      </tr>`;
    }).join("");
    return header + dataRows;
  }).join("");

  const keyHeader = keyItems.length > 0 ? groupHeader("Keys") : "";
  const keyRows = keyItems.map(it => `<tr>
    <td style="color:#b45309;font-weight:500">${esc(it.differ_ref ?? "—")}</td>
    <td colspan="5">${esc(it.key_reference ?? it.room_label ?? "—")}</td>
    <td class="num">${it.quantity}</td>
    <td class="num">${fmt(it.unit_price)}</td>
    <td class="num">${fmt(it.line_total)}</td>
  </tr>`).join("");

  const subtotal = Number(order.subtotal || 0);
  const vat = Number(order.vat || 0);
  const total = Number(order.total || 0);

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${esc(inv)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#0f172a;margin:40px;max-width:900px;font-size:13px}
  h1{font-size:28px;margin:0;letter-spacing:.02em}
  .ref{color:#b45309;font-weight:600}
  .mono{font-family:ui-monospace,Menlo,monospace}
  .muted{color:#64748b}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px}
  .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
  th{padding:8px 10px;background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#475569;text-align:left;border-bottom:2px solid #e2e8f0}
  td{padding:8px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .totals{margin-top:20px;margin-left:auto;width:320px;font-size:13px}
  .totals .row{display:flex;justify-content:space-between;padding:5px 0}
  .totals .grand{font-size:16px;font-weight:700;border-top:2px solid #0f172a;margin-top:6px;padding-top:8px;color:#b45309}
  .foot{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center}
  .head{display:flex;justify-content:space-between;align-items:flex-start}
  .right{text-align:right}
  @media print{body{margin:0;max-width:100%}.noprint{display:none}@page{margin:18mm 16mm}}
</style></head><body>
<div class="head">
  <div>
    <div style="font-weight:700;font-size:20px;color:#b45309">${esc(companyName)}</div>
    <div class="muted">${esc(companyAddr)}</div>
    ${companyEmail ? `<div class="muted">${esc(companyEmail)}</div>` : ""}
    ${companyPhone ? `<div class="muted">${esc(companyPhone)}</div>` : ""}
  </div>
  <div class="right">
    <h1>INVOICE</h1>
    <div class="ref" style="margin-top:6px">${esc(inv)}</div>
    <div class="muted" style="margin-top:4px">${esc(date)}</div>
  </div>
</div>

<div class="grid">
  <div>
    <div class="lbl">Billed to</div>
    <div style="font-weight:600">${esc(order.customer_name || "")}</div>
    ${order.company ? `<div>${esc(order.company)}</div>` : ""}
    ${order.customer_email ? `<div class="muted">${esc(order.customer_email)}</div>` : ""}
    ${d.contact_name || d.contact_phone ? `<div class="muted" style="margin-top:6px">${esc(d.contact_name || "")}${d.contact_phone ? ` · ${esc(d.contact_phone)}` : ""}</div>` : ""}
    <div class="muted" style="margin-top:4px">${[d.line1, d.line2, d.city, d.county, d.postcode].filter(Boolean).map(esc).join(", ")}</div>
  </div>
  <div>
    <div class="lbl">Order details</div>
    <div><span class="muted">Order ref:</span> <span class="ref">${esc(ord)}</span></div>
    ${systemRef ? `<div><span class="muted">System ref:</span> <span class="ref">${esc(systemRef)}</span></div>` : ""}
    ${order.customer_po_ref || order.purchase_order_ref ? `<div><span class="muted">PO ref:</span> ${esc(order.customer_po_ref || order.purchase_order_ref)}</div>` : ""}
    <div><span class="muted">Payment date:</span> ${esc(date)}</div>
  </div>
</div>

<table>
  <thead><tr>
    <th>Differ</th>
    <th>Room / Door</th>
    <th>Product code</th>
    <th>Lock function</th>
    <th>Finish</th>
    <th>Size</th>
    <th class="num">Qty</th>
    <th class="num">Unit price</th>
    <th class="num">Total</th>
  </tr></thead>
  <tbody>
    ${cylRows}
    ${keyHeader}${keyRows}
    ${!cylRows && !keyRows ? `<tr><td colspan="9" class="muted">No items</td></tr>` : ""}
  </tbody>
</table>

<div class="totals">
  <div class="row"><span>Subtotal (ex VAT)</span><span>${fmt(subtotal)}</span></div>
  <div class="row"><span>VAT (${esc(s.vat_rate || "20")}%)</span><span>${fmt(vat)}</span></div>
  <div class="row grand"><span>Total inc VAT</span><span>${fmt(total)}</span></div>
</div>

<div class="foot">
  Thank you for your order. ${esc(companyName)}${companyEmail ? ` · ${esc(companyEmail)}` : ""}${companyPhone ? ` · ${esc(companyPhone)}` : ""}
  ${s.vat_number ? `<div style="margin-top:4px">VAT no. ${esc(s.vat_number)}</div>` : ""}
  <div style="margin-top:6px">LOXX — Master key systems made simple · myloxx.co.uk</div>
</div>

<div class="noprint" style="margin-top:24px;text-align:center"><button onclick="window.print()" style="padding:8px 16px;background:#b45309;color:#fff;border:0;border-radius:6px;cursor:pointer">Print / Save as PDF</button></div>
</body></html>`;
}
