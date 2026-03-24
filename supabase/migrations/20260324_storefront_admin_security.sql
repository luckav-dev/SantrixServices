create table if not exists public.storefront_admin_members (
  store_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'editor')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, user_id)
);

alter table public.storefront_admin_members enable row level security;

drop policy if exists "storefront_admin_members_self_read" on public.storefront_admin_members;
create policy "storefront_admin_members_self_read"
on public.storefront_admin_members
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "storefront_settings_public_write" on public.storefront_settings;
drop policy if exists "storefront_home_public_write" on public.storefront_home;
drop policy if exists "storefront_meta_public_write" on public.storefront_meta;
drop policy if exists "storefront_categories_public_write" on public.storefront_categories;
drop policy if exists "storefront_products_public_write" on public.storefront_products;

drop policy if exists "storefront_settings_admin_write" on public.storefront_settings;
create policy "storefront_settings_admin_write"
on public.storefront_settings
for all
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_settings.store_id
      and admin_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_settings.store_id
      and admin_member.user_id = auth.uid()
  )
);

drop policy if exists "storefront_home_admin_write" on public.storefront_home;
create policy "storefront_home_admin_write"
on public.storefront_home
for all
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_home.store_id
      and admin_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_home.store_id
      and admin_member.user_id = auth.uid()
  )
);

drop policy if exists "storefront_meta_admin_write" on public.storefront_meta;
create policy "storefront_meta_admin_write"
on public.storefront_meta
for all
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_meta.store_id
      and admin_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_meta.store_id
      and admin_member.user_id = auth.uid()
  )
);

drop policy if exists "storefront_categories_admin_write" on public.storefront_categories;
create policy "storefront_categories_admin_write"
on public.storefront_categories
for all
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_categories.store_id
      and admin_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_categories.store_id
      and admin_member.user_id = auth.uid()
  )
);

drop policy if exists "storefront_products_admin_write" on public.storefront_products;
create policy "storefront_products_admin_write"
on public.storefront_products
for all
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_products.store_id
      and admin_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_products.store_id
      and admin_member.user_id = auth.uid()
  )
);

do $$
begin
  alter publication supabase_realtime add table public.storefront_admin_members;
exception
  when duplicate_object then null;
end $$;
