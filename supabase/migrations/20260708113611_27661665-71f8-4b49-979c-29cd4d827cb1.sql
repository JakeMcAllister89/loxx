-- Restore Data API grants wiped by a recent migration.
-- Every table in public lost its GRANTs to authenticated/service_role,
-- causing "permission denied for table" from PostgREST for signed-in users.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cylinder_types TO authenticated;
GRANT SELECT ON public.cylinder_types TO anon;
GRANT ALL ON public.cylinder_types TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.impersonation_log TO authenticated;
GRANT ALL ON public.impersonation_log TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_holders TO authenticated;
GRANT ALL ON public.key_holders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_issues TO authenticated;
GRANT ALL ON public.key_issues TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_systems TO authenticated;
GRANT ALL ON public.key_systems TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_invites TO authenticated;
GRANT ALL ON public.org_invites TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_members TO authenticated;
GRANT ALL ON public.org_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_ownership_transfers TO authenticated;
GRANT ALL ON public.org_ownership_transfers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisations TO authenticated;
GRANT ALL ON public.organisations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_invites TO authenticated;
GRANT ALL ON public.partner_invites TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_logins TO authenticated;
GRANT ALL ON public.partner_logins TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_payments TO authenticated;
GRANT ALL ON public.partner_payments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_invites TO authenticated;
GRANT ALL ON public.platform_invites TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;

GRANT ALL ON public.rate_limits TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_access TO authenticated;
GRANT ALL ON public.system_access TO service_role;
