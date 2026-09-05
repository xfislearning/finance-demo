import { getStoredSession, passwordSignIn, logoutSession, invokeFunction, restSelect, supabaseConfigured } from './supabaseClient';

export async function getCurrentSession() {
  if (!supabaseConfigured) return null;
  const session = await getStoredSession();
  return session?.access_token ? session : null;
}

export async function getWorkspaceForUser() {
  if (!supabaseConfigured) return null;
  const rows = await restSelect('organization_members?select=organization_id,role,organizations(id,company_name,country_code)&limit=1');
  const data = rows?.[0];
  if (!data) return null;
  const org = data.organizations;
  return {
    organizationId: data.organization_id,
    role: data.role,
    companyName: org?.company_name || 'My Company',
    country: org?.country_code || 'US'
  };
}

export async function signIn(email, password) { return passwordSignIn(email, password); }
export async function signOut() { return logoutSession(); }

export async function getCaptchaChallenge() {
  const data = await invokeFunction('account-signup', { action: 'challenge' });
  if (!data?.challenge_id || !data?.question) throw new Error('Could not create human verification challenge.');
  return data;
}

export async function createWorkspaceAccount(form) {
  const data = await invokeFunction('account-signup', {
    action: 'signup',
    first_name: form.firstName,
    last_name: form.lastName,
    company_name: form.companyName,
    email: form.email,
    password: form.password,
    country_code: form.country,
    challenge_id: form.challengeId,
    challenge_answer: form.challengeAnswer,
    website: form.website || ""
  });
  if (!data?.ok) throw new Error(data?.error || 'Account creation failed.');
  return data;
}
