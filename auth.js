import { supabase } from './supabase.js';

export async function signIn(email, password) {
  if (!supabase) return { user: null, error: { message: 'Configure o Supabase em config.js.' } };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data?.user || null, error };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
  location.href = 'index.html';
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export function onAuthChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) location.href = 'admin.html#login';
  return session;
}

export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}
