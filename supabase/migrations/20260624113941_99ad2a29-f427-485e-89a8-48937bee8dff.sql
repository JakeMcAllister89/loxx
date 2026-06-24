-- Partners table
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  partner_type TEXT NOT NULL DEFAULT 'manufacturer' CHECK (partner_type IN ('manufacturer', 'sales_rep', 'broker')),
  default_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partners" ON public.partners FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Add partner_id and commission_pct to key_systems
ALTER TABLE public.key_systems
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2);

-- Add commission snapshot to order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2);

-- Partner portal auth table
CREATE TABLE public.partner_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.partner_logins TO service_role;
ALTER TABLE public.partner_logins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partner logins" ON public.partner_logins FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Commission payments log
CREATE TABLE public.partner_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.partner_payments TO authenticated;
GRANT ALL ON public.partner_payments TO service_role;
ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partner payments" ON public.partner_payments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));