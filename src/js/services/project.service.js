import { supabase } from '../config/supabase.js';

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      application_id,
      customer_id,
      owner_id,
      name,
      status,
      start_date,
      end_date,
      progress,
      customer:customers(name),
      owner:profiles(full_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getApprovedApplications() {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id,
      title,
      customer_id,
      owner_id,
      customer:customers(name)
    `)
    .eq('status', 'Approved')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createProject(project) {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(projectId, changes) {
  const { data, error } = await supabase
    .from('projects')
    .update(changes)
    .eq('id', projectId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Project was not updated. It may no longer be accessible.');
  }
}
