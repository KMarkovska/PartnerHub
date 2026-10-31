-- Run after the migration and after at least one user has registered.
-- All records are fictional and use fixed IDs so this seed is repeatable.
begin;

do $$
declare
  seed_owner_id uuid;
begin
  select profile.id
  into seed_owner_id
  from public.profiles as profile
  where profile.is_active
  order by profile.created_at, profile.id
  limit 1;

  if seed_owner_id is null then
    raise exception
      'Register an account after applying the migration before loading demo data.';
  end if;

  insert into public.funding_programs (
    id, name, description, max_amount, currency, eligibility_information
  )
  values
    ('f1000000-0000-4000-8000-000000000001', 'Regional Innovation Fund',
      'Support for early-stage product research and development.', 75000, 'EUR',
      'Small and medium-sized businesses operating in eligible regions.'),
    ('f1000000-0000-4000-8000-000000000002', 'Green Operations Grant',
      'Funding for measurable energy-efficiency improvements.', 120000, 'EUR',
      'Applicants must provide a baseline energy assessment.'),
    ('f1000000-0000-4000-8000-000000000003', 'Digital Growth Initiative',
      'Support for digital transformation and business automation.', 50000, 'EUR',
      'Registered businesses with a digital transformation plan.'),
    ('f1000000-0000-4000-8000-000000000004', 'Community Skills Partnership',
      'Funding for workforce development and professional training.', 30000, 'EUR',
      'Projects must provide skills training to local employees.')
  on conflict (id) do nothing;

  insert into public.customers (id, name, country, contact_name, contact_email, owner_id)
  values
    ('c1000000-0000-4000-8000-000000000001', 'Northstar Paperworks',
      'Bulgaria', 'Mira Stoyanova', 'mira@northstar.example', seed_owner_id),
    ('c1000000-0000-4000-8000-000000000002', 'Juniper Field Labs',
      'Romania', 'Adrian Popescu', 'adrian@juniper.example', seed_owner_id),
    ('c1000000-0000-4000-8000-000000000003', 'Copper Finch Foods',
      'Greece', 'Eleni Markou', 'eleni@copperfinch.example', seed_owner_id),
    ('c1000000-0000-4000-8000-000000000004', 'Blue Lantern Works',
      'Croatia', 'Luka Horvat', 'luka@bluelantern.example', seed_owner_id),
    ('c1000000-0000-4000-8000-000000000005', 'Meadowline Systems',
      'Bulgaria', 'Nadia Ivanova', 'nadia@meadowline.example', seed_owner_id)
  on conflict (id) do nothing;

  insert into public.applications (
    id, customer_id, program_id, owner_id, title, description,
    requested_amount, approved_amount, status, deadline
  )
  values
    ('a1000000-0000-4000-8000-000000000001',
      'c1000000-0000-4000-8000-000000000001',
      'f1000000-0000-4000-8000-000000000001', seed_owner_id,
      'Recycled Fibre Product Research',
      'Prototype a higher-recycled-content packaging material.', 42000, 38000,
      'Approved', current_date + 60),
    ('a1000000-0000-4000-8000-000000000002',
      'c1000000-0000-4000-8000-000000000002',
      'f1000000-0000-4000-8000-000000000002', seed_owner_id,
      'Low-Energy Laboratory Upgrade',
      'Replace legacy equipment and measure energy savings.', 68000, 60000,
      'Approved', current_date + 90),
    ('a1000000-0000-4000-8000-000000000003',
      'c1000000-0000-4000-8000-000000000003',
      'f1000000-0000-4000-8000-000000000003', seed_owner_id,
      'Digital Inventory Pilot',
      'Introduce inventory forecasting for a small production team.', 24500, null,
      'Under Review', current_date + 45)
  on conflict (id) do nothing;

  insert into public.projects (
    id, application_id, customer_id, owner_id, name, status,
    start_date, end_date, progress
  )
  values
    ('51000000-0000-4000-8000-000000000001',
      'a1000000-0000-4000-8000-000000000001',
      'c1000000-0000-4000-8000-000000000001', seed_owner_id,
      'Recycled Fibre Prototype', 'In Progress',
      current_date - 30, current_date + 120, 35),
    ('51000000-0000-4000-8000-000000000002',
      'a1000000-0000-4000-8000-000000000002',
      'c1000000-0000-4000-8000-000000000002', seed_owner_id,
      'Laboratory Efficiency Retrofit', 'Not Started',
      current_date + 14, current_date + 150, 0)
  on conflict (id) do nothing;

  insert into public.milestones (id, project_id, title, description, due_date, status)
  values
    ('61000000-0000-4000-8000-000000000001',
      '51000000-0000-4000-8000-000000000001',
      'Complete material requirements',
      'Document prototype requirements and evaluation criteria.',
      current_date + 14, 'Completed'),
    ('61000000-0000-4000-8000-000000000002',
      '51000000-0000-4000-8000-000000000001',
      'Produce first prototype batch',
      'Prepare and document the first test batch.',
      current_date + 45, 'In Progress'),
    ('61000000-0000-4000-8000-000000000003',
      '51000000-0000-4000-8000-000000000002',
      'Confirm equipment specification',
      'Approve the equipment specification and installation plan.',
      current_date + 30, 'Not Started');
end;
$$;

commit;
