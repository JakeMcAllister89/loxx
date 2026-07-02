DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'key_issues') THEN
    ALTER TABLE public.key_issues DROP CONSTRAINT IF EXISTS key_issues_node_id_fkey;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.current_user_org_approved()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(o.is_approved, false)
  FROM public.org_members m
  JOIN public.organisations o ON o.id = m.org_id
  WHERE m.user_id = auth.uid() AND m.status = 'active'
  LIMIT 1
$$;

CREATE TABLE IF NOT EXISTS public.key_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  holder_type TEXT NOT NULL DEFAULT 'employee' CHECK (holder_type IN ('employee','contractor','tenant','supplier','other')),
  department TEXT,
  email TEXT,
  phone TEXT,
  external_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id),
  archived_reason TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_holders TO authenticated;
GRANT ALL ON public.key_holders TO service_role;
ALTER TABLE public.key_holders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Standard+ read holders" ON public.key_holders;
CREATE POLICY "Standard+ read holders" ON public.key_holders FOR SELECT TO authenticated
  USING (org_id = public.current_user_org_id()
    AND public.current_user_org_role() IN ('master_admin','admin','standard')
    AND public.current_user_org_approved());

DROP POLICY IF EXISTS "Standard+ insert holders" ON public.key_holders;
CREATE POLICY "Standard+ insert holders" ON public.key_holders FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_user_org_id()
    AND public.current_user_org_role() IN ('master_admin','admin','standard')
    AND public.current_user_org_approved());

DROP POLICY IF EXISTS "Standard+ update holders" ON public.key_holders;
CREATE POLICY "Standard+ update holders" ON public.key_holders FOR UPDATE TO authenticated
  USING (org_id = public.current_user_org_id()
    AND public.current_user_org_role() IN ('master_admin','admin','standard')
    AND public.current_user_org_approved());

DROP POLICY IF EXISTS "Admins full access holders" ON public.key_holders;
CREATE POLICY "Admins full access holders" ON public.key_holders FOR ALL TO authenticated
  USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

CREATE TABLE IF NOT EXISTS public.key_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES public.key_systems(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT,
  node_label TEXT,
  key_ref TEXT,
  holder_id UUID NOT NULL REFERENCES public.key_holders(id),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','returned','lost','resolved')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by UUID REFERENCES auth.users(id),
  expected_return_date DATE,
  returned_at TIMESTAMPTZ,
  returned_by UUID REFERENCES auth.users(id),
  lost_reported_at TIMESTAMPTZ,
  lost_reported_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_type TEXT CHECK (resolution_type IN ('replacement_ordered','cylinder_replaced','system_rekeyed','risk_accepted','other')),
  resolution_notes TEXT,
  replacement_order_id UUID REFERENCES public.orders(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_issues TO authenticated;
GRANT ALL ON public.key_issues TO service_role;
ALTER TABLE public.key_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read issues" ON public.key_issues;
CREATE POLICY "Org members read issues" ON public.key_issues FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.key_systems s WHERE s.id = key_issues.system_id
      AND (
        (s.org_id = public.current_user_org_id()
          AND public.current_user_org_role() IN ('master_admin','admin','standard')
          AND public.current_user_org_approved())
        OR s.id IN (SELECT system_id FROM public.system_access WHERE user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Standard+ insert issues" ON public.key_issues;
CREATE POLICY "Standard+ insert issues" ON public.key_issues FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.key_systems s WHERE s.id = key_issues.system_id
      AND s.org_id = public.current_user_org_id()
      AND public.current_user_org_role() IN ('master_admin','admin','standard')
      AND public.current_user_org_approved())
  );

DROP POLICY IF EXISTS "Standard+ update issues" ON public.key_issues;
CREATE POLICY "Standard+ update issues" ON public.key_issues FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.key_systems s WHERE s.id = key_issues.system_id
      AND s.org_id = public.current_user_org_id()
      AND public.current_user_org_role() IN ('master_admin','admin','standard')
      AND public.current_user_org_approved())
  );

DROP POLICY IF EXISTS "Admins full access issues" ON public.key_issues;
CREATE POLICY "Admins full access issues" ON public.key_issues FOR ALL TO authenticated
  USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

CREATE INDEX IF NOT EXISTS idx_key_holders_org ON public.key_holders(org_id);
CREATE INDEX IF NOT EXISTS idx_key_issues_system ON public.key_issues(system_id);
CREATE INDEX IF NOT EXISTS idx_key_issues_node ON public.key_issues(node_id);
CREATE INDEX IF NOT EXISTS idx_key_issues_holder ON public.key_issues(holder_id);
CREATE INDEX IF NOT EXISTS idx_key_issues_status ON public.key_issues(status);