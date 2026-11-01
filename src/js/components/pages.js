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
    action: '<button class="btn btn-primary" type="button" data-action="application-create"><i class="bi bi-plus-lg me-2" aria-hidden="true"></i>New application</button>',
    content: `
      <section class="card content-card">
        <div class="card-body border-bottom">
          <div class="row g-2">
            <div class="col-12 col-lg-5"><label class="visually-hidden" for="application-search">Search applications</label><div class="input-group"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="application-search" class="form-control" type="search" placeholder="Search applications"></div></div>
            <div class="col-12 col-sm-6 col-lg-3"><label class="visually-hidden" for="application-status">Filter by status</label><select class="form-select" id="application-status"><option value="">All statuses</option><option>Draft</option><option>Submitted</option><option>Under Review</option><option>Approved</option><option>Rejected</option></select></div>
            <div class="col-12 col-sm-6 col-lg-4"><label class="visually-hidden" for="application-customer">Filter by customer</label><select class="form-select" id="application-customer"><option value="">All customers</option></select></div>
          </div>
        </div>
        <div id="applications-loading" class="text-muted small p-3" role="status" aria-live="polite">Loading applications…</div>
        <div id="applications-error" class="alert alert-danger m-3 d-none" role="alert"></div>
        <div id="applications-empty" class="d-none">${emptyState('bi-file-earmark-plus', 'No applications found', 'Create an application to start tracking a funding request.')}</div>
        <div id="applications-filter-empty" class="text-muted small text-center p-4 d-none">No applications match these filters.</div>
        <div class="table-responsive">
          <table class="table align-middle data-table">
            <thead><tr>${['Application', 'Customer', 'Funding program', 'Requested amount', 'Created', 'Status', 'Actions'].map((column) => `<th scope="col">${column}</th>`).join('')}</tr></thead>
            <tbody id="applications-body"></tbody>
          </table>
        </div>
      </section>
      <div class="modal fade" id="application-modal" tabindex="-1" aria-labelledby="application-modal-title" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <form id="application-form">
              <div class="modal-header">
                <div><h2 class="modal-title fs-5" id="application-modal-title">New funding application</h2><p class="text-muted small mb-0">Create a draft, then submit it for administrator review.</p></div>
                <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div id="application-form-error" class="alert alert-danger d-none" role="alert"></div>
                <div id="application-options-empty" class="alert alert-info d-none" role="status"></div>
                <div class="mb-3"><label class="form-label" for="application-title">Application title</label><input class="form-control" id="application-title" name="title" maxlength="150" required></div>
                <div class="row g-3">
                  <div class="col-md-6"><label class="form-label" for="application-customer-input">Customer</label><select class="form-select" id="application-customer-input" name="customerId" required><option value="">Choose a customer</option></select></div>
                  <div class="col-md-6"><label class="form-label" for="application-program-input">Funding program</label><select class="form-select" id="application-program-input" name="programId" required><option value="">Choose a program</option></select><div id="application-program-limit" class="form-text"></div></div>
                </div>
                <div class="row g-3 mt-0">
                  <div class="col-md-6"><label class="form-label" for="application-amount">Requested amount</label><input class="form-control" id="application-amount" name="requestedAmount" type="number" min="0.01" step="0.01" required></div>
                  <div class="col-md-6"><label class="form-label" for="application-deadline">Deadline</label><input class="form-control" id="application-deadline" name="deadline" type="date"></div>
                </div>
                <div class="mt-3"><label class="form-label" for="application-description">Description</label><textarea class="form-control" id="application-description" name="description" rows="4" maxlength="5000"></textarea></div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-light border" type="button" data-bs-dismiss="modal">Cancel</button>
                <button class="btn btn-primary" type="submit"><i class="bi bi-check-lg me-1" aria-hidden="true"></i>Create draft</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal fade" id="application-status-confirmation" tabindex="-1" aria-labelledby="application-status-confirm-title" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <div><h2 class="modal-title fs-5" id="application-status-confirm-title">Confirm status change</h2><p class="text-muted small mb-0" id="application-status-confirm-description">Review this change before continuing.</p></div>
              <button class="btn-close" id="application-status-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div id="application-status-confirmation-error" class="alert alert-danger d-none" role="alert"></div>
              <p class="mb-2">Application</p>
              <p class="fw-semibold text-break mb-0" id="application-status-confirm-name"></p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-light border" id="application-status-cancel" type="button" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-primary" id="application-status-confirm" type="button">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    `,
  },
  customers: {
    title: 'Customers',
    subtitle: 'Manage company profiles and their funding activity.',
    icon: 'bi-buildings',
    action: '<button class="btn btn-primary" type="button" data-action="customer-create"><i class="bi bi-plus-lg me-2" aria-hidden="true"></i>Add customer</button>',
    content: `
      <section class="card content-card">
        <div class="card-body border-bottom">
          <label class="visually-hidden" for="customer-search">Search customers</label>
          <div class="input-group search-control"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="customer-search" class="form-control" type="search" placeholder="Search by company, contact, or email"></div>
        </div>
        <div id="customers-loading" class="text-muted small p-3" role="status" aria-live="polite">Loading customers…</div>
        <div id="customers-error" class="alert alert-danger m-3 d-none" role="alert"></div>
        <div id="customers-empty" class="d-none">${emptyState('bi-buildings', 'No customers yet', 'Add a customer to start organizing your funding applications.')}</div>
        <div id="customers-filter-empty" class="text-muted small text-center p-4 d-none">No customers match your search.</div>
        <div class="table-responsive">
          <table class="table align-middle data-table">
            <thead><tr>${['Company', 'Country', 'Contact person', 'Contact email', 'Applications', 'Assigned to'].map((column) => `<th scope="col">${column}</th>`).join('')}</tr></thead>
            <tbody id="customers-body"></tbody>
          </table>
        </div>
      </section>
      <div class="modal fade" id="customer-modal" tabindex="-1" aria-labelledby="customer-modal-title" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <form id="customer-form">
              <div class="modal-header">
                <div><h2 class="modal-title fs-5" id="customer-modal-title">Add customer</h2><p class="text-muted small mb-0">Add a company to your workspace.</p></div>
                <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div id="customer-form-error" class="alert alert-danger d-none" role="alert"></div>
                <div class="mb-3"><label class="form-label" for="customer-name">Company name</label><input class="form-control" id="customer-name" name="name" maxlength="200" required></div>
                <div class="mb-3"><label class="form-label" for="customer-country">Country</label><input class="form-control" id="customer-country" name="country" maxlength="100" autocomplete="country-name"></div>
                <div class="mb-3"><label class="form-label" for="customer-contact-name">Contact person</label><input class="form-control" id="customer-contact-name" name="contactName" maxlength="150" autocomplete="name"></div>
                <div><label class="form-label" for="customer-contact-email">Contact email</label><input class="form-control" id="customer-contact-email" name="contactEmail" type="email" maxlength="254" autocomplete="email"></div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-light border" type="button" data-bs-dismiss="modal">Cancel</button>
                <button class="btn btn-primary" type="submit"><i class="bi bi-check-lg me-1" aria-hidden="true"></i>Save customer</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `,
  },
  projects: {
    title: 'Projects',
    subtitle: 'Monitor delivery, ownership, and project milestones.',
    icon: 'bi-kanban',
    action: '<button class="btn btn-primary" type="button" data-action="project-create"><i class="bi bi-plus-lg me-2" aria-hidden="true"></i>New project</button>',
    content: `
      <div class="row g-3 mb-3">
        ${[['All projects', 'total', 'All projects'], ['In progress', 'in-progress', 'In progress'], ['Completed', 'completed', 'Completed'], ['On hold', 'on-hold', 'On hold']].map(([label, key, accessibleLabel]) => `
          <div class="col-6 col-xl-3"><div class="card project-stat"><span>${label}</span><strong data-project-count="${key}" aria-label="${accessibleLabel}">—</strong></div></div>
        `).join('')}
      </div>
      <section class="card content-card">
        <div class="card-body border-bottom"><div class="row g-2"><div class="col-12 col-lg-6"><label class="visually-hidden" for="project-search">Search projects</label><div class="input-group"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="project-search" class="form-control" type="search" placeholder="Search projects or customers"></div></div><div class="col-12 col-sm-6 col-lg-3"><label class="visually-hidden" for="project-status">Filter projects by status</label><select class="form-select" id="project-status"><option value="">All statuses</option><option>Not Started</option><option>In Progress</option><option>Completed</option><option>On Hold</option></select></div></div></div>
        <div id="projects-loading" class="text-muted small p-3" role="status" aria-live="polite">Loading projects…</div>
        <div id="projects-error" class="alert alert-danger m-3 d-none" role="alert"></div>
        <div id="projects-empty" class="d-none">${emptyState('bi-kanban', 'No projects yet', 'Create a project from one of your approved applications.')}</div>
        <div id="projects-filter-empty" class="text-muted small text-center p-4 d-none">No projects match these filters.</div>
        <div class="table-responsive">
          <table class="table align-middle data-table">
            <thead><tr>${['Project', 'Customer', 'Owner', 'Start date', 'End date', 'Progress', 'Status', ''].map((column) => `<th scope="col">${column}</th>`).join('')}</tr></thead>
            <tbody id="projects-body"></tbody>
          </table>
        </div>
      </section>
      <div class="modal fade" id="project-modal" tabindex="-1" aria-labelledby="project-modal-title" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <form id="project-form">
              <div class="modal-header">
                <div><h2 class="modal-title fs-5" id="project-modal-title">New project</h2><p id="project-modal-description" class="text-muted small mb-0">Start a project from an approved funding application.</p></div>
                <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div id="project-form-error" class="alert alert-danger d-none" role="alert"></div>
                <div id="project-options-empty" class="alert alert-info d-none" role="status"></div>
                <div id="project-application-field" class="mb-3"><label class="form-label" for="project-application">Approved application</label><select class="form-select" id="project-application" name="applicationId" required><option value="">Choose an application</option></select><div class="form-text">The project will inherit the application's customer and owner.</div></div>
                <div class="mb-3"><label class="form-label" for="project-name">Project name</label><input class="form-control" id="project-name" name="name" maxlength="200" required></div>
                <div class="row g-3">
                  <div class="col-md-6"><label class="form-label" for="project-start-date">Start date</label><input class="form-control" id="project-start-date" name="startDate" type="date"></div>
                  <div class="col-md-6"><label class="form-label" for="project-end-date">End date</label><input class="form-control" id="project-end-date" name="endDate" type="date"></div>
                </div>
                <div id="project-edit-fields" class="row g-3 mt-0 d-none">
                  <div class="col-md-6"><label class="form-label" for="project-edit-status">Status</label><select class="form-select" id="project-edit-status" name="status"><option>Not Started</option><option>In Progress</option><option>Completed</option><option>On Hold</option></select></div>
                  <div class="col-md-6"><label class="form-label" for="project-progress">Progress (%)</label><input class="form-control" id="project-progress" name="progress" type="number" min="0" max="100" step="1"></div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-light border" type="button" data-bs-dismiss="modal">Cancel</button>
                <button class="btn btn-primary" type="submit"><i class="bi bi-check-lg me-1" aria-hidden="true"></i><span id="project-submit-label">Create project</span></button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `,
  },
  documents: {
    title: 'Documents',
    subtitle: 'Keep application and project files organized.',
    icon: 'bi-folder2-open',
    action: '<button class="btn btn-primary" type="button" data-action="document-upload"><i class="bi bi-cloud-arrow-up me-2" aria-hidden="true"></i>Upload document</button>',
    content: `
      <section class="card content-card">
        <div class="card-body border-bottom"><div class="row g-2"><div class="col-12 col-lg-6"><label class="visually-hidden" for="document-search">Search documents</label><div class="input-group"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="document-search" class="form-control" type="search" placeholder="Search documents"></div></div><div class="col-12 col-sm-6 col-lg-3"><label class="visually-hidden" for="document-type">Filter documents by type</label><select id="document-type" class="form-select"><option value="">All documents</option><option value="application">Applications</option><option value="project">Projects</option></select></div></div></div>
        <div id="documents-loading" class="text-muted small p-3" role="status" aria-live="polite">Loading documents…</div>
        <div id="documents-error" class="alert alert-danger m-3 d-none" role="alert"></div>
        <div id="documents-empty" class="d-none">${emptyState('bi-folder2-open', 'No documents yet', 'Upload a file and associate it with an application or project.')}</div>
        <div id="documents-filter-empty" class="text-muted small text-center p-4 d-none">No documents match these filters.</div>
        <div class="table-responsive">
          <table class="table align-middle data-table">
            <thead><tr>${['Document', 'Related to', 'File type', 'Uploaded by', 'Upload date', 'Actions'].map((column) => `<th scope="col">${column}</th>`).join('')}</tr></thead>
            <tbody id="documents-body"></tbody>
          </table>
        </div>
      </section>
      <div class="modal fade" id="document-modal" tabindex="-1" aria-labelledby="document-modal-title" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <form id="document-form">
              <div class="modal-header">
                <div><h2 class="modal-title fs-5" id="document-modal-title">Upload document</h2><p class="text-muted small mb-0">Files are stored privately and access follows your workspace permissions.</p></div>
                <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div id="document-form-error" class="alert alert-danger d-none" role="alert"></div>
                <div id="document-options-empty" class="alert alert-info d-none" role="status">
                  No accessible applications or projects are available to attach a document to.
                  <a href="/src/pages/customers.html">Create a customer</a>, then
                  <a href="/src/pages/applications.html">create an application</a>. Projects can be
                  created from approved applications.
                </div>
                <div class="mb-3"><label class="form-label" for="document-parent">Application or project</label><select class="form-select" id="document-parent" name="parent" required><option value="">Choose an application or project</option></select></div>
                <div><label class="form-label" for="document-file">File</label><input class="form-control" id="document-file" name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png" required><div class="form-text">PDF, Office, text, CSV, JPEG, or PNG. Maximum 20 MB.</div></div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-light border" type="button" data-bs-dismiss="modal">Cancel</button>
                <button class="btn btn-primary" type="submit"><i class="bi bi-cloud-arrow-up me-1" aria-hidden="true"></i><span id="document-submit-label">Upload document</span></button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal fade" id="document-delete-confirmation" tabindex="-1" aria-labelledby="document-delete-confirmation-title" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <div><h2 class="modal-title fs-5" id="document-delete-confirmation-title">Permanently delete document?</h2><p class="text-muted small mb-0">This action cannot be undone.</p></div>
              <button class="btn-close" id="document-delete-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div id="document-delete-error" class="alert alert-danger d-none" role="alert"></div>
              <p class="mb-2">Delete this document and its stored file?</p>
              <p class="fw-semibold text-break mb-0" id="document-delete-file-name"></p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-light border" id="document-delete-cancel" type="button" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-danger" id="document-delete-confirm" type="button"><i class="bi bi-trash me-1" aria-hidden="true"></i>Delete permanently</button>
            </div>
          </div>
        </div>
      </div>
    `,
  },
  admin: {
    title: 'Administration',
    subtitle: 'Manage workspace access, roles, and account status.',
    icon: 'bi-shield-check',
    content: `
      <div id="admin-metrics-state" class="text-muted small mb-3" role="status" aria-live="polite">Loading administration metrics…</div>
      <div id="admin-metrics-error" class="alert alert-danger d-none" role="alert"></div>
      <div class="row g-3 mb-4">
        ${[
          ['Total users', 'totalUsers', 'bi-people', 'bi-blue'],
          ['Active users', 'activeUsers', 'bi-person-check', 'bi-green'],
          ['Customers', 'totalCustomers', 'bi-buildings', 'bi-violet'],
          ['Funding applications', 'totalApplications', 'bi-files', 'bi-blue'],
          ['Awaiting review', 'awaitingReview', 'bi-hourglass-split', 'bi-amber'],
          ['Approved applications', 'approvedApplications', 'bi-check-circle', 'bi-green'],
          ['Projects', 'totalProjects', 'bi-kanban', 'bi-violet'],
        ].map(([label, key, icon, color]) => `
          <div class="col-12 col-sm-6 col-xl-3">
            <section class="card kpi-card h-100">
              <div class="card-body">
                <div class="kpi-topline"><span class="kpi-label">${label}</span><span class="kpi-icon ${color}"><i class="bi ${icon}" aria-hidden="true"></i></span></div>
                <p class="kpi-value mb-0" data-admin-metric="${key}">—</p>
              </div>
            </section>
          </div>
        `).join('')}
      </div>
      <section class="card content-card">
        <div class="card-header"><div><h2 class="section-title">User management</h2><p class="section-subtitle">Registered users and their workspace access</p></div></div>
        <div class="card-body border-bottom"><div class="row g-2">
          <div class="col-12 col-lg-6"><label class="visually-hidden" for="user-search">Search users</label><div class="input-group"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="user-search" class="form-control" type="search" placeholder="Search users by name or email"></div></div>
          <div class="col-12 col-sm-6 col-lg-3"><label class="visually-hidden" for="user-role">Filter by role</label><select class="form-select" id="user-role"><option value="">All roles</option><option value="admin">Administrators</option><option value="user">Regular users</option></select></div>
        </div></div>
        <div id="admin-users-feedback" class="alert d-none mx-3 mt-3" role="status" aria-live="polite"></div>
        <div id="admin-users-loading" class="p-4 text-muted" role="status" aria-live="polite"><span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Loading registered users…</div>
        <div id="admin-users-error" class="alert alert-danger d-none m-3" role="alert"></div>
        <div id="admin-users-empty" class="d-none">${emptyState('bi-people', 'No registered users', 'User profiles will appear here after account registration.')}</div>
        <div id="admin-users-table" class="table-responsive d-none">
          <table class="table align-middle data-table">
            <thead><tr><th scope="col">User</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Account status</th><th scope="col">Registered</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
            <tbody id="admin-users-body"></tbody>
          </table>
          <div id="admin-users-filter-empty" class="text-muted p-3 d-none" role="status">No users match the selected filters.</div>
        </div>
      </section>
      <div class="modal fade" id="admin-access-confirmation" tabindex="-1" aria-labelledby="admin-access-confirmation-title" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <div><h2 class="modal-title fs-5" id="admin-access-confirmation-title">Confirm access changes</h2><p class="text-muted small mb-0">Review these changes before saving.</p></div>
              <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p>Save role and account status changes for <strong id="admin-access-confirm-user"></strong>?</p>
              <dl class="row mb-0">
                <dt class="col-5 text-muted fw-normal">New role</dt>
                <dd class="col-7" id="admin-access-confirm-role"></dd>
                <dt class="col-5 text-muted fw-normal">New account status</dt>
                <dd class="col-7 mb-0" id="admin-access-confirm-status"></dd>
              </dl>
            </div>
            <div class="modal-footer">
              <button class="btn btn-light border" id="admin-access-cancel" type="button" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-primary" id="admin-access-confirm" type="button"><i class="bi bi-check-lg me-1" aria-hidden="true"></i>Save changes</button>
            </div>
          </div>
        </div>
      </div>
    `,
  },
  programs: {
    title: 'Funding programs',
    subtitle: 'Review available programs and eligibility requirements.',
    icon: 'bi-award',
    action: '<button class="btn btn-primary" type="button" data-action="program-create"><i class="bi bi-plus-lg me-2" aria-hidden="true"></i>New funding program</button>',
    actionAdminOnly: true,
    content: `
      <div class="alert alert-info d-flex gap-2 align-items-start" role="status"><i class="bi bi-info-circle mt-1" aria-hidden="true"></i><div>Administrators can create, edit, and deactivate funding programs. Regular users can view active programs.</div></div>
      <section class="card content-card">
        <div class="card-body border-bottom"><div class="row g-2"><div class="col-12 col-lg-6"><label class="visually-hidden" for="program-search">Search funding programs</label><div class="input-group"><span class="input-group-text bg-white"><i class="bi bi-search" aria-hidden="true"></i></span><input id="program-search" class="form-control" type="search" placeholder="Search funding programs"></div></div><div class="col-12 col-sm-6 col-lg-3"><label class="visually-hidden" for="program-status">Filter funding programs</label><select id="program-status" class="form-select"><option value="">All programs</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div></div>
        <div id="programs-loading" class="text-muted small p-3" role="status" aria-live="polite">Loading funding programs…</div>
        <div id="programs-error" class="alert alert-danger d-none m-3" role="alert"></div>
        <div id="programs-empty" class="d-none">${emptyState('bi-award', 'No funding programs yet', 'Available funding opportunities will appear here.')}</div>
        <div id="programs-filter-empty" class="text-muted small text-center p-4 d-none" role="status">No funding programs match these filters.</div>
        <div class="table-responsive">
          <table class="table align-middle data-table">
            <thead><tr>${['Program', 'Description', 'Maximum funding', 'Eligibility', 'Status', ''].map((column) => `<th scope="col">${column}</th>`).join('')}</tr></thead>
            <tbody id="programs-body"></tbody>
          </table>
        </div>
      </section>
      <div class="modal fade" id="program-modal" tabindex="-1" aria-labelledby="program-modal-title" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content">
            <form id="program-form">
              <div class="modal-header">
                <div><h2 class="modal-title fs-5" id="program-modal-title">New funding program</h2><p class="text-muted small mb-0">Program changes are saved to the shared workspace.</p></div>
                <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div id="program-form-error" class="alert alert-danger d-none" role="alert"></div>
                <div class="mb-3"><label class="form-label" for="program-name">Program name</label><input class="form-control" id="program-name" name="name" maxlength="160" required></div>
                <div class="mb-3"><label class="form-label" for="program-description">Description</label><textarea class="form-control" id="program-description" name="description" rows="3"></textarea></div>
                <div class="row g-3 mb-3">
                  <div class="col-sm-8"><label class="form-label" for="program-maximum">Maximum funding</label><input class="form-control" id="program-maximum" name="maxAmount" type="number" min="0.01" max="9999999999.99" step="0.01" required></div>
                  <div class="col-sm-4"><label class="form-label" for="program-currency">Currency</label><input class="form-control text-uppercase" id="program-currency" name="currency" type="text" minlength="3" maxlength="3" pattern="[A-Za-z]{3}" placeholder="EUR" required><div class="form-text">3-letter currency code</div></div>
                </div>
                <div><label class="form-label" for="program-eligibility">Eligibility information</label><textarea class="form-control" id="program-eligibility" name="eligibility" rows="3"></textarea></div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-light border" type="button" data-bs-dismiss="modal">Cancel</button>
                <button class="btn btn-primary" type="submit"><i class="bi bi-check-lg me-1" aria-hidden="true"></i><span id="program-submit-label">Create program</span></button>
              </div>
            </form>
          </div>
        </div>
      </div>
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
            ${isRegister ? '<div class="mb-3"><label class="form-label" for="full-name">Full name</label><input class="form-control form-control-lg" id="full-name" name="name" autocomplete="name" minlength="2" maxlength="100" required></div>' : ''}
            <div class="mb-3"><label class="form-label" for="email">Email address</label><input class="form-control form-control-lg" id="email" name="email" type="email" autocomplete="email" placeholder="you@company.com" required></div>
            <div class="mb-3"><label class="form-label" for="password">Password</label><input class="form-control form-control-lg" id="password" name="password" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" minlength="8" required>${isRegister ? '<div class="d-flex justify-content-between form-text"><span>Use at least 8 characters.</span><span id="password-length" aria-live="polite">0 / 8</span></div>' : ''}</div>
            ${isRegister ? '<div class="mb-4"><label class="form-label" for="confirm-password">Confirm password</label><input class="form-control form-control-lg" id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></div>' : ''}
            ${isRegister ? '' : '<p class="text-end"><a href="/src/pages/forgot-password.html">Forgot password?</a></p>'}
            <button class="btn btn-primary btn-lg w-100" type="submit">${isRegister ? 'Create account' : 'Sign in'}<i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></button>
          </form>
          <p class="auth-switch">${isRegister ? 'Already have an account?' : 'New to PartnerHub?'} <a href="/src/pages/${isRegister ? 'login' : 'register'}.html">${isRegister ? 'Sign in' : 'Create an account'}</a></p>
        </div>
      </section>
      <p class="auth-footnote"><i class="bi bi-lock me-1" aria-hidden="true"></i>Authentication is powered by Supabase.</p>
    </main>
  `;
}

