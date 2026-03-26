import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

let publicSupabaseClient: SupabaseClient | null = null;
let adminSupabaseClient: SupabaseClient | null = null;
let customerSupabaseClient: SupabaseClient | null = null;

export const supabaseStoreId = import.meta.env.VITE_SUPABASE_STORE_ID?.trim() || 'default';
export const adminSupabaseStorageKey = `${supabaseStoreId}-admin-auth`;
export const customerSupabaseStorageKey = `${supabaseStoreId}-customer-auth`;

export function hasSupabaseSync() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getPublicSupabaseClient() {
  if (!hasSupabaseSync()) {
    return null;
  }

  if (!publicSupabaseClient) {
    publicSupabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return publicSupabaseClient;
}

export function getAdminSupabaseClient() {
  if (!hasSupabaseSync()) {
    return null;
  }

  if (!adminSupabaseClient) {
    adminSupabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storageKey: adminSupabaseStorageKey,
      },
    });
  }

  return adminSupabaseClient;
}

export function getCustomerSupabaseClient() {
  if (!hasSupabaseSync()) {
    return null;
  }

  if (!customerSupabaseClient) {
    customerSupabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storageKey: customerSupabaseStorageKey,
      },
    });
  }

  return customerSupabaseClient;
}

export function clearSupabaseStorageKey(storageKey: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(`${storageKey}-code-verifier`);
    window.sessionStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(`${storageKey}-code-verifier`);
  } catch {
    // Ignore storage cleanup failures.
  }
}
