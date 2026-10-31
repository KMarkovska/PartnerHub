# GitHub Copilot Instructions – PartnerHub

## 1. Project Overview

**Project Name:** PartnerHub  
**Project Type:** Partner Funding & Project Management Platform  
**Purpose:** SoftUni AI – Software Technologies with AI Capstone Project

PartnerHub is a responsive, multi-page business web application designed to manage partner funding opportunities, customers, funding applications, projects, milestones and supporting documents.

The platform centralizes funding and project management activities in one place, providing users with visibility into application statuses, funding amounts, project progress and upcoming deadlines.

The application supports two user roles:

- **Administrator:** Manages users, funding programs, customers, applications and projects across the platform.
- **Regular User:** Manages assigned customers, creates funding applications, tracks projects and uploads supporting documents.

The project uses fictional customers, companies and funding programs. It must remain an independent educational application.

## 2. Technology Stack

Use only the following technologies:

### Frontend
- HTML5
- CSS3
- JavaScript (ES6+)
- Bootstrap 5
- Bootstrap Icons

### Backend
- Supabase
- Supabase PostgreSQL Database
- Supabase Authentication
- Supabase Storage
- Supabase Row-Level Security (RLS)

### Build Tools
- Node.js
- npm
- Vite

### Version Control and Deployment
- Git
- GitHub
- Netlify

### Development Restrictions

- Use plain JavaScript and ES modules.
- Do NOT use React.
- Do NOT use Vue.
- Do NOT use Angular.
- Do NOT use TypeScript.
- Do NOT use other frontend frameworks.
- Do NOT introduce unnecessary dependencies.
- Do not replace the selected technology stack without explicit approval.

## 3. Architecture and Project Structure

Implement a multi-page client-server application.

Each main application screen must have its own HTML file.

Use Vite for development and production builds.

Use modular JavaScript files to separate UI components, services, utilities and business logic.

Follow this suggested structure:

