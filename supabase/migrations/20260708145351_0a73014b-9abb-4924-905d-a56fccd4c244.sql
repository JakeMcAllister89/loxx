
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_sort_code text,
  ADD COLUMN IF NOT EXISTS bank_account_number text;

-- Backfill first/last from name for existing rows
UPDATE public.partners
SET
  first_name = COALESCE(first_name, NULLIF(split_part(name, ' ', 1), '')),
  last_name  = COALESCE(last_name,  NULLIF(trim(substring(name from position(' ' in name) + 1)), ''))
WHERE name IS NOT NULL;
