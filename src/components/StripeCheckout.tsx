import { useCallback, useRef, useEffect } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type CartLine } from "@/contexts/CartContext";

interface DeliveryAddress {
  contact_name: string; contact_phone: string;
  line1: string; line2: string; city: string; county: string; postcode: string;
}
interface OrderMeta {
  customerPoRef: string;
  notes: string;
  delivery: DeliveryAddress;
}

interface Props {
  items: CartLine[];
  returnUrl: string;
  systemId?: string | null;
  customer?: { name?: string; company?: string };
  meta?: OrderMeta;
  onError?: (msg: string) => void;
}

export function StripeCheckout({ items, returnUrl, systemId, customer, meta, onError }: Props) {
  const { deliveryCharge } = useCart();
  const deliveryChargeRef = useRef(deliveryCharge);
  useEffect(() => { deliveryChargeRef.current = deliveryCharge; }, [deliveryCharge]);
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!items || items.length === 0) {
      const msg = "Your basket is empty.";
      onError?.(msg);
      throw new Error(msg);
    }
    const deliveryItem = {
      kind: "delivery" as const,
      product_name: "Delivery Charge",
      quantity: 1,
      unit_price: deliveryChargeRef.current,
    };
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        items: [...items, deliveryItem], returnUrl, systemId, customer,
        environment: getStripeEnvironment(),
        customerPoRef: meta?.customerPoRef,
        notes: meta?.notes,
        delivery: meta?.delivery,
      },
    });
    if (error || !data?.clientSecret) {
      const msg = (data as any)?.error || error?.message || "Failed to start checkout";
      onError?.(msg);
      throw new Error(msg);
    }
    return data.clientSecret;
  }, [items, returnUrl, systemId, customer, meta, onError]);

  return (
    <div id="checkout" className="rounded-lg overflow-hidden">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
