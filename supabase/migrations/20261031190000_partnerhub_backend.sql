begin;

create schema private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  full_name text not null default '',
  role text not null default 'user' check (role in ('admin', 'user')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  country text,
  contact_name text,
  contact_email text,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.funding_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  description text,
  max_amount numeric(12, 2) not null check (max_amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  eligibility_information text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  program_id uuid not null references public.funding_programs (id) on delete restrict,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  description text,
  requested_amount numeric(12, 2) not null check (requested_amount > 0),
  approved_amount numeric(12, 2) check (approved_amount >= 0),
  status text not null default 'Draft'
    check (status in ('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected')),
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  status text not null default 'Not Started'
    check (status in ('Not Started', 'In Progress', 'Completed', 'On Hold')),
  start_date date,
  end_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date is null or end_date is null or end_date >= start_date)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  description text,
  due_date date,
  status text not null default 'Not Started'
    check (status in ('Not Started', 'In Progress', 'Completed', 'On Hold')),
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete restrict,
  project_id uuid references public.projects (id) on delete restrict,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  file_name text not null check (length(btrim(file_name)) > 0),
  storage_path text not null unique check (length(btrim(storage_path)) > 0),
  file_type text not null,
  file_size bigint not null check (file_size between 1 and 20971520),
  created_at timestamptz not null default now(),
  constraint documents_exactly_one_parent_check
    check ((application_id is not null) <> (project_id is not null)),
  check (split_part(storage_path, '/', 1) = uploaded_by::text),
  check (file_type in (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png'
  ))
);

create index customers_owner_id_idx on public.customers (owner_id);
create index applications_customer_id_idx on public.applications (customer_id);
create index applications_program_id_idx on public.applications (program_id);
create index applications_owner_id_idx on public.applications (owner_id);
create index applications_status_idx on public.applications (status);
create index applications_deadline_idx on public.applications (deadline) where deadline is not null;
create index projects_application_id_idx on public.projects (application_id);
create index projects_customer_id_idx on public.projects (customer_id);
create index projects_owner_id_idx on public.projects (owner_id);
create index milestones_project_id_idx on public.milestones (project_id);
create index milestones_due_date_idx on public.milestones (due_date) where due_date is not null;
create index documents_application_id_idx on public.documents (application_id) where application_id is not null;
create index documents_project_id_idx on public.documents (project_id) where project_id is not null;
create index documents_uploaded_by_idx on public.documents (uploaded_by);

create function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.is_active
  );
$$;

create function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.is_active
      and profile.role = 'admin'
  );
$$;

create function private.can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
    and (
      private.is_active_admin()
      or exists (
        select 1
        from public.projects as project
        where project.id = target_project_id
          and project.owner_id = (select auth.uid())
      )
    );
$$;

