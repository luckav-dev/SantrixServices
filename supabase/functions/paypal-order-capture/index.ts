import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  recordPaymentEvent,
  updateOrderPaymentState,
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
      orderId?: string;
      paypalOrderId?: string | null;
    };
    const orderId = Number(body.orderId ?? 0);

    if (!orderId) {
      return jsonResponse({ error: 'Missing local order id.' }, 400);
    }

    const adminClient = getServiceSupabaseClient();
    const storeId = getStoreId();

    const { data: order, error: orderError } = await adminClient
      .from('storefront_orders')
      .select('id, user_id, status, provider, provider_order_id')
      .eq('id', orderId)
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return jsonResponse({ error: 'The order was not found for this customer.' }, 404);
    }

    if (order.status === 'completed') {
      return jsonResponse({
        orderId: String(orderId),
        provider: 'paypal',
        status: 'completed',
        providerStatus: 'COMPLETED',
      });
    }

    const paypalOrderId = body.paypalOrderId?.trim() || order.provider_order_id?.trim();
    if (!paypalOrderId) {
      return jsonResponse({ error: 'Missing PayPal order identifier.' }, 400);
    }

    const accessToken = await getPayPalAccessToken();
    const response = await fetch(
      `${getPayPalApiBase()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
      },
    );

    const payload = await response.json();
    const captureStatus = payload?.status ?? payload?.details?.[0]?.issue ?? null;

    if (!response.ok) {
      const issue = payload?.details?.[0]?.issue ?? '';
      if (issue === 'ORDER_ALREADY_CAPTURED') {
        await updateOrderPaymentState({
          adminClient,
          orderId,
          storeId,
          provider: 'paypal',
          status: 'completed',
          providerStatus: 'COMPLETED',
          providerOrderId: paypalOrderId,
          providerMetadata: payload ?? {},
        });

        return jsonResponse({
          orderId: String(orderId),
          provider: 'paypal',
          status: 'completed',
          providerStatus: 'COMPLETED',
        });
      }

      await updateOrderPaymentState({
        adminClient,
        orderId,
        storeId,
        provider: 'paypal',
        status: 'failed',
        providerStatus: captureStatus,
        providerOrderId: paypalOrderId,
        providerMetadata: payload ?? {},
      });

      await recordPaymentEvent({
        adminClient,
        storeId,
        orderId,
        provider: 'paypal',
        eventType: 'paypal.order.capture_failed',
        providerEventId: paypalOrderId,
        payload,
      });

      return jsonResponse(
        {
          error: payload?.message ?? 'Could not capture the PayPal order.',
          details: payload,
        },
        response.status,
      );
    }

    const status = payload?.status === 'COMPLETED' ? 'completed' : 'pending';
    await updateOrderPaymentState({
      adminClient,
      orderId,
      storeId,
      provider: 'paypal',
      status,
      providerStatus: payload?.status ?? captureStatus,
      providerOrderId: paypalOrderId,
      providerReference:
        payload?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null,
      providerMetadata: payload ?? {},
    });

    await recordPaymentEvent({
      adminClient,
      storeId,
      orderId,
      provider: 'paypal',
      eventType: 'paypal.order.captured',
      providerEventId:
        payload?.purchase_units?.[0]?.payments?.captures?.[0]?.id ??
        paypalOrderId,
      payload,
    });

    return jsonResponse({
      orderId: String(orderId),
      provider: 'paypal',
      status,
      providerStatus: payload?.status ?? captureStatus,
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Unexpected PayPal capture failure.',
      },
      500,
    );
  }
});
