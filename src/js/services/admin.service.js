import { supabase } from '../config/supabase.js';

async function getCount(query, description) {
  const { count, error } = await query;
  if (error) throw error;
  if (count === null) throw new Error(`Could not retrieve ${description}.`);
  return count;
}

export async function getAdministrationMetrics() {
  const [
    totalUsers,
    activeUsers,
    totalCustomers,
    totalApplications,
    awaitingReview,
    approvedApplications,
    totalProjects,
  ] = await Promise.all([
    getCount(supabase.from('profiles').select('id', { count: 'exact', head: true }), 'total users'),
    getCount(supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true), 'active users'),
    getCount(supabase.from('customers').select('id', { count: 'exact', head: true }), 'customers'),
    getCount(supabase.from('applications').select('id', { count: 'exact', head: true }), 'applications'),
    getCount(
      supabase.from('applications').select('id', { count: 'exact', head: true })
        .in('status', ['Submitted', 'Under Review']),
      'applications awaiting review',
    ),
    getCount(
      supabase.from('applications').select('id', { count: 'exact', head: true })
        .eq('status', 'Approved'),
      'approved applications',
    ),
    getCount(supabase.from('projects').select('id', { count: 'exact', head: true }), 'projects'),
  ]);

  return {
    totalUsers,
    activeUsers,
    totalCustomers,
    totalApplications,
    awaitingReview,
    approvedApplications,
    totalProjects,
  };
}

export async function getAdministrationUsers() {
  const { data, error } = await supabase.rpc('admin_list_profiles');
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('The administrator user list returned an unexpected response.');
  return data;
}

export async function setUserAccess(profileId, role, isActive) {
  if (!profileId || !['admin', 'user'].includes(role) || typeof isActive !== 'boolean') {
    throw new Error('Select a valid role and account status.');
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (data.user?.id === profileId) {
    throw new Error('You cannot change your own account access.');
  }

  const { error } = await supabase.rpc('set_profile_access', {
    target_profile_id: profileId,
    target_role: role,
    target_is_active: isActive,
  });
  if (error) throw error;
}
