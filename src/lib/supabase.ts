import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get credentials from VITE environment or local storage
const getSupabaseCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem('colegio_supabase_url') || '';
  const storedKey = localStorage.getItem('colegio_supabase_key') || '';

  const url = storedUrl || envUrl;
  const key = storedKey || envKey;

  const isValid = Boolean(
    url && 
    key && 
    url !== 'https://your-supabase-project.supabase.co' && 
    !url.includes('your-supabase-project')
  );

  return { url, key, isValid };
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, key, isValid } = getSupabaseCredentials();
  if (!isValid) return null;

  if (!clientInstance) {
    try {
      clientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return clientInstance;
};

export const saveSupabaseCredentials = (url: string, key: string) => {
  localStorage.setItem('colegio_supabase_url', url.trim());
  localStorage.setItem('colegio_supabase_key', key.trim());
  clientInstance = null; // Reset instance to re-initialize
};

export const clearSupabaseCredentials = () => {
  localStorage.removeItem('colegio_supabase_url');
  localStorage.removeItem('colegio_supabase_key');
  clientInstance = null;
};

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseCredentials().isValid;
};
