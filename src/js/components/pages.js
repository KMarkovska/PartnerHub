const emptyState = (icon, title, description) => `
  <div class="empty-state">
    <span class="empty-state-icon"><i class="bi ${icon}" aria-hidden="true"></i></span>
    <h3>${title}</h3>
    <p>${description}</p>
  </div>
`;

const table = (columns, emptyTitle, emptyDescription, icon = 'bi-inbox') => `
  <div class="table-responsive">
    <table class="table align-middle data-table">
      <thead><tr>${columns.map((column) => `<th scope="col">${column}</th>`).join('')}</tr></thead>
      <tbody><tr><td colspan="${columns.length}">${emptyState(icon, emptyTitle, emptyDescription)}</td></tr></tbody>
    </table>
  </div>
`;

const actionButton = (label, icon = 'bi-plus-lg') => `
  <button class="btn btn-primary" type="button" data-notice="Connect Supabase to enable ${label.toLowerCase()}." aria-label="${label}">
    <i class="bi ${icon} me-2" aria-hidden="true"></i>${label}
  </button>
`;

export const pages = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'A clear view of your funding activity and projects.',
    icon: 'bi-grid-1x2',
    content: `
      <div class="row g-3 mb-4">
        ${[
          ['Total applications', 'bi-files', 'bi-blue'],
          ['Pending review', 'bi-hourglass-split', 'bi-amber'],
          ['Approved funding', 'bi-currency-euro', 'bi-green'],
          ['Active projects', 'bi-kanban', 'bi-violet'],
        ].map(([label, icon, color]) => `
          <div class="col-12 col-sm-6 col-xl-3">
            <section class="card kpi-card h-100">
              <div class="card-body">
                <div class="kpi-topline"><span class="kpi-label">${label}</span><span class="kpi-icon ${color}"><i class="bi ${icon}" aria-hidden="true"></i></span></div>
                <p class="kpi-value mb-1">—</p>
                <p class="kpi-footnote mb-0">Connect your workspace to load data</p>
              </div>
            </section>
          </div>
        `).join('')}
      </div>
      <div class="row g-3">
        <div class="col-12 col-xl-8">
          <section class="card content-card h-100">
            <div class="card-header"><div><h2 class="section-title">Recent applications</h2><p class="section-subtitle">The latest funding requests in your workspace</p></div><a class="btn btn-sm btn-light border" href="/src/pages/applications.html">View applications</a></div>
            ${table(['Application', 'Customer', 'Program', 'Requested', 'Status'], 'No applications yet', 'Applications will appear here when your workspace is connected.')}
          </section>
        </div>
        <div class="col-12 col-xl-4">
          <section class="card content-card h-100">
            <div class="card-header"><div><h2 class="section-title">Upcoming deadlines</h2><p class="section-subtitle">Stay ahead of important dates</p></div></div>
            ${emptyState('bi-calendar-check', 'Nothing scheduled', 'Upcoming application deadlines will show here.')}
          </section>
        </div>
      </div>
      <section class="card content-card mt-3">
        <div class="card-header"><div><h2 class="section-title">Funding overview</h2><p class="section-subtitle">Requested and approved funding across your applications</p></div></div>
        <div class="overview-placeholder"><i class="bi bi-bar-chart-line" aria-hidden="true"></i><span>Funding analytics will be available when connected data is loaded.</span></div>
      </section>
    `,
  },
  applications: {
    title: 'Funding applications',
    subtitle: 'Track requests from draft through final decision.',
    icon: 'bi-files',
    action: actionButton('New application'),
    content: `
      <section class="card content-card">
        <div class="card-body border-bottom">
          <div class="row g-2">
            <div class="col-12 col-lg-5"><label class="visually-hidden" for="application-search">Search applications</label><div class="input-group"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="application-search" class="form-control" type="search" placeholder="Search applications"></div></div>
            <div class="col-12 col-sm-6 col-lg-3"><label class="visually-hidden" for="application-status">Filter by status</label><select class="form-select" id="application-status"><option value="">All statuses</option><option>Draft</option><option>Submitted</option><option>Under Review</option><option>Approved</option><option>Rejected</option></select></div>
            <div class="col-12 col-sm-6 col-lg-4"><label class="visually-hidden" for="application-customer">Filter by customer</label><select class="form-select" id="application-customer"><option value="">All customers</option></select></div>
          </div>
        </div>
        ${table(['Application', 'Customer', 'Funding program', 'Requested amount', 'Submitted', 'Status', ''], 'No applications found', 'New funding applications will appear here.', 'bi-file-earmark-plus')}
      </section>
    `,
  },
  customers: {
    title: 'Customers',
    subtitle: 'Manage company profiles and their funding activity.',
    icon: 'bi-buildings',
    action: actionButton('Add customer'),
    content: `
      <section class="card content-card">
        <div class="card-body border-bottom">
          <label class="visually-hidden" for="customer-search">Search customers</label>
          <div class="input-group search-control"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="customer-search" class="form-control" type="search" placeholder="Search by company, contact, or email"></div>
        </div>
        ${table(['Company', 'Country', 'Contact person', 'Contact email', 'Applications', 'Assigned to', ''], 'No customers yet', 'Add a customer to start organizing your funding applications.', 'bi-buildings')}
      </section>
    `,
  },
  projects: {
    title: 'Projects',
    subtitle: 'Monitor delivery, ownership, and project milestones.',
    icon: 'bi-kanban',
    action: actionButton('New project'),
    content: `
      <div class="row g-3 mb-3">
        ${[['All projects', '—'], ['In progress', '—'], ['Completed', '—'], ['On hold', '—']].map(([label, count]) => `
          <div class="col-6 col-xl-3"><div class="card project-stat"><span>${label}</span><strong>${count}</strong></div></div>
        `).join('')}
      </div>
      <section class="card content-card">
        <div class="card-body border-bottom"><div class="row g-2"><div class="col-12 col-lg-6"><label class="visually-hidden" for="project-search">Search projects</label><div class="input-group"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="project-search" class="form-control" type="search" placeholder="Search projects or customers"></div></div><div class="col-12 col-sm-6 col-lg-3"><label class="visually-hidden" for="project-status">Filter projects by status</label><select id="project-status" class="form-select"><option>All statuses</option><option>Not Started</option><option>In Progress</option><option>Completed</option><option>On Hold</option></select></div></div></div>
        ${table(['Project', 'Customer', 'Owner', 'Start date', 'End date', 'Progress', 'Status'], 'No projects yet', 'Projects created from approved applications will appear here.', 'bi-kanban')}
      </section>
    `,
  },
  documents: {
    title: 'Documents',
    subtitle: 'Keep application and project files organized.',
    icon: 'bi-folder2-open',
    action: actionButton('Upload document', 'bi-cloud-arrow-up'),
    content: `
      <section class="card content-card">
        <div class="card-body border-bottom"><div class="row g-2"><div class="col-12 col-lg-6"><label class="visually-hidden" for="document-search">Search documents</label><div class="input-group"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="document-search" class="form-control" type="search" placeholder="Search documents"></div></div><div class="col-12 col-sm-6 col-lg-3"><label class="visually-hidden" for="document-type">Filter documents by type</label><select id="document-type" class="form-select"><option>All documents</option><option>Applications</option><option>Projects</option></select></div></div></div>
        ${table(['Document', 'Related to', 'File type', 'Uploaded by', 'Upload date', ''], 'No documents yet', 'Files associated with applications and projects will appear here.', 'bi-folder2-open')}
      </section>
    `,
  },
  admin: {
    title: 'Administration',
    subtitle: 'Manage workspace access, roles, and account status.',
    icon: 'bi-shield-check',
    content: `
      <div class="alert alert-warning d-flex gap-2 align-items-start" role="alert"><i class="bi bi-shield-exclamation mt-1" aria-hidden="true"></i><div><strong>Administrator access is not configured.</strong> Connect Supabase Auth and enforce role checks with database policies before using administrative actions.</div></div>
      <section class="card content-card">
        <div class="card-body border-bottom"><div class="row g-2"><div class="col-12 col-lg-6"><label class="visually-hidden" for="user-search">Search users</label><div class="input-group"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="user-search" class="form-control" type="search" placeholder="Search users by name or email"></div></div><div class="col-12 col-sm-6 col-lg-3"><label class="visually-hidden" for="user-role">Filter by role</label><select id="user-role" class="form-select"><option>All roles</option><option>Administrator</option><option>Regular user</option></select></div></div></div>
        ${table(['User', 'Email', 'Role', 'Account status', 'Joined', ''], 'No users to display', 'Workspace members will appear here after authentication is configured.', 'bi-people')}
      </section>
      <section class="card content-card mt-3"><div class="card-header"><div><h2 class="section-title">Workspace overview</h2><p class="section-subtitle">Platform-wide customer, application, and project activity</p></div></div><div class="row g-3 p-3"><div class="col-12 col-md-4"><div class="admin-metric"><span>Customers</span><strong>—</strong></div></div><div class="col-12 col-md-4"><div class="admin-metric"><span>Applications</span><strong>—</strong></div></div><div class="col-12 col-md-4"><div class="admin-metric"><span>Projects</span><strong>—</strong></div></div></div></section>
    `,
  },
  programs: {
    title: 'Funding programs',
    subtitle: 'Review available programs and eligibility requirements.',
    icon: 'bi-award',
    action: actionButton('New funding program'),
    content: `
      <div class="alert alert-info d-flex gap-2 align-items-start" role="status"><i class="bi bi-info-circle mt-1" aria-hidden="true"></i><div>Only administrators will be able to create or edit funding programs once authentication and access policies are connected.</div></div>
      <section class="card content-card">
        <div class="card-body border-bottom"><div class="row g-2"><div class="col-12 col-lg-6"><label class="visually-hidden" for="program-search">Search funding programs</label><div class="input-group"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="program-search" class="form-control" type="search" placeholder="Search funding programs"></div></div><div class="col-12 col-sm-6 col-lg-3"><label class="visually-hidden" for="program-status">Filter funding programs</label><select id="program-status" class="form-select"><option>All programs</option><option>Active</option><option>Inactive</option></select></div></div></div>
        ${table(['Program', 'Description', 'Maximum funding', 'Eligibility', 'Status', ''], 'No funding programs yet', 'Available funding opportunities will appear here when connected.', 'bi-award')}
      </section>
    `,
  },
};

