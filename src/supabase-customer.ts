import type { AuthChangeEvent, RealtimeChannel, Session, User } from '@supabase/supabase-js';
import type { StorefrontReview } from './commerce-types';
import type { CustomerAuthProviderId } from './site-config';
import type { CartLine, CurrencyCode } from './store';
import { getCustomerSupabaseClient, hasSupabaseSync, supabaseStoreId } from './supabase';

const CUSTOMER_TABLE = 'storefront_customers';
const ORDER_TABLE = 'storefront_orders';
const ORDER_ITEM_TABLE = 'storefront_order_items';
const REVIEW_TABLE = 'storefront_reviews';
const PUBLIC_ORDER_FEED_TABLE = 'storefront_public_order_feed';

export interface RemoteCustomerSession {
  userId: string;
  displayName: string;
  email: string | null;
  provider: string;
  isAnonymous: boolean;
  loggedInAt: string;
}

interface CustomerRow {
  store_id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  is_anonymous: boolean;
  provider: string;
}

interface OrderItemRow {
  order_id: number | string;
  product_slug: string;
}

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

export interface RemoteCustomerReviewState {
  purchasedProductSlugs: string[];
  reviews: StorefrontReview[];
}

function resolveDisplayName(user: User, preferredName?: string | null) {
  const nextName = preferredName?.trim();
  if (nextName) {
    return nextName;
  }

  const metadataName =
    typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : null;

  if (metadataName?.trim()) {
    return metadataName.trim();
  }

  if (user.email) {
    return user.email.split('@')[0];
  }

  return `Customer ${user.id.slice(0, 6)}`;
}

function resolveProviderLabel(user: User, override?: CustomerAuthProviderId | null) {
  if (override === 'fivem') {
    return 'FiveM';
  }

  if (override === 'google') {
    return 'Google';
  }

  if (override === 'discord') {
    return 'Discord';
  }

  const provider = typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : '';

  if (provider === 'google') {
    return 'Google';
  }

  if (provider === 'discord') {
    return 'Discord';
  }

  if (provider === 'anonymous') {
    return 'FiveM';
  }

  return 'Supabase';
}

