import { Modal } from 'bootstrap';
import {
  createProject,
  getApprovedApplications,
  getProjects,
  updateProject,
} from '../services/project.service.js';

export function setupProjectsPage() {
  const modal = Modal.getOrCreateInstance(document.getElementById('project-modal'));
  const form = document.getElementById('project-form');
  const formError = document.getElementById('project-form-error');
  const applicationSelect = document.getElementById('project-application');
  const nameInput = document.getElementById('project-name');
  const startDateInput = document.getElementById('project-start-date');
  const endDateInput = document.getElementById('project-end-date');
  const statusInput = document.getElementById('project-edit-status');
  const progressInput = document.getElementById('project-progress');
  const search = document.getElementById('project-search');
  const statusFilter = document.getElementById('project-status');
  const submitButton = form.querySelector('button[type="submit"]');
  let projects = [];
  let applications = [];
  let editingProjectId = null;

  document.querySelector('[data-action="project-create"]').addEventListener('click', () => {
    editingProjectId = null;
    form.reset();
    hideFormError();
    setEditMode(false);
    modal.show();
  });
  search.addEventListener('input', filterProjects);
  statusFilter.addEventListener('change', filterProjects);
  startDateInput.addEventListener('change', validateDates);
  endDateInput.addEventListener('change', validateDates);

  document.getElementById('projects-body').addEventListener('click', (event) => {
    const button = event.target.closest('[data-project-edit]');
    if (!button) return;
    const project = projects.find((item) => item.id === button.dataset.projectEdit);
    if (!project) return;

    editingProjectId = project.id;
    form.reset();
    hideFormError();
    setEditMode(true);
    nameInput.value = project.name;
    startDateInput.value = project.start_date ?? '';
    endDateInput.value = project.end_date ?? '';
    statusInput.value = project.status;
    progressInput.value = String(project.progress);
    modal.show();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormError();
    validateDates();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const name = String(formData.get('name')).trim();
    if (!name) {
      nameInput.setCustomValidity('Enter a project name.');
      nameInput.reportValidity();
      return;
    }

    const changes = {
      name,
      start_date: formData.get('startDate') || null,
      end_date: formData.get('endDate') || null,
    };

    if (editingProjectId) {
      changes.status = String(formData.get('status'));
      changes.progress = Number(formData.get('progress'));
    }

    setFormBusy(true);
    try {
      if (editingProjectId) {
        await updateProject(editingProjectId, changes);
        showPageNotice('Project updated.', 'success');
      } else {
        const application = applications.find((item) => item.id === formData.get('applicationId'));
        if (!application) {
          showFormError('Choose an approved application you can access.');
          return;
        }
        await createProject({
          application_id: application.id,
          customer_id: application.customer_id,
          owner_id: application.owner_id,
          ...changes,
          status: 'Not Started',
          progress: 0,
        });
        showPageNotice('Project created.', 'success');
      }

      modal.hide();
      form.reset();
      await loadProjects();
    } catch (error) {
      showFormError(getErrorMessage(error, 'Could not save this project. Please try again.'));
    } finally {
      setFormBusy(false);
    }
  });
  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));

  void loadApplications();
  void loadProjects();

  async function loadApplications() {
    try {
      applications = await getApprovedApplications();
      applicationSelect.replaceChildren(new Option('Choose an application', ''));
      for (const application of applications) {
        const label = `${application.title} — ${application.customer?.name ?? 'Customer'}`;
        applicationSelect.add(new Option(label, application.id));
      }
      const emptyPanel = document.getElementById('project-options-empty');
      if (applications.length === 0) {
        emptyPanel.textContent = 'No approved applications are available to create a project.';
        emptyPanel.classList.remove('d-none');
        submitButton.disabled = true;
      } else {
        emptyPanel.classList.add('d-none');
        submitButton.disabled = false;
      }
    } catch (error) {
      showFormError(`Could not load approved applications: ${getErrorMessage(error, 'Please try again.')}`);
      submitButton.disabled = true;
    }
  }

  async function loadProjects() {
    const loading = document.getElementById('projects-loading');
    const errorPanel = document.getElementById('projects-error');
    const emptyPanel = document.getElementById('projects-empty');
    const body = document.getElementById('projects-body');
    loading.classList.remove('d-none');
    errorPanel.classList.add('d-none');
    emptyPanel.classList.add('d-none');
    body.replaceChildren();

    try {
      projects = await getProjects();
      loading.classList.add('d-none');
      updateCounts();
      if (projects.length === 0) {
        emptyPanel.classList.remove('d-none');
        filterProjects();
        return;
      }
      renderProjects();
      filterProjects();
    } catch (error) {
      loading.classList.add('d-none');
      errorPanel.textContent = `Unable to load projects: ${getErrorMessage(error, 'Please try again.')}`;
      errorPanel.classList.remove('d-none');
      for (const count of document.querySelectorAll('[data-project-count]')) {
        count.textContent = '—';
      }
    }
  }

  function updateCounts() {
    const counts = {
      total: projects.length,
      'in-progress': projects.filter((project) => project.status === 'In Progress').length,
      completed: projects.filter((project) => project.status === 'Completed').length,
      'on-hold': projects.filter((project) => project.status === 'On Hold').length,
    };
    for (const [key, value] of Object.entries(counts)) {
      document.querySelector(`[data-project-count="${key}"]`).textContent =
        new Intl.NumberFormat().format(value);
    }
  }

  function renderProjects() {
    document.getElementById('projects-body').innerHTML = projects.map((project) => `
      <tr data-project-row
          data-search="${escapeHtml(`${project.name} ${project.customer?.name ?? ''}`.toLowerCase())}"
          data-status="${escapeHtml(project.status)}">
        <td><span class="fw-semibold">${escapeHtml(project.name)}</span></td>
        <td>${escapeHtml(project.customer?.name ?? '—')}</td>
        <td>${escapeHtml(project.owner?.full_name?.trim() || 'PartnerHub user')}</td>
        <td>${formatDate(project.start_date)}</td>
        <td>${formatDate(project.end_date)}</td>
        <td><div class="d-flex align-items-center gap-2"><div class="progress flex-grow-1" role="progressbar" aria-label="${escapeHtml(project.name)} progress" aria-valuenow="${Number(project.progress)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width: ${Number(project.progress)}%"></div></div><span class="small">${Number(project.progress)}%</span></div></td>
        <td><span class="badge ${statusBadgeClass(project.status)}">${escapeHtml(project.status)}</span></td>
        <td><button class="btn btn-sm btn-outline-primary" type="button" data-project-edit="${escapeHtml(project.id)}">Edit</button></td>
      </tr>
    `).join('');
  }

  function filterProjects() {
    const query = search.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const rows = [...document.querySelectorAll('[data-project-row]')];
    let visibleRows = 0;
    for (const row of rows) {
      const visible = row.dataset.search.includes(query)
        && (!selectedStatus || row.dataset.status === selectedStatus);
      row.classList.toggle('d-none', !visible);
      if (visible) visibleRows += 1;
    }
    document.getElementById('projects-filter-empty').classList.toggle(
      'd-none',
      rows.length === 0 || visibleRows > 0,
    );
    document.getElementById('projects-empty').classList.toggle(
      'd-none',
      rows.length > 0 || projects.length > 0,
    );
  }

  function setEditMode(isEditing) {
    document.getElementById('project-modal-title').textContent =
      isEditing ? 'Edit project' : 'New project';
    document.getElementById('project-modal-description').textContent = isEditing
      ? 'Update project details, status, and progress.'
      : 'Start a project from an approved funding application.';
    document.getElementById('project-application-field').classList.toggle('d-none', isEditing);
    document.getElementById('project-application').required = !isEditing;
    document.getElementById('project-edit-fields').classList.toggle('d-none', !isEditing);
    document.getElementById('project-edit-status').required = isEditing;
    document.getElementById('project-progress').required = isEditing;
    document.getElementById('project-submit-label').textContent =
      isEditing ? 'Save changes' : 'Create project';
    submitButton.disabled = !isEditing && applications.length === 0;
  }

  function validateDates() {
    const hasInvalidRange = startDateInput.value
      && endDateInput.value
      && endDateInput.value < startDateInput.value;
    endDateInput.setCustomValidity(
      hasInvalidRange ? 'End date must be on or after the start date.' : '',
    );
  }

  function setFormBusy(isBusy) {
    form.querySelectorAll('input, select, button[type="submit"]').forEach((control) => {
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
  if (status === 'Completed') return 'text-bg-success';
  if (status === 'On Hold') return 'text-bg-warning';
  if (status === 'In Progress') return 'text-bg-primary';
  return 'text-bg-secondary';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
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
