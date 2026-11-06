import { getDashboardOverview, getProjectCalendarEvents } from '../services/dashboard.service.js';

export function setupDashboardPage() {
  setupProjectCalendar();
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

function setupProjectCalendar() {
  const monthLabel = document.getElementById('project-calendar-month');
  const grid = document.getElementById('project-calendar-grid');
  const agendaTitle = document.getElementById('project-calendar-agenda-title');
  const agendaCount = document.getElementById('project-calendar-count');
  const agendaEvents = document.getElementById('project-calendar-events');
  const errorPanel = document.getElementById('project-calendar-error');
  const today = startOfLocalDay(new Date());
  let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate = today;
  let events = [];
  let requestNumber = 0;
  let isLoading = false;

  document.getElementById('project-calendar-previous').addEventListener('click', () => {
    changeMonth(-1);
  });
  document.getElementById('project-calendar-next').addEventListener('click', () => {
    changeMonth(1);
  });
  document.getElementById('project-calendar-today').addEventListener('click', () => {
    visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedDate = today;
    void loadMonthEvents();
  });
  grid.addEventListener('click', (event) => {
    const dayButton = event.target.closest('[data-calendar-date]');
    if (!dayButton) return;
    selectedDate = parseLocalDate(dayButton.dataset.calendarDate);
    renderCalendar();
    renderAgenda();
  });

  renderCalendar();
  void loadMonthEvents();

  function changeMonth(amount) {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1);
    selectedDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    void loadMonthEvents();
  }

  async function loadMonthEvents() {
    const currentRequest = ++requestNumber;
    const { start, end } = getCalendarRange(visibleMonth);
    isLoading = true;
    events = [];
    errorPanel.classList.add('d-none');
    renderCalendar();
    renderAgenda();

    try {
      const monthEvents = await getProjectCalendarEvents(toLocalDateString(start), toLocalDateString(end));
      if (currentRequest !== requestNumber) return;
      events = monthEvents;
    } catch (error) {
      if (currentRequest !== requestNumber) return;
      errorPanel.textContent = `Project dates could not be loaded: ${getErrorMessage(error)}`;
      errorPanel.classList.remove('d-none');
    } finally {
      if (currentRequest === requestNumber) {
        isLoading = false;
        renderCalendar();
        renderAgenda();
      }
    }
  }

  function renderCalendar() {
    monthLabel.textContent = new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(visibleMonth);

    const { start } = getCalendarRange(visibleMonth);
    grid.innerHTML = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const dateString = toLocalDateString(date);
      const dayEvents = events.filter((item) => item.date === dateString);
      const isToday = dateString === toLocalDateString(today);
      const isSelected = dateString === toLocalDateString(selectedDate);
      const classes = [
        'calendar-day',
        date.getMonth() !== visibleMonth.getMonth() ? 'calendar-day-outside' : '',
        isToday ? 'calendar-day-today' : '',
        isSelected ? 'calendar-day-selected' : '',
      ].filter(Boolean).join(' ');
      const eventLabel = dayEvents.length === 1 ? '1 project event' : `${dayEvents.length} project events`;
      const accessibleDate = new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
      const markers = [...new Set(dayEvents.map((item) => item.type))]
        .slice(0, 3)
        .map((type) => `<span class="calendar-event-marker calendar-event-marker-${type}"></span>`)
        .join('');

      return `
        <button class="${classes}" type="button" data-calendar-date="${dateString}"
          aria-label="${accessibleDate}, ${eventLabel}" aria-pressed="${isSelected}"${isToday ? ' aria-current="date"' : ''}>
          <span class="calendar-day-number">${date.getDate()}</span>
          ${dayEvents.length ? `<span class="calendar-day-activity" aria-hidden="true">${markers}<span>${dayEvents.length}</span></span>` : ''}
        </button>
      `;
    }).join('');
  }

  function renderAgenda() {
    agendaTitle.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(selectedDate);

    const selectedDateString = toLocalDateString(selectedDate);
    const dayEvents = events.filter((item) => item.date === selectedDateString);
    agendaCount.textContent = String(dayEvents.length);
    agendaCount.setAttribute('aria-label', `${dayEvents.length} scheduled events`);

    if (isLoading) {
      agendaEvents.innerHTML = '<div class="agenda-empty"><span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span>Loading your schedule…</span></div>';
      return;
    }
    if (errorPanel.classList.contains('d-none') === false) {
      agendaEvents.innerHTML = '<div class="agenda-empty"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><span>Schedule is unavailable right now.</span></div>';
      return;
    }
    if (dayEvents.length === 0) {
      agendaEvents.innerHTML = `
        <div class="agenda-empty">
          <i class="bi bi-calendar2-check" aria-hidden="true"></i>
          <span>Nothing planned for this day.</span>
          <small>Choose another date to see project activity.</small>
        </div>
      `;
      return;
    }

    agendaEvents.innerHTML = dayEvents.map((item) => `
      <article class="agenda-event agenda-event-${item.type}">
        <span class="agenda-event-icon" aria-hidden="true"><i class="bi ${calendarEventIcon(item.type)}"></i></span>
        <div class="agenda-event-copy">
          <span class="agenda-event-type">${calendarEventLabel(item.type)}</span>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.detail)}</p>
          <span class="agenda-event-status">${escapeHtml(item.status)}</span>
        </div>
      </article>
    `).join('');
  }
}

function getCalendarRange(month) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 1 - mondayOffset);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 41);
  return { start, end };
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calendarEventIcon(type) {
  if (type === 'start') return 'bi-flag';
  if (type === 'end') return 'bi-flag-fill';
  return 'bi-check2-circle';
}

function calendarEventLabel(type) {
  if (type === 'start') return 'Project kickoff';
  if (type === 'end') return 'Target completion';
  return 'Milestone';
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
