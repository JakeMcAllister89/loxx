// v2
// Creates a BACS pro-forma order — mirrors create-checkout order/item/commission
// creation but skips Stripe. Sends pro-forma invoice email via Resend.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

interface CartLine {
  kind: "cylinder" | "key" | "delivery";
  product_code?: string;
  product_name?: string;
  cylinder_type?: string;
  cylinder_profile?: string;
  finish?: string;
  size?: string;
  room_label?: string;
  differ_ref?: string;
  key_reference?: string;
  quantity: number;
  unit_price: number;
}

interface DeliveryAddress {
  contact_name?: string; contact_phone?: string;
  line1?: string; line2?: string; city?: string; county?: string; postcode?: string;
}

interface Body {
  items: CartLine[];
  systemId?: string | null;
  customer?: { name?: string; company?: string };
  customerPoRef?: string;
  poRef?: string;
  notes?: string;
  delivery?: DeliveryAddress;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const escapeHtml = (s: unknown) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const gbp = (n: number) => `£${Number(n).toFixed(2)}`;

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return jsonError("Unauthorized — please sign in again", 401);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return jsonError("Unauthorized — please sign in again", 401);

    let body: Body;
    try { body = (await req.json()) as Body; }
    catch { return jsonError("Invalid request body"); }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return jsonError("Your basket is empty — please add items before ordering");
    }
    const d = body.delivery ?? {};
    if (!d.contact_name || !d.contact_phone || !d.line1 || !d.city || !d.postcode) {
      return jsonError("Delivery contact and address are required (contact name, phone, line 1, city, postcode)");
    }

    const items = body.items.map((it) => ({
      ...it,
      quantity: Math.max(1, Math.min(999, Math.floor(Number(it.quantity) || 1))),
      unit_price: Math.max(0, Math.min(100000, Number(it.unit_price) || 0)),
    }));

    const productItems = items.filter((it) => it.kind !== "delivery");
    const deliveryItem = items.find((it) => it.kind === "delivery");
    const subtotal = productItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const deliveryCharge = deliveryItem?.unit_price ?? 0;
    if (subtotal <= 0) return jsonError("Order total must be greater than zero");

    const vat = +((subtotal + deliveryCharge) * 0.2).toFixed(2);
    const total = +(subtotal + deliveryCharge + vat).toFixed(2);

    const deliveryText = [d.line1, d.line2, d.city, d.county, d.postcode].filter(Boolean).join(", ");
    const combinedNotes = [
      body.notes,
      deliveryText ? `Delivery: ${deliveryText}` : null,
      body.customerPoRef ? `Customer PO: ${body.customerPoRef}` : null,
    ].filter(Boolean).join(" | ") || null;

    const orderInsert: Record<string, unknown> = {
      user_id: user.id,
      status: "pending_bacs",
      subtotal,
      vat: 0,
      total: subtotal + deliveryCharge,
      delivery_charge: deliveryCharge,
      customer_email: user.email,
      customer_name: body.customer?.name ?? null,
      company: body.customer?.company ?? null,
      system_id: body.systemId ?? null,
      purchase_order_ref: body.poRef ?? body.customerPoRef ?? null,
      customer_po_ref: body.customerPoRef ?? null,
      notes: combinedNotes,
      delivery_address: body.delivery ?? null,
      payment_method: "bacs",
      payment_status: "unpaid",
    };

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert(orderInsert)
      .select("id")
      .single();
    if (orderErr || !order) return jsonError(`Failed to create order: ${orderErr?.message}`, 500);

    // Snapshot commission rate
    let commissionPct: number | null = null;
    if (body.systemId) {
      const { data: sys } = await supabase
        .from("key_systems")
        .select("commission_pct, partner_id, partners:partner_id (default_commission_pct, is_active)")
        .eq("id", body.systemId)
        .maybeSingle();
      if (sys?.partner_id) {
        const partner = (sys as any).partners;
        const sysPct = (sys as any).commission_pct;
        const defPct = partner?.default_commission_pct;
        commissionPct = typeof sysPct === "number" ? sysPct
          : typeof defPct === "number" ? Number(defPct)
          : 0;
      }
    }

    const itemRows = productItems.map((it) => {
      const line_total = it.quantity * it.unit_price;
      const commission_amount = commissionPct != null
        ? Math.round(line_total * commissionPct) / 100
        : null;
      return {
        order_id: order.id,
        item_type: it.kind,
        product_code: it.product_code ?? null,
        cylinder_type: it.cylinder_type ?? null,
        finish: it.finish ?? null,
        room_label: it.room_label ?? null,
        key_reference: it.key_reference ?? null,
        differ_ref: it.differ_ref ?? null,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total,
        commission_pct: commissionPct,
        commission_amount,
      };
    });
    const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
    if (itemsErr) return jsonError(`Failed to write order items: ${itemsErr.message}`, 500);

    const orderRef = order.id.slice(0, 8).toUpperCase();

    // Load admin settings
    const settingKeys = [
      "company_name", "company_address", "company_phone", "company_email", "company_logo_url",
      "vat_number", "vat_rate",
      "bank_name", "bank_sort_code", "bank_account_number", "bank_account_name",
    ];
    const { data: settingsRows } = await supabase
      .from("admin_settings").select("key,value").in("key", settingKeys);
    const s: Record<string, string> = {};
    (settingsRows ?? []).forEach((r: any) => (s[r.key] = r.value ?? ""));

    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const lineRowsHtml: string[] = [];
    for (const it of productItems) {
      const desc = it.kind === "key"
        ? `Key — ${escapeHtml(it.key_reference ?? "blank")}${it.product_name ? ` · ${escapeHtml(it.product_name)}` : ""}`
        : `${escapeHtml(it.product_name ?? it.product_code ?? "Cylinder")}${it.room_label ? ` · ${escapeHtml(it.room_label)}` : ""}${it.differ_ref ? ` · ${escapeHtml(it.differ_ref)}` : ""}${it.finish ? ` · ${escapeHtml(it.finish)}` : ""}`;
      const lineTotal = it.quantity * it.unit_price;
      lineRowsHtml.push(`
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;">${desc}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;text-align:center;">${it.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;text-align:right;">${gbp(it.unit_price)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;text-align:right;">${gbp(lineTotal)}</td>
        </tr>`);
    }
    if (deliveryCharge > 0) {
      lineRowsHtml.push(`
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;">Delivery</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;text-align:center;">1</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;text-align:right;">${gbp(deliveryCharge)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;text-align:right;">${gbp(deliveryCharge)}</td>
        </tr>`);
    }

    const customerName = body.customer?.name ?? "";
    const customerCompany = body.customer?.company ?? "";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Pro-Forma Invoice ${orderRef}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:680px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:24px;font-weight:700;letter-spacing:1px;color:#0f172a;">LOXX</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;text-transform:uppercase;letter-spacing:1px;">Pro-Forma Invoice</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px;color:#6b7280;">Reference</div>
          <div style="font-size:16px;font-weight:600;color:#0f172a;font-family:monospace;">${escapeHtml(orderRef)}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">${escapeHtml(dateStr)}</div>
        </div>
      </div>

      <div style="padding:24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td valign="top" style="width:50%;padding-right:12px;">
              <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Bill To</div>
              <div style="font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(customerName || user.email)}</div>
              ${customerCompany ? `<div style="font-size:13px;color:#374151;">${escapeHtml(customerCompany)}</div>` : ""}
              <div style="font-size:13px;color:#6b7280;">${escapeHtml(user.email ?? "")}</div>
            </td>
            <td valign="top" style="width:50%;padding-left:12px;border-left:1px solid #f1f5f9;">
              <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Payment Details</div>
              <div style="font-size:13px;color:#1f2937;line-height:1.6;">
                <div><strong>Bank:</strong> ${escapeHtml(s.bank_name || "—")}</div>
                <div><strong>Sort code:</strong> ${escapeHtml(s.bank_sort_code || "—")}</div>
                <div><strong>Account:</strong> ${escapeHtml(s.bank_account_number || "—")}</div>
                <div><strong>Account name:</strong> ${escapeHtml(s.bank_account_name || "—")}</div>
              </div>
            </td>
          </tr>
        </table>

        <div style="margin-top:20px;padding:14px 16px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;font-size:13px;color:#78350f;line-height:1.5;">
          <strong>Payment required before order is processed.</strong> Please use your order reference
          <span style="font-family:monospace;font-weight:700;">${escapeHtml(orderRef)}</span>
          as the payment reference. Once payment is received your order will be confirmed and dispatched within 3–5 working days.
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:24px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;">Description</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;">Qty</th>
              <th style="padding:10px 8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;">Unit price</th>
              <th style="padding:10px 8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;">Line total</th>
            </tr>
          </thead>
          <tbody>${lineRowsHtml.join("")}</tbody>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;">
          <tr><td></td><td style="width:200px;">
            <div style="font-size:13px;color:#374151;display:flex;justify-content:space-between;padding:4px 0;">
              <span>Subtotal (ex VAT)</span><span style="font-family:monospace;">${gbp(subtotal + deliveryCharge)}</span>
            </div>
            <div style="font-size:13px;color:#374151;display:flex;justify-content:space-between;padding:4px 0;">
              <span>VAT (20%)</span><span style="font-family:monospace;">${gbp(vat)}</span>
            </div>
            <div style="font-size:15px;color:#0f172a;font-weight:700;display:flex;justify-content:space-between;padding:8px 0 4px;border-top:2px solid #0f172a;margin-top:4px;">
              <span>Total inc VAT</span><span style="font-family:monospace;">${gbp(total)}</span>
            </div>
          </td></tr>
        </table>
      </div>

      <div style="padding:18px 28px;background:#f9fafb;border-top:1px solid #eee;font-size:11px;color:#6b7280;line-height:1.6;text-align:center;">
        This pro-forma invoice is not a VAT invoice. A full VAT invoice will be issued on dispatch.<br/>
        LOXX · myloxx.co.uk${s.company_email ? ` · ${escapeHtml(s.company_email)}` : ""}${s.vat_number ? ` · VAT No. ${escapeHtml(s.vat_number)}` : ""}
      </div>
    </div>
  </div>
