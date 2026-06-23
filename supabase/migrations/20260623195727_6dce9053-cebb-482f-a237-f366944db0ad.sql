ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Backfill: any existing order that is not 'pending' status was paid
UPDATE public.orders
  SET payment_status = 'paid', paid_at = created_at
  WHERE status NOT IN ('pending', 'cancelled');