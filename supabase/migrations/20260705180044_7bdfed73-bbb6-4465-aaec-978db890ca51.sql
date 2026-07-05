
-- 1. system_access: tighten to require the target system belongs to caller's org
DROP POLICY IF EXISTS "Master admins manage system access" ON public.system_access;
CREATE POLICY "Master admins manage system access"
  ON public.system_access
  FOR ALL
  TO authenticated
  USING (
    org_id = public.current_user_org_id()
    AND public.is_org_master_admin(auth.uid(), public.current_user_org_id())
    AND EXISTS (
      SELECT 1 FROM public.key_systems ks
      WHERE ks.id = system_access.system_id
        AND ks.org_id = public.current_user_org_id()
    )
  )
  WITH CHECK (
    org_id = public.current_user_org_id()
    AND public.is_org_master_admin(auth.uid(), public.current_user_org_id())
    AND EXISTS (
      SELECT 1 FROM public.key_systems ks
      WHERE ks.id = system_access.system_id
        AND ks.org_id = public.current_user_org_id()
    )
  );

-- 2 & 3. audit_log: restrict inserts to systems in the caller's org (or org-scoped null system_id)
DROP POLICY IF EXISTS "Users insert own logs" ON public.audit_log;
CREATE POLICY "Users insert own logs"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      system_id IS NULL
      OR system_id IN (
        SELECT ks.id FROM public.key_systems ks
        WHERE ks.org_id = public.current_user_org_id()
      )
    )
  );

-- 4. admin_settings: mark public keys; restrict reads accordingly
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Keys safe for all authenticated users (used in invoices, quotes, cart, checkout)
UPDATE public.admin_settings
  SET is_public = true
  WHERE key IN (
    'company_name','company_address','company_phone','company_email',
    'quote_terms','quote_footer','quote_validity_days',
    'vat_rate','vat_number',
    'bank_name','bank_sort_code','bank_account_number','bank_account_name',
    'delivery_charge_keys_only','delivery_charge_with_cylinders'
  );

-- Sensitive keys stay admin-only (supplier_*, po_notes, and anything else)
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.admin_settings;

CREATE POLICY "Authenticated users read public settings"
  ON public.admin_settings
  FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Admins read all settings"
  ON public.admin_settings
  FOR SELECT
  TO authenticated
  USING (public.check_is_admin());
