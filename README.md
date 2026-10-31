# PartnerHub

PartnerHub is a responsive, multi-page starter for managing partner funding applications, customers, projects, documents, and funding programs.

## Technology

- HTML, CSS, and JavaScript ES modules
- Bootstrap 5 and Bootstrap Icons
- Vite
- Supabase Auth client using the publishable key from local environment variables

## Run locally

Install dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your Supabase project URL and publishable key. Never put a Supabase secret or service-role key in frontend environment variables. `.env` is ignored by Git.

Open the local URL printed by Vite. The root page takes you to the sign-in screen. The current screens are available at:

- `/src/pages/login.html`
- `/src/pages/register.html`
- `/src/pages/dashboard.html`
- `/src/pages/applications.html`
- `/src/pages/customers.html`
- `/src/pages/projects.html`
- `/src/pages/documents.html`
- `/src/pages/admin.html`
- `/src/pages/programs.html`

Sign-in and account creation use Supabase Auth. The database migration creates profiles, funding and project tables, role safeguards, RLS policies, and a private documents bucket. Database-backed page data and file upload/download workflows are not implemented yet.

To verify project connectivity, open the sign-in or registration page and select **Test Supabase connection**. The check calls the Supabase Auth settings endpoint using the configured publishable key and reports success or a sanitized HTTP error without displaying the key.

## Supabase database setup

The schema and access-control source is in `supabase/migrations/20261031190000_partnerhub_backend.sql`. It has **not** been applied to the hosted project. The current environment has a publishable key but no Supabase database-management credential or CLI, so it cannot apply migrations remotely.

1. Open the [PartnerHub Supabase SQL Editor](https://supabase.com/dashboard/project/pxsapaipigauweaghzwg/sql/new).
2. Before applying anything, confirm the seven PartnerHub tables and `partnerhub-documents` bucket do not already exist. The migration aborts if the bucket already exists; it does not drop or replace existing objects.
3. Open `supabase/migrations/20261031190000_partnerhub_backend.sql`, paste its complete contents into a new SQL Editor query, and run it. The SQL runs in a transaction.
4. Verify the tables, RLS, foreign keys, policies, and bucket in the SQL Editor before continuing. The SQL test suite is `supabase/tests/database/partnerhub_rls.test.sql`; run it with Supabase CLI and a local Docker database (`supabase test db`) after configuring the CLI.
5. After the migration succeeds, register an account so the auth trigger creates its `user` profile. Then run `supabase/seed.sql` in the SQL Editor to load fictional demo programs, customers, applications, projects, and milestones. Seeding requires at least one active profile and creates no user accounts.

The migration uses `RESTRICT` on record relationships to avoid cascading deletion of business records. RLS limits customer/application/project access to active owners or active administrators; milestone access follows project ownership; document access follows its application or project; inactive funding programs are hidden from regular users. Profile roles can only be changed through the administrator-guarded database function after the first administrator is bootstrapped. The storage bucket is private, limits uploads to 20 MiB and the listed document/image types, and uses paths shaped as `<uploader-uuid>/<applications|projects>/<record-uuid>/<document-uuid>/<filename>`.

New profiles default to `user`. To bootstrap the first administrator, use the trusted SQL Editor as the project owner after registration, replacing the UUID with that user's `profiles.id`:

```sql
update public.profiles
set role = 'admin'
where id = 'AUTH_USER_UUID';
```

After that, active administrators should use the guarded `public.set_profile_access` function to assign roles or deactivate accounts. Application clients cannot update profile roles directly.

## Build and preview

```sh
npm run build
npm run preview
```

Vite builds each page as a separate HTML entry under `dist/`.
