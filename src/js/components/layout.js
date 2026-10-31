import { pages } from './pages.js';

const navigation = [
  { label: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2' }] },
  {
    label: 'Workspace',
    items: [
      { id: 'applications', label: 'Applications', icon: 'bi-files' },
      { id: 'customers', label: 'Customers', icon: 'bi-buildings' },
      { id: 'projects', label: 'Projects', icon: 'bi-kanban' },
      { id: 'documents', label: 'Documents', icon: 'bi-folder2-open' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { id: 'programs', label: 'Funding programs', icon: 'bi-award' },
      { id: 'admin', label: 'Administration', icon: 'bi-shield-check' },
    ],
  },
];

function renderNavigation(activePage) {
  return navigation.map(({ label, items }) => `
    <div class="nav-group">
      <p class="nav-group-label">${label}</p>
      <ul class="nav flex-column gap-1">
        ${items.map(({ id, label: itemLabel, icon }) => `
          <li class="nav-item">
            <a class="nav-link${activePage === id ? ' active' : ''}" href="/src/pages/${id}.html"${activePage === id ? ' aria-current="page"' : ''}>
              <i class="bi ${icon}" aria-hidden="true"></i><span>${itemLabel}</span>
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');
}

function renderSidebar(activePage, mobile = false) {
  return `
    <div class="sidebar-inner${mobile ? ' sidebar-mobile' : ''}">
      <a class="sidebar-brand" href="/src/pages/dashboard.html">
        <span class="brand-mark"><i class="bi bi-layers" aria-hidden="true"></i></span>
        <span>Partner<span>Hub</span></span>
      </a>
      <nav class="sidebar-nav" aria-label="Main navigation">${renderNavigation(activePage)}</nav>
      <div class="sidebar-help"><span class="help-icon"><i class="bi bi-life-preserver" aria-hidden="true"></i></span><div><strong>Need a hand?</strong><span>Workspace help</span></div><i class="bi bi-arrow-up-right ms-auto" aria-hidden="true"></i></div>
    </div>
  `;
}

export function renderLayout(pageId) {
  const page = pages[pageId];
  if (!page) throw new Error(`Unknown PartnerHub page: ${pageId}`);

  document.title = `${page.title} | PartnerHub`;
  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">${renderSidebar(pageId)}</aside>
      <div class="offcanvas offcanvas-start mobile-sidebar" tabindex="-1" id="mobile-navigation" aria-labelledby="mobile-navigation-title">
        <div class="visually-hidden" id="mobile-navigation-title">PartnerHub navigation</div>
        ${renderSidebar(pageId, true)}
      </div>
      <div class="app-main">
        <header class="topbar">
          <button class="btn btn-light border mobile-menu-button" type="button" data-bs-toggle="offcanvas" data-bs-target="#mobile-navigation" aria-controls="mobile-navigation" aria-label="Open navigation"><i class="bi bi-list" aria-hidden="true"></i></button>
          <div class="topbar-context"><span class="topbar-context-label">Workspace</span><span class="topbar-context-name">PartnerHub</span><i class="bi bi-chevron-down" aria-hidden="true"></i></div>
          <div class="topbar-actions"><span class="environment-pill"><span></span>Setup mode</span><a class="topbar-avatar" href="/src/pages/login.html" aria-label="Go to sign in">PH</a></div>
        </header>
        <main class="page-content">
          <div class="setup-notice" role="status"><i class="bi bi-info-circle" aria-hidden="true"></i><span>Starter workspace: authentication and live data are not connected yet.</span></div>
          <div class="page-heading">
            <div class="page-heading-copy"><div class="page-eyebrow"><i class="bi ${page.icon}" aria-hidden="true"></i> PARTNERHUB WORKSPACE</div><h1>${page.title}</h1><p>${page.subtitle}</p></div>
            ${page.action ? `<div class="page-heading-action">${page.action}</div>` : ''}
          </div>
          <div id="page-notice" class="alert d-none" role="status" aria-live="polite"></div>
          ${page.content}
          <footer class="page-footer"><span>PartnerHub</span><span>Funding and projects, together.</span></footer>
        </main>
      </div>
    </div>
  `;
}
