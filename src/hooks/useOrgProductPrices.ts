import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Returns customer-specific effective prices keyed by product code.
 *
 * While loading (or when there is no org / not signed in), the returned Map is empty
 * and `loading` is true — callers must fall back to the product's `price_gbp` so the
 * UI never shows blank prices during initial load.
 */
export function useOrgProductPrices() {
  const { orgId, orgRoleLoading } = useAuth();
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgRoleLoading) return;
    if (!orgId) {
      setPrices(new Map());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .rpc("get_org_product_prices", { _org_id: orgId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setPrices(new Map());
        } else {
          const m = new Map<string, number>();
          (data as Array<{ code: string | null; effective_price: number | string | null }>).forEach((r) => {
            if (r.code && r.effective_price != null) m.set(r.code, Number(r.effective_price));
          });
          setPrices(m);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [orgId, orgRoleLoading]);

  /** Get the effective price for a code, falling back to `fallback` (usually price_gbp). */
  const priceFor = (code: string | null | undefined, fallback: number | null | undefined): number => {
    if (code && prices.has(code)) return prices.get(code)!;
    return Number(fallback ?? 0);
  };

  return { prices, loading, priceFor };
}
