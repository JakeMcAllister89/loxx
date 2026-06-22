// Verifies a completed checkout session and finalises the order with totals & address.
// Idempotent — safe to call multiple times from the return page.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function bad(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return bad("Unauthorized", 401);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return bad("Unauthorized", 401);

    const { sessionId, environment } = await req.json();
    if (!sessionId || typeof sessionId !== "string") return bad("sessionId required");
    if (environment !== "sandbox" && environment !== "live") return bad("Invalid environment");

    const stripe = createStripeClient(environment as StripeEnv);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "total_details"],
    });

    const orderId = session.metadata?.orderId;
    const sessionUserId = session.metadata?.userId;
    if (!orderId || sessionUserId !== user.id) return bad("Order not found for this user", 404);

    // Load order and confirm ownership
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!order) return bad("Order not found", 404);

    const paid = session.payment_status === "paid";
    const status = paid ? "paid" : order.status;

    const totalPence = session.amount_total ?? 0;
    const subtotalPence = session.amount_subtotal ?? 0;
    const taxPence = session.total_details?.amount_tax ?? Math.max(0, totalPence - subtotalPence);

    // Preserve the basket-entered delivery address (with contact_name/contact_phone).
    // Only fall back to Stripe shipping_details if the order has no delivery address.
    const shippingDetails = (session as any).shipping_details ?? (session as any).collected_information?.shipping_details ?? null;
    const existing = order.delivery_address;
    const hasExisting = existing && typeof existing === "object" && (existing.line1 || existing.contact_name);
    const address = hasExisting
      ? existing
      : (shippingDetails?.address
        ? {
            contact_name: shippingDetails.name ?? null,
            line1: shippingDetails.address.line1 ?? null,
            line2: shippingDetails.address.line2 ?? null,
            city: shippingDetails.address.city ?? null,
            postcode: shippingDetails.address.postal_code ?? null,
            county: shippingDetails.address.state ?? null,
            country: shippingDetails.address.country ?? null,
          }
        : order.delivery_address);

    const piId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    await supabase
      .from("orders")
      .update({
        status,
        subtotal: subtotalPence / 100,
        vat: taxPence / 100,
        total: totalPence / 100,
        customer_email: session.customer_details?.email ?? order.customer_email,
        customer_name: shippingDetails?.name ?? order.customer_name,
        delivery_address: address,
        stripe_payment_intent: piId,
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        orderId: order.id,
        status,
        paid,
        total: totalPence / 100,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("verify-checkout error", e);
    return bad((e as Error).message ?? "Server error", 500);
  }
});