async function ensureCustomerProfile(
  user: User,
  preferredName?: string | null,
  providerOverride?: CustomerAuthProviderId | null,
) {
  const client = getCustomerSupabaseClient();
  if (!client) {
    return null;
  }

  const payload = {
    store_id: supabaseStoreId,
    user_id: user.id,
    display_name: resolveDisplayName(user, preferredName),
    email: user.email ?? null,
    is_anonymous: Boolean((user as { is_anonymous?: boolean }).is_anonymous),
    provider: resolveProviderLabel(user, providerOverride),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from(CUSTOMER_TABLE)
    .upsert(payload, { onConflict: 'store_id,user_id' })
    .select('store_id, user_id, display_name, email, is_anonymous')
    .single();

  if (error) {
    throw error;
  }

  const customer = data as CustomerRow;

  return {
    userId: customer.user_id,
    displayName: customer.display_name,
    email: customer.email,
    provider: customer.provider,
    isAnonymous: customer.is_anonymous,
    loggedInAt: new Date().toISOString(),
  };
}

function maskCustomerLabel(displayName: string) {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return 'Anonymous';
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const [name] = parts;
    return name.length <= 2 ? `${name[0] ?? 'A'}*` : `${name.slice(0, 2)}***`;
  }

  return `${parts[0]} ${parts[1][0]}.`;
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

export async function signInStorefrontCustomer(displayName?: string) {
  const client = getCustomerSupabaseClient();
  if (!client) {
    return null;
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  if (sessionData.session?.user) {
    return ensureCustomerProfile(sessionData.session.user, displayName, 'fivem');
  }

  const { data, error } = await client.auth.signInAnonymously({
    options: {
      data: {
        store_id: supabaseStoreId,
        display_name: displayName?.trim() || null,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Supabase no devolvió un usuario para la sesión del storefront.');
  }

  return ensureCustomerProfile(data.user, displayName, 'fivem');
}

export async function signInStorefrontCustomerWithOAuth(
  provider: Extract<CustomerAuthProviderId, 'google' | 'discord'>,
  redirectTo: string,
) {
  const client = getCustomerSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function startFiveMHeadlessLogin(returnPath: string) {
  const client = getCustomerSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.functions.invoke('tebex-auth-start', {
    body: {
      returnPath,
    },
  });

  if (error) {
    throw error;
  }

  return data as {
    authUrl: string;
    basketIdent: string;
  };
}

export async function completeFiveMHeadlessLogin(basketIdent: string) {
  const client = getCustomerSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.functions.invoke('tebex-auth-complete', {
    body: {
      basketIdent,
    },
  });

  if (error) {
    throw error;
  }

  return data as {
    providerUserId?: string;
    providerUsername: string;
    metadata?: Record<string, unknown>;
  };
}

export async function restoreRemoteCustomerSession() {
  const client = getCustomerSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return null;
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  const session = sessionData.session;
  if (!session?.user) {
    return null;
  }

  return ensureCustomerProfile(session.user);
}

export async function signOutRemoteCustomer() {
  const client = getCustomerSupabaseClient();
  if (!client) {
    return;
  }

  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

export function subscribeToRemoteCustomerSession(
  onChange: (session: RemoteCustomerSession | null) => void,
) {
  const client = getCustomerSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return () => undefined;
  }

  const { data } = client.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    window.setTimeout(() => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        onChange(null);
        return;
      }

      void ensureCustomerProfile(session.user)
        .then((profile) => {
          onChange(profile);
        })
        .catch((error) => {
          console.error('Failed to resolve storefront customer session.', error);
          onChange(null);
        });
    }, 0);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function linkRemoteCustomerIdentity(args: {
  provider: CustomerAuthProviderId;
  providerUserId?: string | null;
  providerUsername: string;
  metadata?: Record<string, unknown>;
}) {
  const client = getCustomerSupabaseClient();
  if (!client) {
    return null;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) {
    throw userError;
  }

  const user = userData.user;
  if (!user) {
    throw new Error('No hay sesión válida para vincular la identidad externa.');
  }

  const profile = await ensureCustomerProfile(user, args.providerUsername, args.provider);
  if (!profile) {
    throw new Error('No se pudo preparar el perfil del cliente.');
  }

  const payload = {
    store_id: supabaseStoreId,
    user_id: user.id,
    provider: args.provider,
    provider_user_id: args.providerUserId ?? null,
    provider_username: args.providerUsername,
    metadata: args.metadata ?? {},
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await client
    .from('storefront_customer_identities')
    .upsert(payload, { onConflict: 'store_id,user_id,provider' });

  if (error) {
    throw error;
  }

  return profile;
}

export async function createRemoteOrder(args: {
  cartLines: CartLine[];
  currency: CurrencyCode;
  subtotalEur: number;
  taxEur: number;
  totalEur: number;
}) {
  const client = getCustomerSupabaseClient();
  if (!client) {
    return null;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) {
    throw userError;
  }

  const user = userData.user;
  if (!user) {
    throw new Error('Necesitas iniciar sesión para completar la compra.');
  }

  const customer = await ensureCustomerProfile(user);
  if (!customer) {
    throw new Error('No se pudo preparar la sesión del cliente.');
  }

  const timestamp = new Date().toISOString();
  const orderInsert = {
    store_id: supabaseStoreId,
    user_id: user.id,
    customer_name: customer.displayName,
    customer_email: customer.email,
    status: 'completed',
    provider: 'supabase-demo',
    currency: args.currency,
    subtotal_eur: Number(args.subtotalEur.toFixed(2)),
    tax_eur: Number(args.taxEur.toFixed(2)),
    total_eur: Number(args.totalEur.toFixed(2)),
    updated_at: timestamp,
  };

  const { data: orderData, error: orderError } = await client
    .from(ORDER_TABLE)
    .insert(orderInsert)
    .select('id')
    .single();

  if (orderError) {
    throw orderError;
  }

  const orderId = String((orderData as { id: number | string }).id);

  const itemPayload = args.cartLines.map((line) => ({
    order_id: Number(orderId),
    store_id: supabaseStoreId,
    user_id: user.id,
    product_slug: line.product.slug,
    product_title: line.product.title,
    product_image: line.product.image,
    quantity: line.quantity,
    unit_price_eur: Number(line.product.priceValue.toFixed(2)),
    subtotal_eur: Number(line.subtotalEur.toFixed(2)),
    product_snapshot: {
      slug: line.product.slug,
      title: line.product.title,
      fullTitle: line.product.fullTitle,
      image: line.product.image,
      categoryId: line.product.categoryId,
      categoryLabel: line.product.categoryLabel,
      frameworks: line.product.frameworks,
      priceValue: line.product.priceValue,
      oldPriceValue: line.product.oldPriceValue,
      discountText: line.product.discountText,
      previewLink: line.product.previewLink,
      documentationLink: line.product.documentationLink,
    },
    created_at: timestamp,
    updated_at: timestamp,
  }));

  const { error: itemError } = await client.from(ORDER_ITEM_TABLE).insert(itemPayload);
  if (itemError) {
    throw itemError;
  }

  const publicFeedInsert = {
    order_id: Number(orderId),
    store_id: supabaseStoreId,
    customer_label: maskCustomerLabel(customer.displayName),
    total_eur: Number(args.totalEur.toFixed(2)),
    currency: args.currency,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const { error: publicFeedError } = await client
    .from(PUBLIC_ORDER_FEED_TABLE)
    .upsert(publicFeedInsert, { onConflict: 'order_id' });

  if (publicFeedError) {
    console.error('No se pudo publicar el feed público del pedido.', publicFeedError);
  }

  return {
    orderId,
    customer,
  };
}

export async function fetchCustomerReviewState() {
  const client = getCustomerSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return {
      purchasedProductSlugs: [],
      reviews: [],
    } satisfies RemoteCustomerReviewState;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) {
    throw userError;
  }

  const user = userData.user;
  if (!user) {
    return {
      purchasedProductSlugs: [],
      reviews: [],
    } satisfies RemoteCustomerReviewState;
  }

  const [orderItemsResponse, reviewsResponse] = await Promise.all([
    client
      .from(ORDER_ITEM_TABLE)
      .select('order_id, product_slug, storefront_orders!inner(status)')
      .eq('store_id', supabaseStoreId)
      .eq('user_id', user.id)
      .eq('storefront_orders.status', 'completed'),
    client
      .from(REVIEW_TABLE)
      .select('id, order_id, product_slug, product_title, rating, quote, display_name, is_published, created_at, updated_at')
      .eq('store_id', supabaseStoreId)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ]);

  if (orderItemsResponse.error) {
    throw orderItemsResponse.error;
  }
  if (reviewsResponse.error) {
    throw reviewsResponse.error;
  }

  const purchasedProductSlugs = Array.from(
    new Set(
      ((orderItemsResponse.data ?? []) as Array<OrderItemRow & {
        storefront_orders?: { status?: string } | { status?: string }[] | null;
      }>)
        .filter((item) => {
          const relation = item.storefront_orders;
          if (Array.isArray(relation)) {
            return relation.some((entry) => entry?.status === 'completed');
          }

          return relation?.status === 'completed';
        })
        .map((item) => item.product_slug),
    ),
  );

  const reviews = ((reviewsResponse.data ?? []) as ReviewRow[]).map(mapReview);

  return {
    purchasedProductSlugs,
    reviews,
  } satisfies RemoteCustomerReviewState;
}

export async function upsertRemoteProductReview(args: {
  productSlug: string;
  productTitle: string;
  rating: number;
  quote: string;
}) {
  const client = getCustomerSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return null;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) {
    throw userError;
  }

  const user = userData.user;
  if (!user) {
    throw new Error('Necesitas iniciar sesión para dejar una reseña.');
  }

  const customer = await ensureCustomerProfile(user);
  if (!customer) {
    throw new Error('No se pudo resolver el perfil del cliente.');
  }

  const { data: latestOrderItem, error: latestOrderItemError } = await client
    .from(ORDER_ITEM_TABLE)
    .select('order_id')
    .eq('store_id', supabaseStoreId)
    .eq('user_id', user.id)
    .eq('product_slug', args.productSlug)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestOrderItemError) {
    throw latestOrderItemError;
  }

  if (!latestOrderItem) {
    throw new Error('Solo los compradores verificados pueden dejar reseña en este producto.');
  }

  const payload = {
    store_id: supabaseStoreId,
    user_id: user.id,
    order_id: (latestOrderItem as { order_id: number | string }).order_id,
    product_slug: args.productSlug,
    product_title: args.productTitle,
    rating: Math.max(1, Math.min(5, Math.round(args.rating))),
    quote: args.quote.trim(),
    display_name: customer.displayName,
    is_published: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from(REVIEW_TABLE)
    .upsert(payload, { onConflict: 'store_id,user_id,product_slug' })
    .select('id, order_id, product_slug, product_title, rating, quote, display_name, is_published, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return mapReview(data as ReviewRow);
}

export function subscribeToCustomerOrders(onChange: () => void) {
  const client = getCustomerSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return () => undefined;
  }

  const channel: RealtimeChannel = client
    .channel(`storefront-customer-orders:${supabaseStoreId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: ORDER_TABLE,
        filter: `store_id=eq.${supabaseStoreId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeToCustomerReviewState(onChange: () => void) {
  const client = getCustomerSupabaseClient();
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
    .channel(`storefront-customer-reviews:${supabaseStoreId}`)
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
