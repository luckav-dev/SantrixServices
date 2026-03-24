create table if not exists public.storefront_public_order_feed (
  order_id bigint primary key references public.storefront_orders(id) on delete cascade,
  store_id text not null,
  customer_label text not null,
  total_eur numeric(10, 2) not null default 0,
  currency text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.storefront_reviews (
  id bigint generated always as identity primary key,
  store_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id bigint references public.storefront_orders(id) on delete set null,
  product_slug text not null,
  product_title text not null,
  rating integer not null check (rating between 1 and 5),
  quote text not null check (char_length(trim(quote)) between 10 and 800),
  display_name text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (store_id, user_id, product_slug)
);

create index if not exists storefront_public_order_feed_store_idx
  on public.storefront_public_order_feed (store_id, created_at desc);

create index if not exists storefront_reviews_store_idx
  on public.storefront_reviews (store_id, created_at desc);

create index if not exists storefront_reviews_product_idx
  on public.storefront_reviews (store_id, product_slug, created_at desc);

alter table public.storefront_public_order_feed enable row level security;
alter table public.storefront_reviews enable row level security;

drop policy if exists "storefront_public_order_feed_public_read" on public.storefront_public_order_feed;
create policy "storefront_public_order_feed_public_read"
on public.storefront_public_order_feed
for select
to anon, authenticated
using (true);

drop policy if exists "storefront_public_order_feed_self_insert" on public.storefront_public_order_feed;
create policy "storefront_public_order_feed_self_insert"
on public.storefront_public_order_feed
for insert
to authenticated
with check (
  exists (
    select 1
    from public.storefront_orders orders_row
    where orders_row.id = storefront_public_order_feed.order_id
      and orders_row.store_id = storefront_public_order_feed.store_id
      and orders_row.user_id = auth.uid()
  )
);

drop policy if exists "storefront_reviews_public_read" on public.storefront_reviews;
create policy "storefront_reviews_public_read"
on public.storefront_reviews
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "storefront_reviews_self_read" on public.storefront_reviews;
create policy "storefront_reviews_self_read"
on public.storefront_reviews
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "storefront_reviews_self_insert" on public.storefront_reviews;
create policy "storefront_reviews_self_insert"
on public.storefront_reviews
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.storefront_order_items order_items
    join public.storefront_orders orders_row
      on orders_row.id = order_items.order_id
    where order_items.store_id = storefront_reviews.store_id
      and order_items.user_id = auth.uid()
      and order_items.product_slug = storefront_reviews.product_slug
      and orders_row.status = 'completed'
  )
);

drop policy if exists "storefront_reviews_self_update" on public.storefront_reviews;
create policy "storefront_reviews_self_update"
on public.storefront_reviews
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.storefront_order_items order_items
    join public.storefront_orders orders_row
      on orders_row.id = order_items.order_id
    where order_items.store_id = storefront_reviews.store_id
      and order_items.user_id = auth.uid()
      and order_items.product_slug = storefront_reviews.product_slug
      and orders_row.status = 'completed'
  )
);

drop policy if exists "storefront_reviews_admin_read" on public.storefront_reviews;
create policy "storefront_reviews_admin_read"
on public.storefront_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_reviews.store_id
      and admin_member.user_id = auth.uid()
  )
);

drop policy if exists "storefront_reviews_admin_update" on public.storefront_reviews;
create policy "storefront_reviews_admin_update"
on public.storefront_reviews
for update
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_reviews.store_id
      and admin_member.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_reviews.store_id
      and admin_member.user_id = auth.uid()
  )
);

create or replace view public.storefront_public_metrics as
with order_stats as (
  select
    store_id,
    count(*)::integer as sales_count,
    coalesce(sum(total_eur), 0)::numeric(12, 2) as revenue_eur
  from public.storefront_public_order_feed
  group by store_id
),
review_stats as (
  select
    store_id,
    count(*)::integer as reviews_count,
    coalesce(avg(rating), 0)::numeric(5, 2) as average_rating
  from public.storefront_reviews
  where is_published = true
  group by store_id
)
select
  coalesce(order_stats.store_id, review_stats.store_id) as store_id,
  coalesce(order_stats.sales_count, 0) as sales_count,
  coalesce(order_stats.revenue_eur, 0)::numeric(12, 2) as revenue_eur,
  coalesce(review_stats.reviews_count, 0) as reviews_count,
  coalesce(review_stats.average_rating, 0)::numeric(5, 2) as average_rating
from order_stats
full join review_stats
  on review_stats.store_id = order_stats.store_id;

do $$
begin
  alter publication supabase_realtime add table public.storefront_public_order_feed;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.storefront_reviews;
exception
  when duplicate_object then null;
end $$;
