
-- Section 1: cylinder_profile on products
alter table public.products add column if not exists cylinder_profile text;
update public.products set cylinder_profile = 'Euro' where code in ('EKZ-12','AZG','C-AZG','HS-EKZ','C-KDZ36K36','C-DZ36/36','C-KDZ36K41','C-DZ36/41','C-KDZ31K31');
update public.products set cylinder_profile = 'Oval' where code = 'C-OKZ36K36';
update public.products set cylinder_profile = 'Euro thumbturn' where code = 'TT-30/10';
update public.products set cylinder_profile = 'Mortice' where code = 'MC-35';

-- Section 4: customer PO ref on orders
alter table public.orders add column if not exists customer_po_ref text;

-- Section 7: supplier PO fields on orders
alter table public.orders add column if not exists po_number text;
alter table public.orders add column if not exists po_sent_at timestamptz;
alter table public.orders add column if not exists po_sent_to text;

create sequence if not exists po_number_seq start with 1 increment by 1;

create or replace function public.assign_po_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare next_num integer;
begin
  next_num := nextval('po_number_seq');
  return 'PO-' || lpad(next_num::text, 4, '0');
end;
$$;

-- Section 7: admin_settings
create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  updated_at timestamptz default now()
);

grant select, insert, update, delete on public.admin_settings to authenticated;
grant all on public.admin_settings to service_role;

alter table public.admin_settings enable row level security;

create policy "Admins can manage settings"
on public.admin_settings
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into public.admin_settings (key, value) values
  ('supplier_name', 'Your Supplier Name'),
  ('supplier_email', 'supplier@example.com'),
  ('supplier_account', ''),
  ('company_name', 'LOXX'),
  ('company_address', ''),
  ('po_notes', 'Please key all cylinders to the master key system reference noted on this order.')
on conflict (key) do nothing;

-- Section 8: cylinder_types
create table if not exists public.cylinder_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

grant select on public.cylinder_types to anon, authenticated;
grant all on public.cylinder_types to authenticated;
grant all on public.cylinder_types to service_role;

alter table public.cylinder_types enable row level security;

create policy "Anyone can read cylinder types"
on public.cylinder_types
for select
using (true);

create policy "Admins can manage cylinder types"
on public.cylinder_types
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into public.cylinder_types (name, sort_order) values
  ('Single', 1), ('Double', 2), ('Oval', 3), ('Thumbturn', 4), ('Mortice', 5)
on conflict (name) do nothing;
