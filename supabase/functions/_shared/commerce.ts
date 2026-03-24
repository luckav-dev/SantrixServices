export type CheckoutProvider = 'tebex' | 'paypal' | 'external';

export interface CheckoutItemInput {
  slug: string;
  quantity: number;
}

interface ProductRow {
  slug: string;
  product: Record<string, unknown>;
}

interface CustomerRow {
  display_name: string;
  email: string | null;
  provider: string;
  is_anonymous: boolean;
}

interface CustomerIdentityRow {
  provider: string;
  provider_user_id: string | null;
  provider_username: string;
  metadata: Record<string, unknown> | null;
}

export interface ResolvedCheckoutLine {
  slug: string;
  quantity: number;
  product: Record<string, unknown>;
  title: string;
  image: string;
  priceValue: number;
  subtotalEur: number;
  checkoutProvider: CheckoutProvider;
  requiresIdentity: boolean;
  tebexPackageId: string;
  tebexServerId: string;
  externalCheckoutUrl: string;
}

export interface CheckoutContext {
  customer: CustomerRow;
  identities: CustomerIdentityRow[];
  lines: ResolvedCheckoutLine[];
  subtotalEur: number;
  totalEur: number;
  provider: CheckoutProvider;
}

export function normalizeReturnPath(value: string | undefined, fallback = '/') {
  if (!value || !value.startsWith('/')) {
    return fallback;
  }

  return value;
}

export function getSiteUrl(request: Request) {
  return (
    Deno.env.get('SITE_URL')?.trim() ||
    request.headers.get('origin')?.trim() ||
    ''
  );
}

export function inferCheckoutProvider(product: Record<string, unknown>): CheckoutProvider {
  const checkoutProvider = typeof product.checkoutProvider === 'string'
    ? product.checkoutProvider
    : '';

  if (checkoutProvider === 'paypal' || checkoutProvider === 'external') {
    return checkoutProvider;
  }

  const tebexPackageId = resolveTebexPackageId(product);
  if (tebexPackageId) {
    return 'tebex';
  }

  if (resolveExternalCheckoutUrl(product)) {
    return 'external';
  }

  return 'paypal';
}

export function resolveTebexPackageId(product: Record<string, unknown>) {
  const candidates = [
    product.tebexPackageId,
    product.escrowVersionId,
    product.openVersionId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return '';
}

export function resolveExternalCheckoutUrl(product: Record<string, unknown>) {
  const directUrl =
    typeof product.externalCheckoutUrl === 'string' ? product.externalCheckoutUrl.trim() : '';

  if (directUrl) {
    return directUrl;
  }

  const href = typeof product.href === 'string' ? product.href.trim() : '';
  return href.startsWith('http') ? href : '';
}

export function resolveRequiresIdentity(
  product: Record<string, unknown>,
  provider: CheckoutProvider,
) {
  if (typeof product.requiresIdentity === 'boolean') {
    return product.requiresIdentity;
  }

  return provider === 'tebex' && Boolean(resolveTebexPackageId(product));
}

export function maskCustomerLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Guest';
  }

  if (trimmed.length <= 2) {
    return `${trimmed[0] ?? 'G'}*`;
  }

  return `${trimmed.slice(0, 2)}***`;
}

export async function buildCheckoutContext(args: {
  adminClient: any;
  storeId: string;
  userId: string;
  items: CheckoutItemInput[];
}) {
  const { adminClient, items, storeId, userId } = args;
  const cleanItems = items
    .map((item) => ({
      slug: item.slug?.trim?.() ?? '',
      quantity: Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity)) : 1,
    }))
    .filter((item) => item.slug);

  if (!cleanItems.length) {
    throw new Error('No hay líneas válidas en el checkout.');
  }

  const { data: customer, error: customerError } = await adminClient
    .from('storefront_customers')
    .select('display_name, email, provider, is_anonymous')
    .eq('store_id', storeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (customerError) {
    throw customerError;
  }

  if (!customer) {
    throw new Error('No existe un perfil de cliente válido para este usuario.');
  }

  const { data: identities, error: identityError } = await adminClient
    .from('storefront_customer_identities')
    .select('provider, provider_user_id, provider_username, metadata')
    .eq('store_id', storeId)
    .eq('user_id', userId);

  if (identityError) {
    throw identityError;
  }

  const slugs = cleanItems.map((item) => item.slug);
  const { data: products, error: productError } = await adminClient
    .from('storefront_products')
    .select('slug, product')
    .eq('store_id', storeId)
    .in('slug', slugs);

  if (productError) {
    throw productError;
  }

  const productMap = new Map(
    ((products ?? []) as ProductRow[]).map((row) => [row.slug, row.product]),
  );

  const lines = cleanItems.map((item) => {
    const product = productMap.get(item.slug);
    if (!product) {
      throw new Error(`No se encontró el producto ${item.slug} en la tienda.`);
    }

    const checkoutProvider = inferCheckoutProvider(product);
    const priceValue = Number(product.priceValue ?? 0);

    return {
      slug: item.slug,
      quantity: item.quantity,
      product,
      title:
        (typeof product.title === 'string' && product.title.trim()) ||
        item.slug,
      image: typeof product.image === 'string' ? product.image : '',
      priceValue,
      subtotalEur: Number((priceValue * item.quantity).toFixed(2)),
      checkoutProvider,
      requiresIdentity: resolveRequiresIdentity(product, checkoutProvider),
      tebexPackageId: resolveTebexPackageId(product),
      tebexServerId:
        typeof product.tebexServerId === 'string' ? product.tebexServerId.trim() : '',
      externalCheckoutUrl: resolveExternalCheckoutUrl(product),
    } satisfies ResolvedCheckoutLine;
  });

  const providers = Array.from(new Set(lines.map((line) => line.checkoutProvider)));
  if (providers.length !== 1) {
    throw new Error(
      'No puedes mezclar productos con proveedores de pago distintos en el mismo checkout.',
    );
  }

  const provider = providers[0];
  if (provider === 'tebex') {
    const missingPackage = lines.find((line) => !line.tebexPackageId);
    if (missingPackage) {
      throw new Error(
        `El producto ${missingPackage.title} no tiene configurado un package id de Tebex.`,
      );
    }
  }

  if (provider === 'external') {
    throw new Error(
      'Los productos con checkout externo todavía no tienen confirmación automática de pago.',
    );
  }

  const subtotalEur = Number(
    lines.reduce((sum, line) => sum + line.subtotalEur, 0).toFixed(2),
  );

  return {
    customer: customer as CustomerRow,
    identities: (identities ?? []) as CustomerIdentityRow[],
    lines,
    subtotalEur,
    totalEur: subtotalEur,
    provider,
  } satisfies CheckoutContext;
}

