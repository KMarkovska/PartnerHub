import { Modal } from 'bootstrap';
import {
  createFundingProgram,
  getFundingPrograms,
  updateFundingProgram,
} from '../services/program.service.js';

export function setupProgramsPage(role) {
  const isAdmin = role === 'admin';
  const modal = Modal.getOrCreateInstance(document.getElementById('program-modal'));
  const form = document.getElementById('program-form');
  const formError = document.getElementById('program-form-error');
  const nameInput = document.getElementById('program-name');
  const currencyInput = document.getElementById('program-currency');
  const submitButton = form.querySelector('button[type="submit"]');
  const search = document.getElementById('program-search');
  const statusFilter = document.getElementById('program-status');
  let programs = [];
  let editingProgramId = null;

  if (!isAdmin) {
    statusFilter.querySelector('option[value="inactive"]').remove();
  } else {
    document.querySelector('[data-action="program-create"]').addEventListener('click', () => {
      editingProgramId = null;
      form.reset();
      hideFormError();
      setEditMode(false);
      modal.show();
    });
  }

  search.addEventListener('input', filterPrograms);
  statusFilter.addEventListener('change', filterPrograms);
  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));
  currencyInput.addEventListener('input', () => {
    currencyInput.value = currencyInput.value.toUpperCase();
    currencyInput.setCustomValidity('');
  });

  document.getElementById('programs-body').addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-program-edit]');
    if (editButton && isAdmin) {
      const program = programs.find((item) => item.id === editButton.dataset.programEdit);
      if (!program) return;
      editingProgramId = program.id;
      form.reset();
      hideFormError();
      setEditMode(true);
      nameInput.value = program.name;
      form.elements.description.value = program.description ?? '';
      form.elements.maxAmount.value = String(program.max_amount);
      currencyInput.value = program.currency;
      form.elements.eligibility.value = program.eligibility_information ?? '';
      modal.show();
      return;
    }

    const toggleButton = event.target.closest('[data-program-toggle]');
    if (!toggleButton || !isAdmin) return;
    const program = programs.find((item) => item.id === toggleButton.dataset.programToggle);
    if (!program) return;

    const nextActive = toggleButton.dataset.nextActive === 'true';
    const action = nextActive ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} "${program.name}"?`)) return;

    toggleButton.disabled = true;
    try {
      await updateFundingProgram(program.id, { is_active: nextActive });
      showPageNotice(`Funding program ${nextActive ? 'activated' : 'deactivated'}.`, 'success');
      await loadPrograms();
    } catch (error) {
      showPageNotice(`Could not ${action} this funding program: ${getErrorMessage(error, 'Please try again.')}`, 'danger');
      toggleButton.disabled = false;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormError();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const name = String(formData.get('name')).trim();
    if (!name) {
      nameInput.setCustomValidity('Enter a program name.');
      nameInput.reportValidity();
      return;
    }

    const maxAmount = Number(formData.get('maxAmount'));
    const currency = String(formData.get('currency')).trim().toUpperCase();
    if (!Number.isFinite(maxAmount) || maxAmount <= 0 || !/^[A-Z]{3}$/.test(currency)) {
      showFormError('Enter a positive maximum amount and a valid three-letter currency code.');
      return;
    }

    const changes = {
      name,
      description: String(formData.get('description')).trim() || null,
      max_amount: maxAmount,
      currency,
      eligibility_information: String(formData.get('eligibility')).trim() || null,
    };

    setFormBusy(true);
    try {
      if (editingProgramId) {
        await updateFundingProgram(editingProgramId, changes);
        showPageNotice('Funding program updated.', 'success');
      } else {
        await createFundingProgram({ ...changes, is_active: true });
        showPageNotice('Funding program created.', 'success');
      }

      modal.hide();
      form.reset();
      await loadPrograms();
    } catch (error) {
      showFormError(getErrorMessage(error, 'Could not save this funding program. Please try again.'));
    } finally {
      setFormBusy(false);
    }
  });

  void loadPrograms();

  async function loadPrograms() {
    const loading = document.getElementById('programs-loading');
    const errorPanel = document.getElementById('programs-error');
    const emptyPanel = document.getElementById('programs-empty');
    const body = document.getElementById('programs-body');
    loading.classList.remove('d-none');
    errorPanel.classList.add('d-none');
    emptyPanel.classList.add('d-none');
    body.replaceChildren();

    try {
      programs = await getFundingPrograms();
      loading.classList.add('d-none');
      if (programs.length === 0) {
        emptyPanel.classList.remove('d-none');
        filterPrograms();
        return;
      }
      renderPrograms();
      filterPrograms();
    } catch (error) {
      loading.classList.add('d-none');
      errorPanel.textContent = `Unable to load funding programs: ${getErrorMessage(error, 'Please try again.')}`;
      errorPanel.classList.remove('d-none');
    }
  }

  function renderPrograms() {
    document.getElementById('programs-body').innerHTML = programs.map((program) => `
      <tr data-program-row data-active="${program.is_active}"
          data-search="${escapeHtml(`${program.name} ${program.description ?? ''} ${program.eligibility_information ?? ''}`.toLowerCase())}">
        <td><span class="fw-semibold">${escapeHtml(program.name)}</span></td>
        <td>${escapeHtml(program.description?.trim() || '—')}</td>
        <td>${formatCurrency(program.max_amount, program.currency)}</td>
        <td>${escapeHtml(program.eligibility_information?.trim() || '—')}</td>
        <td><span class="badge ${program.is_active ? 'text-bg-success' : 'text-bg-secondary'}">${program.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>${isAdmin ? `
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary" type="button" data-program-edit="${escapeHtml(program.id)}">Edit</button>
            <button class="btn btn-sm ${program.is_active ? 'btn-outline-secondary' : 'btn-outline-success'}"
                    type="button" data-program-toggle="${escapeHtml(program.id)}"
                    data-next-active="${!program.is_active}">
              ${program.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ` : ''}</td>
      </tr>
    `).join('');
  }

  function filterPrograms() {
    const query = search.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const rows = [...document.querySelectorAll('[data-program-row]')];
    let visibleRows = 0;
    for (const row of rows) {
      const statusMatches = !selectedStatus
        || (selectedStatus === 'active' ? row.dataset.active === 'true' : row.dataset.active === 'false');
      const visible = row.dataset.search.includes(query) && statusMatches;
      row.classList.toggle('d-none', !visible);
      if (visible) visibleRows += 1;
    }
    document.getElementById('programs-filter-empty').classList.toggle(
      'd-none',
      rows.length === 0 || visibleRows > 0,
    );
    document.getElementById('programs-empty').classList.toggle(
      'd-none',
      rows.length > 0 || programs.length > 0,
    );
  }

  function setEditMode(isEditing) {
    document.getElementById('program-modal-title').textContent =
      isEditing ? 'Edit funding program' : 'New funding program';
    document.getElementById('program-submit-label').textContent =
      isEditing ? 'Save changes' : 'Create program';
  }

  function setFormBusy(isBusy) {
    form.querySelectorAll('input, textarea, button[type="submit"]').forEach((control) => {
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
}

function formatCurrency(value, currency) {
  const amount = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
  return `${currency} ${amount}`;
}

function showPageNotice(message, type) {
  const notice = document.getElementById('page-notice');
  notice.textContent = message;
  notice.className = `alert alert-${type}`;
  notice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
    && error.message
  ) {
    return error.message;
  }
  return fallback;
}
