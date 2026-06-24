
REVOKE EXECUTE ON FUNCTION public.current_user_org_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_org_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_master_admin(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_in_org(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_org_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_master_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_in_org(UUID, UUID) TO authenticated;
