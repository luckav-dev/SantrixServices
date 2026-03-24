import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  getAdminSupabaseClient,
  hasSupabaseSync,
  supabaseStoreId,
} from './supabase';

const CUSTOMER_TABLE = 'storefront_customers';
const ORDER_TABLE = 'storefront_orders';
const ORDER_ITEM_TABLE = 'storefront_order_items';

export interface AdminCustomerRecord {
  userId: string;
  displayName: string;
  email: string | null;
  isAnonymous: boolean;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderItemRecord {
  orderId: string;
  productSlug: string;
  productTitle: string;
  quantity: number;
  subtotalEur: number;
}

export interface AdminOrderRecord {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string | null;
  status: string;
  provider: string;
  providerStatus: string | null;
  providerOrderId: string | null;
  providerReference: string | null;
  currency: string;
  subtotalEur: number;
  taxEur: number;
  totalEur: number;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: AdminOrderItemRecord[];
}

export interface AdminCommerceSnapshot {
  customers: AdminCustomerRecord[];
  orders: AdminOrderRecord[];
}

interface CustomerRow {
  user_id: string;
  display_name: string;
  email: string | null;
  is_anonymous: boolean;
  provider: string;
  created_at: string;
  updated_at: string;
}

interface OrderRow {
  id: number | string;
  user_id: string;
  customer_name: string;
  customer_email: string | null;
  status: string;
  provider: string;
  provider_status: string | null;
  provider_order_id: string | null;
  provider_reference: string | null;
  currency: string;
  subtotal_eur: number;
  tax_eur: number;
  total_eur: number;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItemRow {
  order_id: number | string;
  product_slug: string;
  product_title: string;
  quantity: number;
  subtotal_eur: number;
}

export async function fetchAdminCommerceSnapshot() {
  const client = getAdminSupabaseClient();
  if (!client) {
    return {
      customers: [],
      orders: [],
    } satisfies AdminCommerceSnapshot;
  }

  const [customersResponse, ordersResponse, orderItemsResponse] = await Promise.all([
    client
      .from(CUSTOMER_TABLE)
      .select('user_id, display_name, email, is_anonymous, provider, created_at, updated_at')
      .eq('store_id', supabaseStoreId)
      .order('updated_at', { ascending: false })
      .limit(50),
    client
      .from(ORDER_TABLE)
      .select('id, user_id, customer_name, customer_email, status, provider, provider_status, provider_order_id, provider_reference, currency, subtotal_eur, tax_eur, total_eur, paid_at, cancelled_at, created_at, updated_at')
      .eq('store_id', supabaseStoreId)
      .order('created_at', { ascending: false })
      .limit(50),
    client
      .from(ORDER_ITEM_TABLE)
      .select('order_id, product_slug, product_title, quantity, subtotal_eur')
      .eq('store_id', supabaseStoreId)
      .order('created_at', { ascending: false }),
  ]);

  if (customersResponse.error) {
    throw customersResponse.error;
  }
  if (ordersResponse.error) {
    throw ordersResponse.error;
  }
  if (orderItemsResponse.error) {
    throw orderItemsResponse.error;
  }

  const customers = ((customersResponse.data ?? []) as CustomerRow[]).map((customer) => ({
    userId: customer.user_id,
    displayName: customer.display_name,
    email: customer.email,
    isAnonymous: customer.is_anonymous,
    provider: customer.provider,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
  }));

  const itemsByOrder = new Map<string, AdminOrderItemRecord[]>();
  for (const item of (orderItemsResponse.data ?? []) as OrderItemRow[]) {
    const orderId = String(item.order_id);
    const bucket = itemsByOrder.get(orderId) ?? [];
    bucket.push({
      orderId,
      productSlug: item.product_slug,
      productTitle: item.product_title,
      quantity: item.quantity,
      subtotalEur: Number(item.subtotal_eur),
    });
    itemsByOrder.set(orderId, bucket);
  }

  const orders = ((ordersResponse.data ?? []) as OrderRow[]).map((order) => ({
    id: String(order.id),
    userId: order.user_id,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    status: order.status,
    provider: order.provider,
    providerStatus: order.provider_status,
    providerOrderId: order.provider_order_id,
    providerReference: order.provider_reference,
    currency: order.currency,
    subtotalEur: Number(order.subtotal_eur),
    taxEur: Number(order.tax_eur),
    totalEur: Number(order.total_eur),
    paidAt: order.paid_at,
    cancelledAt: order.cancelled_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: itemsByOrder.get(String(order.id)) ?? [],
  }));

  return {
    customers,
    orders,
  } satisfies AdminCommerceSnapshot;
}

export function subscribeToAdminCommerceSnapshot(onChange: () => void) {
  const client = getAdminSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return () => undefined;
  }

  let refreshTimer: number | null = null;

  function scheduleRefresh() {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
    }

    refreshTimer = window.setTimeout(() => {
      onChange();
    }, 120);
  }

  const channel: RealtimeChannel = client
    .channel(`storefront-admin-commerce:${supabaseStoreId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: CUSTOMER_TABLE,
        filter: `store_id=eq.${supabaseStoreId}`,
      },
      scheduleRefresh,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: ORDER_TABLE,
        filter: `store_id=eq.${supabaseStoreId}`,
      },
      scheduleRefresh,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: ORDER_ITEM_TABLE,
        filter: `store_id=eq.${supabaseStoreId}`,
      },
      scheduleRefresh,
    )
    .subscribe();

  return () => {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
    }
    void client.removeChannel(channel);
  };
}
