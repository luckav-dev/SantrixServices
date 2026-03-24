create table if not exists public.storefront_customers (
  store_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  provider text not null default 'supabase',
  is_anonymous boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (store_id, user_id)
);

create table if not exists public.storefront_orders (
  id bigint generated always as identity primary key,
  store_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_email text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  provider text not null default 'supabase-demo',
  currency text not null,
  subtotal_eur numeric(10, 2) not null default 0,
  tax_eur numeric(10, 2) not null default 0,
  total_eur numeric(10, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.storefront_order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.storefront_orders(id) on delete cascade,
  store_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_slug text not null,
  product_title text not null,
  product_image text,
  quantity integer not null check (quantity > 0),
  unit_price_eur numeric(10, 2) not null default 0,
  subtotal_eur numeric(10, 2) not null default 0,
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists storefront_orders_store_user_idx
  on public.storefront_orders (store_id, user_id, created_at desc);

create index if not exists storefront_order_items_order_idx
  on public.storefront_order_items (order_id);

alter table public.storefront_customers enable row level security;
alter table public.storefront_orders enable row level security;
alter table public.storefront_order_items enable row level security;

drop policy if exists "storefront_customers_self_read" on public.storefront_customers;
create policy "storefront_customers_self_read"
on public.storefront_customers
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "storefront_customers_self_insert" on public.storefront_customers;
create policy "storefront_customers_self_insert"
on public.storefront_customers
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "storefront_customers_self_update" on public.storefront_customers;
create policy "storefront_customers_self_update"
on public.storefront_customers
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "storefront_customers_admin_read" on public.storefront_customers;
create policy "storefront_customers_admin_read"
on public.storefront_customers
for select
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_customers.store_id
      and admin_member.user_id = auth.uid()
  )
);

drop policy if exists "storefront_orders_self_read" on public.storefront_orders;
create policy "storefront_orders_self_read"
on public.storefront_orders
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "storefront_orders_self_insert" on public.storefront_orders;
create policy "storefront_orders_self_insert"
on public.storefront_orders
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "storefront_orders_admin_read" on public.storefront_orders;
create policy "storefront_orders_admin_read"
on public.storefront_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_orders.store_id
      and admin_member.user_id = auth.uid()
  )
);

drop policy if exists "storefront_order_items_self_read" on public.storefront_order_items;
create policy "storefront_order_items_self_read"
on public.storefront_order_items
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "storefront_order_items_self_insert" on public.storefront_order_items;
create policy "storefront_order_items_self_insert"
on public.storefront_order_items
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.storefront_orders orders_row
    where orders_row.id = storefront_order_items.order_id
      and orders_row.user_id = auth.uid()
      and orders_row.store_id = storefront_order_items.store_id
  )
);

drop policy if exists "storefront_order_items_admin_read" on public.storefront_order_items;
create policy "storefront_order_items_admin_read"
on public.storefront_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_order_items.store_id
      and admin_member.user_id = auth.uid()
  )
);

do $$
begin
  alter publication supabase_realtime add table public.storefront_customers;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.storefront_orders;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.storefront_order_items;
exception
  when duplicate_object then null;
end $$;
