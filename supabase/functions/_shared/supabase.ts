import { createClient } from 'npm:@supabase/supabase-js@2';

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getStoreId() {
  return (
    Deno.env.get('SUPABASE_STORE_ID')?.trim() ||
    Deno.env.get('VITE_SUPABASE_STORE_ID')?.trim() ||
    'default'
  );
}

export function getServiceSupabaseClient() {
  return createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export function getRequestSupabaseClient(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';

  return createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_ANON_KEY'),
    {
      global: authorization ? { headers: { Authorization: authorization } } : undefined,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

export async function requireAuthenticatedUser(request: Request) {
  const client = getRequestSupabaseClient(request);
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Necesitas una sesión válida para iniciar el checkout.');
  }

  return data.user;
}
