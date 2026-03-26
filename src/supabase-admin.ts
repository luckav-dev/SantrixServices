import type { AuthChangeEvent, RealtimeChannel, Session } from '@supabase/supabase-js';
import { getAdminSupabaseClient, hasSupabaseSync, supabaseStoreId } from './supabase';

const ADMIN_TABLE = 'storefront_admin_members';

export interface RemoteAdminSession {
  userId: string;
  email: string;
  role: string;
  loggedInAt: string;
}

interface AdminMembershipRow {
  store_id: string;
  user_id: string;
  role: string;
}

function getProviderLabel(provider: 'google' | 'discord') {
  return provider === 'google' ? 'Google' : 'Discord';
}

function normalizeOAuthProviderError(provider: 'google' | 'discord', message: string) {
  if (/provider is not enabled|unsupported provider/i.test(message)) {
    return `${getProviderLabel(provider)} no está habilitado en Supabase Auth. Actívalo en Authentication > Providers y añade tu URL de callback del admin.`;
  }

  if (/redirect/i.test(message) && /url/i.test(message)) {
    return `La redirección de ${getProviderLabel(provider)} no está bien configurada. Revisa las Redirect URLs del admin en Supabase Auth.`;
  }

  return message;
}

async function fetchMembership(userId: string, email: string | null) {
  const client = getAdminSupabaseClient();
  if (!client || !email) {
    return null;
  }

  const { data, error } = await client
    .from(ADMIN_TABLE)
    .select('store_id, user_id, role')
    .eq('store_id', supabaseStoreId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const membership = data as AdminMembershipRow;

  return {
    userId,
    email,
    role: membership.role,
    loggedInAt: new Date().toISOString(),
  } satisfies RemoteAdminSession;
}

export async function signInAdminWithPassword(email: string, password: string) {
  const client = getAdminSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  const member = await fetchMembership(data.user.id, data.user.email ?? null);
  if (!member) {
    await client.auth.signOut();
    throw new Error('Este usuario no tiene acceso al dashboard para esta tienda.');
  }

  return member;
}

export async function signInAdminWithOAuth(provider: 'google' | 'discord', redirectTo: string) {
  const client = getAdminSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw new Error(normalizeOAuthProviderError(provider, error.message));
  }

  if (!data?.url) {
    throw new Error(`Supabase no devolvió una URL de acceso para ${getProviderLabel(provider)}.`);
  }

  return {
    url: data.url,
  };
}

export async function restoreRemoteAdminSession() {
  const client = getAdminSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return null;
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  const session = sessionData.session;
  if (!session?.user) {
    return null;
  }

  return fetchMembership(session.user.id, session.user.email ?? null);
}

export async function signOutRemoteAdmin() {
  const client = getAdminSupabaseClient();
  if (!client) {
    return;
  }

  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

export function subscribeToRemoteAdminSession(
  onChange: (session: RemoteAdminSession | null) => void,
) {
  const client = getAdminSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return () => undefined;
  }

  const { data } = client.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    window.setTimeout(() => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        onChange(null);
        return;
      }

      void fetchMembership(session.user.id, session.user.email ?? null)
        .then((membership) => {
          onChange(membership);
        })
        .catch((error) => {
          console.error('Failed to resolve Supabase admin membership.', error);
          onChange(null);
        });
    }, 0);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export function subscribeToAdminMembershipChanges(onChange: () => void) {
  const client = getAdminSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return () => undefined;
  }

  const channel: RealtimeChannel = client
    .channel(`storefront-admin-members:${supabaseStoreId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: ADMIN_TABLE,
        filter: `store_id=eq.${supabaseStoreId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
