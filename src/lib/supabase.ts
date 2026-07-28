import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get credentials from env vars or localStorage fallback
const getSupabaseCredentials = () => {
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('colegio_supabase_url') : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('colegio_supabase_key') : null;

  const url = customUrl || import.meta.env.VITE_SUPABASE_URL || '';
  const key = customKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const isValid = Boolean(
    url && 
    key && 
    url !== 'https://your-supabase-project.supabase.co' && 
    !url.includes('your-supabase-project')
  );

  return { url, key, isValid };
};

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('colegio_supabase_url', url);
    localStorage.setItem('colegio_supabase_key', key);
    clientInstance = null;
  }
};

export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('colegio_supabase_url');
    localStorage.removeItem('colegio_supabase_key');
    clientInstance = null;
  }
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

export const isSupabaseConfigured = (): boolean => {
  return getSupabaseCredentials().isValid;
};

