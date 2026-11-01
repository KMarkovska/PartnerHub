import { supabase } from '../config/supabase.js';

const programColumns = 'id, name, description, max_amount, currency, eligibility_information, is_active, created_at';

export async function getFundingPrograms() {
  const { data, error } = await supabase
    .from('funding_programs')
    .select(programColumns)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function createFundingProgram(program) {
  const { data, error } = await supabase
    .from('funding_programs')
    .insert(program)
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export async function updateFundingProgram(programId, changes) {
  const { data, error } = await supabase
    .from('funding_programs')
    .update(changes)
    .eq('id', programId)
    .select('id')
    .single();

  if (error) throw error;
  return data;
}
