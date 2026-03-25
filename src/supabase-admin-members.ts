import { getAdminSupabaseClient, hasSupabaseSync } from './supabase';

export interface AdminMemberRecord {
  userId: string;
  email: string | null;
  role: 'owner' | 'admin' | 'editor';
  createdAt: string;
  updatedAt: string;
}

interface AdminMembersFunctionResponse<T> {
  members?: T;
  member?: T;
  error?: string;
}

async function invokeAdminMembersFunction<T>(body: Record<string, unknown>) {
  const client = getAdminSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return null;
  }

  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;

  const { data, error } = await client.functions.invoke('admin-members', {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (error) {
    throw error;
  }

  return (data ?? null) as AdminMembersFunctionResponse<T> | null;
}

export async function fetchAdminMembers() {
  const payload = await invokeAdminMembersFunction<AdminMemberRecord[]>({
    action: 'list',
  });

  return payload?.members ?? [];
}

export async function addAdminMember(args: {
  emailOrUserId: string;
  role: AdminMemberRecord['role'];
}) {
  const payload = await invokeAdminMembersFunction<AdminMemberRecord>({
    action: 'add',
    emailOrUserId: args.emailOrUserId,
    role: args.role,
  });

  return payload?.member ?? null;
}

export async function updateAdminMemberRole(args: {
  userId: string;
  role: AdminMemberRecord['role'];
}) {
  const payload = await invokeAdminMembersFunction<AdminMemberRecord>({
    action: 'updateRole',
    userId: args.userId,
    role: args.role,
  });

  return payload?.member ?? null;
}

export async function removeAdminMember(userId: string) {
  await invokeAdminMembersFunction({
    action: 'remove',
    userId,
  });
}
