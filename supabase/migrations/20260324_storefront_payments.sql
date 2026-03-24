alter table public.storefront_orders
  add column if not exists provider_order_id text;

alter table public.storefront_orders
  add column if not exists provider_checkout_url text;

alter table public.storefront_orders
  add column if not exists provider_status text;

alter table public.storefront_orders
  add column if not exists provider_reference text;

alter table public.storefront_orders
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb;

alter table public.storefront_orders
  add column if not exists paid_at timestamptz;

alter table public.storefront_orders
  add column if not exists cancelled_at timestamptz;

create unique index if not exists storefront_orders_provider_order_idx
  on public.storefront_orders (store_id, provider, provider_order_id)
  where provider_order_id is not null;

create table if not exists public.storefront_payment_events (
  id bigint generated always as identity primary key,
  store_id text not null,
  order_id bigint references public.storefront_orders(id) on delete set null,
  provider text not null,
  event_type text not null,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists storefront_payment_events_provider_event_idx
  on public.storefront_payment_events (provider, provider_event_id)
  where provider_event_id is not null;

create index if not exists storefront_payment_events_store_idx
  on public.storefront_payment_events (store_id, created_at desc);

alter table public.storefront_payment_events enable row level security;

drop policy if exists "storefront_payment_events_admin_read" on public.storefront_payment_events;
create policy "storefront_payment_events_admin_read"
on public.storefront_payment_events
for select
to authenticated
using (
  exists (
    select 1
    from public.storefront_admin_members admin_member
    where admin_member.store_id = storefront_payment_events.store_id
      and admin_member.user_id = auth.uid()
  )
);

do $$
begin
  alter publication supabase_realtime add table public.storefront_payment_events;
exception
  when duplicate_object then null;
end $$;
