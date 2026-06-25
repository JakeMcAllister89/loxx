DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can manage cylinder types" ON public.cylinder_types;
CREATE POLICY "Admins can manage cylinder types" ON public.cylinder_types FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins Manage settings" ON public.admin_settings;
CREATE POLICY "Admins can manage settings" ON public.admin_settings FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can read all orders" ON public.orders FOR SELECT TO authenticated USING (public.check_is_admin());
CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can read all order items" ON public.order_items;
CREATE POLICY "Admins can read all order items" ON public.order_items FOR SELECT TO authenticated USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can read all key systems" ON public.key_systems;
CREATE POLICY "Admins can read all key systems" ON public.key_systems FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Admins view all quotes" ON public.quotes;
CREATE POLICY "Admins view all quotes" ON public.quotes FOR SELECT TO authenticated USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins manage partners" ON public.partners;
CREATE POLICY "Admins manage partners" ON public.partners FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Admins manage partner logins" ON public.partner_logins;
CREATE POLICY "Admins manage partner logins" ON public.partner_logins FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Admins manage partner payments" ON public.partner_payments;
CREATE POLICY "Admins manage partner payments" ON public.partner_payments FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Admins manage platform invites" ON public.platform_invites;
CREATE POLICY "Admins manage platform invites" ON public.platform_invites FOR ALL TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can manage product images" ON storage.objects;
CREATE POLICY "Admins can manage product images" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'product-images' AND public.check_is_admin()) WITH CHECK (bucket_id = 'product-images' AND public.check_is_admin());