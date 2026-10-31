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

Sign-in, account creation, session persistence, protected pages, profile loading, role-based navigation, administrator-only routing, and logout use Supabase Auth and the `profiles` table. New accounts receive the database's default `user` role through the profile trigger; registration never accepts a role. Supabase RLS and database functions remain the authority for data access. The Administration page uses Supabase for its user list, access changes, and metrics. Other database-backed page data and file upload/download workflows are not implemented yet.

To verify project connectivity, open the sign-in or registration page and select **Test Supabase connection**. The check calls the Supabase Auth settings endpoint using the configured publishable key and reports success or a sanitized HTTP error without displaying the key.

## Authentication end-to-end testing

Browser end-to-end automation is not configured in this repository. `npm run test:db` runs pgTAP authorization tests, not browser registration, email, or session flows. Do not treat a successful build or pgTAP run as proof that the browser authentication flows passed.

The safest manual option is an isolated local Supabase stack with Docker and the local email catcher. The local configuration enables email confirmation and permits the Vite login callback. Do not point the local test app at the hosted project:

1. Start Docker, then run `npx supabase start` and `npx supabase db reset --local --no-seed` from the repository root. These commands reset only the local database.
2. In PowerShell, set the app to the local API and use only the publishable/anon key printed by `npx supabase status`, then start Vite:

   ```powershell
   $env:VITE_SUPABASE_URL = "http://127.0.0.1:54321"
   $env:VITE_SUPABASE_ANON_KEY = "<local publishable/anon key from supabase status>"
   npm run dev
   ```

   Do not use a production URL/key for this local run.
3. Open `/src/pages/register.html` and register a test-only identity such as `PartnerHub E2E User` with a unique email address. Local messages are captured by the email catcher at `http://127.0.0.1:54324`; they are not sent externally.
4. Open the confirmation email in the catcher. The link should return to `/src/pages/login.html` and establish a session. In the local Studio SQL Editor (`http://127.0.0.1:54323`), verify a `profiles` row exists for the Auth user with role `user` and `is_active = true`.
5. Sign out, verify the correct password signs in, and verify an incorrect password displays an error. Refresh a protected page while signed in; the session should remain active.
6. As the regular user, open `/src/pages/admin.html` directly; the app should redirect to the dashboard with an access-denied notice. Sign out and open a protected page; it should redirect to sign-in.
7. To test administration, create a second disposable user and use the documented first-admin bootstrap only in this isolated local database. Sign in as the admin; verify the user table and counts load, then change the other test user role/status. The current administrator own access controls should be disabled.

If testing against a hosted environment, use a separate staging Supabase project and a test mailbox you control, never production data. Add the exact staging app callback URL ending in `/src/pages/login.html` to **Authentication > URL Configuration > Redirect URLs**. Do not use real employee/customer details or commit test credentials.

## Supabase database setup

The schema and access-control source is in `supabase/migrations/20261031190000_partnerhub_backend.sql`. It was applied to the hosted project through the Supabase SQL Editor on 2026-10-31. Live checks confirmed all seven tables have RLS enabled, all 12 foreign keys and the document-parent constraint exist, the private bucket and its three Storage policies exist, and the profile trigger and guarded administrator function are installed. The pgTAP suite has not been run against the hosted project.

The administration email listing and self-access protection are in `supabase/migrations/20261031200139_admin_user_management.sql`. Apply this migration after the base migration in each target project before using the updated Administration page. This change has not been applied to the hosted project.

1. Open the [PartnerHub Supabase SQL Editor](https://supabase.com/dashboard/project/pxsapaipigauweaghzwg/sql/new).
2. The current hosted project already has this migration. For a different project, first confirm the seven PartnerHub tables and `partnerhub-documents` bucket do not exist; the migration aborts if the bucket already exists and does not drop or replace existing objects.
3. To apply it to a clean project, run the complete `supabase/migrations/20261031190000_partnerhub_backend.sql` file in the SQL Editor. The SQL runs in a transaction.
4. The live project currently has no active profiles, so demo data has not been seeded. Register an account, bootstrap the first administrator using the trusted SQL below, then run `supabase/seed.sql` in the SQL Editor. Seeding requires at least one active profile and creates no user accounts.
5. The SQL test suite is `supabase/tests/database/partnerhub_rls.test.sql`; run it against a local Docker database with Supabase CLI (`supabase test db`). It has not been run against the hosted project.

The migration uses `RESTRICT` on record relationships to avoid cascading deletion of business records. RLS limits customer/application/project access to active owners or active administrators; milestone access follows project ownership; document access follows its application or project; inactive funding programs are hidden from regular users. Profile roles can only be changed through the administrator-guarded database function after the first administrator is bootstrapped. The storage bucket is private, limits uploads to 20 MiB and the listed document/image types, and uses paths shaped as `<uploader-uuid>/<applications|projects>/<record-uuid>/<document-uuid>/<filename>`.

New profiles default to `user`. To bootstrap the first administrator, use the trusted SQL Editor as the project owner after registration, replacing the UUID with that user's `profiles.id`:

```sql
update public.profiles
set role = 'admin'
where id = 'AUTH_USER_UUID';
```

After that, active administrators should use the guarded `public.set_profile_access` function to assign roles or deactivate accounts. Application clients cannot update profile roles directly.

GitHub Actions runs the same pgTAP suite on pushes to `main` and pull requests targeting `main`. The workflow uses a fresh local Supabase stack on `ubuntu-latest` and does not connect to the hosted project or require production secrets. View results in the repository's **Actions** tab under **Database tests**.

## Build and preview

```sh
npm run build
npm run preview
```

Vite builds each page as a separate HTML entry under `dist/`.
