CREATE OR REPLACE FUNCTION public.system_belongs_to_org(_system_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.key_systems
    WHERE id = _system_id AND org_id = _org_id
  );
$$;

REVOKE ALL ON FUNCTION public.system_belongs_to_org(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.system_belongs_to_org(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Master admins manage system access" ON public.system_access;

CREATE POLICY "Master admins manage system access"
  ON public.system_access
  FOR ALL
  TO authenticated
  USING (
    org_id = public.current_user_org_id()
    AND public.is_org_master_admin(auth.uid(), public.current_user_org_id())
    AND public.system_belongs_to_org(system_access.system_id, public.current_user_org_id())
  )
  WITH CHECK (
    org_id = public.current_user_org_id()
    AND public.is_org_master_admin(auth.uid(), public.current_user_org_id())
    AND public.system_belongs_to_org(system_access.system_id, public.current_user_org_id())
  );