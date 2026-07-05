-- Recording changes already applied to the live DB. Idempotent so re-run is a no-op.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;

UPDATE public.orders o
   SET org_id = p.org_id
  FROM public.profiles p
 WHERE o.org_id IS NULL AND p.id = o.user_id;

DROP POLICY IF EXISTS "Org members read orders" ON public.orders;
CREATE POLICY "Org members read orders" ON public.orders
  FOR SELECT TO authenticated
  USING (org_id = public.current_user_org_id());

DROP POLICY IF EXISTS "Org members read order items" ON public.order_items;
CREATE POLICY "Org members read order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.org_id = public.current_user_org_id()
    )
  );
