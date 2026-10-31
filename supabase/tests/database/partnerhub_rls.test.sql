begin;

select plan(38);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'customers', 'customers table exists');
select has_table('public', 'funding_programs', 'funding_programs table exists');
select has_table('public', 'applications', 'applications table exists');
select has_table('public', 'projects', 'projects table exists');
select has_table('public', 'milestones', 'milestones table exists');
select has_table('public', 'documents', 'documents table exists');

select ok(
  (select count(*) = 7
   from pg_class as relation
   join pg_namespace as schema on schema.oid = relation.relnamespace
   where schema.nspname = 'public'
     and relation.relname in (
       'profiles', 'customers', 'funding_programs', 'applications',
       'projects', 'milestones', 'documents'
     )
     and relation.relrowsecurity),
  'RLS is enabled on all seven application tables'
);

select is(
  (select count(*)::integer
   from pg_constraint as constraint_row
   join pg_class as relation on relation.oid = constraint_row.conrelid
   join pg_namespace as schema on schema.oid = relation.relnamespace
   where schema.nspname = 'public'
     and relation.relname in (
       'profiles', 'customers', 'funding_programs', 'applications',
       'projects', 'milestones', 'documents'
     )
     and constraint_row.contype = 'f'),
  12,
  'all twelve expected foreign keys exist'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.documents'::regclass
      and conname = 'documents_exactly_one_parent_check'
      and contype = 'c'
  ),
  'documents must belong to exactly one application or project'
);

select is(
  (select count(*)::integer
   from pg_policy as policy
   where policy.polrelid = 'storage.objects'::regclass
     and policy.polname in (
       'partnerhub_documents_read_authorized',
       'partnerhub_documents_upload_owner_path',
       'partnerhub_documents_delete_admin'
     )),
  3,
  'private document storage policies exist'
);

select ok(
  (select not bucket.public
   from storage.buckets as bucket
   where bucket.id = 'partnerhub-documents'),
  'document bucket exists and is private'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created_partnerhub_profile'
      and not tgisinternal
  ),
  'new auth users receive a profile trigger'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.set_profile_access(uuid,text,boolean)',
    'EXECUTE'
  ),
  'authenticated clients can call the guarded administrator operation'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('71000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'rls-user-one@example.invalid', '', now(), '{"provider":"email"}',
   '{"full_name":"RLS User One"}', now(), now()),
  ('71000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'rls-user-two@example.invalid', '', now(), '{"provider":"email"}',
   '{"full_name":"RLS User Two"}', now(), now());

update public.profiles
set role = 'admin'
where id = '71000000-0000-4000-8000-000000000002';

insert into public.funding_programs (
  id, name, max_amount, currency, is_active
)
values
  ('f2000000-0000-4000-8000-000000000001', 'RLS active test program', 1000, 'EUR', true),
  ('f2000000-0000-4000-8000-000000000002', 'RLS inactive test program', 1000, 'EUR', false);

insert into public.customers (id, name, owner_id)
values
  ('c2000000-0000-4000-8000-000000000001', 'RLS customer one',
   '71000000-0000-4000-8000-000000000001'),
  ('c2000000-0000-4000-8000-000000000002', 'RLS customer two',
   '71000000-0000-4000-8000-000000000002');

insert into public.applications (
  id, customer_id, program_id, owner_id, title, requested_amount, status
)
values
  ('a2000000-0000-4000-8000-000000000001',
   'c2000000-0000-4000-8000-000000000001',
   'f2000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001',
   'RLS application one', 500, 'Approved'),
  ('a2000000-0000-4000-8000-000000000002',
   'c2000000-0000-4000-8000-000000000002',
   'f2000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000002',
   'RLS application two', 500, 'Approved');

insert into public.projects (
  id, application_id, customer_id, owner_id, name
)
values
  ('52000000-0000-4000-8000-000000000001',
   'a2000000-0000-4000-8000-000000000001',
   'c2000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001',
   'RLS project one'),
  ('52000000-0000-4000-8000-000000000002',
   'a2000000-0000-4000-8000-000000000002',
   'c2000000-0000-4000-8000-000000000002',
   '71000000-0000-4000-8000-000000000002',
   'RLS project two');

insert into public.milestones (id, project_id, title)
values
  ('62000000-0000-4000-8000-000000000001',
   '52000000-0000-4000-8000-000000000001', 'RLS milestone one'),
  ('62000000-0000-4000-8000-000000000002',
   '52000000-0000-4000-8000-000000000002', 'RLS milestone two');

