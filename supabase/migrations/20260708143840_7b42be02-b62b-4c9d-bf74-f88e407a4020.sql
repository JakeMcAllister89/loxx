
CREATE TABLE public.partner_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('master_admin','member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','removed')),
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, email)
);

GRANT ALL ON public.partner_members TO service_role;

ALTER TABLE public.partner_members ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: all access goes through edge functions (service_role).
CREATE POLICY "Admins can view partner members"
ON public.partner_members
FOR SELECT
TO authenticated
USING (public.check_is_admin());

CREATE TRIGGER trg_partner_members_updated_at
BEFORE UPDATE ON public.partner_members
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed from existing partner_logins so no partner is locked out.
INSERT INTO public.partner_members (partner_id, email, role, status)
SELECT pl.partner_id, lower(pl.email), 'master_admin', 'active'
FROM public.partner_logins pl
ON CONFLICT (partner_id, email) DO NOTHING;
