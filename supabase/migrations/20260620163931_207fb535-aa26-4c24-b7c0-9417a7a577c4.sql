
revoke execute on function public.assign_po_number() from public;
revoke execute on function public.assign_po_number() from anon;
revoke execute on function public.assign_po_number() from authenticated;
grant execute on function public.assign_po_number() to service_role;
