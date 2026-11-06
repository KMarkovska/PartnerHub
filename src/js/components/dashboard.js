import { getDashboardOverview, getProjectCalendarEvents } from '../services/dashboard.service.js';

export function setupDashboardPage() {
  setupProjectCalendar();
  const updateFundingAnalytics = setupFundingAnalytics();
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
      updateFundingAnalytics(overview);
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
      setFundingAnalyticsUnavailable();
    } finally {
      loading.classList.add('d-none');
    }
  }
}

function setupFundingAnalytics() {
  const periodSelect = document.getElementById('funding-analytics-period');
  const currencySelect = document.getElementById('funding-analytics-currency');
  let overview = null;

  periodSelect.addEventListener('change', () => renderFundingAnalytics(overview));
  currencySelect.addEventListener('change', () => renderFundingAnalytics(overview));

  return (data) => {
    overview = data;
    renderFundingAnalytics(data);
  };
}

function renderFundingAnalytics(overview) {
  if (!overview) return;

  const periodSelect = document.getElementById('funding-analytics-period');
  const currencySelect = document.getElementById('funding-analytics-currency');
  const chart = document.getElementById('funding-analytics-chart');
  const dataTable = document.getElementById('funding-analytics-data');
  const note = document.getElementById('funding-analytics-note');
  const periodType = periodSelect.value;
  const trends = overview.fundingTrends ?? [];
  const selectedCurrency = currencySelect.value;

  currencySelect.replaceChildren(...trends.map(({ currency }) => new Option(currency, currency)));
  currencySelect.disabled = trends.length === 0;
  if (trends.length > 0) {
    currencySelect.value = trends.some(({ currency }) => currency === selectedCurrency)
      ? selectedCurrency
      : trends[0].currency;
  }

  const currencyTrend = trends.find(({ currency }) => currency === currencySelect.value);
  if (!currencyTrend) {
    for (const id of [
      'funding-analytics-requested',
      'funding-analytics-approved',
      'funding-analytics-applications',
      'funding-analytics-rate',
      'funding-analytics-change',
    ]) {
      document.getElementById(id).textContent = '—';
    }
    chart.innerHTML = `
      <div class="analytics-empty">
        <i class="bi bi-bar-chart-line" aria-hidden="true"></i>
        <span>No currency-based funding data is available for this account.</span>
      </div>
    `;
    dataTable.replaceChildren();
    note.textContent = analyticsNote(overview.fundingTotalsIncomplete);
    return;
  }

  const periods = getAnalyticsPeriods(periodType);
  const bucketByPeriod = new Map(currencyTrend[periodType].map((bucket) => [bucket.period, bucket]));
  const rows = periods.map((period) => ({
    ...period,
    ...(bucketByPeriod.get(period.key) ?? {
      requested: 0,
      approved: 0,
      applications: 0,
      approvedApplications: 0,
    }),
  }));
  const current = rows[rows.length - 1];
  const periodName = periodType === 'monthly' ? 'month' : 'year';
  document.getElementById('funding-analytics-requested-label').textContent =
    `Requested this ${periodName}`;
  document.getElementById('funding-analytics-approved-label').textContent =
    `Approved this ${periodName}`;
  document.getElementById('funding-analytics-applications-label').textContent =
    `Applications this ${periodName}`;
  document.getElementById('funding-analytics-rate-label').textContent =
    `Approval rate for this ${periodName}'s applications`;
  document.getElementById('funding-analytics-change-label').textContent =
    `Requests vs previous full ${periodName}`;
  document.getElementById('funding-analytics-requested').textContent =
    formatCurrency(current.requested, currencyTrend.currency);
  document.getElementById('funding-analytics-approved').textContent =
    formatCurrency(current.approved, currencyTrend.currency);
  document.getElementById('funding-analytics-applications').textContent =
    formatCount(current.applications);
  document.getElementById('funding-analytics-rate').textContent = current.applications
    ? `${((current.approvedApplications / current.applications) * 100).toFixed(1)}%`
    : '—';

  const lastCompleted = rows[rows.length - 2];
  const previousCompleted = rows[rows.length - 3];
  const change = document.getElementById('funding-analytics-change');
  change.classList.remove('analytics-change-up', 'analytics-change-down', 'analytics-change-neutral');
  if (previousCompleted.requested > 0) {
    const percentChange = ((lastCompleted.requested - previousCompleted.requested)
      / previousCompleted.requested) * 100;
    change.textContent = `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`;
    change.classList.add(
      percentChange > 0
        ? 'analytics-change-up'
        : percentChange < 0
          ? 'analytics-change-down'
          : 'analytics-change-neutral',
    );
  } else {
    change.textContent = lastCompleted.requested > 0 ? 'New activity' : 'No baseline';
    change.classList.add('analytics-change-neutral');
  }

  document.getElementById('funding-analytics-current-note').textContent =
    periodType === 'monthly' ? 'Current month is month-to-date.' : 'Current year is year-to-date.';
  note.textContent = analyticsNote(overview.fundingTotalsIncomplete);
  dataTable.innerHTML = rows.map((row) => `
    <tr>
      <th scope="row">${escapeHtml(row.label)}</th>
      <td>${formatCount(row.applications)}</td>
      <td>${formatCurrency(row.requested, currencyTrend.currency)}</td>
      <td>${formatCurrency(row.approved, currencyTrend.currency)}</td>
    </tr>
  `).join('');
  renderFundingTrendChart(chart, rows, currencyTrend.currency, periodType);
}

