create table if not exists public.storefront_customer_identities (
  id bigint generated always as identity primary key,
  store_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'discord', 'fivem')),
  provider_user_id text,
  provider_username text not null,
  metadata jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (store_id, user_id, provider)
);

create index if not exists storefront_customer_identities_store_idx
  on public.storefront_customer_identities (store_id, user_id, provider);

alter table public.storefront_customer_identities enable row level security;

drop policy if exists "storefront_customer_identities_self_read" on public.storefront_customer_identities;
create policy "storefront_customer_identities_self_read"
on public.storefront_customer_identities
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "storefront_customer_identities_self_insert" on public.storefront_customer_identities;
create policy "storefront_customer_identities_self_insert"
on public.storefront_customer_identities
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "storefront_customer_identities_self_update" on public.storefront_customer_identities;
create policy "storefront_customer_identities_self_update"
on public.storefront_customer_identities
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "storefront_customer_identities_admin_read" on public.storefront_customer_identities;
create policy "storefront_customer_identities_admin_read"
on public.storefront_customer_identities
for select
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_customer_identities.store_id
      and admin_member.user_id = auth.uid()
  )
);

do $$
begin
  alter publication supabase_realtime add table public.storefront_customer_identities;
exception
  when duplicate_object then null;
end $$;
