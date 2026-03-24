create table if not exists public.storefront_settings (
  store_id text primary key,
  site_config_public jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.storefront_home (
  store_id text primary key,
  home jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.storefront_meta (
  store_id text primary key,
  generated_at text not null,
  featured_slugs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.storefront_categories (
  store_id text not null,
  id text not null,
  position integer not null default 0,
  category jsonb not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, id)
);

create table if not exists public.storefront_products (
  store_id text not null,
  slug text not null,
  position integer not null default 0,
  product jsonb not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, slug)
);

create table if not exists public.storefront_admin_members (
  store_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'editor')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, user_id)
);

alter table public.storefront_settings enable row level security;
alter table public.storefront_home enable row level security;
alter table public.storefront_meta enable row level security;
alter table public.storefront_categories enable row level security;
alter table public.storefront_products enable row level security;
alter table public.storefront_admin_members enable row level security;

drop policy if exists "storefront_settings_public_read" on public.storefront_settings;
create policy "storefront_settings_public_read"
on public.storefront_settings
for select
to anon, authenticated
using (true);

drop policy if exists "storefront_home_public_read" on public.storefront_home;
create policy "storefront_home_public_read"
on public.storefront_home
for select
to anon, authenticated
using (true);

drop policy if exists "storefront_meta_public_read" on public.storefront_meta;
create policy "storefront_meta_public_read"
on public.storefront_meta
for select
to anon, authenticated
using (true);

drop policy if exists "storefront_categories_public_read" on public.storefront_categories;
create policy "storefront_categories_public_read"
on public.storefront_categories
for select
to anon, authenticated
using (true);

drop policy if exists "storefront_products_public_read" on public.storefront_products;
create policy "storefront_products_public_read"
on public.storefront_products
for select
to anon, authenticated
using (true);

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
  alter publication supabase_realtime add table public.storefront_settings;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.storefront_home;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.storefront_meta;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.storefront_categories;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.storefront_products;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.storefront_admin_members;
exception
  when duplicate_object then null;
end $$;

do $migration$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'storefront_states'
  ) then
    execute $sql$
      insert into public.storefront_settings (store_id, site_config_public, updated_at)
      select id, site_config_public, coalesce(updated_at, timezone('utc', now()))
      from public.storefront_states
      on conflict (store_id) do update
      set
        site_config_public = excluded.site_config_public,
        updated_at = excluded.updated_at
    $sql$;

    execute $sql$
      insert into public.storefront_home (store_id, home, updated_at)
      select id, storefront -> 'home', coalesce(updated_at, timezone('utc', now()))
      from public.storefront_states
      on conflict (store_id) do update
      set
        home = excluded.home,
        updated_at = excluded.updated_at
    $sql$;

    execute $sql$
      insert into public.storefront_meta (store_id, generated_at, featured_slugs, updated_at)
      select
        id,
        coalesce(storefront ->> 'generatedAt', timezone('utc', now())::text),
        coalesce(storefront -> 'featuredSlugs', '[]'::jsonb),
        coalesce(updated_at, timezone('utc', now()))
      from public.storefront_states
      on conflict (store_id) do update
      set
        generated_at = excluded.generated_at,
        featured_slugs = excluded.featured_slugs,
        updated_at = excluded.updated_at
    $sql$;

    execute $sql$
      insert into public.storefront_categories (store_id, id, position, category, updated_at)
      select
        state.id,
        category_entry.value ->> 'id',
        category_entry.ordinality - 1,
        category_entry.value,
        coalesce(state.updated_at, timezone('utc', now()))
      from public.storefront_states state
      cross join lateral jsonb_array_elements(state.storefront -> 'categories') with ordinality as category_entry(value, ordinality)
      on conflict (store_id, id) do update
      set
        position = excluded.position,
        category = excluded.category,
        updated_at = excluded.updated_at
    $sql$;

    execute $sql$
      insert into public.storefront_products (store_id, slug, position, product, updated_at)
      select
        state.id,
        product_entry.value ->> 'slug',
        product_entry.ordinality - 1,
        product_entry.value,
        coalesce(state.updated_at, timezone('utc', now()))
      from public.storefront_states state
      cross join lateral jsonb_array_elements(state.storefront -> 'products') with ordinality as product_entry(value, ordinality)
      on conflict (store_id, slug) do update
      set
        position = excluded.position,
        product = excluded.product,
        updated_at = excluded.updated_at
    $sql$;
  end if;
end
$migration$;
