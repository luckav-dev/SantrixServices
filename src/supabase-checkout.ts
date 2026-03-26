import { getCustomerSupabaseClient, hasSupabaseSync, supabaseStoreId } from './supabase';
import type { CartLine, CurrencyCode, ProductCheckoutProvider } from './store';

interface CheckoutFunctionResponse {
  orderId: string;
  provider: ProductCheckoutProvider;
  redirectUrl: string;
}

export interface RemoteCheckoutStartResult {
  orderId: string;
  provider: ProductCheckoutProvider;
  redirectUrl: string;
}

export interface RemoteOrderStatus {
  orderId: string;
  status: string;
  provider: string;
  providerStatus: string | null;
  totalEur: number;
  updatedAt: string;
}

interface OrderStatusRow {
  id: number | string;
  status: string;
  provider: string;
  provider_status: string | null;
  total_eur: number;
  updated_at: string;
}

async function extractFunctionErrorMessage(error: unknown, fallback: string) {
  const response = (error as { context?: { clone?: () => Response } | Response })?.context;

  if (response && typeof (response as Response).clone === 'function') {
    const clonedResponse = (response as Response).clone();

    try {
      const payload = (await clonedResponse.json()) as {
        error?: string;
        message?: string;
        msg?: string;
        details?: {
          error?: string;
          message?: string;
          msg?: string;
          detail?: string;
        };
      };

      return (
        payload.error ||
        payload.message ||
        payload.msg ||
        payload.details?.error ||
        payload.details?.message ||
        payload.details?.msg ||
        payload.details?.detail ||
        fallback
      );
    } catch {
      try {
        const text = await clonedResponse.text();
        return text.trim() || fallback;
      } catch {
        return fallback;
      }
    }
  }

  const message = (error as { message?: string })?.message;
  return message || fallback;
}

function normalizeCheckoutFunctionError(provider: ProductCheckoutProvider, message: string) {
  if (/Necesitas iniciar sesi.+FiveM/i.test(message) || /identity/i.test(message) && /required/i.test(message)) {
    return 'Este checkout requiere que inicies sesión con FiveM antes de pagar este producto.';
  }

  if (/valida|sesi.+v.+lida/i.test(message) && /checkout/i.test(message)) {
    return 'Tu sesión de cliente ya no es válida. Vuelve a iniciar sesión antes de continuar con el checkout.';
  }

  if (/SITE_URL|complete_url|cancel_url|return/i.test(message)) {
    return 'La configuración de retorno de Tebex no es válida. Revisa SITE_URL y las rutas de vuelta del checkout.';
  }

  if (/Could not create the Tebex basket/i.test(message) || /basket/i.test(message) && /tebex/i.test(message)) {
    return 'Tebex no pudo preparar el basket del checkout. Revisa la configuración Headless y prueba de nuevo.';
  }

  if (/checkout url/i.test(message)) {
    return 'Tebex no devolvió la URL final del checkout. Revisa la configuración del webstore.';
  }

  if (/non-2xx status code/i.test(message)) {
    return provider === 'paypal'
      ? 'PayPal devolvió un error al preparar el pago.'
      : 'La función de Tebex devolvió un error al preparar el checkout.';
  }

  return message;
}

function getCheckoutProviders(cartLines: CartLine[]) {
  return Array.from(new Set(cartLines.map((line) => line.product.checkoutProvider)));
}

function getCheckoutPayload(args: {
  cartLines: CartLine[];
  currency: CurrencyCode;
  successPath?: string;
  cancelPath?: string;
}) {
  return {
    currency: args.currency,
    successPath: args.successPath,
    cancelPath: args.cancelPath,
    items: args.cartLines.map((line) => ({
      slug: line.product.slug,
      quantity: line.quantity,
    })),
  };
}

export async function startRemoteCheckout(args: {
  cartLines: CartLine[];
  currency: CurrencyCode;
  successPath?: string;
  cancelPath?: string;
}) {
  const client = getCustomerSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return null;
  }

  const providers = getCheckoutProviders(args.cartLines);
  if (providers.length !== 1) {
    throw new Error(
      'No puedes mezclar productos con proveedores de pago distintos en el mismo checkout.',
    );
  }

  const provider = providers[0];
  if (provider === 'external') {
    throw new Error(
      'Los productos con checkout externo todavía no tienen verificación automática de pago en esta plantilla.',
    );
  }

  const functionName =
    provider === 'paypal' ? 'paypal-order-create' : 'tebex-basket-create';

  const { data, error } = await client.functions.invoke(functionName, {
    body: getCheckoutPayload(args),
  });

  if (error) {
    const message = await extractFunctionErrorMessage(
      error,
      provider === 'paypal'
        ? 'No se pudo iniciar el checkout de PayPal.'
        : 'No se pudo iniciar el checkout de Tebex.',
    );
    throw new Error(normalizeCheckoutFunctionError(provider, message));
  }

  const payload = data as Partial<CheckoutFunctionResponse> | null;
  if (!payload?.orderId || !payload?.redirectUrl || !payload.provider) {
    throw new Error('La función de checkout no devolvió una respuesta válida.');
  }

  return {
    orderId: String(payload.orderId),
    provider: payload.provider,
    redirectUrl: String(payload.redirectUrl),
  } satisfies RemoteCheckoutStartResult;
}

export async function captureRemotePayPalOrder(args: {
  orderId: string;
  paypalOrderId?: string | null;
}) {
  const client = getCustomerSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return null;
  }

  const { data, error } = await client.functions.invoke('paypal-order-capture', {
    body: {
      orderId: args.orderId,
      paypalOrderId: args.paypalOrderId ?? null,
    },
  });

  if (error) {
    const message = await extractFunctionErrorMessage(
      error,
      'No se pudo confirmar el pedido con PayPal.',
    );
    throw new Error(normalizeCheckoutFunctionError('paypal', message));
  }

  return data as {
    orderId: string;
    provider: 'paypal';
    status: string;
    providerStatus?: string | null;
  } | null;
}

export async function fetchRemoteCustomerOrderStatus(orderId: string) {
  const client = getCustomerSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return null;
  }

  const { data, error } = await client
    .from('storefront_orders')
    .select('id, status, provider, provider_status, total_eur, updated_at')
    .eq('store_id', supabaseStoreId)
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as OrderStatusRow;
  return {
    orderId: String(row.id),
    status: row.status,
    provider: row.provider,
    providerStatus: row.provider_status,
    totalEur: Number(row.total_eur),
    updatedAt: row.updated_at,
  } satisfies RemoteOrderStatus;
}

export async function waitForRemoteOrderSettlement(args: {
  orderId: string;
  timeoutMs?: number;
  intervalMs?: number;
}) {
  const timeoutMs = args.timeoutMs ?? 25000;
  const intervalMs = args.intervalMs ?? 1600;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const order = await fetchRemoteCustomerOrderStatus(args.orderId);
    if (order && order.status !== 'pending') {
      return order;
    }

    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  return fetchRemoteCustomerOrderStatus(args.orderId);
}