```text
partnerhub/
│
├── .github/
│   └── copilot-instructions.md
│
├── public/
│   └── assets/
│
├── src/
│   ├── pages/
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── dashboard.html
│   │   ├── applications.html
│   │   ├── customers.html
│   │   ├── projects.html
│   │   ├── documents.html
│   │   ├── admin.html
│   │   └── programs.html
│   │
│   ├── js/
│   │   ├── config/
│   │   │   └── supabase.js
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── application.service.js
│   │   │   ├── customer.service.js
│   │   │   ├── project.service.js
│   │   │   ├── document.service.js
│   │   │   └── admin.service.js
│   │   │
│   │   ├── components/
│   │   │   ├── sidebar.js
│   │   │   ├── navbar.js
│   │   │   └── notifications.js
│   │   │
│   │   ├── utils/
│   │   │   ├── validators.js
│   │   │   └── formatters.js
│   │   │
│   │   └── main.js
│   │
│   └── css/
│       └── style.css
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

The structure may be extended when necessary, but preserve separation of responsibilities.

Do not put all application logic in one JavaScript file.

## 4. Application Screens

Implement the following pages:

### 4.1 Login
- Email and password authentication.
- Form validation.
- Error and success messages.
- Redirect authenticated users to the dashboard.

### 4.2 Registration
- Full name.
- Email.
- Password.
- Password confirmation.
- Create Supabase Auth account.
- Create corresponding profile record.

New users must receive the regular user role by default.

### 4.3 Dashboard
Display relevant statistics:

- Total funding applications.
- Pending applications.
- Approved applications.
- Rejected applications.
- Total requested funding.
- Total approved funding.
- Active projects.
- Upcoming deadlines.
- Recent applications.

Statistics must come from actual Supabase records, not hardcoded values.

Regular users should see their own accessible information. Administrators should see platform-wide information.

### 4.4 Funding Applications
Provide:

- Applications listing.
- Search functionality.
- Status filters.
- Customer filters.
- Funding program filters.
- Create application.
- Edit application.
- Delete application.
- Application details.
- Status management.

Application statuses:

- Draft
- Submitted
- Under Review
- Approved
- Rejected

### 4.5 Customers
Provide:

- Customer listing.
- Search customers.
- Add customer.
- Edit customer.
- Delete customer.
- Customer details.
- Associated funding applications.

Customer fields:

- Company name.
- Country.
- Contact person.
- Contact email.
- Assigned user.

### 4.6 Projects
Provide:

- Project listing.
- Project creation.
- Project editing.
- Project status management.
- Assigned project owner.
- Start date.
- End date.
- Progress percentage.
- Associated customer.
- Associated approved funding application.
- Project milestones.

Project statuses:

- Not Started
- In Progress
- Completed
- On Hold

### 4.7 Documents
Provide:

- Document listing.
- File upload.
- File download.
- File metadata.
- Associated application or project.
- Upload date.
- Uploaded by.

Use Supabase Storage for the actual files.

### 4.8 Administration
Accessible only to administrators.

Provide:

- User listing.
- User details.
- Role management.
- Account activation status.
- View all customers.
- View all applications.
- View all projects.

Supported roles:

- admin
- user

### 4.9 Funding Programs
Provide:

- Funding program listing.
- Create funding program.
- Edit funding program.
- Activate/deactivate funding programs.
- Funding description.
- Maximum funding amount.
- Currency.
- Eligibility information.

Only administrators can manage funding programs.

## 5. Database Design

Use Supabase PostgreSQL as the main database.

The application must contain at least the following seven tables:

### 5.1 profiles

Purpose: Store user profile information and application roles.

Columns:

- id – UUID, primary key, references auth.users.id.
- full_name – text.
- role – text, default 'user'.
- is_active – boolean, default true.
- created_at – timestamp.

Only administrators can assign administrative roles.

Users must never be allowed to promote themselves to administrator.

### 5.2 customers

Purpose: Store customer/company information.

Columns:

- id – UUID, primary key.
- name – text, required.
- country – text.
- contact_name – text.
- contact_email – text.
- owner_id – UUID, references profiles.id.
- created_at – timestamp.

### 5.3 funding_programs

Purpose: Store available funding programs.

Columns:

- id – UUID, primary key.
- name – text.
- description – text.
- max_amount – numeric(12,2).
- currency – text.
- eligibility_information – text.
- is_active – boolean.
- created_at – timestamp.

### 5.4 applications

Purpose: Store funding applications.

Columns:

- id – UUID, primary key.
- customer_id – UUID, references customers.id.
- program_id – UUID, references funding_programs.id.
- owner_id – UUID, references profiles.id.
- title – text.
- description – text.
- requested_amount – numeric(12,2).
- approved_amount – numeric(12,2), nullable.
- status – text.
- deadline – date.
- created_at – timestamp.
- updated_at – timestamp.

### 5.5 projects

Purpose: Store projects created from approved applications.

Columns:

- id – UUID, primary key.
- application_id – UUID, references applications.id.
- customer_id – UUID, references customers.id.
- owner_id – UUID, references profiles.id.
- name – text.
- status – text.
- start_date – date.
- end_date – date.
- progress – integer, between 0 and 100.
- created_at – timestamp.
- updated_at – timestamp.

### 5.6 milestones

Purpose: Track project milestones.

Columns:

- id – UUID, primary key.
- project_id – UUID, references projects.id.
- title – text.
- description – text.
- due_date – date.
- status – text.
- created_at – timestamp.

### 5.7 documents

Purpose: Store document metadata.

Columns:

- id – UUID, primary key.
- application_id – UUID, nullable foreign key.
- project_id – UUID, nullable foreign key.
- uploaded_by – UUID, references profiles.id.
- file_name – text.
- storage_path – text.
- file_type – text.
- file_size – bigint.
- created_at – timestamp.

A document must be associated with either an application or a project. Enforce this using a database constraint.

## 6. Database Best Practices

- Use UUID primary keys.
- Define appropriate foreign keys.
- Use appropriate ON DELETE behavior.
- Add created_at and updated_at timestamps where relevant.
- Use NOT NULL constraints for required fields.
- Use CHECK constraints for status, role, amount and progress values.
- Use numeric types for financial amounts.
- Add indexes to frequently queried columns and foreign keys.
- Avoid duplicated information.
- Use proper relational database normalization.
- Store actual files in Supabase Storage, not PostgreSQL.
- Store file paths and metadata in the documents table.

Every database schema change must be implemented through a SQL migration file in:

supabase/migrations/

Never make undocumented database schema changes.

## 7. Authentication and Authorization

Use Supabase Authentication.

Implement:

- Registration.
- Login.
- Logout.
- Session management.
- Protected application pages.
- Role-based access control.

Use the profiles table to store application roles.

Implement Row-Level Security (RLS) policies on all application tables.

### Regular user permissions

Regular users may:

- View their own profile.
- View and manage their own customer records.
- View and manage their own applications.
- View and manage their own projects.
- Manage milestones belonging to their projects.
- Upload and download authorized documents.
- View active funding programs.

### Administrator permissions

Administrators may:

- View all profiles.
- Manage user roles through trusted administrative operations.
- View and manage all customers.
- View and manage all applications.
- View and manage all projects.
- Manage milestones.
- Access all authorized documents.
- Create, edit and deactivate funding programs.

### Security requirements

- Enable RLS on every relevant table.
- Never rely only on frontend role checks.
- Enforce access restrictions in PostgreSQL.
- Do not expose the Supabase service-role key.
- Do not allow users to modify their own role.
- Validate record ownership on create and update operations.
- Protect related records from unauthorized access.
- Apply Storage access policies.
- Use private Storage buckets.
- Ensure deactivated users cannot access protected data.
- Do not trust user-supplied owner_id values.

Use secure SQL functions where appropriate. Avoid recursive RLS policies when checking administrator permissions.

## 8. Supabase Storage

Create a private bucket:

partnerhub-documents

Use it for:

- SOW documents.
- Purchase orders.
- Supporting evidence.
- Project documents.
- Other application-related files.

Requirements:

- Upload files from the frontend.
- Store files in Supabase Storage.
- Save file metadata in the documents table.
- Use unique file paths to prevent accidental overwrites.
- Restrict access based on ownership and permissions.
- Allow authorized users to download files.
- Validate file size and allowed file types.
- Handle upload and download errors.

Never make confidential documents publicly accessible.

## 9. UI and Design Guidelines

The application must have a professional enterprise SaaS appearance.

### Design direction

Use a clean, modern business dashboard inspired by enterprise applications.

### Color palette

- Primary navy: #163A5F
- Secondary blue: #2878C8
- Background: #F5F7FA
- White: #FFFFFF
- Main text: #1F2937
- Muted text: #6B7280

### Typography

Use Inter or a similar clean sans-serif font.

### Layout

- Left sidebar navigation.
- Top navigation bar.
- Main content area.
- Responsive navigation.
- Dashboard KPI cards.
- Professional data tables.
- Consistent forms.
- Bootstrap modals for create/edit operations.
- Status badges.
- Loading indicators.
- Empty states.
- Success and error notifications.

### Status colors

Use consistent visual indicators for application and project statuses.

Do not overload the interface with unnecessary animations or decorative elements.

### Responsive design

The application must work on:

- Desktop browsers.
- Tablet screens.
- Mobile browsers.

Use Bootstrap's responsive grid system and responsive components.

## 10. JavaScript Coding Standards

- Use ES6+ syntax.
- Use JavaScript ES modules.
- Prefer const and let.
- Avoid var.
- Use async/await for asynchronous operations.
- Use try/catch for error handling.
- Use meaningful variable and function names.
- Keep functions focused and reusable.
- Avoid duplicated code.
- Separate database operations from presentation logic.
- Validate user input.
- Escape untrusted content before inserting it into HTML.
- Avoid unsafe use of innerHTML.
- Handle loading, success, empty and error states.

Do not use hardcoded application data when the information should come from Supabase.

Use seed data only for development and testing.

## 11. Supabase Integration

Use the official Supabase JavaScript client.

Initialize the client in:

src/js/config/supabase.js

Use environment variables:

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

Use only the public publishable/anon key in frontend code.

Create reusable service modules for database operations.

Examples:

- auth.service.js
- customer.service.js
- application.service.js
- project.service.js
- document.service.js
- admin.service.js

Services should be responsible for communicating with Supabase.

UI components should call the services rather than containing duplicated database queries.

## 12. Vite Configuration

Use Vite as the application build tool.

Requirements:

- Configure all HTML pages as build inputs.
- Use npm scripts for development and production builds.
- Keep the project compatible with Netlify deployment.
- Verify that all pages work after running npm run build.
- Ensure that assets and module paths resolve correctly in production.

Use appropriate Vite configuration for a multi-page application.

## 13. Git and GitHub Guidelines

Use Git throughout the entire development process.

Requirements:

- Keep `.github/copilot-instructions.md` in the repository and include it in the first commit, before application development begins.
- Treat this file as project-wide guidance throughout development; consult and follow it when planning, implementing, testing and reviewing changes.
- Commit every successfully implemented feature.
- Use meaningful commit messages.
- Keep commits focused on specific changes.
- Do not commit node_modules.
- Do not commit .env files.
- Do not commit passwords or private credentials.
- Keep .env.example with placeholder values.
- Test changes before committing.
- Preserve working functionality.

Target at least 18 meaningful commits across at least three different calendar days.

Do not create artificial commits containing no meaningful project changes.

## 14. Documentation Requirements

Maintain a comprehensive README.md.

The README must contain:

1. Project title and description.
2. Main application features.
3. User roles and permissions.
4. Technology stack.
5. Application architecture.
6. Database schema.
7. Entity Relationship Diagram.
8. Folder and file structure.
9. Supabase setup instructions.
10. Local development instructions.
11. Environment variable configuration.
12. Database migration instructions.
13. Demo account information.
14. Deployment URL.
15. Screenshots of the application.

Keep documentation consistent with the actual implementation.

## 15. Development Workflow

Follow the AI-assisted development loop for every feature:

1. Inspect the existing code and architecture.
2. Understand the requested feature.
3. Propose a small implementation plan.
4. Implement the feature using the existing architecture.
5. Run the application.
6. Test the functionality.
7. Review the browser console and terminal output.
8. Fix bugs and regressions.
9. Verify that existing features still work.
10. Commit successful changes to Git.

Implement one feature at a time.

Do not attempt to build the entire application in one large change.

Before making substantial changes, explain which files will be affected.

Never silently remove existing functionality.

Do not overwrite working code without understanding its purpose.

## 16. Quality Assurance

Before considering a feature complete, verify:

- The feature works as expected.
- Data is saved correctly in Supabase.
- Data is retrieved correctly.
- Validation works.
- Loading states work.
- Errors are handled.
- Authorization is enforced.
- Responsive layout works.
- No unexpected console errors occur.
- Existing functionality has not been broken.

Test the application with both regular-user and administrator accounts.

Verify unauthorized access directly against Supabase, not only through the frontend.

## 17. Project Priorities

Development priorities must follow this order:

1. Correct architecture and project setup.
2. Database schema and migrations.
3. Authentication and authorization.
4. Core CRUD functionality.
5. Dashboard.
6. Projects and milestones.
7. File uploads and downloads.
8. Administrator panel.
9. Responsive design and UI refinements.
10. Testing, documentation and deployment.

Do not prioritize optional features over mandatory capstone requirements.

## 18. Important Instructions for GitHub Copilot

Always follow these project instructions when generating or modifying code.

Before implementing a feature:

- Inspect relevant existing files.
- Reuse existing services and components.
- Follow the established folder structure.
- Use plain JavaScript.
- Respect the database schema.
- Respect user permissions.
- Avoid unnecessary dependencies.

When a request is ambiguous, ask for clarification rather than making major architectural assumptions.

When proposing improvements, prioritize simplicity, maintainability, security and compatibility with the capstone requirements.

The final goal is a fully functional, secure, responsive, multi-page business application that demonstrates good software engineering practices and meets all SoftUni capstone assessment criteria.