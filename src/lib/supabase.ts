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
let offlineUntil = 0;

export const markSupabaseOffline = (reason?: string) => {
  const wasOnline = offlineUntil === 0;
  offlineUntil = Date.now() + 30000; // Cooldown 30s
  if (wasOnline) {
    console.warn(`[Supabase Offline] Conexão indisponível (${reason || 'Failed to fetch'}). Operando em modo de dados locais por 30s.`);
  }
};

export const resetSupabaseOfflineStatus = () => {
  offlineUntil = 0;
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (Date.now() < offlineUntil) {
    return null; // Return null during offline cooldown to avoid console flood
  }

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
  resetSupabaseOfflineStatus();
};

export const clearSupabaseCredentials = () => {
  localStorage.removeItem('colegio_supabase_url');
  localStorage.removeItem('colegio_supabase_key');
  clientInstance = null;
  resetSupabaseOfflineStatus();
};

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseCredentials().isValid;
};
