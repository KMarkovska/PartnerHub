import { supabase } from '../config/supabase.js';

const bucketName = 'partnerhub-documents';
const maximumFileSize = 20 * 1024 * 1024;
const mimeTypesByExtension = {
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  pdf: 'application/pdf',
  png: 'image/png',
  txt: 'text/plain',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
const allowedMimeTypes = new Set(Object.values(mimeTypesByExtension));

export async function getDocuments() {
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, application_id, project_id, uploaded_by, file_name, storage_path, file_type, file_size, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const applicationIds = [...new Set(
    (documents ?? []).map((document) => document.application_id).filter(Boolean),
  )];
  const projectIds = [...new Set(
    (documents ?? []).map((document) => document.project_id).filter(Boolean),
  )];
  const uploaderIds = [...new Set(
    (documents ?? []).map((document) => document.uploaded_by).filter(Boolean),
  )];
  const [applications, projects, uploaders] = await Promise.all([
    getRecordsByIds('applications', applicationIds, 'id, title'),
    getRecordsByIds('projects', projectIds, 'id, name'),
    getRecordsByIds('profiles', uploaderIds, 'id, full_name'),
  ]);
  const applicationNames = new Map(applications.map((application) => [application.id, application.title]));
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const uploaderNames = new Map(uploaders.map((uploader) => [uploader.id, uploader.full_name]));

  return (documents ?? []).map((document) => ({
    ...document,
    parent_type: document.application_id ? 'application' : 'project',
    parent_name: document.application_id
      ? applicationNames.get(document.application_id) ?? 'Application'
      : projectNames.get(document.project_id) ?? 'Project',
    uploader_name: uploaderNames.get(document.uploaded_by)?.trim() || 'PartnerHub user',
  }));
}

export async function getDocumentParents() {
  const [applicationsResult, projectsResult] = await Promise.all([
    supabase.from('applications').select('id, title').order('title'),
    supabase.from('projects').select('id, name').order('name'),
  ]);

  if (applicationsResult.error) throw applicationsResult.error;
  if (projectsResult.error) throw projectsResult.error;

  return {
    applications: applicationsResult.data ?? [],
    projects: projectsResult.data ?? [],
  };
}

export function getSupportedMimeType(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const extensionType = extension ? mimeTypesByExtension[extension] : null;
  if (extensionType) return extensionType;
  return allowedMimeTypes.has(file.type) ? file.type : null;
}

export async function uploadDocument(file, parent, userId) {
  if (!(file instanceof File) || file.size < 1 || file.size > maximumFileSize) {
    throw new Error('Choose a file larger than 0 bytes and no larger than 20 MB.');
  }

  const fileType = getSupportedMimeType(file);
  if (!fileType) {
    throw new Error('This file type is not supported. Choose a PDF, Office, text, CSV, JPEG, or PNG file.');
  }

  const documentId = crypto.randomUUID();
  const fileName = sanitizeFileName(file.name);
  const storagePath = `${userId}/${parent.type}s/${parent.id}/${documentId}/${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, file, { contentType: fileType, upsert: false });

  if (uploadError) throw uploadError;

  const metadata = {
    id: documentId,
    application_id: parent.type === 'application' ? parent.id : null,
    project_id: parent.type === 'project' ? parent.id : null,
    uploaded_by: userId,
    file_name: fileName,
    storage_path: storagePath,
    file_type: fileType,
    file_size: file.size,
  };
  const { error: metadataError } = await supabase.from('documents').insert(metadata);
  if (metadataError) {
    throw new Error(
      `The file was uploaded, but its document record could not be saved. Contact an administrator to clean up the incomplete upload before retrying. ${metadataError.message}`,
    );
  }
}

export async function downloadDocument(storagePath, fileName) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(storagePath, { download: fileName });

  if (error) throw error;
  return data;
}

async function getRecordsByIds(tableName, ids, columns) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from(tableName)
    .select(columns)
    .in('id', ids);
  if (error) throw error;
  return data ?? [];
}

function sanitizeFileName(fileName) {
  const sanitized = fileName
    .replace(/[\\/\u0000-\u001f\u007f]/g, '_')
    .replace(/\.{2,}/g, '.')
    .trim();
  return sanitized || 'document';
}
