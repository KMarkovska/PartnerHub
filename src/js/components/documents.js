import { Modal } from 'bootstrap';
import {
  downloadDocument,
  deleteDocument,
  getDocuments,
  getDocumentParents,
  getSupportedMimeType,
  uploadDocument,
} from '../services/document.service.js';

const maximumFileSize = 20 * 1024 * 1024;

export function setupDocumentsPage(currentUserId, role) {
  const isAdmin = role === 'admin';
  const modal = Modal.getOrCreateInstance(document.getElementById('document-modal'));
  const deleteConfirmationElement = document.getElementById('document-delete-confirmation');
  const deleteConfirmationModal = Modal.getOrCreateInstance(deleteConfirmationElement);
  const deleteConfirmationButton = document.getElementById('document-delete-confirm');
  const deleteConfirmationCancel = document.getElementById('document-delete-cancel');
  const deleteConfirmationClose = document.getElementById('document-delete-close');
  const deleteConfirmationError = document.getElementById('document-delete-error');
  const form = document.getElementById('document-form');
  const formError = document.getElementById('document-form-error');
  const parentSelect = document.getElementById('document-parent');
  const fileInput = document.getElementById('document-file');
  const search = document.getElementById('document-search');
  const typeFilter = document.getElementById('document-type');
  const submitButton = form.querySelector('button[type="submit"]');
  let documents = [];
  let parents = { applications: [], projects: [] };
  let pendingDelete = null;
  let isDeletingDocument = false;

  parentSelect.disabled = true;
  fileInput.disabled = true;
  submitButton.disabled = true;

  document.querySelector('[data-action="document-upload"]').addEventListener('click', () => {
    hideFormError();
    modal.show();
  });
  search.addEventListener('input', filterDocuments);
  typeFilter.addEventListener('change', filterDocuments);
  fileInput.addEventListener('change', validateFile);
  document.getElementById('documents-body').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-document-download], [data-document-delete]');
    if (!button) return;

    const documentRecord = documents.find((item) => item.id === (
      button.dataset.documentDownload ?? button.dataset.documentDelete
    ));
    if (!documentRecord) {
      showPageNotice('This document is no longer available. Reload the page and try again.', 'danger');
      return;
    }

    if (button.matches('[data-document-delete]')) {
      if (!isAdmin) return;
      pendingDelete = { documentRecord, button };
      document.getElementById('document-delete-file-name').textContent = documentRecord.file_name;
      deleteConfirmationError.classList.add('d-none');
      deleteConfirmationError.textContent = '';
      deleteConfirmationModal.show();
      return;
    }

    button.disabled = true;
    try {
      const blob = await downloadDocument(documentRecord.storage_path, documentRecord.file_name);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = documentRecord.file_name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      showPageNotice(`Could not download the document: ${getErrorMessage(error, 'Please try again.')}`, 'danger');
    } finally {
      button.disabled = false;
    }
  });
  deleteConfirmationElement.addEventListener('hide.bs.modal', (event) => {
    if (isDeletingDocument) event.preventDefault();
  });
  deleteConfirmationElement.addEventListener('hidden.bs.modal', () => {
    pendingDelete = null;
  });
  deleteConfirmationButton.addEventListener('click', async () => {
    if (!pendingDelete || isDeletingDocument) return;

    const { documentRecord, button } = pendingDelete;
    isDeletingDocument = true;
    deleteConfirmationButton.disabled = true;
    deleteConfirmationCancel.disabled = true;
    deleteConfirmationClose.disabled = true;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    deleteConfirmationButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Deleting…';

    try {
      await deleteDocument(documentRecord.id, documentRecord.storage_path);
      showPageNotice('Document permanently deleted.', 'success');
      pendingDelete = null;
      isDeletingDocument = false;
      deleteConfirmationModal.hide();
      await loadDocuments();
    } catch (error) {
      deleteConfirmationError.textContent = `Could not delete the document: ${getErrorMessage(error, 'Please try again.')}`;
      deleteConfirmationError.classList.remove('d-none');
      await loadDocuments();
    } finally {
      isDeletingDocument = false;
      deleteConfirmationButton.disabled = false;
      deleteConfirmationCancel.disabled = false;
      deleteConfirmationClose.disabled = false;
      deleteConfirmationButton.innerHTML = '<i class="bi bi-trash me-1" aria-hidden="true"></i>Delete permanently';
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormError();
    validateFile();
    if (!form.reportValidity()) return;

    const file = fileInput.files?.[0];
    const parentValue = parentSelect.value;
    const separatorIndex = parentValue.indexOf(':');
    const parent = {
      type: parentValue.slice(0, separatorIndex),
      id: parentValue.slice(separatorIndex + 1),
    };
    if (!file || !['application', 'project'].includes(parent.type) || !parent.id) {
      showFormError('Choose an application or project and select a supported file.');
      return;
    }

    setFormBusy(true);
    try {
      await uploadDocument(file, parent, currentUserId);
      form.reset();
      modal.hide();
      showPageNotice('Document uploaded securely.', 'success');
      await loadDocuments();
    } catch (error) {
      showFormError(getErrorMessage(error, 'Could not upload this document. Please try again.'));
    } finally {
      setFormBusy(false);
    }
  });

  void loadParents();
  void loadDocuments();

  async function loadParents() {
    try {
      parents = await getDocumentParents();
      parentSelect.replaceChildren(new Option('Choose an application or project', ''));
      appendParentOptions('Applications', parents.applications, 'application', 'title');
      appendParentOptions('Projects', parents.projects, 'project', 'name');
      const availableCount = parents.applications.length + parents.projects.length;
      const emptyPanel = document.getElementById('document-options-empty');
      if (availableCount === 0) {
        emptyPanel.classList.remove('d-none');
      } else {
        emptyPanel.classList.add('d-none');
      }
      parentSelect.disabled = availableCount === 0;
      fileInput.disabled = availableCount === 0;
      submitButton.disabled = availableCount === 0;
    } catch (error) {
      showFormError(`Could not load applications and projects: ${getErrorMessage(error, 'Please try again.')}`);
      parentSelect.disabled = true;
      fileInput.disabled = true;
      submitButton.disabled = true;
    }
  }

  function appendParentOptions(label, records, type, nameKey) {
    if (records.length === 0) return;
    const group = document.createElement('optgroup');
    group.label = label;
    for (const record of records) {
      group.append(new Option(record[nameKey], `${type}:${record.id}`));
    }
    parentSelect.append(group);
  }

  async function loadDocuments() {
    const loading = document.getElementById('documents-loading');
    const errorPanel = document.getElementById('documents-error');
    const emptyPanel = document.getElementById('documents-empty');
    const body = document.getElementById('documents-body');
    loading.classList.remove('d-none');
    errorPanel.classList.add('d-none');
    emptyPanel.classList.add('d-none');
    body.replaceChildren();

    try {
      documents = await getDocuments();
      loading.classList.add('d-none');
      if (documents.length === 0) {
        emptyPanel.classList.remove('d-none');
        filterDocuments();
        return;
      }
      renderDocuments();
      filterDocuments();
    } catch (error) {
      loading.classList.add('d-none');
      errorPanel.textContent = `Unable to load documents: ${getErrorMessage(error, 'Please try again.')}`;
      errorPanel.classList.remove('d-none');
    }
  }

  function renderDocuments() {
    document.getElementById('documents-body').innerHTML = documents.map((documentRecord) => `
      <tr data-document-row
          data-parent-type="${documentRecord.parent_type}"
          data-search="${escapeHtml(`${documentRecord.file_name} ${documentRecord.parent_name} ${documentRecord.file_type} ${documentRecord.uploader_name}`.toLowerCase())}">
        <td><span class="fw-semibold">${escapeHtml(documentRecord.file_name)}</span><div class="small text-muted">${formatFileSize(documentRecord.file_size)}</div></td>
        <td><span class="badge text-bg-light">${documentRecord.parent_type === 'application' ? 'Application' : 'Project'}</span> ${escapeHtml(documentRecord.parent_name)}</td>
        <td>${escapeHtml(documentRecord.file_type)}</td>
        <td>${escapeHtml(documentRecord.uploader_name)}</td>
        <td>${formatDate(documentRecord.created_at)}</td>
        <td><div class="d-flex flex-wrap gap-2">
          <button class="btn btn-sm btn-outline-primary" type="button" data-document-download="${escapeHtml(documentRecord.id)}"><i class="bi bi-download me-1" aria-hidden="true"></i>Download</button>
          ${isAdmin ? `<button class="btn btn-sm btn-outline-danger" type="button" data-document-delete="${escapeHtml(documentRecord.id)}" aria-label="Delete ${escapeHtml(documentRecord.file_name)}"><i class="bi bi-trash me-1" aria-hidden="true"></i>Delete</button>` : ''}
        </div></td>
      </tr>
    `).join('');
  }

  function filterDocuments() {
    const query = search.value.trim().toLowerCase();
    const selectedType = typeFilter.value;
    const rows = [...document.querySelectorAll('[data-document-row]')];
    let visibleRows = 0;
    for (const row of rows) {
      const visible = row.dataset.search.includes(query)
        && (!selectedType || row.dataset.parentType === selectedType);
      row.classList.toggle('d-none', !visible);
      if (visible) visibleRows += 1;
    }
    document.getElementById('documents-filter-empty').classList.toggle(
      'd-none',
      rows.length === 0 || visibleRows > 0,
    );
    document.getElementById('documents-empty').classList.toggle(
      'd-none',
      rows.length > 0 || documents.length > 0,
    );
  }

  function validateFile() {
    const file = fileInput.files?.[0];
    if (!file) {
      fileInput.setCustomValidity('');
      return;
    }
    let error = '';
    if (file.size < 1 || file.size > maximumFileSize) {
      error = 'Choose a file larger than 0 bytes and no larger than 20 MB.';
    } else if (!getSupportedMimeType(file)) {
      error = 'This file type is not supported. Choose a PDF, Office, text, CSV, JPEG, or PNG file.';
    }
    fileInput.setCustomValidity(error);
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

function formatFileSize(value) {
  return new Intl.NumberFormat(undefined, {
    style: 'unit',
    unit: 'byte',
    unitDisplay: 'short',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  const date = new Date(value);
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