</body></html>`;

    // Send via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && user.email) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "My LOXX Orders <orders@myloxx.co.uk>",
            to: [user.email],
            subject: `Pro-Forma Invoice — Order ${orderRef} — Payment Required`,
            html,
          }),
        });
        if (!res.ok) {
          console.error("Resend customer email failed", res.status, await res.text());
        }
        // Internal notification
        if (s.company_email) {
          const notifyText = `New BACS order received — awaiting payment.

Reference: ${orderRef}
Customer: ${customerName || "(no name)"}
Company:  ${customerCompany || "(no company)"}
Email:    ${user.email}
Total:    ${gbp(total)}

The customer has been sent a pro-forma invoice with bank details.`;
          const res2 = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "My LOXX Orders <orders@myloxx.co.uk>",
              to: [s.company_email],
              subject: `New BACS Order — ${orderRef} — Awaiting Payment`,
              text: notifyText,
            }),
          });
          if (!res2.ok) {
            console.error("Resend internal notify failed", res2.status, await res2.text());
          }
        }
      } catch (e) {
        console.error("Resend send error", e);
      }
    } else {
      console.warn("RESEND_API_KEY not set or user has no email — skipping pro-forma email");
    }

    return new Response(
      JSON.stringify({ success: true, orderId: order.id, orderRef }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-bacs-order error", e);
    return jsonError((e as Error).message ?? "Server error", 500);
  }
});
