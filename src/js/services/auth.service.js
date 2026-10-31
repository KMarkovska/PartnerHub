import { supabase } from '../config/supabase.js';

export class InactiveProfileError extends Error {
  constructor() {
    super('This account is inactive. Contact your administrator for assistance.');
    this.name = 'InactiveProfileError';
  }
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(fullName, email, password) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getAuthenticatedProfile() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) {
    throw new Error('Your PartnerHub profile could not be found. Contact your administrator.');
  }
  if (!profile.is_active) throw new InactiveProfileError();
  if (profile.role !== 'admin' && profile.role !== 'user') {
    throw new Error('Your account has an unsupported access role. Contact your administrator.');
  }

  return { user: userData.user, profile };
}