export async function createPendingOrder(args: {
  adminClient: any;
  storeId: string;
  userId: string;
  customer: CustomerRow;
  lines: ResolvedCheckoutLine[];
  provider: string;
  currency: string;
  subtotalEur: number;
  totalEur: number;
}) {
  const timestamp = new Date().toISOString();
  const { data: orderData, error: orderError } = await args.adminClient
    .from('storefront_orders')
    .insert({
      store_id: args.storeId,
      user_id: args.userId,
      customer_name: args.customer.display_name,
      customer_email: args.customer.email,
      status: 'pending',
      provider: args.provider,
      currency: args.currency,
      subtotal_eur: args.subtotalEur,
      tax_eur: 0,
      total_eur: args.totalEur,
      provider_metadata: {},
      updated_at: timestamp,
    })
    .select('id')
    .single();

  if (orderError) {
    throw orderError;
  }

  const orderId = Number((orderData as { id: number }).id);

  const itemPayload = args.lines.map((line) => ({
    order_id: orderId,
    store_id: args.storeId,
    user_id: args.userId,
    product_slug: line.slug,
    product_title: line.title,
    product_image: line.image,
    quantity: line.quantity,
    unit_price_eur: Number(line.priceValue.toFixed(2)),
    subtotal_eur: Number(line.subtotalEur.toFixed(2)),
    product_snapshot: line.product,
    created_at: timestamp,
    updated_at: timestamp,
  }));

  const { error: itemError } = await args.adminClient
    .from('storefront_order_items')
    .insert(itemPayload);

  if (itemError) {
    throw itemError;
  }

  return {
    orderId,
    createdAt: timestamp,
  };
}

export async function upsertPublicOrderFeed(args: {
  adminClient: any;
  orderId: number;
  storeId: string;
  customerName: string;
  totalEur: number;
  currency: string;
}) {
  const { error } = await args.adminClient
    .from('storefront_public_order_feed')
    .upsert(
      {
        order_id: args.orderId,
        store_id: args.storeId,
        customer_label: maskCustomerLabel(args.customerName),
        total_eur: Number(args.totalEur.toFixed(2)),
        currency: args.currency,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'order_id' },
    );

  if (error) {
    throw error;
  }
}

export async function recordPaymentEvent(args: {
  adminClient: any;
  storeId: string;
  orderId?: number | null;
  provider: string;
  eventType: string;
  providerEventId?: string | null;
  payload: unknown;
}) {
  const row = {
    store_id: args.storeId,
    order_id: args.orderId ?? null,
    provider: args.provider,
    event_type: args.eventType,
    provider_event_id: args.providerEventId ?? null,
    payload: args.payload ?? {},
    processed_at: new Date().toISOString(),
  };

  const response = args.providerEventId
    ? await args.adminClient
        .from('storefront_payment_events')
        .upsert(row, {
          onConflict: 'provider,provider_event_id',
          ignoreDuplicates: false,
        })
    : await args.adminClient.from('storefront_payment_events').insert(row);

  if (response.error) {
    throw response.error;
  }
}

export async function updateOrderPaymentState(args: {
  adminClient: any;
  orderId: number;
  storeId: string;
  provider: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  providerStatus?: string | null;
  providerOrderId?: string | null;
  providerCheckoutUrl?: string | null;
  providerReference?: string | null;
  providerMetadata?: Record<string, unknown>;
}) {
  const timestamp = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: args.status,
    provider_status: args.providerStatus ?? null,
    provider_order_id: args.providerOrderId ?? null,
    provider_checkout_url: args.providerCheckoutUrl ?? null,
    provider_reference: args.providerReference ?? null,
    provider_metadata: args.providerMetadata ?? {},
    updated_at: timestamp,
  };

  if (args.status === 'completed') {
    patch.paid_at = timestamp;
    patch.cancelled_at = null;
  }

  if (args.status === 'cancelled') {
    patch.cancelled_at = timestamp;
  }

  const { data, error } = await args.adminClient
    .from('storefront_orders')
    .update(patch)
    .eq('id', args.orderId)
    .eq('store_id', args.storeId)
    .select('id, customer_name, total_eur, currency')
    .single();

  if (error) {
    throw error;
  }

  if (args.status === 'completed') {
    const order = data as { id: number; customer_name: string; total_eur: number; currency: string };
    await upsertPublicOrderFeed({
      adminClient: args.adminClient,
      orderId: Number(order.id),
      storeId: args.storeId,
      customerName: order.customer_name,
      totalEur: Number(order.total_eur),
      currency: order.currency,
    });
  }

  return data;
}

export function getFiveMIdentity(identities: CustomerIdentityRow[]) {
  return identities.find((identity) => identity.provider === 'fivem') ?? null;
}
