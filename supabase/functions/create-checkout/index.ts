// v7
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

    // Length caps for free-text fields — prevent excessively long input
    // from being stored or emailed downstream.
    const checkLen = (val: unknown, max: number, label: string): string | null => {
      if (val == null) return null;
      if (typeof val === "string" && val.length > max) return `Field ${label} is too long (max ${max} characters)`;
      return null;
    };
    const lenErr =
      checkLen(body.notes, 1000, "notes") ||
      checkLen(body.customerPoRef, 1000, "customerPoRef") ||
      checkLen(body.poRef, 1000, "poRef") ||
      checkLen(body.customer?.name, 200, "customer.name") ||
      checkLen(body.customer?.company, 200, "customer.company") ||
      checkLen(body.delivery?.contact_name, 200, "delivery.contact_name") ||
      checkLen(body.delivery?.line1, 200, "delivery.line1") ||
      checkLen(body.delivery?.line2, 200, "delivery.line2") ||
      checkLen(body.delivery?.city, 200, "delivery.city") ||
      checkLen(body.delivery?.county, 200, "delivery.county") ||
      checkLen(body.delivery?.contact_phone, 30, "delivery.contact_phone") ||
      checkLen(body.delivery?.postcode, 30, "delivery.postcode");
    if (lenErr) return jsonError(lenErr);

    // Fetch authoritative prices from the database for all product codes
    // in this cart — never trust client-supplied unit_price for catalogued items.
    // Uses the customer's org-specific effective pricing when set.
    const productCodes = body.items
      .map(it => it.product_code)
      .filter((c): c is string => !!c);
    const priceMap = new Map<string, number>();
    if (productCodes.length > 0) {
      const { data: prof } = await supabase
        .from("profiles").select("org_id").eq("id", user.id).maybeSingle();
      const orgId = (prof as any)?.org_id ?? null;
      if (orgId) {
        const { data: eff } = await supabase.rpc("get_org_product_prices", { _org_id: orgId });
        (eff ?? []).forEach((r: any) => {
          if (r?.code && r?.effective_price != null && productCodes.includes(r.code)) {
            priceMap.set(r.code, Number(r.effective_price));
          }
        });
      }
      // Fallback for any codes not returned by the RPC (e.g. no org, inactive product).
      const missing = productCodes.filter((c) => !priceMap.has(c));
      if (missing.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("code,price_gbp")
          .in("code", missing)
          .eq("is_active", true);
        (prods ?? []).forEach((p: any) => {
          if (p.code && p.price_gbp != null) priceMap.set(p.code, Number(p.price_gbp));
        });
      }
    }

    // Fetch authoritative delivery rates — never trust client-supplied
    // unit_price for the delivery line either. Rate depends on whether
    // the cart contains any cylinder items, mirroring CartContext's logic.
    const { data: deliverySettings } = await supabase
      .from("admin_settings")
      .select("key,value")
      .in("key", ["delivery_charge_keys_only", "delivery_charge_with_cylinders"]);
    const deliveryMap = new Map<string, number>();
    (deliverySettings ?? []).forEach((s: any) => deliveryMap.set(s.key, parseFloat(s.value)));
    const hasCylinders = body.items.some((it) => it.kind === "cylinder");
    const authoritativeDeliveryCharge = hasCylinders
      ? (deliveryMap.get("delivery_charge_with_cylinders") ?? 9.50)
      : (deliveryMap.get("delivery_charge_keys_only") ?? 7.50);

    const items = body.items.map((it) => {
      const qty = Math.max(1, Math.min(999, Math.floor(Number(it.quantity) || 1)));
      let unit_price: number;
      if (it.kind === "delivery") {
        // Always server-derived — client value is ignored entirely.
        unit_price = authoritativeDeliveryCharge;
      } else if (it.product_code && priceMap.has(it.product_code)) {
        unit_price = priceMap.get(it.product_code)!;
      } else {
        // No catalogued price available (shouldn't normally happen for
        // cylinder/key lines) — reject rather than trust client price.
        unit_price = -1;
      }
      return { ...it, quantity: qty, unit_price };
    });

    if (items.some((it) => it.kind !== "delivery" && it.unit_price < 0)) {
      return jsonError("One or more items could not be priced — please refresh your basket and try again");
    }

    const productItems = items.filter((it) => it.kind !== "delivery");
    const deliveryItem = items.find((it) => it.kind === "delivery");
    const subtotal = productItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const deliveryCharge = deliveryItem ? authoritativeDeliveryCharge : 0;
    if (subtotal <= 0) return jsonError("Order total must be greater than zero");

    const deliveryText = body.delivery ? [
      body.delivery.line1, body.delivery.line2, body.delivery.city,
      body.delivery.county, body.delivery.postcode,
    ].filter(Boolean).join(", ") : null;

    const combinedNotes = body.notes || null;

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
    if (orderErr || !order) { console.error(orderErr); return jsonError("Could not create your order — please try again", 500); }

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
        if (partner?.is_active === false) {
          commissionPct = 0;
        } else {
          commissionPct = typeof sysPct === "number" ? sysPct
            : typeof defPct === "number" ? Number(defPct)
            : 0;
        }
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
    if (itemsErr) { console.error(itemsErr); return jsonError("Could not save your order items — please try again", 500); }


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
    return jsonError("Server error", 500);
  }
});
