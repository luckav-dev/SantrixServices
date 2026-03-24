import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  PublicPaymentFeedEntry,
  StorefrontMetrics,
  StorefrontReview,
} from './commerce-types';
import {
  getPublicSupabaseClient,
  hasSupabaseSync,
  supabaseStoreId,
} from './supabase';

const REVIEW_TABLE = 'storefront_reviews';
const PUBLIC_ORDER_FEED_TABLE = 'storefront_public_order_feed';
const METRICS_VIEW = 'storefront_public_metrics';

interface ReviewRow {
  id: number | string;
  order_id: number | string | null;
  product_slug: string;
  product_title: string;
  rating: number;
  quote: string;
  display_name: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface PublicOrderFeedRow {
  order_id: number | string;
  customer_label: string;
  total_eur: number;
  currency: string;
  created_at: string;
}

interface MetricsRow {
  sales_count: number;
  revenue_eur: number;
  reviews_count: number;
  average_rating: number;
}

export interface PublicCommerceSnapshot {
  metrics: StorefrontMetrics;
  recentOrders: PublicPaymentFeedEntry[];
  recentReviews: StorefrontReview[];
}

function emptyMetrics(): StorefrontMetrics {
  return {
    salesCount: 0,
    revenueEur: 0,
    reviewsCount: 0,
    averageRating: 0,
  };
}

function mapReview(review: ReviewRow): StorefrontReview {
  return {
    id: String(review.id),
    orderId: review.order_id === null ? null : String(review.order_id),
    productSlug: review.product_slug,
    productTitle: review.product_title,
    rating: Number(review.rating),
    quote: review.quote,
    displayName: review.display_name,
    isPublished: review.is_published,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
  };
}

export async function fetchPublicCommerceSnapshot() {
  const client = getPublicSupabaseClient();
  if (!client) {
    return {
      metrics: emptyMetrics(),
      recentOrders: [],
      recentReviews: [],
    } satisfies PublicCommerceSnapshot;
  }

  const [metricsResponse, ordersResponse, reviewsResponse] = await Promise.all([
    client
      .from(METRICS_VIEW)
      .select('sales_count, revenue_eur, reviews_count, average_rating')
      .eq('store_id', supabaseStoreId)
      .maybeSingle(),
    client
      .from(PUBLIC_ORDER_FEED_TABLE)
      .select('order_id, customer_label, total_eur, currency, created_at')
      .eq('store_id', supabaseStoreId)
      .order('created_at', { ascending: false })
      .limit(18),
    client
      .from(REVIEW_TABLE)
      .select('id, order_id, product_slug, product_title, rating, quote, display_name, is_published, created_at, updated_at')
      .eq('store_id', supabaseStoreId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(24),
  ]);

  if (metricsResponse.error) {
    throw metricsResponse.error;
  }
  if (ordersResponse.error) {
    throw ordersResponse.error;
  }
  if (reviewsResponse.error) {
    throw reviewsResponse.error;
  }

  const metricsRow = metricsResponse.data as MetricsRow | null;
  const metrics: StorefrontMetrics = metricsRow
    ? {
        salesCount: Number(metricsRow.sales_count ?? 0),
        revenueEur: Number(metricsRow.revenue_eur ?? 0),
        reviewsCount: Number(metricsRow.reviews_count ?? 0),
        averageRating: Number(metricsRow.average_rating ?? 0),
      }
    : emptyMetrics();

  const recentOrders = ((ordersResponse.data ?? []) as PublicOrderFeedRow[]).map((order) => ({
    orderId: String(order.order_id),
    customerLabel: order.customer_label,
    totalEur: Number(order.total_eur),
    currency: order.currency,
    createdAt: order.created_at,
  }));

  const recentReviews = ((reviewsResponse.data ?? []) as ReviewRow[]).map(mapReview);

  return {
    metrics,
    recentOrders,
    recentReviews,
  } satisfies PublicCommerceSnapshot;
}

export function subscribeToPublicCommerceSnapshot(onChange: () => void) {
  const client = getPublicSupabaseClient();
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
    .channel(`storefront-public-commerce:${supabaseStoreId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: PUBLIC_ORDER_FEED_TABLE,
        filter: `store_id=eq.${supabaseStoreId}`,
      },
      scheduleRefresh,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: REVIEW_TABLE,
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
