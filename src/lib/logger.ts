import { supabase } from './supabase';

export async function logAction(
  action: string,
  details: Record<string, unknown> = {},
  userId?: string
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    await supabase.from('system_logs').insert({
      user_id: userId || session?.user?.id || null,
      action,
      details,
      ip_address: null,
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

export const LogActions = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  CREATE_LOCATION: 'CREATE_LOCATION',
  UPDATE_LOCATION: 'UPDATE_LOCATION',
  DELETE_LOCATION: 'DELETE_LOCATION',
  CREATE_REGION: 'CREATE_REGION',
  UPDATE_REGION: 'UPDATE_REGION',
  DELETE_REGION: 'DELETE_REGION',
  CREATE_ISG_EXPERT: 'CREATE_ISG_EXPERT',
  UPDATE_ISG_EXPERT: 'UPDATE_ISG_EXPERT',
  DELETE_ISG_EXPERT: 'DELETE_ISG_EXPERT',
  CREATE_NEARMISS: 'CREATE_NEARMISS',
  UPDATE_NEARMISS: 'UPDATE_NEARMISS',
  DELETE_NEARMISS: 'DELETE_NEARMISS',
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  DOWNLOAD_BACKUP: 'DOWNLOAD_BACKUP',
} as const;
