
CREATE TABLE public.partner_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_invites_token ON public.partner_invites(token);
CREATE INDEX idx_partner_invites_partner_id ON public.partner_invites(partner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_invites TO authenticated;
GRANT ALL ON public.partner_invites TO service_role;

ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view partner invites"
  ON public.partner_invites FOR SELECT
  TO authenticated
  USING (public.check_is_admin());

CREATE POLICY "Admins can manage partner invites"
  ON public.partner_invites FOR ALL
  TO authenticated
  USING (public.check_is_admin())
  WITH CHECK (public.check_is_admin());

CREATE TRIGGER partner_invites_set_updated_at
  BEFORE UPDATE ON public.partner_invites
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
