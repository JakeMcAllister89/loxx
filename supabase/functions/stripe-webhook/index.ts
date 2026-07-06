// stripe-webhook v2
// Receives Stripe webhook events (checkout.session.completed) and marks the
// matching order as paid. Idempotent — safe if Stripe redelivers the same event.
// After marking paid, sends the customer an order confirmation email. Email
// failures are logged but never fail the webhook — the order stays paid.

import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyWebhook, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const escapeHtml = (s: unknown) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const gbp = (n: number) => `£${Number(n).toFixed(2)}`;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawEnv = new URL(req.url).searchParams.get("env") ?? "sandbox";
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  let event: { type: string; data: { object: any } };
  try {
    event = await verifyWebhook(req, env);
  } catch (e) {
    console.error("stripe-webhook signature verification failed:", (e as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId: string | undefined = session?.metadata?.orderId;

      if (!orderId) {
        console.warn("stripe-webhook checkout.session.completed missing metadata.orderId");
        return json200();
      }

      const { data: order, error: fetchErr } = await supabase
        .from("orders")
        .select("id,status,payment_status")
        .eq("id", orderId)
        .maybeSingle();

      if (fetchErr) {
        console.error("stripe-webhook order lookup failed:", fetchErr);
        return json200(); // ack so Stripe doesn't retry a poison event
      }
      if (!order) {
        console.warn("stripe-webhook order not found for id", orderId);
        return json200();
      }

      if (order.status === "paid" && order.payment_status === "paid") {
        return json200(); // already processed
      }

      const piId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

      const { error: updErr } = await supabase
        .from("orders")
        .update({
          status: "paid",
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent: piId,
        })
        .eq("id", order.id);

      if (updErr) {
        console.error("stripe-webhook order update failed:", updErr);
        return new Response("Update failed", { status: 500 });
      }

      // Fire-and-forget confirmation email. Any failure is logged but must
      // never fail the webhook — the order is already paid.
      try {
        await sendOrderConfirmationEmail(order.id);
      } catch (e) {
        console.error("stripe-webhook confirmation email failed:", e);
      }
    } else {
      console.log("stripe-webhook unhandled event type:", event.type);
    }

    return json200();
  } catch (e) {
    console.error("stripe-webhook handler error:", e);
    return new Response("Handler error", { status: 500 });
  }
});

