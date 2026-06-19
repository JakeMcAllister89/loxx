// Creates a Stripe Embedded Checkout session for a cart of LOXX cylinder line items.
// UK seller, physical goods → tax calculation only (no managed_payments).
// Creates a pending order + order_items rows before payment so verify-checkout can finalise.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

interface CartLine {
  kind: "cylinder" | "key";
  product_code?: string;
  cylinder_type?: string;
  finish?: string;
  room_label?: string;
  differ_ref?: string;
  key_reference?: string;
  quantity: number;
  unit_price: number; // GBP
}

interface CheckoutBody {
  items: CartLine[];
  returnUrl: string;
  environment: StripeEnv;
  systemId?: string | null;
  customer?: { name?: string; company?: string };
  poRef?: string;
  notes?: string;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PHYSICAL_GOODS_TAX_CODE = "txcd_99999999";

function badRequest(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return badRequest("Method not allowed", 405);

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return badRequest("Unauthorized", 401);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return badRequest("Unauthorized", 401);

    const body = (await req.json()) as CheckoutBody;
    if (!Array.isArray(body.items) || body.items.length === 0) return badRequest("Cart is empty");
    if (!body.returnUrl) return badRequest("returnUrl is required");
    if (body.environment !== "sandbox" && body.environment !== "live") return badRequest("Invalid environment");

    // Sanitise + price guard (in pence) — never trust client unit_price for >£1000.
    const items = body.items.map((it) => ({
      ...it,
      quantity: Math.max(1, Math.min(999, Math.floor(Number(it.quantity) || 1))),
      unit_price: Math.max(0, Math.min(100000, Number(it.unit_price) || 0)),
    }));

    const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

    // Create pending order. VAT is finalised on verify-checkout from the real session amounts.
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        subtotal,
        vat: 0,
        total: subtotal,
        customer_email: user.email,
        customer_name: body.customer?.name ?? null,
        company: body.customer?.company ?? null,
        system_id: body.systemId ?? null,
        purchase_order_ref: body.poRef ?? null,
        notes: body.notes ?? null,
      })
      .select("id")
      .single();
    if (orderErr || !order) return badRequest(`Failed to create order: ${orderErr?.message}`, 500);

    const itemRows = items.map((it) => ({
      order_id: order.id,
      item_type: it.kind,
      product_code: it.product_code ?? null,
      cylinder_type: it.cylinder_type ?? null,
      finish: it.finish ?? null,
      room_label: it.room_label ?? it.key_reference ?? null,
      differ_ref: it.differ_ref ?? null,
      quantity: it.quantity,
      unit_price: it.unit_price,
      line_total: it.quantity * it.unit_price,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
    if (itemsErr) return badRequest(`Failed to write order items: ${itemsErr.message}`, 500);

    const stripe = createStripeClient(body.environment);

    const line_items = items.map((it) => {
      const isKey = it.kind === "key";
      const name = isKey
        ? `Key — ${it.key_reference ?? "blank"}`
        : `${it.product_code ?? "Cylinder"}${it.room_label ? ` · ${it.room_label}` : ""}`;
      const description = [
        it.differ_ref,
        it.cylinder_type,
        it.finish,
      ].filter(Boolean).join(" · ") || undefined;
      return {
        quantity: it.quantity,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(it.unit_price * 100), // £ → pence
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
      shipping_address_collection: {
        allowed_countries: [
          "GB", "IE", "FR", "DE", "NL", "BE", "LU", "IT", "ES", "PT",
          "AT", "DK", "SE", "FI", "NO", "PL", "CZ", "SK", "SI", "HU",
        ],
      },
      payment_intent_data: {
        description: `LOXX order ${order.id.slice(0, 8).toUpperCase()}`,
      },
      metadata: {
        userId: user.id,
        orderId: order.id,
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
    return badRequest((e as Error).message ?? "Server error", 500);
  }
});
