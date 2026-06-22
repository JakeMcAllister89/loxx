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
  room_label: string | null;
  differ_ref: string | null;
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

  let systemRef: string | null = null;
  if (order.system_id) {
    const { data: sys } = await supabase.from("key_systems").select("reference").eq("id", order.system_id).single();
    systemRef = sys?.reference ?? null;
  }

  const html = renderInvoiceHtml(order as OrderRow, (items ?? []) as ItemRow[], s, systemRef);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function renderInvoiceHtml(order: OrderRow, items: ItemRow[], s: Record<string, string>, systemRef: string | null): string {
  const inv = invoiceRef(order.id);
  const ord = orderRef(order.id);
  const date = new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const d = order.delivery_address || {};
  const companyName = s.company_name || "LOXX";
  const companyAddr = s.company_address || "";
  const companyEmail = s.company_email || "";
  const companyPhone = s.company_phone || "";

  const itemRows = items.map((it) => {
    const isKey = it.item_type === "key";
    const desc = isKey
      ? `${it.room_label || "Key"}${it.differ_ref ? ` — ${it.differ_ref}` : ""}`
      : [
          it.product_code || it.cylinder_type || "Cylinder",
          [it.cylinder_type, it.finish].filter(Boolean).join(" · "),
          it.room_label && it.differ_ref ? `${it.room_label} (${it.differ_ref})` : (it.room_label || it.differ_ref || ""),
        ].filter(Boolean).join(" — ");
    return `<tr>
      <td>${esc(desc)}</td>
      <td class="num">${it.quantity}</td>
      <td class="num">${fmt(it.unit_price)}</td>
      <td class="num">${fmt(it.line_total)}</td>
    </tr>`;
  }).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${esc(inv)}</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Inter,sans-serif;color:#0f172a;margin:40px;max-width:820px}
  h1{font-size:32px;margin:0;letter-spacing:.02em}
  .ref{font-family:ui-monospace,Menlo,monospace;color:#b45309;font-weight:600}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:32px}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
  th,td{padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}
  th{background:#f8fafc;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#475569}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .totals{margin-top:24px;margin-left:auto;width:320px;font-size:14px}
  .totals .row{display:flex;justify-content:space-between;padding:6px 0}
  .totals .grand{font-size:18px;font-weight:700;border-top:2px solid #0f172a;margin-top:6px;padding-top:10px;color:#b45309}
  .foot{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b}
  .head{display:flex;justify-content:space-between;align-items:flex-start}
  .right{text-align:right}
  .muted{color:#64748b;font-size:12px}
  @media print { body{margin:20px} .noprint{display:none} }
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
    <div class="label">Billed to</div>
    <div style="font-weight:600">${esc(order.customer_name || "")}</div>
    ${order.company ? `<div>${esc(order.company)}</div>` : ""}
    ${order.customer_email ? `<div class="muted">${esc(order.customer_email)}</div>` : ""}
    ${d.contact_name || d.contact_phone ? `<div class="muted" style="margin-top:6px">Delivery contact: ${esc(d.contact_name || "")}${d.contact_phone ? ` · ${esc(d.contact_phone)}` : ""}</div>` : ""}
    <div class="muted" style="margin-top:4px">
      ${[d.line1, d.line2, d.city, d.county, d.postcode].filter(Boolean).map(esc).join("<br/>")}
    </div>
  </div>
  <div>
    <div class="label">Order details</div>
    <div><span class="muted">Order ref:</span> <span class="ref">${esc(ord)}</span></div>
    ${systemRef ? `<div><span class="muted">System ref:</span> <span class="ref">${esc(systemRef)}</span></div>` : ""}
    ${order.customer_po_ref || order.purchase_order_ref ? `<div><span class="muted">Your PO ref:</span> ${esc(order.customer_po_ref || order.purchase_order_ref)}</div>` : ""}
    <div><span class="muted">Payment method:</span> Stripe</div>
    <div><span class="muted">Payment date:</span> ${esc(date)}</div>
  </div>
</div>

<table>
  <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Total</th></tr></thead>
  <tbody>${itemRows || `<tr><td colspan="4" class="muted">No items</td></tr>`}</tbody>
</table>

<div class="totals">
  <div class="row"><span>Subtotal (ex VAT)</span><span>${fmt(order.subtotal)}</span></div>
  <div class="row"><span>VAT (${esc(s.vat_rate || "20")}%)</span><span>${fmt(order.vat)}</span></div>
  <div class="row grand"><span>Total inc VAT</span><span>${fmt(order.total)}</span></div>
</div>

<div class="foot">
  Thank you for your order.<br/>
  ${esc(companyName)}${companyEmail ? ` · ${esc(companyEmail)}` : ""}${companyPhone ? ` · ${esc(companyPhone)}` : ""}
  ${s.vat_number ? `<div style="margin-top:4px">VAT no. ${esc(s.vat_number)}</div>` : ""}
</div>

<div class="noprint" style="margin-top:24px"><button onclick="window.print()" style="padding:8px 16px;background:#b45309;color:#fff;border:0;border-radius:6px;cursor:pointer">Print / Save as PDF</button></div>
</body></html>`;
}
