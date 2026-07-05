-- Tighten EXECUTE grants on SECURITY DEFINER functions in the public schema.
-- Trigger functions never need to be invocable via the API, so revoke from
-- all client roles. RLS helper functions must remain callable by
-- `authenticated` (the RLS engine invokes them as the caller), but they
-- do not need to be callable by anonymous users.

-- Trigger functions: revoke from PUBLIC and every client role.
REVOKE ALL ON FUNCTION public.prevent_is_admin_self_escalation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_self_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_system_access_org_id() FROM PUBLIC, anon, authenticated;

-- RLS helpers callable during policy evaluation: allow `authenticated` only.
REVOKE EXECUTE ON FUNCTION public.current_user_org_approved() FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.current_user_org_approved() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_user_org_id()       FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.current_user_org_id()       TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_user_org_role()     FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.current_user_org_role()     TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_is_admin()            FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.check_is_admin()            TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_org_master_admin(uuid, uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_org_master_admin(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_in_org(uuid, uuid)     FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.user_in_org(uuid, uuid)     TO authenticated;

-- Public delivery-rate helper: needed by the anonymous cart preview,
-- so anon must retain EXECUTE.
-- (No change to get_delivery_rates.)

-- Admin-only / server-only helpers: keep them callable only by service_role.
REVOKE ALL ON FUNCTION public.is_admin(uuid)                                      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_po_number()                                  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_quote_number()                               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user()                                   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transfer_org_master_admin(uuid, uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
