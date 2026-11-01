import { supabase } from '../config/supabase.js';

export async function getCustomers() {
  const [customersResult, applicationsResult] = await Promise.all([
    supabase
      .from('customers')
      .select(`
        id,
        name,
        country,
        contact_name,
        contact_email,
        owner_id,
        owner:profiles(full_name)
      `)
      .order('name'),
    supabase.from('applications').select('customer_id'),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (applicationsResult.error) throw applicationsResult.error;

  const applicationCounts = new Map();
  for (const application of applicationsResult.data ?? []) {
    applicationCounts.set(
      application.customer_id,
      (applicationCounts.get(application.customer_id) ?? 0) + 1,
    );
  }

  return (customersResult.data ?? []).map((customer) => ({
    ...customer,
    application_count: applicationCounts.get(customer.id) ?? 0,
  }));
}

export async function createCustomer(customer) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select('id')
    .single();

  if (error) throw error;
  return data;
}
