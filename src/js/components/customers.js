import { Modal } from 'bootstrap';
import { createCustomer, getCustomers } from '../services/customer.service.js';

export function setupCustomersPage(currentUserId) {
  const modal = Modal.getOrCreateInstance(document.getElementById('customer-modal'));
  const form = document.getElementById('customer-form');
  const formError = document.getElementById('customer-form-error');
  const search = document.getElementById('customer-search');
  const createButton = document.querySelector('[data-action="customer-create"]');
  const submitButton = form.querySelector('button[type="submit"]');
  let customers = [];

  createButton.addEventListener('click', () => {
    hideFormError();
    modal.show();
  });
  search.addEventListener('input', filterCustomers);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormError();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const name = String(formData.get('name')).trim();
    if (!name) {
      document.getElementById('customer-name').setCustomValidity('Enter a company name.');
      document.getElementById('customer-name').reportValidity();
      return;
    }

    setFormBusy(true);
    try {
      await createCustomer({
        name,
        country: optionalValue(formData.get('country')),
        contact_name: optionalValue(formData.get('contactName')),
        contact_email: optionalValue(formData.get('contactEmail')),
        owner_id: currentUserId,
      });

      form.reset();
      modal.hide();
      showPageNotice('Customer added to your workspace.', 'success');
      await loadCustomers();
    } catch (error) {
      showFormError(getErrorMessage(error, 'Could not add this customer. Please try again.'));
    } finally {
      setFormBusy(false);
    }
  });

  const nameInput = document.getElementById('customer-name');
  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));

  void loadCustomers();

  async function loadCustomers() {
    const loading = document.getElementById('customers-loading');
    const errorPanel = document.getElementById('customers-error');
    const emptyPanel = document.getElementById('customers-empty');
    const body = document.getElementById('customers-body');
    loading.classList.remove('d-none');
    errorPanel.classList.add('d-none');
    emptyPanel.classList.add('d-none');
    body.replaceChildren();

    try {
      customers = await getCustomers();
      loading.classList.add('d-none');
      if (customers.length === 0) {
        emptyPanel.classList.remove('d-none');
        filterCustomers();
        return;
      }

      renderCustomers();
      filterCustomers();
    } catch (error) {
      loading.classList.add('d-none');
      errorPanel.textContent = `Unable to load customers: ${getErrorMessage(error, 'Please try again.')}`;
      errorPanel.classList.remove('d-none');
    }
  }

  function renderCustomers() {
    document.getElementById('customers-body').innerHTML = customers.map((customer) => `
      <tr data-customer-row
          data-search="${escapeHtml(`${customer.name} ${customer.country ?? ''} ${customer.contact_name ?? ''} ${customer.contact_email ?? ''}`.toLowerCase())}">
        <td><span class="fw-semibold">${escapeHtml(customer.name)}</span></td>
        <td>${escapeHtml(customer.country || '—')}</td>
        <td>${escapeHtml(customer.contact_name || '—')}</td>
        <td>${customer.contact_email ? `<a href="mailto:${escapeHtml(customer.contact_email)}">${escapeHtml(customer.contact_email)}</a>` : '—'}</td>
        <td>${new Intl.NumberFormat().format(customer.application_count)}</td>
        <td>${escapeHtml(customer.owner?.full_name?.trim() || 'PartnerHub user')}</td>
      </tr>
    `).join('');
  }

  function filterCustomers() {
    const query = search.value.trim().toLowerCase();
    const rows = [...document.querySelectorAll('[data-customer-row]')];
    let visibleRows = 0;
    for (const row of rows) {
      const visible = row.dataset.search.includes(query);
      row.classList.toggle('d-none', !visible);
      if (visible) visibleRows += 1;
    }
    document.getElementById('customers-filter-empty').classList.toggle(
      'd-none',
      rows.length === 0 || visibleRows > 0,
    );
    document.getElementById('customers-empty').classList.toggle(
      'd-none',
      rows.length > 0 || customers.length > 0,
    );
  }

  function setFormBusy(isBusy) {
    form.querySelectorAll('input, button[type="submit"]').forEach((control) => {
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

function optionalValue(value) {
  return String(value).trim() || null;
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
