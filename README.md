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

Sign-in and account creation use Supabase Auth. Account registration stores the full name as user metadata. Database profiles, live application data, role enforcement, and file storage are not configured yet; the interface labels this setup state rather than showing fabricated records.

## Build and preview

```sh
npm run build
npm run preview
```

Vite builds each page as a separate HTML entry under `dist/`.
