-- PARTNERS
DROP POLICY IF EXISTS "Admins manage partners" ON public.partners;
CREATE POLICY "Admins manage partners" ON public.partners
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- PARTNER_LOGINS
DROP POLICY IF EXISTS "Admins manage partner logins" ON public.partner_logins;
CREATE POLICY "Admins manage partner logins" ON public.partner_logins
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- PARTNER_PAYMENTS
DROP POLICY IF EXISTS "Admins manage partner payments" ON public.partner_payments;
CREATE POLICY "Admins manage partner payments" ON public.partner_payments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- PLATFORM_INVITES
DROP POLICY IF EXISTS "Admins manage platform invites" ON public.platform_invites;
CREATE POLICY "Admins manage platform invites" ON public.platform_invites
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));