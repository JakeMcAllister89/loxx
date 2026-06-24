CREATE TABLE public.platform_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_invites TO authenticated;
GRANT ALL ON public.platform_invites TO service_role;

ALTER TABLE public.platform_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage platform invites" ON public.platform_invites
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_platform_invites_token ON public.platform_invites(token);
CREATE INDEX idx_platform_invites_email ON public.platform_invites(lower(email));