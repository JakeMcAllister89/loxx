DROP POLICY IF EXISTS "Admins manage platform invites" ON public.platform_invites;

CREATE POLICY "Admins manage platform invites" ON public.platform_invites
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ));