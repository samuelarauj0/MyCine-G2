-- Function to securely set banner active status
create or replace function public.set_banner_active(p_banner_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'permission denied';
  end if;

  update public.promotional_banners
  set is_active = p_is_active,
      updated_at = now()
  where id = p_banner_id;
end;
$$;

-- Allow admins to view all banners in admin panel
drop policy if exists "Admins can view all banners" on public.promotional_banners;
create policy "Admins can view all banners"
on public.promotional_banners
for select
using (public.has_role(auth.uid(), 'admin'));