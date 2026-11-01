import { Modal } from 'bootstrap';
import {
  getAdministrationMetrics,
  getAdministrationUsers,
  setUserAccess,
} from '../services/admin.service.js';

export function setupAdminPage(currentUserId) {
  const confirmationElement = document.getElementById('admin-access-confirmation');
  const confirmationModal = Modal.getOrCreateInstance(confirmationElement);
  const confirmationButton = document.getElementById('admin-access-confirm');
  const confirmationCancel = document.getElementById('admin-access-cancel');
  const search = document.getElementById('user-search');
  const roleFilter = document.getElementById('user-role');
  const usersBody = document.getElementById('admin-users-body');
  let pendingAccessUpdate = null;
  let isSavingAccess = false;

  search.addEventListener('input', filterUsers);
  roleFilter.addEventListener('change', filterUsers);
  usersBody.addEventListener('change', (event) => {
    const row = event.target.closest('[data-admin-user-row]');
    if (!row) return;
    if (event.target.matches('[data-admin-active]')) {
      const label = usersBody.querySelector(`label[for="${event.target.id}"]`);
      label.textContent = event.target.checked ? 'Active' : 'Inactive';
    }
    updateSaveButton(row);
    filterUsers();
  });
  usersBody.addEventListener('click', (event) => {
    const button = event.target.closest('[data-admin-save]');
    if (!button || button.disabled) return;

    const row = button.closest('[data-admin-user-row]');
    const role = row.querySelector('[data-admin-role]').value;
    const isActive = row.querySelector('[data-admin-active]').checked;
    const name = row.dataset.userName;
    pendingAccessUpdate = { row, role, isActive, name };
    document.getElementById('admin-access-confirm-user').textContent = name;
    document.getElementById('admin-access-confirm-role').textContent = role === 'admin'
      ? 'Administrator'
      : 'Regular user';
    document.getElementById('admin-access-confirm-status').textContent = isActive ? 'Active' : 'Inactive';
    confirmationModal.show();
  });

  confirmationElement.addEventListener('hide.bs.modal', (event) => {
    if (isSavingAccess) event.preventDefault();
  });
  confirmationElement.addEventListener('hidden.bs.modal', () => {
    pendingAccessUpdate = null;
  });
  confirmationButton.addEventListener('click', async () => {
    if (!pendingAccessUpdate || isSavingAccess) return;

    const { row, role, isActive, name } = pendingAccessUpdate;
    isSavingAccess = true;
    confirmationButton.disabled = true;
    confirmationCancel.disabled = true;
    row.querySelector('[data-admin-save]').disabled = true;
    row.setAttribute('aria-busy', 'true');
    try {
      await setUserAccess(row.dataset.userId, role, isActive);
      showUsersFeedback(`Access updated for ${name}.`, 'success');
      await Promise.all([loadUsers(), loadMetrics()]);
    } catch (error) {
      showUsersFeedback(getErrorMessage(error, 'Could not update this account.'), 'danger');
      resetRow(row);
    } finally {
      row.removeAttribute('aria-busy');
      updateSaveButton(row);
      isSavingAccess = false;
      confirmationButton.disabled = false;
      confirmationCancel.disabled = false;
      pendingAccessUpdate = null;
      confirmationModal.hide();
    }
  });

  void loadMetrics();
  void loadUsers();

  async function loadMetrics() {
    const status = document.getElementById('admin-metrics-state');
    const errorPanel = document.getElementById('admin-metrics-error');
    status.textContent = 'Loading administration metrics…';
    status.classList.remove('d-none');
    errorPanel.classList.add('d-none');

    try {
      const metrics = await getAdministrationMetrics();
      for (const [key, value] of Object.entries(metrics)) {
        const element = document.querySelector(`[data-admin-metric="${key}"]`);
        element.textContent = new Intl.NumberFormat().format(value);
      }
      status.classList.add('d-none');
    } catch (error) {
      status.classList.add('d-none');
      errorPanel.textContent = `Unable to load administration metrics: ${getErrorMessage(error, 'Please try again.')}`;
      errorPanel.classList.remove('d-none');
      for (const element of document.querySelectorAll('[data-admin-metric]')) {
        element.textContent = '—';
      }
    }
  }

  async function loadUsers() {
    const loading = document.getElementById('admin-users-loading');
    const errorPanel = document.getElementById('admin-users-error');
    const emptyPanel = document.getElementById('admin-users-empty');
    const table = document.getElementById('admin-users-table');
    loading.classList.remove('d-none');
    errorPanel.classList.add('d-none');
    emptyPanel.classList.add('d-none');
    table.classList.add('d-none');

    try {
      const users = await getAdministrationUsers();
      loading.classList.add('d-none');
      if (users.length === 0) {
        emptyPanel.classList.remove('d-none');
        return;
      }

      renderUsers(users, currentUserId);
      table.classList.remove('d-none');
      filterUsers();
    } catch (error) {
      loading.classList.add('d-none');
      errorPanel.textContent = `Unable to load users: ${getErrorMessage(error, 'Please try again.')}`;
      errorPanel.classList.remove('d-none');
    }
  }

  function filterUsers() {
    const searchTerm = search.value.trim().toLowerCase();
    const selectedRole = roleFilter.value;
    let visibleUsers = 0;
    for (const row of usersBody.querySelectorAll('[data-admin-user-row]')) {
      const matchesSearch = row.dataset.search.includes(searchTerm);
      const matchesRole = !selectedRole || row.dataset.currentRole === selectedRole;
      const visible = matchesSearch && matchesRole;
      row.classList.toggle('d-none', !visible);
      if (visible) visibleUsers += 1;
    }
    document.getElementById('admin-users-filter-empty').classList.toggle('d-none', visibleUsers > 0);
  }
}

