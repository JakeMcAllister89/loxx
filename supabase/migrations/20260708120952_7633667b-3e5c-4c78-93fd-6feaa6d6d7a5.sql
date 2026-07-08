
-- 1. customer_pricing (org-level default margin)
CREATE TABLE public.customer_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES public.organisations(id) ON DELETE CASCADE,
  default_margin_pct NUMERIC(5,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_pricing TO authenticated;
GRANT ALL ON public.customer_pricing TO service_role;

ALTER TABLE public.customer_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view customer pricing"
  ON public.customer_pricing FOR SELECT
  TO authenticated
  USING (public.check_is_admin());

CREATE POLICY "Admins can insert customer pricing"
  ON public.customer_pricing FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_admin());

CREATE POLICY "Admins can update customer pricing"
  ON public.customer_pricing FOR UPDATE
  TO authenticated
  USING (public.check_is_admin())
  WITH CHECK (public.check_is_admin());

CREATE POLICY "Admins can delete customer pricing"
  ON public.customer_pricing FOR DELETE
  TO authenticated
  USING (public.check_is_admin());

-- 2. customer_product_pricing (per-product override)
CREATE TABLE public.customer_product_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  margin_pct NUMERIC(5,2) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (org_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_product_pricing TO authenticated;
GRANT ALL ON public.customer_product_pricing TO service_role;

ALTER TABLE public.customer_product_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view customer product pricing"
  ON public.customer_product_pricing FOR SELECT
  TO authenticated
  USING (public.check_is_admin());

CREATE POLICY "Admins can insert customer product pricing"
  ON public.customer_product_pricing FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_admin());

CREATE POLICY "Admins can update customer product pricing"
  ON public.customer_product_pricing FOR UPDATE
  TO authenticated
  USING (public.check_is_admin())
  WITH CHECK (public.check_is_admin());

CREATE POLICY "Admins can delete customer product pricing"
  ON public.customer_product_pricing FOR DELETE
  TO authenticated
  USING (public.check_is_admin());

-- 3. Effective price resolver
CREATE OR REPLACE FUNCTION public.get_org_product_prices(_org_id UUID)
RETURNS TABLE(product_id UUID, code TEXT, effective_price NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow calls for the caller's own org, or service_role.
  IF auth.role() <> 'service_role' AND _org_id IS DISTINCT FROM public.current_user_org_id() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS product_id,
    p.code,
    CASE
      WHEN cpp.margin_pct IS NOT NULL
           AND p.cost_price IS NOT NULL
           AND p.cost_price > 0
           AND cpp.margin_pct < 100
        THEN ROUND(p.cost_price / (1 - cpp.margin_pct / 100.0), 2)
      WHEN cp.default_margin_pct IS NOT NULL
           AND p.cost_price IS NOT NULL
           AND p.cost_price > 0
           AND cp.default_margin_pct < 100
        THEN ROUND(p.cost_price / (1 - cp.default_margin_pct / 100.0), 2)
      ELSE p.price_gbp
    END AS effective_price
  FROM public.products p
  LEFT JOIN public.customer_product_pricing cpp
    ON cpp.product_id = p.id AND cpp.org_id = _org_id
  LEFT JOIN public.customer_pricing cp
    ON cp.org_id = _org_id
  WHERE p.is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_product_prices(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_product_prices(UUID) TO authenticated, service_role;
