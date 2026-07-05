// stripe-webhook v1
// Receives Stripe webhook events (checkout.session.completed) and marks the
// matching order as paid. Idempotent — safe if Stripe redelivers the same event.

import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyWebhook, type StripeEnv } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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
