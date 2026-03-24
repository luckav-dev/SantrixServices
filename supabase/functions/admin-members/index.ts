import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  getRequestSupabaseClient,
  getServiceSupabaseClient,
  getStoreId,
} from '../_shared/supabase.ts';

type AdminRole = 'owner' | 'admin' | 'editor';

interface MembershipRow {
  store_id: string;
  user_id: string;
  role: AdminRole;
  created_at: string;
  updated_at: string;
}

function normalizeRole(value: unknown): AdminRole {
  if (value === 'owner' || value === 'admin' || value === 'editor') {
    return value;
  }

  return 'editor';
}

async function requireMembership(request: Request) {
  const requestClient = getRequestSupabaseClient(request);
  const { data: userData, error: userError } = await requestClient.auth.getUser();
  if (userError) {
    throw userError;
  }

  const user = userData.user;
  if (!user) {
    throw new Error('Necesitas una sesión admin válida.');
  }

  const adminClient = getServiceSupabaseClient();
  const storeId = getStoreId();
  const { data: membership, error: membershipError } = await adminClient
    .from('storefront_admin_members')
    .select('store_id, user_id, role, created_at, updated_at')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    throw new Error('Este usuario no pertenece al panel de esta tienda.');
  }

  return {
    user,
    adminClient,
    storeId,
    membership: membership as MembershipRow,
  };
}

async function listAuthUsersByIds(adminClient: ReturnType<typeof getServiceSupabaseClient>, ids: string[]) {
  const resolved = new Map<string, string | null>();
  let page = 1;
  const perPage = 500;

  while (ids.some((id) => !resolved.has(id))) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data.users ?? [];
    if (!users.length) {
      break;
    }

    for (const authUser of users) {
      if (ids.includes(authUser.id)) {
        resolved.set(authUser.id, authUser.email ?? null);
      }
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return resolved;
}

async function findAuthUserByEmailOrId(
  adminClient: ReturnType<typeof getServiceSupabaseClient>,
  emailOrUserId: string,
) {
  const query = emailOrUserId.trim().toLowerCase();
  if (!query) {
    return null;
  }

  let page = 1;
  const perPage = 500;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data.users ?? [];
    const match = users.find(
      (authUser) =>
        authUser.id === emailOrUserId.trim() ||
        authUser.email?.toLowerCase() === query,
    );

    if (match) {
      return match;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function listMembers(adminClient: ReturnType<typeof getServiceSupabaseClient>, storeId: string) {
  const { data, error } = await adminClient
    .from('storefront_admin_members')
    .select('store_id, user_id, role, created_at, updated_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as MembershipRow[];
  const emailMap = await listAuthUsersByIds(
    adminClient,
    rows.map((row) => row.user_id),
  );

  return rows.map((row) => ({
    userId: row.user_id,
    email: emailMap.get(row.user_id) ?? null,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function countOwners(adminClient: ReturnType<typeof getServiceSupabaseClient>, storeId: string) {
  const { count, error } = await adminClient
    .from('storefront_admin_members')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('role', 'owner');

  if (error) {
    throw error;
  }

  return count ?? 0;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { adminClient, membership, storeId } = await requireMembership(request);
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      emailOrUserId?: string;
      userId?: string;
      role?: AdminRole;
    };

    if (body.action === 'list') {
      const members = await listMembers(adminClient, storeId);
      return jsonResponse({ members });
    }

    if (membership.role !== 'owner') {
      return jsonResponse(
        { error: 'Solo el owner puede gestionar miembros del dashboard.' },
        403,
      );
    }

    if (body.action === 'add') {
      const lookup = body.emailOrUserId?.trim() ?? '';
      if (!lookup) {
        return jsonResponse({ error: 'Falta el email o user id del admin.' }, 400);
      }

      const authUser = await findAuthUserByEmailOrId(adminClient, lookup);
      if (!authUser) {
        return jsonResponse(
          {
            error:
              'No existe una cuenta de Supabase Auth con ese email o user id. Crea primero el usuario en Auth.',
          },
          404,
        );
      }

      const timestamp = new Date().toISOString();
      const { error } = await adminClient.from('storefront_admin_members').upsert(
        {
          store_id: storeId,
          user_id: authUser.id,
          role: normalizeRole(body.role),
          updated_at: timestamp,
        },
        { onConflict: 'store_id,user_id' },
      );

      if (error) {
        throw error;
      }

      return jsonResponse({
        member: {
          userId: authUser.id,
          email: authUser.email ?? null,
          role: normalizeRole(body.role),
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });
    }

    if (body.action === 'updateRole') {
      const userId = body.userId?.trim() ?? '';
      if (!userId) {
        return jsonResponse({ error: 'Falta el user id del miembro.' }, 400);
      }

      const nextRole = normalizeRole(body.role);
      const { data: currentMember, error: currentMemberError } = await adminClient
        .from('storefront_admin_members')
        .select('store_id, user_id, role, created_at, updated_at')
        .eq('store_id', storeId)
        .eq('user_id', userId)
        .maybeSingle();

      if (currentMemberError) {
        throw currentMemberError;
      }

      if (!currentMember) {
        return jsonResponse({ error: 'No se encontró ese miembro.' }, 404);
      }

      if (currentMember.role === 'owner' && nextRole !== 'owner') {
        const owners = await countOwners(adminClient, storeId);
        if (owners <= 1) {
          return jsonResponse(
            { error: 'No puedes dejar la tienda sin al menos un owner.' },
            409,
          );
        }
      }

      const timestamp = new Date().toISOString();
      const { error } = await adminClient
        .from('storefront_admin_members')
        .update({
          role: nextRole,
          updated_at: timestamp,
        })
        .eq('store_id', storeId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      const authUser = await findAuthUserByEmailOrId(adminClient, userId);
      return jsonResponse({
        member: {
          userId,
          email: authUser?.email ?? null,
          role: nextRole,
          createdAt: currentMember.created_at,
          updatedAt: timestamp,
        },
      });
    }

    if (body.action === 'remove') {
      const userId = body.userId?.trim() ?? '';
      if (!userId) {
        return jsonResponse({ error: 'Falta el user id del miembro.' }, 400);
      }

      const { data: currentMember, error: currentMemberError } = await adminClient
        .from('storefront_admin_members')
        .select('role')
        .eq('store_id', storeId)
        .eq('user_id', userId)
        .maybeSingle();

      if (currentMemberError) {
        throw currentMemberError;
      }

      if (!currentMember) {
        return jsonResponse({ error: 'No se encontró ese miembro.' }, 404);
      }

      if (currentMember.role === 'owner') {
        const owners = await countOwners(adminClient, storeId);
        if (owners <= 1) {
          return jsonResponse(
            { error: 'No puedes eliminar el último owner del panel.' },
            409,
          );
        }
      }

      const { error } = await adminClient
        .from('storefront_admin_members')
        .delete()
        .eq('store_id', storeId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: 'Unsupported admin-members action.' }, 400);
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected admin members failure.',
      },
      500,
    );
  }
});
