-- Switch assign_quote_number to SECURITY INVOKER and grant sequence usage so it no longer trips the SECURITY DEFINER linter
create or replace function public.assign_quote_number()
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare next_num integer;
begin
  next_num := nextval('public.quote_number_seq');
  return 'QT-' || lpad(next_num::text, 4, '0');
end;
$$;

revoke all on function public.assign_quote_number() from public, anon;
grant execute on function public.assign_quote_number() to authenticated, service_role;
grant usage on sequence public.quote_number_seq to authenticated, service_role;

-- Restrict listing of product-images bucket via storage.objects.
-- Public file reads still work through the public URL endpoint (which bypasses RLS),
-- but the broad SELECT policy that allowed listing all objects is replaced with an admin-only one.
drop policy if exists "Product images are publicly readable" on storage.objects;

create policy "Admins can list product images"
on storage.objects
for select
to authenticated
using (bucket_id = 'product-images' and public.is_admin(auth.uid()));