create function private.can_access_document_target(
  target_application_id uuid,
  target_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
    and (
      private.is_active_admin()
      or (
        target_application_id is not null
        and exists (
          select 1
          from public.applications as application
          where application.id = target_application_id
            and application.owner_id = (select auth.uid())
        )
      )
      or (
        target_project_id is not null
        and exists (
          select 1
          from public.projects as project
          where project.id = target_project_id
            and project.owner_id = (select auth.uid())
        )
      )
    );
$$;

create function private.can_access_storage_object(target_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
    and (
      private.is_active_admin()
      or exists (
        select 1
        from public.documents as document
        where document.storage_path = target_name
          and private.can_access_document_target(
            document.application_id,
            document.project_id
          )
      )
    );
$$;

create function private.can_upload_storage_object(target_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
    and case
      when cardinality(storage.foldername(target_name)) < 4 then false
      when private.is_active_admin() then
        (
          (storage.foldername(target_name))[2] = 'applications'
          and exists (
            select 1
            from public.applications as application
            where application.id::text = (storage.foldername(target_name))[3]
          )
        )
        or (
          (storage.foldername(target_name))[2] = 'projects'
          and exists (
            select 1
            from public.projects as project
            where project.id::text = (storage.foldername(target_name))[3]
          )
        )
      else
        (storage.foldername(target_name))[1] = (select auth.uid())::text
        and (
          (
            (storage.foldername(target_name))[2] = 'applications'
            and exists (
              select 1
              from public.applications as application
              where application.id::text = (storage.foldername(target_name))[3]
                and application.owner_id = (select auth.uid())
            )
          )
          or (
            (storage.foldername(target_name))[2] = 'projects'
            and exists (
              select 1
              from public.projects as project
              where project.id::text = (storage.foldername(target_name))[3]
                and project.owner_id = (select auth.uid())
            )
          )
        )
    end;
$$;

revoke all on function private.is_active_user() from public, anon;
revoke all on function private.is_active_admin() from public, anon;
revoke all on function private.can_access_project(uuid) from public, anon;
revoke all on function private.can_access_document_target(uuid, uuid) from public, anon;
revoke all on function private.can_access_storage_object(text) from public, anon;
revoke all on function private.can_upload_storage_object(text) from public, anon;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_active_admin() to authenticated;
grant execute on function private.can_access_project(uuid) to authenticated;
grant execute on function private.can_access_document_target(uuid, uuid) to authenticated;
grant execute on function private.can_access_storage_object(text) to authenticated;
grant execute on function private.can_upload_storage_object(text) to authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

insert into public.profiles (id, full_name)
select
  auth_user.id,
  coalesce(nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''), '')
from auth.users as auth_user
on conflict (id) do nothing;

create trigger on_auth_user_created_partnerhub_profile
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.set_profile_access(
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

  if target_role is null
    or target_role not in ('admin', 'user')
    or target_is_active is null then
    raise exception 'Invalid profile access settings.'
      using errcode = '22023';
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

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create function public.validate_application_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean := private.is_active_admin();
begin
  if not exists (
    select 1 from public.profiles as profile
    where profile.id = new.owner_id and profile.is_active
  ) then
    raise exception 'Application owner must be an active profile.'
      using errcode = '23514';
  end if;

  if not caller_is_admin
    and (select auth.uid()) is not null
    and new.owner_id <> (select auth.uid()) then
    raise exception 'Applications must be assigned to the current user.'
      using errcode = '42501';
  end if;

  if not caller_is_admin
    and (select auth.uid()) is not null
    and not exists (
    select 1 from public.customers as customer
    where customer.id = new.customer_id
      and customer.owner_id = (select auth.uid())
  ) then
    raise exception 'The selected customer is not accessible.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.funding_programs as program
    where program.id = new.program_id and program.is_active
  ) then
    raise exception 'Applications must use an active funding program.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_application_owner() from public, anon, authenticated;

create trigger applications_validate_owner
before insert or update of customer_id, program_id, owner_id
on public.applications
for each row execute function public.validate_application_owner();

create function public.validate_customer_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles as profile
    where profile.id = new.owner_id and profile.is_active
  ) then
    raise exception 'Customer owner must be an active profile.'
      using errcode = '23514';
  end if;

  if not (select private.is_active_admin())
    and (select auth.uid()) is not null
    and new.owner_id <> (select auth.uid()) then
    raise exception 'Customers must be assigned to the current user.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_customer_owner() from public, anon, authenticated;

create trigger customers_validate_owner
before insert or update of owner_id
on public.customers
for each row execute function public.validate_customer_owner();

create function public.validate_project_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles as profile
    where profile.id = new.owner_id and profile.is_active
  ) then
    raise exception 'Project owner must be an active profile.'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.applications as application
    where application.id = new.application_id
      and application.status = 'Approved'
      and application.customer_id = new.customer_id
      and application.owner_id = new.owner_id
  ) then
    raise exception 'A project must match an approved application, customer, and owner.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_project_application() from public, anon, authenticated;

create trigger projects_validate_application
before insert or update of application_id, customer_id, owner_id
on public.projects
for each row execute function public.validate_project_application();

create function public.validate_document_storage_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  path_segments text[] := storage.foldername(new.storage_path);
begin
  if cardinality(path_segments) < 4
    or path_segments[1] <> new.uploaded_by::text
    or path_segments[4] <> new.id::text then
    raise exception 'Document storage path does not match its uploader and document.'
      using errcode = '23514';
  end if;

  if new.application_id is not null
    and (
      path_segments[2] <> 'applications'
      or path_segments[3] <> new.application_id::text
    ) then
    raise exception 'Document storage path does not match its application.'
      using errcode = '23514';
  end if;

  if new.project_id is not null
    and (
      path_segments[2] <> 'projects'
      or path_segments[3] <> new.project_id::text
    ) then
    raise exception 'Document storage path does not match its project.'
      using errcode = '23514';
  end if;

  if (select auth.uid()) is not null
    and not private.can_access_document_target(new.application_id, new.project_id) then
    raise exception 'Document target is not accessible.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_document_storage_path() from public, anon, authenticated;

