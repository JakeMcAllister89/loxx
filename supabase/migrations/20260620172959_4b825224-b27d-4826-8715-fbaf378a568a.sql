
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  system_id uuid references public.key_systems(id) on delete set null,
  quote_number text unique,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','converted','expired')),
  valid_until date,
  customer_name text,
  customer_email text,
  company text,
  delivery_address jsonb,
  customer_po_ref text,
  notes text,
  items jsonb,
  subtotal numeric(10,2),
  vat numeric(10,2),
  total numeric(10,2),
  tree_snapshot jsonb,
  converted_order_id uuid references public.orders(id) on delete set null,
  sent_at timestamptz,
  sent_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.quotes to authenticated;
grant all on public.quotes to service_role;

alter table public.quotes enable row level security;

create policy "Users manage own quotes"
on public.quotes for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins view all quotes"
on public.quotes for select
to authenticated
using (public.is_admin(auth.uid()));

create index if not exists quotes_user_id_idx on public.quotes(user_id);
create index if not exists quotes_system_id_idx on public.quotes(system_id);
create index if not exists quotes_status_idx on public.quotes(status);

create trigger quotes_set_updated_at
before update on public.quotes
for each row execute function public.tg_set_updated_at();

create sequence if not exists public.quote_number_seq start with 1 increment by 1;

create or replace function public.assign_quote_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare next_num integer;
begin
  next_num := nextval('public.quote_number_seq');
  return 'QT-' || lpad(next_num::text, 4, '0');
end;
$$;

revoke all on function public.assign_quote_number() from public;
grant execute on function public.assign_quote_number() to authenticated, service_role;

insert into public.admin_settings (key, value) values
  ('quote_validity_days', '"30"'::jsonb),
  ('quote_terms', '"This quotation is valid for 30 days from the date of issue. Prices shown exclude VAT unless stated. VAT will be applied at the prevailing rate. Delivery within 3-5 working days of order confirmation and payment. All cylinders are supplied keyed to the master key system reference stated above."'::jsonb),
  ('quote_footer', '"LOXX — Master key systems made simple"'::jsonb)
on conflict (key) do nothing;
