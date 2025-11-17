import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'isg_expert' | 'viewer';
  is_active: boolean;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error('Kullanıcı profili bulunamadı');
  if (!profile.is_active) throw new Error('Kullanıcı hesabı aktif değil');

  return { user: data.user, profile };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signUp(
  email: string,
  password: string,
  full_name: string,
  role: 'admin' | 'isg_expert' | 'viewer' = 'viewer'
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Kullanıcı oluşturulamadı');

  const { error: profileError } = await supabase.from('users').insert({
    id: data.user.id,
    email,
    full_name,
    role,
    is_active: true,
  });

  if (profileError) throw profileError;

  return data.user;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) return null;

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || !profile) return null;

  return profile as UserProfile;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

export function onAuthStateChange(callback: (user: UserProfile | null) => void) {
  supabase.auth.onAuthStateChange((event, session) => {
    (async () => {
      if (session?.user) {
        const profile = await getCurrentUser();
        callback(profile);
      } else {
        callback(null);
      }
    })();
  });
}