create trigger documents_validate_storage_path
before insert or update of id, application_id, project_id, uploaded_by, storage_path
on public.documents
for each row execute function public.validate_document_storage_path();

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.funding_programs enable row level security;
alter table public.applications enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.documents enable row level security;

revoke all on table
  public.profiles,
  public.customers,
  public.funding_programs,
  public.applications,
  public.projects,
  public.milestones,
  public.documents
from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on
  public.customers,
  public.funding_programs,
  public.applications,
  public.projects,
  public.milestones
to authenticated;
grant select, insert, delete on public.documents to authenticated;
grant update (file_name, file_type) on public.documents to authenticated;

create policy profiles_select_self_or_admin
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select private.is_active_admin())
);

create policy profiles_update_own_name
on public.profiles for update to authenticated
using (
  id = (select auth.uid())
  and (select private.is_active_user())
)
with check (
  id = (select auth.uid())
  and (select private.is_active_user())
);

create policy profiles_admin_update_name
on public.profiles for update to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy customers_manage_owner_or_admin
on public.customers for all to authenticated
using (
  (select private.is_active_admin())
  or (
    (select private.is_active_user())
    and owner_id = (select auth.uid())
  )
)
with check (
  (select private.is_active_admin())
  or (
    (select private.is_active_user())
    and owner_id = (select auth.uid())
  )
);

create policy funding_programs_select_active_or_admin
on public.funding_programs for select to authenticated
using (
  (is_active and (select private.is_active_user()))
  or (select private.is_active_admin())
);

create policy funding_programs_admin_manage
on public.funding_programs for all to authenticated
using ((select private.is_active_admin()))
with check ((select private.is_active_admin()));

create policy applications_manage_owner_or_admin
on public.applications for all to authenticated
using (
  (select private.is_active_admin())
  or (
    (select private.is_active_user())
    and owner_id = (select auth.uid())
  )
)
with check (
  (select private.is_active_admin())
  or (
    (select private.is_active_user())
    and owner_id = (select auth.uid())
  )
);

create policy projects_manage_owner_or_admin
on public.projects for all to authenticated
using (
  (select private.is_active_admin())
  or (
    (select private.is_active_user())
    and owner_id = (select auth.uid())
  )
)
with check (
  (select private.is_active_admin())
  or (
    (select private.is_active_user())
    and owner_id = (select auth.uid())
  )
);

create policy milestones_manage_project_owner_or_admin
on public.milestones for all to authenticated
using ((select private.can_access_project(project_id)))
with check ((select private.can_access_project(project_id)));

create policy documents_select_authorized
on public.documents for select to authenticated
using (
  (select private.can_access_document_target(application_id, project_id))
);

create policy documents_insert_authorized
on public.documents for insert to authenticated
with check (
  (
    uploaded_by = (select auth.uid())
    or (select private.is_active_admin())
  )
  and (select private.can_access_document_target(application_id, project_id))
);

create policy documents_update_authorized
on public.documents for update to authenticated
using (
  (select private.can_access_document_target(application_id, project_id))
)
with check (
  uploaded_by = (select auth.uid())
  and (select private.can_access_document_target(application_id, project_id))
);

create policy documents_delete_admin
on public.documents for delete to authenticated
using ((select private.is_active_admin()));

do $$
begin
  if exists (
    select 1 from storage.buckets where id = 'partnerhub-documents'
  ) then
    raise exception
      'Storage bucket partnerhub-documents already exists; inspect its settings before applying this migration.';
  end if;
end;
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'partnerhub-documents',
  'partnerhub-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png'
  ]
);

create policy partnerhub_documents_read_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'partnerhub-documents'
  and (select private.can_access_storage_object(name))
);

create policy partnerhub_documents_upload_owner_path
on storage.objects for insert to authenticated
with check (
  bucket_id = 'partnerhub-documents'
  and (select private.can_upload_storage_object(name))
);

create policy partnerhub_documents_delete_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'partnerhub-documents'
  and (select private.is_active_admin())
);

commit;
