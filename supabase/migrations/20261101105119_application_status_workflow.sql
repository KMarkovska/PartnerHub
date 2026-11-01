create function public.enforce_application_status_workflow()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'Draft' then
      raise exception 'New applications must start as drafts.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if private.is_active_admin() then
    if (
      old.status = 'Submitted'
      and new.status in ('Under Review', 'Approved', 'Rejected')
    ) or (
      old.status = 'Under Review'
      and new.status in ('Approved', 'Rejected')
    ) then
      return new;
    end if;
  elsif private.is_active_user()
    and old.owner_id = (select auth.uid())
    and old.status = 'Draft'
    and new.status = 'Submitted' then
    return new;
  end if;

  raise exception 'You are not allowed to make this application status change.'
    using errcode = '42501';
end;
$$;

revoke all on function public.enforce_application_status_workflow()
  from public, anon, authenticated;

create trigger applications_enforce_status_workflow
before insert or update on public.applications
for each row execute function public.enforce_application_status_workflow();