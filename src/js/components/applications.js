import { Modal } from 'bootstrap';
import {
  createApplication,
  getApplicationOptions,
  getApplications,
  updateApplicationStatus,
} from '../services/application.service.js';

export function setupApplicationsPage(currentUserId, role) {
  const isAdmin = role === 'admin';
  const modalElement = document.getElementById('application-modal');
  const modal = Modal.getOrCreateInstance(modalElement);
  const form = document.getElementById('application-form');
  const formError = document.getElementById('application-form-error');
  const customersSelect = document.getElementById('application-customer-input');
  const programsSelect = document.getElementById('application-program-input');
  const amountInput = document.getElementById('application-amount');
  const programLimit = document.getElementById('application-program-limit');
  const search = document.getElementById('application-search');
  const statusFilter = document.getElementById('application-status');
  const customerFilter = document.getElementById('application-customer');
  const createButton = document.querySelector('[data-action="application-create"]');
  const submitButton = form.querySelector('button[type="submit"]');
  let applications = [];
  let customers = [];
  let programs = [];
  submitButton.disabled = true;

  createButton.addEventListener('click', () => {
    hideFormError();
    modal.show();
  });
  search.addEventListener('input', filterApplications);
  statusFilter.addEventListener('change', filterApplications);
  customerFilter.addEventListener('change', filterApplications);
  programsSelect.addEventListener('change', updateProgramLimit);
  document.getElementById('applications-body').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-application-status]');
    if (!button) return;

    const application = applications.find((item) => item.id === button.dataset.applicationStatus);
    const nextStatus = button.dataset.nextStatus;
    if (!application || !canChangeStatus(application, nextStatus)) return;

    if (nextStatus === 'Submitted' && !window.confirm('Submit this draft to the administrator for review?')) {
      return;
    }
    if (['Approved', 'Rejected'].includes(nextStatus)
      && !window.confirm(`Are you sure you want to mark "${application.title}" as ${nextStatus.toLowerCase()}?`)) {
      return;
    }

    button.disabled = true;
    try {
      await updateApplicationStatus(application.id, nextStatus);
      showPageNotice(`Application status changed to ${nextStatus}.`, 'success');
      await loadApplications();
    } catch (error) {
      showPageNotice(`Could not change the application status: ${getErrorMessage(error, 'Please try again.')}`, 'danger');
      button.disabled = false;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormError();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const selectedProgram = programs.find((program) => program.id === formData.get('programId'));
    const requestedAmount = Number(formData.get('requestedAmount'));
    if (!selectedProgram || requestedAmount > Number(selectedProgram.max_amount)) {
      showFormError('Choose an active funding program and request no more than its maximum amount.');
      return;
    }

    setFormBusy(true);
    try {
      await createApplication({
        customer_id: formData.get('customerId'),
        program_id: selectedProgram.id,
        owner_id: currentUserId,
        title: String(formData.get('title')).trim(),
        description: String(formData.get('description')).trim() || null,
        requested_amount: requestedAmount,
        deadline: formData.get('deadline') || null,
        status: 'Draft',
      });

      form.reset();
      updateProgramLimit();
      modal.hide();
      showPageNotice('Draft application created.', 'success');
      await loadApplications();
    } catch (error) {
      showFormError(getErrorMessage(error, 'Could not create the application. Please try again.'));
    } finally {
      setFormBusy(false);
    }
  });

  void loadOptions();
  void loadApplications();

  async function loadOptions() {
    try {
      ({ customers, programs } = await getApplicationOptions());
      populateOptions(customersSelect, customers, 'Choose a customer');
      populateOptions(customerFilter, customers, 'All customers');
      populateOptions(programsSelect, programs, 'Choose a program');
      const missing = [];
      if (customers.length === 0) missing.push('Add a customer before creating an application.');
      if (programs.length === 0) missing.push('No active funding programs are available.');
      submitButton.disabled = missing.length > 0;
      if (missing.length > 0) {
        const optionsEmpty = document.getElementById('application-options-empty');
        optionsEmpty.textContent = missing.join(' ');
        optionsEmpty.classList.remove('d-none');
        submitButton.disabled = true;
      }
      updateProgramLimit();
    } catch (error) {
      showFormError(`Could not load customers and funding programs: ${getErrorMessage(error, 'Please try again.')}`);
      submitButton.disabled = true;
    }
  }

  async function loadApplications() {
    const loading = document.getElementById('applications-loading');
    const errorPanel = document.getElementById('applications-error');
    const emptyPanel = document.getElementById('applications-empty');
    const body = document.getElementById('applications-body');
    loading.classList.remove('d-none');
    errorPanel.classList.add('d-none');
    emptyPanel.classList.add('d-none');
    body.replaceChildren();

    try {
      applications = await getApplications();
      loading.classList.add('d-none');
      if (applications.length === 0) {
        emptyPanel.classList.remove('d-none');
        filterApplications();
        return;
      }

      renderApplications();
      filterApplications();
    } catch (error) {
      loading.classList.add('d-none');
      errorPanel.textContent = `Unable to load applications: ${getErrorMessage(error, 'Please try again.')}`;
      errorPanel.classList.remove('d-none');
    }
  }

  function renderApplications() {
    const body = document.getElementById('applications-body');
    body.innerHTML = applications.map((application) => `
      <tr data-application-row data-customer-id="${escapeHtml(application.customer_id ?? '')}"
          data-search="${escapeHtml(`${application.title} ${application.customer?.name ?? ''} ${application.program?.name ?? ''}`.toLowerCase())}"
          data-status="${escapeHtml(application.status)}">
        <td><span class="fw-semibold">${escapeHtml(application.title)}</span>${application.deadline ? `<div class="small text-muted">Due ${formatDate(application.deadline)}</div>` : ''}</td>
        <td>${escapeHtml(application.customer?.name ?? '—')}</td>
        <td>${escapeHtml(application.program?.name ?? '—')}</td>
        <td>${formatCurrency(application.requested_amount, application.program?.currency)}</td>
        <td>${formatDate(application.created_at)}</td>
        <td><span class="badge ${statusBadgeClass(application.status)}">${escapeHtml(application.status)}</span></td>
        <td><div class="d-flex flex-wrap gap-2">${renderStatusActions(application)}</div></td>
      </tr>
    `).join('');
  }

  function renderStatusActions(application) {
    const actions = [];
    if (isAdmin) {
      if (application.status === 'Submitted') {
        actions.push(['Under Review', 'Start review', 'btn-outline-primary']);
        actions.push(['Approved', 'Approve', 'btn-outline-success']);
        actions.push(['Rejected', 'Reject', 'btn-outline-danger']);
      } else if (application.status === 'Under Review') {
        actions.push(['Approved', 'Approve', 'btn-outline-success']);
        actions.push(['Rejected', 'Reject', 'btn-outline-danger']);
      }
    } else if (
      application.owner_id === currentUserId
      && application.status === 'Draft'
    ) {
      actions.push(['Submitted', 'Submit for review', 'btn-outline-primary']);
    }

    return actions.map(([status, label, style]) => `
      <button class="btn btn-sm ${style}" type="button"
              data-application-status="${escapeHtml(application.id)}"
              data-next-status="${status}">${label}</button>
    `).join('');
  }

  function canChangeStatus(application, nextStatus) {
    if (!isAdmin) {
      return application.owner_id === currentUserId
        && application.status === 'Draft'
        && nextStatus === 'Submitted';
    }

    return (application.status === 'Submitted'
        && ['Under Review', 'Approved', 'Rejected'].includes(nextStatus))
      || (application.status === 'Under Review'
        && ['Approved', 'Rejected'].includes(nextStatus));
  }

  function filterApplications() {
    const searchTerm = search.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedCustomer = customerFilter.value;
    const rows = [...document.querySelectorAll('[data-application-row]')];
    let visibleRows = 0;
    for (const row of rows) {
      const visible = row.dataset.search.includes(searchTerm)
        && (!selectedStatus || row.dataset.status === selectedStatus)
        && (!selectedCustomer || row.dataset.customerId === selectedCustomer);
      row.classList.toggle('d-none', !visible);
      if (visible) visibleRows += 1;
    }
    document.getElementById('applications-filter-empty').classList.toggle(
      'd-none',
      rows.length === 0 || visibleRows > 0,
    );
    document.getElementById('applications-empty').classList.toggle(
      'd-none',
      rows.length > 0 || applications.length > 0,
    );
  }

  function updateProgramLimit() {
    const program = programs.find((item) => item.id === programsSelect.value);
    if (!program) {
      amountInput.removeAttribute('max');
      programLimit.textContent = '';
      return;
    }
    amountInput.max = String(program.max_amount);
    programLimit.textContent = `Maximum ${formatCurrency(program.max_amount, program.currency)}.`;
  }

  function populateOptions(select, options, placeholder) {
    select.replaceChildren(new Option(placeholder, ''));
    for (const option of options) {
      select.add(new Option(option.name, option.id));
    }
  }

  function setFormBusy(isBusy) {
    form.querySelectorAll('input, select, textarea, button[type="submit"]').forEach((control) => {
      control.disabled = isBusy;
    });
    submitButton.setAttribute('aria-busy', String(isBusy));
  }

  function hideFormError() {
    formError.textContent = '';
    formError.classList.add('d-none');
  }

  function showFormError(message) {
    formError.textContent = message;
    formError.classList.remove('d-none');
  }

  function showPageNotice(message, type) {
    const notice = document.getElementById('page-notice');
    notice.textContent = message;
    notice.className = `alert alert-${type}`;
    notice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function statusBadgeClass(status) {
  if (status === 'Approved') return 'text-bg-success';
  if (status === 'Rejected') return 'text-bg-danger';
  if (status === 'Under Review') return 'text-bg-info';
  if (status === 'Submitted') return 'text-bg-primary';
  return 'text-bg-secondary';
}

function formatCurrency(value, currency) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || !currency) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
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

function getErrorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}
