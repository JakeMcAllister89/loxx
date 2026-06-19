import { useCallback } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import type { CartLine } from "@/contexts/CartContext";

interface Props {
  items: CartLine[];
  returnUrl: string;
  systemId?: string | null;
  customer?: { name?: string; company?: string };
  onError?: (msg: string) => void;
}

export function StripeCheckout({ items, returnUrl, systemId, customer, onError }: Props) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        items, returnUrl, systemId, customer,
        environment: getStripeEnvironment(),
      },
    });
    if (error || !data?.clientSecret) {
      const msg = (data as any)?.error || error?.message || "Failed to start checkout";
      onError?.(msg);
      throw new Error(msg);
    }
    return data.clientSecret;
  }, [items, returnUrl, systemId, customer, onError]);

  return (
    <div id="checkout" className="rounded-lg overflow-hidden">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
