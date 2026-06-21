
-- Admin read access to all orders
CREATE POLICY "Admins can read all orders" ON public.orders
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all orders" ON public.orders
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can read all order items" ON public.order_items
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can read all key systems" ON public.key_systems
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can read all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- Seed admin_settings defaults
INSERT INTO public.admin_settings (key, value) VALUES
  ('supplier_name', ''),
  ('supplier_email', ''),
  ('supplier_account', ''),
  ('company_name', 'LOXX'),
  ('company_address', ''),
  ('company_phone', ''),
  ('company_email', ''),
  ('po_notes', 'Please key all cylinders to the master key system reference noted on this order.'),
  ('quote_validity_days', '30'),
  ('quote_terms', 'This quotation is valid for 30 days from the date of issue. Prices shown exclude VAT unless stated. VAT will be applied at the prevailing rate. Delivery within 3-5 working days of order confirmation and payment.'),
  ('quote_footer', 'LOXX — Master key systems made simple'),
  ('vat_rate', '20'),
  ('vat_number', '')
ON CONFLICT (key) DO NOTHING;
