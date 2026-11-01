import { supabase } from '../config/supabase.js';

export async function getApplications() {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id,
      customer_id,
      title,
      requested_amount,
      status,
      deadline,
      created_at,
      customer:customers(name),
      program:funding_programs(name, currency)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getApplicationOptions() {
  const [customersResult, programsResult] = await Promise.all([
    supabase.from('customers').select('id, name').order('name'),
    supabase
      .from('funding_programs')
      .select('id, name, max_amount, currency')
      .eq('is_active', true)
      .order('name'),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (programsResult.error) throw programsResult.error;

  return {
    customers: customersResult.data ?? [],
    programs: programsResult.data ?? [],
  };
}

export async function createApplication(application) {
  const { data, error } = await supabase
    .from('applications')
    .insert(application)
    .select('id')
    .single();

  if (error) throw error;
  return data;
}