function renderUsers(users, currentUserId) {
  const body = document.getElementById('admin-users-body');
  body.innerHTML = users.map((user) => {
    const currentUser = user.id === currentUserId;
    const name = user.full_name?.trim() || 'PartnerHub user';
    const email = user.email || '—';
    const joined = formatDate(user.created_at);
    const escapedName = escapeHtml(name);
    const escapedEmail = escapeHtml(email);
    const escapedSearch = escapeHtml(`${name} ${email}`.toLowerCase());
    const escapedId = escapeHtml(user.id);
    const role = ['admin', 'user'].includes(user.role) ? user.role : 'user';
    const isActive = Boolean(user.is_active);

    return `
      <tr data-admin-user-row data-user-id="${escapedId}" data-user-name="${escapedName}"
          data-search="${escapedSearch}" data-current-role="${role}"
          data-original-role="${role}" data-original-active="${isActive}"
          data-current-user="${currentUser}">
        <td>${escapedName}${currentUser ? ' <span class="badge text-bg-light">You</span>' : ''}</td>
        <td>${escapedEmail}</td>
        <td>
          <label class="visually-hidden" for="admin-role-${escapedId}">Role for ${escapedName}</label>
          <select id="admin-role-${escapedId}" class="form-select form-select-sm" data-admin-role
                  ${currentUser ? 'disabled' : ''}>
            <option value="user" ${role === 'user' ? 'selected' : ''}>Regular user</option>
            <option value="admin" ${role === 'admin' ? 'selected' : ''}>Administrator</option>
          </select>
        </td>
        <td>
          <div class="form-check form-switch">
            <input id="admin-active-${escapedId}" class="form-check-input" type="checkbox"
                   data-admin-active ${isActive ? 'checked' : ''} ${currentUser ? 'disabled' : ''}>
            <label class="form-check-label" for="admin-active-${escapedId}">
              ${isActive ? 'Active' : 'Inactive'}
            </label>
          </div>
        </td>
        <td>${joined}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" type="button" data-admin-save
                  aria-label="Save access changes for ${escapedName}"
                  disabled ${currentUser ? 'title="You cannot change your own access."' : ''}>
            Save
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function resetRow(row) {
  row.querySelector('[data-admin-role]').value = row.dataset.originalRole;
  row.querySelector('[data-admin-active]').checked = row.dataset.originalActive === 'true';
}

function updateSaveButton(row) {
  const role = row.querySelector('[data-admin-role]').value;
  const isActive = row.querySelector('[data-admin-active]').checked;
  const changed = role !== row.dataset.originalRole
    || isActive !== (row.dataset.originalActive === 'true');
  const saveButton = row.querySelector('[data-admin-save]');
  saveButton.disabled = row.dataset.currentUser === 'true' || !changed;
}

function showUsersFeedback(message, type) {
  const feedback = document.getElementById('admin-users-feedback');
  feedback.textContent = message;
  feedback.className = `alert alert-${type}`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function getErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error !== 'object' || error === null) return fallback;

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  if (code === 'PGRST202' || (message.includes('admin_list_profiles') && /not find|not exist/i.test(message))) {
    return 'The admin user-list function is missing from this Supabase project. Apply the admin user-management migration, then reload.';
  }
  if (message) return code ? `${message} (${code})` : message;
  return fallback;
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