function getAnalyticsPeriods(periodType) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  if (periodType === 'yearly') {
    return Array.from({ length: 5 }, (_, index) => {
      const year = String(currentYear - 4 + index);
      return { key: year, label: year };
    });
  }

  const currentMonth = now.getUTCMonth();
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(currentYear, currentMonth - 11 + index, 1));
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const label = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      timeZone: 'UTC',
    }).format(date);
    return { key: `${year}-${month}`, label: `${label} '${String(year).slice(-2)}` };
  });
}

function renderFundingTrendChart(container, rows, currency, periodType) {
  if (!rows.some((row) => row.applications > 0)) {
    container.innerHTML = `
      <div class="analytics-empty">
        <i class="bi bi-bar-chart-line" aria-hidden="true"></i>
        <span>No applications were created during this period.</span>
      </div>
    `;
    return;
  }

  const width = 900;
  const height = 290;
  const left = 84;
  const right = 18;
  const top = 16;
  const bottom = 44;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximum = Math.max(
    1,
    ...rows.map((row) => Math.max(row.requested, row.approved)),
  ) * 1.12;
  const groupWidth = plotWidth / rows.length;
  const barWidth = Math.min(24, groupWidth * 0.3);
  const gap = Math.min(5, groupWidth * 0.07);
  const grid = Array.from({ length: 5 }, (_, index) => {
    const y = top + (plotHeight * index) / 4;
    const value = maximum * (4 - index) / 4;
    return `
      <line class="analytics-grid-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line>
      <text class="analytics-axis-label" x="${left - 10}" y="${y + 4}" text-anchor="end">${escapeHtml(formatCompactCurrency(value, currency))}</text>
    `;
  }).join('');
  const bars = rows.map((row, index) => {
    const center = left + groupWidth * (index + 0.5);
    const requestedHeight = (row.requested / maximum) * plotHeight;
    const approvedHeight = (row.approved / maximum) * plotHeight;
    const requestedX = center - barWidth - gap / 2;
    const approvedX = center + gap / 2;
    const requestedY = top + plotHeight - requestedHeight;
    const approvedY = top + plotHeight - approvedHeight;
    const label = escapeHtml(row.label);
    const requestedTitle = escapeHtml(`${row.label}: requested ${formatCurrency(row.requested, currency)}`);
    const approvedTitle = escapeHtml(`${row.label}: approved ${formatCurrency(row.approved, currency)}`);
    return `
      ${row.requested > 0 ? `<rect class="analytics-bar-requested" x="${requestedX}" y="${requestedY}" width="${barWidth}" height="${requestedHeight}" rx="4" tabindex="0" aria-label="${requestedTitle}"><title>${requestedTitle}</title></rect>` : ''}
      ${row.approved > 0 ? `<rect class="analytics-bar-approved" x="${approvedX}" y="${approvedY}" width="${barWidth}" height="${approvedHeight}" rx="4" tabindex="0" aria-label="${approvedTitle}"><title>${approvedTitle}</title></rect>` : ''}
      <text class="analytics-period-label" x="${center}" y="${height - 13}" text-anchor="middle">${label}</text>
    `;
  }).join('');
  const grouping = periodType === 'monthly' ? 'month' : 'year';

  container.innerHTML = `
    <svg class="analytics-chart-svg" viewBox="0 0 ${width} ${height}" role="img"
         aria-labelledby="funding-analytics-svg-title funding-analytics-svg-description">
      <title id="funding-analytics-svg-title">Requested and approved funding by ${grouping}</title>
      <desc id="funding-analytics-svg-description">Grouped bars compare requested and currently approved amounts in ${escapeHtml(currency)}. Detailed values are available in the table below.</desc>
      ${grid}
      ${bars}
    </svg>
  `;
}

function formatCompactCurrency(value, currency) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function analyticsNote(hasIncompleteTotals) {
  const note = 'Amounts are grouped by application creation date. Approved funding is the current approved allocation, not cash spent. Profit is unavailable because project revenue and costs are not tracked.';
  return hasIncompleteTotals
    ? `${note} Some records are omitted because their funding currency is unavailable.`
    : note;
}

function setFundingAnalyticsUnavailable() {
  for (const id of [
    'funding-analytics-requested',
    'funding-analytics-approved',
    'funding-analytics-applications',
    'funding-analytics-rate',
    'funding-analytics-change',
  ]) {
    document.getElementById(id).textContent = '—';
  }
  document.getElementById('funding-analytics-chart').textContent =
    'Funding analytics are unavailable until the dashboard data can be loaded.';
  document.getElementById('funding-analytics-currency').disabled = true;
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
      <a class="agenda-event agenda-event-${item.type}"
         href="/src/pages/projects.html?project=${encodeURIComponent(item.projectId)}"
         aria-label="${escapeHtml(`${item.title}. ${item.detail}. Open related project.`)}">
        <span class="agenda-event-icon" aria-hidden="true"><i class="bi ${calendarEventIcon(item.type)}"></i></span>
        <div class="agenda-event-copy">
          <span class="agenda-event-type">${calendarEventLabel(item.type)}</span>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.detail)}</p>
          <span class="agenda-event-status">${escapeHtml(item.status)}</span>
        </div>
        <i class="bi bi-arrow-up-right agenda-event-link-icon" aria-hidden="true"></i>
      </a>
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
