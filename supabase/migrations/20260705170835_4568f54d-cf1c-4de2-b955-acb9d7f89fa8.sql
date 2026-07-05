REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.profiles TO authenticated;
GRANT UPDATE (name, company, role, phone, email, org_id, first_name, last_name, default_address, default_invoice_address, referred_by_partner_id, updated_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;