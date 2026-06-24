
-- =========================================================
-- 1. ORGANISATIONS
-- =========================================================
CREATE TABLE public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organisations TO authenticated;
GRANT ALL ON public.organisations TO service_role;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 2. ORG MEMBERS
-- =========================================================
CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  org_role TEXT NOT NULL DEFAULT 'standard' CHECK (org_role IN ('master_admin','admin','standard','view_only')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','removed')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.org_members TO authenticated;
GRANT ALL ON public.org_members TO service_role;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. SECURITY-DEFINER HELPERS (avoid RLS recursion)
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT org_id FROM public.org_members
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_org_role()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT org_role FROM public.org_members
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_master_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND org_id = _org_id
      AND org_role = 'master_admin' AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.user_in_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND org_id = _org_id AND status = 'active'
  )
$$;

-- =========================================================
-- 4. POLICIES on organisations / org_members
-- =========================================================
CREATE POLICY "Org members can read their org" ON public.organisations
  FOR SELECT TO authenticated
  USING (public.user_in_org(auth.uid(), id));

CREATE POLICY "Master admins update their org" ON public.organisations
  FOR UPDATE TO authenticated
  USING (public.is_org_master_admin(auth.uid(), id));

CREATE POLICY "Members can read their org members" ON public.org_members
  FOR SELECT TO authenticated
  USING (org_id = public.current_user_org_id());

CREATE POLICY "Master admins manage members" ON public.org_members
  FOR ALL TO authenticated
  USING (public.is_org_master_admin(auth.uid(), org_id))
  WITH CHECK (public.is_org_master_admin(auth.uid(), org_id));

-- =========================================================
-- 5. ORG INVITES
-- =========================================================
CREATE TABLE public.org_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  org_role TEXT NOT NULL CHECK (org_role IN ('admin','standard','view_only')),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  system_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.org_invites TO authenticated;
GRANT ALL ON public.org_invites TO service_role;
ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins manage invites" ON public.org_invites
  FOR ALL TO authenticated
  USING (public.is_org_master_admin(auth.uid(), org_id))
  WITH CHECK (public.is_org_master_admin(auth.uid(), org_id));

-- =========================================================
-- 6. SYSTEM ACCESS
-- =========================================================
CREATE TABLE public.system_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id UUID NOT NULL REFERENCES public.key_systems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(system_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.system_access TO authenticated;
GRANT ALL ON public.system_access TO service_role;
ALTER TABLE public.system_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own grants" ON public.system_access
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Master admins manage system access" ON public.system_access
  FOR ALL TO authenticated
  USING (public.is_org_master_admin(auth.uid(), public.current_user_org_id()))
  WITH CHECK (public.is_org_master_admin(auth.uid(), public.current_user_org_id()));

-- =========================================================
-- 7. ALTER existing tables
-- =========================================================
ALTER TABLE public.key_systems ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;
ALTER TABLE public.profiles    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL;
ALTER TABLE public.profiles    ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles    ADD COLUMN IF NOT EXISTS last_name  TEXT;
ALTER TABLE public.audit_log   ADD COLUMN IF NOT EXISTS actor_name TEXT;

-- =========================================================
-- 8. REWRITE key_systems policies to be org-aware
-- =========================================================
DROP POLICY IF EXISTS "Systems owner all" ON public.key_systems;
DROP POLICY IF EXISTS "Org members read systems" ON public.key_systems;
DROP POLICY IF EXISTS "Standard and above insert systems" ON public.key_systems;
DROP POLICY IF EXISTS "Standard and above update systems" ON public.key_systems;
DROP POLICY IF EXISTS "Master admin only delete systems" ON public.key_systems;

CREATE POLICY "Org members read systems" ON public.key_systems
  FOR SELECT TO authenticated
  USING (
    (org_id = public.current_user_org_id() AND public.current_user_org_role() IN ('master_admin','admin','standard'))
    OR id IN (SELECT system_id FROM public.system_access WHERE user_id = auth.uid())
  );

CREATE POLICY "Standard and above insert systems" ON public.key_systems
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.current_user_org_id()
    AND public.current_user_org_role() IN ('master_admin','admin','standard')
  );

CREATE POLICY "Standard and above update systems" ON public.key_systems
  FOR UPDATE TO authenticated
  USING (
    org_id = public.current_user_org_id()
    AND public.current_user_org_role() IN ('master_admin','admin','standard')
  );

