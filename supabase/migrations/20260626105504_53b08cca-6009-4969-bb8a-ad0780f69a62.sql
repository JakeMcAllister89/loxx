ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_charge numeric NOT NULL DEFAULT 0;
INSERT INTO public.admin_settings (key, value) VALUES
  ('delivery_charge_keys_only', '7.50'),
  ('delivery_charge_with_cylinders', '9.50')
ON CONFLICT (key) DO NOTHING;