export function renderPasswordRecoveryPage(mode) {
  const isUpdate = mode === 'update';
  return `
    <main class="auth-page">
      <a class="auth-brand" href="/src/pages/login.html"><span class="brand-mark"><i class="bi bi-layers" aria-hidden="true"></i></span><span>Partner<span>Hub</span></span></a>
      <section class="card auth-card">
        <div class="card-body">
          <span class="auth-eyebrow">${isUpdate ? 'SECURE YOUR ACCOUNT' : 'ACCOUNT RECOVERY'}</span>
          <h1>${isUpdate ? 'Choose a new password' : 'Reset your password'}</h1>
          <p class="auth-description">${isUpdate ? 'Enter a new password for your PartnerHub account.' : 'Enter your account email and we will send a password reset link if it matches an account.'}</p>
          <div id="auth-notice" class="alert d-none" role="status" aria-live="polite"></div>
          <form id="password-recovery-form">
            ${isUpdate ? `
              <div class="mb-3"><label class="form-label" for="password">New password</label><input class="form-control form-control-lg" id="password" name="password" type="password" autocomplete="new-password" minlength="8" required></div>
              <div class="mb-4"><label class="form-label" for="confirm-password">Confirm new password</label><input class="form-control form-control-lg" id="confirm-password" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required></div>
            ` : `
              <div class="mb-4"><label class="form-label" for="email">Email address</label><input class="form-control form-control-lg" id="email" name="email" type="email" autocomplete="email" placeholder="you@company.com" required></div>
            `}
            <button class="btn btn-primary btn-lg w-100" type="submit">${isUpdate ? 'Update password' : 'Send reset link'}<i class="bi bi-arrow-right ms-2" aria-hidden="true"></i></button>
          </form>
          <p class="auth-switch">${isUpdate ? '<a href="/src/pages/forgot-password.html">Request another reset link</a> · ' : ''}<a href="/src/pages/login.html">Return to sign in</a></p>
        </div>
      </section>
      <p class="auth-footnote"><i class="bi bi-lock me-1" aria-hidden="true"></i>Authentication is powered by Supabase.</p>
    </main>
  `;
}