CREATE POLICY "Master admin only delete systems" ON public.key_systems
  FOR DELETE TO authenticated
  USING (
    org_id = public.current_user_org_id()
    AND public.current_user_org_role() = 'master_admin'
  );

-- =========================================================
-- 9. REWRITE audit_log policy to be org-aware
-- =========================================================
DROP POLICY IF EXISTS "Users see own logs" ON public.audit_log;
CREATE POLICY "Org members see org logs" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    system_id IN (
      SELECT id FROM public.key_systems
      WHERE org_id = public.current_user_org_id()
    )
    AND public.current_user_org_role() IN ('master_admin','admin','standard')
  );

-- =========================================================
-- 10. UPDATED handle_new_user trigger -> bootstrap org
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company    TEXT;
  v_full_name  TEXT;
  v_first      TEXT;
  v_last       TEXT;
  v_org_id     UUID;
  v_existing   UUID;
BEGIN
  v_company   := COALESCE(NEW.raw_user_meta_data->>'company', '');
  v_first     := NULLIF(NEW.raw_user_meta_data->>'first_name', '');
  v_last      := NULLIF(NEW.raw_user_meta_data->>'last_name', '');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '');

  IF v_first IS NULL AND v_full_name <> '' THEN
    v_first := split_part(v_full_name, ' ', 1);
    v_last  := NULLIF(trim(substring(v_full_name from position(' ' in v_full_name) + 1)), '');
  END IF;
  v_first := COALESCE(v_first, '');
  v_last  := COALESCE(v_last, '');

  -- If user was invited, an org_members(pending) row matching email exists. Attach it.
  SELECT org_id INTO v_existing
  FROM public.org_members
  WHERE lower(email) = lower(NEW.email) AND status = 'pending'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    v_org_id := v_existing;
    UPDATE public.org_members
       SET user_id = NEW.id, status = 'active'
     WHERE org_id = v_org_id AND lower(email) = lower(NEW.email);
  ELSE
    INSERT INTO public.organisations(name)
    VALUES (NULLIF(v_company,'') )
    RETURNING id INTO v_org_id;

    -- If company was blank, fall back to "<first>'s organisation"
    IF v_company = '' THEN
      UPDATE public.organisations SET name = COALESCE(NULLIF(v_first,'')||'''s organisation','My organisation')
       WHERE id = v_org_id;
    END IF;

    INSERT INTO public.org_members(org_id, user_id, first_name, last_name, email, org_role, status)
    VALUES (v_org_id, NEW.id, v_first, v_last, NEW.email, 'master_admin', 'active');
  END IF;

  INSERT INTO public.profiles (id, name, company, email, role, first_name, last_name, org_id)
  VALUES (
    NEW.id,
    trim(v_first || ' ' || v_last),
    v_company,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'facility_manager'),
    v_first,
    v_last,
    v_org_id
  )
  ON CONFLICT (id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name  = EXCLUDED.last_name,
        org_id     = EXCLUDED.org_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 11. BACKFILL existing users into orgs
-- =========================================================
DO $$
DECLARE
  r RECORD;
  v_org_id UUID;
  v_first TEXT;
  v_last TEXT;
BEGIN
  FOR r IN
    SELECT p.id, p.name, p.company, p.email
    FROM public.profiles p
    WHERE p.org_id IS NULL
  LOOP
    v_first := COALESCE(NULLIF(split_part(COALESCE(r.name,''), ' ', 1),''), 'User');
    v_last  := NULLIF(trim(substring(COALESCE(r.name,'') from position(' ' in COALESCE(r.name,'') ) + 1)),'');
    IF v_last IS NULL THEN v_last := ''; END IF;

    INSERT INTO public.organisations(name)
    VALUES (COALESCE(NULLIF(r.company,''), v_first || '''s organisation'))
    RETURNING id INTO v_org_id;

    INSERT INTO public.org_members(org_id, user_id, first_name, last_name, email, org_role, status)
    VALUES (v_org_id, r.id, v_first, v_last, r.email, 'master_admin', 'active');

    UPDATE public.profiles
       SET org_id = v_org_id,
           first_name = COALESCE(first_name, v_first),
           last_name  = COALESCE(last_name, v_last)
     WHERE id = r.id;
  END LOOP;
END $$;

-- Backfill key_systems.org_id from their owner's profile
UPDATE public.key_systems ks
   SET org_id = p.org_id
  FROM public.profiles p
 WHERE ks.org_id IS NULL AND p.id = ks.user_id;
