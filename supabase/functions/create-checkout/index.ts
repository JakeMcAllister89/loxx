// Creates a Stripe Embedded Checkout session for a cart of LOXX cylinder line items. v3
// UK seller, physical goods → tax calculation only (no managed_payments).
// Creates a pending order + order_items rows before payment so verify-checkout can finalise.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

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
  unit_price: number; // GBP
}

interface DeliveryAddress {
  contact_name?: string; contact_phone?: string;
  line1?: string; line2?: string; city?: string; county?: string; postcode?: string;
}

interface CheckoutBody {
  items: CartLine[];
  returnUrl: string;
  environment: StripeEnv;
  systemId?: string | null;
  customer?: { name?: string; company?: string };
  customerPoRef?: string;
  poRef?: string;
  projectName?: string;
  notes?: string;
  delivery?: DeliveryAddress;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PHYSICAL_GOODS_TAX_CODE = "txcd_99999999";

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

    let body: CheckoutBody;
    try { body = (await req.json()) as CheckoutBody; }
    catch { return jsonError("Invalid request body"); }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return jsonError("Your basket is empty — please add items before checking out");
    }
    if (!body.returnUrl) return jsonError("returnUrl is required");
    if (body.environment !== "sandbox" && body.environment !== "live") return jsonError("Invalid environment");

    // Sanitise + price guard (in pence) — never trust client unit_price for >£1000.
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

    const deliveryText = body.delivery ? [
      body.delivery.line1, body.delivery.line2, body.delivery.city,
      body.delivery.county, body.delivery.postcode,
    ].filter(Boolean).join(", ") : null;

    const combinedNotes = [
      body.notes,
      deliveryText ? `Delivery: ${deliveryText}` : null,
      body.customerPoRef ? `Customer PO: ${body.customerPoRef}` : null,
    ].filter(Boolean).join(" | ") || null;

    // Create pending order. VAT is finalised on verify-checkout from the real session amounts.
    const orderInsert: Record<string, unknown> = {
      user_id: user.id,
      status: "pending",
      subtotal,
      vat: 0,
      total: subtotal + deliveryCharge,
      delivery_charge: deliveryCharge,
      customer_email: user.email,
      customer_name: body.customer?.name ?? null,
      company: body.customer?.company ?? null,
      system_id: body.systemId ?? null,
      purchase_order_ref: body.poRef ?? body.customerPoRef ?? null,
      notes: combinedNotes,
      delivery_address: body.delivery ?? null,
    };
    // optional columns added by recent migrations
    if (body.customerPoRef !== undefined) orderInsert.customer_po_ref = body.customerPoRef || null;
    orderInsert.project_name = body.projectName || null;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert(orderInsert)
      .select("id")
      .single();
    if (orderErr || !order) return jsonError(`Failed to create order: ${orderErr?.message}`, 500);

    // Snapshot commission rate for this order based on attributed partner (locked at order time)
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


    const stripe = createStripeClient(body.environment);

    const line_items = items.map((it) => {
      if (it.kind === "delivery") {
        return {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(it.unit_price * 100),
            tax_behavior: "exclusive" as const,
            product_data: {
              name: "Delivery Charge",
              tax_code: PHYSICAL_GOODS_TAX_CODE,
            },
          },
        };
      }
      const isKey = it.kind === "key";
      const name = isKey
        ? `Key — ${it.key_reference ?? "blank"}`
        : `${it.product_name ?? it.product_code ?? "Cylinder"}${it.room_label ? ` · ${it.room_label}` : ""}`;
      const description = [
        it.differ_ref,
        it.cylinder_profile,
        it.cylinder_type,
        it.finish,
        it.size,
      ].filter(Boolean).join(" · ") || undefined;
      return {
        quantity: it.quantity,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(it.unit_price * 100),
          tax_behavior: "exclusive" as const,
          product_data: {
            name: name.slice(0, 250),
            ...(description ? { description: description.slice(0, 350) } : {}),
            tax_code: PHYSICAL_GOODS_TAX_CODE,
          },
        },
      };
    });

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      mode: "payment",
      return_url: body.returnUrl,
      line_items,
      customer_email: user.email ?? undefined,
      automatic_tax: { enabled: true },
      payment_intent_data: {
        description: `LOXX order ${order.id.slice(0, 8).toUpperCase()}`,
      },

      metadata: {
        userId: user.id,
        orderId: order.id,
        ...(body.customerPoRef ? { customerPoRef: body.customerPoRef.slice(0, 100) } : {}),
      },
    });

    await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret, orderId: order.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("create-checkout error", e);
    return jsonError((e as Error).message ?? "Server error", 500);
  }
});