function json200() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendOrderConfirmationEmail(orderId: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.warn("stripe-webhook RESEND_API_KEY not set — skipping confirmation email");
    return;
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id,customer_email,customer_name,company,subtotal,vat,total,delivery_charge,delivery_address,system_id,purchase_order_ref")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr || !order) {
    console.error("stripe-webhook confirmation: order load failed", orderErr);
    return;
  }
  if (!order.customer_email) {
    console.warn("stripe-webhook confirmation: order has no customer_email, skipping");
    return;
  }

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("item_type,product_code,cylinder_type,finish,room_label,key_reference,differ_ref,quantity,unit_price,line_total")
    .eq("order_id", orderId);
  if (itemsErr) {
    console.error("stripe-webhook confirmation: items load failed", itemsErr);
    return;
  }

  let systemRef: string | null = null;
  let systemName: string | null = null;
  if (order.system_id) {
    const { data: sys } = await supabase
      .from("key_systems")
      .select("reference,name")
      .eq("id", order.system_id)
      .maybeSingle();
    systemRef = (sys as any)?.reference ?? null;
    systemName = (sys as any)?.name ?? null;
  }

  const orderRef = String(order.id).slice(0, 8).toUpperCase();
  const subject = `Order Confirmed — ${orderRef}`;

  const productItems = (items ?? []).filter((it: any) => it.item_type !== "delivery");
  const deliveryCharge = Number(order.delivery_charge ?? 0);
  const total = Number(order.total ?? 0);

  const lineRowsHtml = productItems.map((it: any) => {
    const desc = it.item_type === "key"
      ? `Key — ${escapeHtml(it.key_reference ?? "blank")}`
      : `${escapeHtml(it.cylinder_type ?? it.product_code ?? "Cylinder")}${it.room_label ? ` · ${escapeHtml(it.room_label)}` : ""}${it.differ_ref ? ` · ${escapeHtml(it.differ_ref)}` : ""}${it.finish ? ` · ${escapeHtml(it.finish)}` : ""}`;
    return `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;">${desc}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;text-align:center;">${Number(it.quantity)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;text-align:right;">${gbp(Number(it.line_total))}</td>
      </tr>`;
  }).join("");

  const deliveryRowHtml = deliveryCharge > 0 ? `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;">Delivery</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;text-align:center;">1</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#1f2937;text-align:right;">${gbp(deliveryCharge)}</td>
    </tr>` : "";

  const d = (order.delivery_address ?? {}) as Record<string, unknown>;
  const addrLines = [d.contact_name, d.line1, d.line2, d.city, d.county, d.postcode]
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => escapeHtml(v))
    .join("<br/>");
  const phoneLine = d.contact_phone ? `<br/>${escapeHtml(d.contact_phone)}` : "";

  const systemBlock = order.system_id ? `
    <div style="margin-top:16px;font-size:13px;color:#374151;">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Master key system</div>
      <div>${escapeHtml(systemName ?? "System")}${systemRef ? ` · <span style="font-family:monospace;">${escapeHtml(systemRef)}</span>` : ""}</div>
    </div>` : "";

  const poBlock = order.purchase_order_ref ? `
    <div style="margin-top:8px;font-size:13px;color:#374151;">
      <span style="color:#6b7280;">Your PO reference:</span> ${escapeHtml(order.purchase_order_ref)}
    </div>` : "";

  const customerGreeting = order.customer_name
    ? `Hi ${escapeHtml(String(order.customer_name).split(" ")[0])},`
    : "Hi there,";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Order Confirmed ${orderRef}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:640px;margin:0 auto;padding:32px 24px;">
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid #eee;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle"><img src="https://wrblvasfekwaaayorccv.supabase.co/storage/v1/object/public/brand/email-logo.png" alt="My LOXX" width="40" height="40" style="display:block;border-radius:8px" /></td>
          <td style="padding-left:10px;font-size:20px;font-weight:700;color:#17171a;vertical-align:middle;">My LOXX</td>
        </tr></table>
      </div>

      <div style="padding:24px 28px;">
        <h2 style="margin:0 0 8px;color:#0f172a;">Order confirmed 🎉</h2>
        <p style="margin:0 0 6px;font-size:14px;color:#374151;">${customerGreeting}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
          Thanks — we've received your payment and your order is now in production.
        </p>

        <div style="font-size:13px;color:#374151;">
          <span style="color:#6b7280;">Order reference:</span>
          <span style="font-family:monospace;font-weight:600;color:#0f172a;">${escapeHtml(orderRef)}</span>
        </div>
        ${systemBlock}
        ${poBlock}

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:24px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;">Description</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;">Qty</th>
              <th style="padding:10px 8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e5e7eb;">Line total</th>
            </tr>
          </thead>
          <tbody>${lineRowsHtml}${deliveryRowHtml}</tbody>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;">
          <tr><td></td><td style="width:220px;">
            <div style="font-size:15px;color:#0f172a;font-weight:700;display:flex;justify-content:space-between;padding:8px 0 4px;border-top:2px solid #0f172a;">
              <span>Total paid (inc VAT)</span><span style="font-family:monospace;">${gbp(total)}</span>
            </div>
          </td></tr>
        </table>

        <div style="margin-top:24px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Delivery address</div>
          <div style="font-size:13px;color:#1f2937;line-height:1.6;">
            ${addrLines || "<em>No delivery address on file</em>"}${phoneLine}
          </div>
        </div>

        <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
          Our team will prepare your cylinders and keys to your exact specification and be in touch with dispatch details shortly.
        </p>
      </div>

      <div style="padding:18px 28px;background:#f9fafb;border-top:1px solid #eee;font-size:11px;color:#6b7280;line-height:1.6;text-align:center;">
        My LOXX · myloxx.co.uk
      </div>
    </div>
  </div>
</body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "My LOXX Orders <orders@myloxx.co.uk>",
      to: [order.customer_email],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    console.error("stripe-webhook confirmation email Resend failed", res.status, await res.text());
  }
}
