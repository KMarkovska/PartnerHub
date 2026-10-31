create or replace function public.set_profile_access(
  target_profile_id uuid,
  target_role text,
  target_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_admin() then
    raise exception 'An active administrator is required to manage profile access.'
      using errcode = '42501';
  end if;

  if target_profile_id is null
    or target_role is null
    or target_role not in ('admin', 'user')
    or target_is_active is null then
    raise exception 'Invalid profile access settings.'
      using errcode = '22023';
  end if;

  if target_profile_id = (select auth.uid()) then
    raise exception 'Administrators cannot change their own profile access.'
      using errcode = '42501';
  end if;

  update public.profiles
  set role = target_role,
      is_active = target_is_active
  where id = target_profile_id;

  if not found then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_profile_access(uuid, text, boolean) from public, anon;
grant execute on function public.set_profile_access(uuid, text, boolean) to authenticated;

create function public.admin_list_profiles()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_admin() then
    raise exception 'An active administrator is required to view profile details.'
      using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.full_name,
    u.email::text,
    p.role,
    p.is_active,
    p.created_at
  from public.profiles as p
  join auth.users as u on u.id = p.id
  order by p.created_at desc, p.id;
end;
$$;

revoke all on function public.admin_list_profiles() from public, anon;
grant execute on function public.admin_list_profiles() to authenticated;