export function renderAuthPage(pageId) {
  const isRegister = pageId === 'register';
  return `
    <main class="auth-page">
      <a class="auth-brand" href="/src/pages/login.html"><span class="brand-mark"><i class="bi bi-layers" aria-hidden="true"></i></span><span>Partner<span>Hub</span></span></a>
      <section class="card auth-card">
        <div class="card-body">
          <span class="auth-eyebrow">${isRegister ? 'GET STARTED' : 'WELCOME BACK'}</span>
          <h1>${isRegister ? 'Create your account' : 'Sign in to PartnerHub'}</h1>
          <p class="auth-description">${isRegister ? 'Set up your workspace access to manage funding and projects.' : 'Manage partner funding and projects in one place.'}</p>
          <div id="auth-notice" class="alert d-none" role="status" aria-live="polite"></div>
          <form id="auth-form">
            ${isRegister ? '<div class="mb-3"><label class="form-label" for="full-name">Full name</label><input class="form-control form-control-lg" id="full-name" name="name" autocomplete="name" required></div>' : ''}
            <div class="mb-3"><label class="form-label" for="email">Email address</label><input class="form-control form-control-lg" id="email" name="email" type="email" autocomplete="email" placeholder="you@company.com" required></div>
            <div class="mb-3"><label class="form-label" for="password">Password</label><input class="form-control form-control-lg" id="password" name="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" minlength="8" required></div>
            ${isRegister ? '<div class="mb-4"><label class="form-label" for="confirm-password">Confirm password</label><input class="form-control form-control-lg" id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></div>' : ''}
            <button class="btn btn-primary btn-lg w-100" type="submit">${isRegister ? 'Create account' : 'Sign in'}<i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></button>
          </form>
          <p class="auth-switch">${isRegister ? 'Already have an account?' : 'New to PartnerHub?'} <a href="/src/pages/${isRegister ? 'login' : 'register'}.html">${isRegister ? 'Sign in' : 'Create an account'}</a></p>
        </div>
      </section>
      <p class="auth-footnote"><i class="bi bi-lock me-1" aria-hidden="true"></i>Authentication is powered by Supabase.</p>
    </main>
  `;
}
