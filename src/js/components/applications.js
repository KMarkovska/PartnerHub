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
  const statusConfirmationElement = document.getElementById('application-status-confirmation');
  const statusConfirmationModal = Modal.getOrCreateInstance(statusConfirmationElement);
  const statusConfirmationButton = document.getElementById('application-status-confirm');
  const statusConfirmationCancel = document.getElementById('application-status-cancel');
  const statusConfirmationClose = document.getElementById('application-status-close');
  const statusConfirmationError = document.getElementById('application-status-confirmation-error');
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
  let pendingStatusChange = null;
  let isUpdatingStatus = false;
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
    if (!button || button.disabled) return;

    const application = applications.find((item) => item.id === button.dataset.applicationStatus);
    const nextStatus = button.dataset.nextStatus;
    if (!application || !canChangeStatus(application, nextStatus)) return;

    if (['Submitted', 'Approved', 'Rejected'].includes(nextStatus)) {
      pendingStatusChange = { application, nextStatus, button };
      document.getElementById('application-status-confirm-title').textContent = nextStatus === 'Submitted'
        ? 'Submit application for review?'
        : `Confirm ${nextStatus.toLowerCase()} decision`;
      document.getElementById('application-status-confirm-description').textContent = nextStatus === 'Submitted'
        ? 'The administrator will be able to review this application after submission.'
        : `This will mark the application as ${nextStatus.toLowerCase()}.`;
      document.getElementById('application-status-confirm-name').textContent = application.title;
      statusConfirmationButton.textContent = nextStatus === 'Submitted'
        ? 'Submit for review'
        : nextStatus;
      statusConfirmationButton.classList.toggle('btn-danger', nextStatus === 'Rejected');
      statusConfirmationButton.classList.toggle('btn-primary', nextStatus !== 'Rejected');
      statusConfirmationError.classList.add('d-none');
      statusConfirmationError.textContent = '';
      statusConfirmationModal.show();
      return;
    }

    await saveStatusChange(application, nextStatus, button);
  });
  statusConfirmationElement.addEventListener('hide.bs.modal', (event) => {
    if (isUpdatingStatus) event.preventDefault();
  });
  statusConfirmationElement.addEventListener('hidden.bs.modal', () => {
    pendingStatusChange = null;
  });
  statusConfirmationButton.addEventListener('click', async () => {
    if (!pendingStatusChange || isUpdatingStatus) return;

    const { application, nextStatus, button } = pendingStatusChange;
    isUpdatingStatus = true;
    setStatusConfirmationBusy(true);
    try {
      await updateApplicationStatus(application.id, nextStatus);
      pendingStatusChange = null;
      isUpdatingStatus = false;
      setStatusConfirmationBusy(false);
      statusConfirmationModal.hide();
      showPageNotice(`Application status changed to ${nextStatus}.`, 'success');
      await loadApplications();
    } catch (error) {
      statusConfirmationError.textContent = `Could not change the application status: ${getErrorMessage(error, 'Please try again.')}`;
      statusConfirmationError.classList.remove('d-none');
      button.disabled = false;
    } finally {
      isUpdatingStatus = false;
      setStatusConfirmationBusy(false);
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

  async function saveStatusChange(application, nextStatus, button) {
    button.disabled = true;
    try {
      await updateApplicationStatus(application.id, nextStatus);
      showPageNotice(`Application status changed to ${nextStatus}.`, 'success');
      await loadApplications();
    } catch (error) {
      showPageNotice(`Could not change the application status: ${getErrorMessage(error, 'Please try again.')}`, 'danger');
      button.disabled = false;
    }
  }

  function setStatusConfirmationBusy(isBusy) {
    statusConfirmationButton.disabled = isBusy;
    statusConfirmationCancel.disabled = isBusy;
    statusConfirmationClose.disabled = isBusy;
    if (pendingStatusChange?.button) {
      pendingStatusChange.button.disabled = isBusy;
    }
    if (isBusy) {
      statusConfirmationButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Updating…';
    } else {
      statusConfirmationButton.textContent = {
        Submitted: 'Submit for review',
        Approved: 'Approve',
        Rejected: 'Reject',
      }[pendingStatusChange?.nextStatus] ?? 'Confirm';
    }
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
