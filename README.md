# PartnerHub

PartnerHub is a responsive, multi-page starter for managing partner funding applications, customers, projects, documents, and funding programs.

## Technology

- HTML, CSS, and JavaScript ES modules
- Bootstrap 5 and Bootstrap Icons
- Vite
- Supabase integration is planned but not configured yet

## Run locally

Install dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

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

The UI currently provides responsive page layouts, navigation, empty states, and form validation. Authentication, live data, role enforcement, and file storage require Supabase configuration and are not active yet; the interface labels this setup state rather than showing fabricated records.

## Build and preview

```sh
npm run build
npm run preview
```

Vite builds each page as a separate HTML entry under `dist/`.
