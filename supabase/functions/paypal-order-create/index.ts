import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  buildCheckoutContext,
  createPendingOrder,
  getSiteUrl,
  normalizeReturnPath,
  recordPaymentEvent,
  updateOrderPaymentState,
  type CheckoutItemInput,
} from '../_shared/commerce.ts';
import {
  getServiceSupabaseClient,
  getStoreId,
  requireAuthenticatedUser,
} from '../_shared/supabase.ts';

function getPayPalApiBase() {
  return Deno.env.get('PAYPAL_API_BASE')?.trim() || 'https://api-m.sandbox.paypal.com';
}

async function getPayPalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')?.trim();
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('Missing PayPal credentials.');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const payload = await response.json();
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description ?? 'Could not fetch PayPal access token.');
  }

  return payload.access_token as string;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const user = await requireAuthenticatedUser(request);
    const body = (await request.json().catch(() => ({}))) as {
      items?: CheckoutItemInput[];
      currency?: string;
      successPath?: string;
      cancelPath?: string;
    };

    const adminClient = getServiceSupabaseClient();
    const storeId = getStoreId();
    const siteUrl = getSiteUrl(request);

    if (!siteUrl) {
      return jsonResponse({ error: 'Missing SITE_URL for checkout redirects.' }, 500);
    }

    const checkout = await buildCheckoutContext({
      adminClient,
      storeId,
      userId: user.id,
      items: body.items ?? [],
    });

    if (checkout.provider !== 'paypal') {
      return jsonResponse(
        { error: 'The current basket is not configured for PayPal checkout.' },
        409,
      );
    }

    const pendingOrder = await createPendingOrder({
      adminClient,
      storeId,
      userId: user.id,
      customer: checkout.customer,
      lines: checkout.lines,
      provider: 'paypal',
      currency: 'EUR',
      subtotalEur: checkout.subtotalEur,
      totalEur: checkout.totalEur,
    });

    const successUrl = new URL(
      normalizeReturnPath(body.successPath, '/checkout/return'),
      siteUrl,
    );
    successUrl.searchParams.set('provider', 'paypal');
    successUrl.searchParams.set('orderId', String(pendingOrder.orderId));

    const cancelUrl = new URL(
      normalizeReturnPath(body.cancelPath, '/checkout/return?status=cancelled'),
      siteUrl,
    );
    cancelUrl.searchParams.set('provider', 'paypal');
    cancelUrl.searchParams.set('orderId', String(pendingOrder.orderId));
    cancelUrl.searchParams.set('status', 'cancelled');

    const accessToken = await getPayPalAccessToken();
    const createPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: String(pendingOrder.orderId),
          custom_id: `${storeId}:${pendingOrder.orderId}`,
          invoice_id: `${storeId}-${pendingOrder.orderId}`,
          description: `${checkout.lines.length} item(s) from ${storeId}`,
          amount: {
            currency_code: 'EUR',
            value: checkout.totalEur.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'EUR',
                value: checkout.subtotalEur.toFixed(2),
              },
            },
          },
          items: checkout.lines.map((line) => ({
            name: line.title.slice(0, 127),
            quantity: String(line.quantity),
            unit_amount: {
              currency_code: 'EUR',
              value: line.priceValue.toFixed(2),
            },
          })),
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: successUrl.toString(),
            cancel_url: cancelUrl.toString(),
            brand_name: storeId,
            user_action: 'PAY_NOW',
          },
        },
      },
    };

    const response = await fetch(`${getPayPalApiBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(createPayload),
    });

    const payload = await response.json();
    if (!response.ok) {
      await updateOrderPaymentState({
        adminClient,
        orderId: pendingOrder.orderId,
        storeId,
        provider: 'paypal',
        status: 'failed',
        providerStatus: payload?.name ?? 'create_failed',
        providerMetadata: payload ?? {},
      });

      return jsonResponse(
        {
          error: payload?.message ?? 'Could not create the PayPal order.',
          details: payload,
        },
        response.status,
      );
    }

    const approveUrl =
      payload?.links?.find?.((link: { rel?: string; href?: string }) =>
        link?.rel === 'payer-action' || link?.rel === 'approve'
      )?.href ?? null;

    if (!approveUrl) {
      await updateOrderPaymentState({
        adminClient,
        orderId: pendingOrder.orderId,
        storeId,
        provider: 'paypal',
        status: 'failed',
        providerStatus: payload?.status ?? 'missing_approve_url',
        providerOrderId: payload?.id ?? null,
        providerMetadata: payload ?? {},
      });

      return jsonResponse({ error: 'PayPal did not return an approval URL.' }, 502);
    }

    await updateOrderPaymentState({
      adminClient,
      orderId: pendingOrder.orderId,
      storeId,
      provider: 'paypal',
      status: 'pending',
      providerStatus: payload?.status ?? 'CREATED',
      providerOrderId: payload?.id ?? null,
      providerCheckoutUrl: approveUrl,
      providerMetadata: payload ?? {},
    });

    await recordPaymentEvent({
      adminClient,
      storeId,
      orderId: pendingOrder.orderId,
      provider: 'paypal',
      eventType: 'paypal.order.created',
      providerEventId: payload?.id ?? null,
      payload,
    });

    return jsonResponse({
      orderId: String(pendingOrder.orderId),
      provider: 'paypal',
      redirectUrl: String(approveUrl),
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Unexpected PayPal create order failure.',
      },
      500,
    );
  }
});