insert into public.documents (
  id, project_id, uploaded_by, file_name, storage_path, file_type, file_size
)
values
  ('d2000000-0000-4000-8000-000000000001',
   '52000000-0000-4000-8000-000000000001',
   '71000000-0000-4000-8000-000000000001', 'one.pdf',
   '71000000-0000-4000-8000-000000000001/projects/52000000-0000-4000-8000-000000000001/d2000000-0000-4000-8000-000000000001/one.pdf',
   'application/pdf', 100),
  ('d2000000-0000-4000-8000-000000000002',
   '52000000-0000-4000-8000-000000000002',
   '71000000-0000-4000-8000-000000000002', 'two.pdf',
   '71000000-0000-4000-8000-000000000002/projects/52000000-0000-4000-8000-000000000002/d2000000-0000-4000-8000-000000000002/two.pdf',
   'application/pdf', 100);

insert into storage.objects (id, bucket_id, name)
values
  ('d3000000-0000-4000-8000-000000000001', 'partnerhub-documents',
   '71000000-0000-4000-8000-000000000001/projects/52000000-0000-4000-8000-000000000001/d2000000-0000-4000-8000-000000000001/one.pdf'),
  ('d3000000-0000-4000-8000-000000000002', 'partnerhub-documents',
   '71000000-0000-4000-8000-000000000002/projects/52000000-0000-4000-8000-000000000002/d2000000-0000-4000-8000-000000000002/two.pdf');

set local role anon;

select throws_ok(
  $$select count(*) from public.customers$$,
  '42501',
  null,
  'anonymous users cannot access protected customer data'
);

select throws_ok(
  $$select count(*) from storage.objects
    where bucket_id = 'partnerhub-documents'$$,
  '42501',
  null,
  'anonymous users cannot access document storage'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.customers),
  1,
  'regular users see only their own customers'
);

select is(
  (select count(*)::integer from public.funding_programs),
  1,
  'regular users see active programs only'
);

select is(
  (select count(*)::integer from public.applications),
  1,
  'regular users see only their own applications'
);

select is(
  (select count(*)::integer from public.projects),
  1,
  'regular users see only their own projects'
);

select is(
  (select count(*)::integer from public.milestones),
  1,
  'regular users see milestones on their own projects only'
);

select is(
  (select count(*)::integer from public.documents),
  1,
  'regular users see documents on their own projects only'
);

select is(
  (select count(*)::integer
   from storage.objects
   where bucket_id = 'partnerhub-documents'),
  1,
  'regular users can read only storage objects for their own documents'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'partnerhub-documents',
      '71000000-0000-4000-8000-000000000001/projects/52000000-0000-4000-8000-000000000001/new-document/authorized.pdf'
    )$$,
  'regular users can upload to a path under their own project'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values (
      'partnerhub-documents',
      '71000000-0000-4000-8000-000000000002/projects/52000000-0000-4000-8000-000000000002/new-document/unauthorized.pdf'
    )$$,
  '42501',
  null,
  'regular users cannot upload to another user project path'
);

select throws_ok(
  $$insert into public.customers (name, owner_id)
    values ('Unauthorized customer', '71000000-0000-4000-8000-000000000002')$$,
  '42501',
  null,
  'regular users cannot create records for another owner'
);

select throws_ok(
  $$update public.profiles set role = 'admin'
    where id = '71000000-0000-4000-8000-000000000001'$$,
  '42501',
  null,
  'users cannot directly change their profile role'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.customers),
  2,
  'active administrators can view all customers'
);

select is(
  (select count(*)::integer from public.applications),
  2,
  'active administrators can view all applications'
);

select is(
  (select count(*)::integer from public.projects),
  2,
  'active administrators can view all projects'
);

select is(
  (select count(*)::integer from public.milestones),
  2,
  'active administrators can view all milestones'
);

select is(
  (select count(*)::integer from public.documents),
  2,
  'active administrators can view all documents'
);

select is(
  (select count(*)::integer
   from storage.objects
   where bucket_id = 'partnerhub-documents'),
  3,
  'active administrators can read all authorized storage objects'
);

select lives_ok(
  $$select public.set_profile_access(
    '71000000-0000-4000-8000-000000000001',
    'admin',
    true
  )$$,
  'active administrators can use the trusted profile access operation'
);

select is(
  (select role from public.profiles
   where id = '71000000-0000-4000-8000-000000000001'),
  'admin',
  'the trusted administrator operation can assign the admin role'
);

select lives_ok(
  $$select public.set_profile_access(
    '71000000-0000-4000-8000-000000000001',
    'user',
    false
  )$$,
  'active administrators can deactivate users'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '71000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.customers),
  0,
  'inactive users cannot access protected customer data'
);

select throws_ok(
  $$select public.set_profile_access(
    '71000000-0000-4000-8000-000000000002',
    'admin',
    true
  )$$,
  '42501',
  'An active administrator is required to manage profile access.',
  'inactive users cannot use administrator profile operations'
);

select * from finish();
rollback;
