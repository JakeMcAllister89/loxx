
DROP POLICY IF EXISTS "Admins view all quotes" ON public.quotes;
CREATE POLICY "Admins view all quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins manage settings" ON public.admin_settings;
CREATE POLICY "Admins manage settings" ON public.admin_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
