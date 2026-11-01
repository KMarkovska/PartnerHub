import { getDashboardOverview } from '../services/dashboard.service.js';

export function setupDashboardPage() {
  void loadDashboard();

  async function loadDashboard() {
    const loading = document.getElementById('dashboard-loading');
    const errorPanel = document.getElementById('dashboard-error');
    loading.classList.remove('d-none');
    errorPanel.classList.add('d-none');

    try {
      const overview = await getDashboardOverview();
      document.querySelector('[data-dashboard-metric="totalApplications"]').textContent =
        formatCount(overview.totalApplications);
      document.querySelector('[data-dashboard-metric="pendingApplications"]').textContent =
        formatCount(overview.pendingApplications);
      document.querySelector('[data-dashboard-metric="activeProjects"]').textContent =
        formatCount(overview.activeProjects);
      document.querySelector('[data-dashboard-metric="approvedFunding"]').textContent =
        formatCurrencyTotals(overview.fundingTotals, 'approved');
      renderRecentApplications(overview.recentApplications);
      renderUpcomingDeadlines(overview.upcomingDeadlines);
      renderFundingOverview(overview.fundingTotals, overview.fundingTotalsIncomplete);
    } catch (error) {
      errorPanel.textContent = `Unable to load your workspace overview: ${getErrorMessage(error)}`;
      errorPanel.classList.remove('d-none');
      for (const metric of document.querySelectorAll('[data-dashboard-metric]')) {
        metric.textContent = '—';
      }
      document.getElementById('dashboard-recent-applications').replaceChildren();
      document.getElementById('dashboard-deadlines').replaceChildren();
      document.getElementById('dashboard-funding-overview').textContent =
        'Funding totals are unavailable until the overview can be loaded.';
    } finally {
      loading.classList.add('d-none');
    }
  }
}

function renderRecentApplications(applications) {
  const body = document.getElementById('dashboard-recent-applications');
  const empty = document.getElementById('dashboard-applications-empty');
  empty.classList.toggle('d-none', applications.length > 0);
  body.innerHTML = applications.map((application) => `
    <tr>
      <td><span class="fw-semibold">${escapeHtml(application.title)}</span></td>
      <td>${escapeHtml(application.customer?.name ?? '—')}</td>
      <td>${escapeHtml(application.program?.name ?? '—')}</td>
      <td>${formatCurrency(application.requested_amount, application.program?.currency)}</td>
      <td><span class="badge ${statusBadgeClass(application.status)}">${escapeHtml(application.status)}</span></td>
    </tr>
  `).join('');
}

function renderUpcomingDeadlines(deadlines) {
  const list = document.getElementById('dashboard-deadlines');
  const empty = document.getElementById('dashboard-deadlines-empty');
  empty.classList.toggle('d-none', deadlines.length > 0);
  list.innerHTML = deadlines.map((application) => `
    <div class="list-group-item px-3 py-3">
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div class="min-w-0">
          <div class="fw-semibold text-truncate">${escapeHtml(application.title)}</div>
          <div class="small text-muted">${escapeHtml(application.customer?.name ?? '—')}</div>
        </div>
        <time class="small text-nowrap" datetime="${escapeHtml(application.deadline)}">${formatDate(application.deadline)}</time>
      </div>
      <span class="badge ${statusBadgeClass(application.status)} mt-2">${escapeHtml(application.status)}</span>
    </div>
  `).join('');
}

function renderFundingOverview(fundingTotals, isIncomplete) {
  const container = document.getElementById('dashboard-funding-overview');
  if (fundingTotals.length === 0) {
    container.innerHTML = `
      ${isIncomplete ? '<div class="alert alert-warning" role="status">Some funding totals are unavailable because their program details are restricted.</div>' : ''}
      <div class="text-muted small p-2">Funding totals will appear after applications are created.</div>
    `;
    return;
  }

  container.innerHTML = `
    ${isIncomplete ? '<div class="alert alert-warning" role="status">Some funding totals are omitted because program currency details are not accessible to this account.</div>' : ''}
    <div class="table-responsive">
      <table class="table align-middle data-table mb-0">
        <thead><tr><th scope="col">Currency</th><th scope="col">Requested</th><th scope="col">Approved</th></tr></thead>
        <tbody>
          ${fundingTotals.map((totals) => `
            <tr>
              <td>${escapeHtml(totals.currency)}</td>
              <td>${formatCurrency(totals.requested, totals.currency)}</td>
              <td>${formatCurrency(totals.approved, totals.currency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function formatCurrencyTotals(fundingTotals, amountType) {
  if (fundingTotals.length === 0) return '0';
  const approvedTotals = fundingTotals.filter((totals) => totals.approved > 0);
  if (approvedTotals.length === 0) {
    return [...new Set(fundingTotals.map((totals) => totals.currency))]
      .map((currency) => formatCurrency(0, currency))
      .join(' · ');
  }
  return approvedTotals
    .map((totals) => formatCurrency(totals[amountType], totals.currency))
    .join(' · ');
}

function formatCurrency(value, currency) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || !currency) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}

function formatCount(value) {
  return new Intl.NumberFormat().format(value);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function statusBadgeClass(status) {
  if (status === 'Approved') return 'text-bg-success';
  if (status === 'Rejected') return 'text-bg-danger';
  if (status === 'Under Review') return 'text-bg-info';
  if (status === 'Submitted') return 'text-bg-primary';
  return 'text-bg-secondary';
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Please try again.';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}
