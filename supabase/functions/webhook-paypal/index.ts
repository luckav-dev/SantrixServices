import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  recordPaymentEvent,
  updateOrderPaymentState,
} from '../_shared/commerce.ts';
import { getServiceSupabaseClient, getStoreId } from '../_shared/supabase.ts';

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

function getNestedString(payload: Record<string, unknown>, path: string[]) {
  let current: unknown = payload;
  for (const segment of path) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' && current.trim() ? current.trim() : null;
}

function parseLocalOrderId(payload: Record<string, unknown>, storeId: string) {
  const customId = getNestedString(payload, ['resource', 'custom_id']);
  if (customId) {
    const [, localOrderId] = customId.split(':');
    if (localOrderId) {
      return Number(localOrderId);
    }
  }

  const invoiceId = getNestedString(payload, ['resource', 'invoice_id']);
  if (invoiceId?.startsWith(`${storeId}-`)) {
    return Number(invoiceId.slice(storeId.length + 1));
  }

  return 0;
}

async function verifyWebhook(payload: Record<string, unknown>, request: Request) {
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID')?.trim();
  if (!webhookId) {
    throw new Error('Missing PAYPAL_WEBHOOK_ID for webhook verification.');
  }

  const accessToken = await getPayPalAccessToken();
  const verificationResponse = await fetch(
    `${getPayPalApiBase()}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: request.headers.get('paypal-auth-algo'),
        cert_url: request.headers.get('paypal-cert-url'),
        transmission_id: request.headers.get('paypal-transmission-id'),
        transmission_sig: request.headers.get('paypal-transmission-sig'),
        transmission_time: request.headers.get('paypal-transmission-time'),
        webhook_id: webhookId,
        webhook_event: payload,
      }),
    },
  );

  const verificationPayload = await verificationResponse.json();
  return verificationPayload?.verification_status === 'SUCCESS';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody || '{}') as Record<string, unknown>;
    const isVerified = await verifyWebhook(payload, request);

    if (!isVerified) {
      return jsonResponse({ error: 'Invalid PayPal webhook signature.' }, 401);
    }

    const adminClient = getServiceSupabaseClient();
    const storeId = getStoreId();
    const eventType = getNestedString(payload, ['event_type']) ?? 'paypal.unknown';
    const localOrderId = parseLocalOrderId(payload, storeId);
    const relatedPayPalOrderId =
      getNestedString(payload, ['resource', 'supplementary_data', 'related_ids', 'order_id']) ??
      getNestedString(payload, ['resource', 'id']);

    let orderId = localOrderId;
    if (!orderId && relatedPayPalOrderId) {
      const { data: orderRow } = await adminClient
        .from('storefront_orders')
        .select('id')
        .eq('store_id', storeId)
        .eq('provider', 'paypal')
        .eq('provider_order_id', relatedPayPalOrderId)
        .maybeSingle();

      orderId = Number(orderRow?.id ?? 0);
    }

    if (orderId) {
      if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        await updateOrderPaymentState({
          adminClient,
          orderId,
          storeId,
          provider: 'paypal',
          status: 'completed',
          providerStatus: 'COMPLETED',
          providerOrderId: relatedPayPalOrderId,
          providerReference: getNestedString(payload, ['resource', 'id']),
          providerMetadata: payload,
        });
      } else if (
        eventType === 'PAYMENT.CAPTURE.DENIED' ||
        eventType === 'PAYMENT.CAPTURE.DECLINED'
      ) {
        await updateOrderPaymentState({
          adminClient,
          orderId,
          storeId,
          provider: 'paypal',
          status: 'failed',
          providerStatus: eventType,
          providerOrderId: relatedPayPalOrderId,
          providerMetadata: payload,
        });
      } else if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
        await updateOrderPaymentState({
          adminClient,
          orderId,
          storeId,
          provider: 'paypal',
          status: 'cancelled',
          providerStatus: eventType,
          providerOrderId: relatedPayPalOrderId,
          providerReference: getNestedString(payload, ['resource', 'id']),
          providerMetadata: payload,
        });
      } else if (eventType === 'CHECKOUT.ORDER.APPROVED') {
        await updateOrderPaymentState({
          adminClient,
          orderId,
          storeId,
          provider: 'paypal',
          status: 'pending',
          providerStatus: 'APPROVED',
          providerOrderId: relatedPayPalOrderId,
          providerMetadata: payload,
        });
      }
    }

    await recordPaymentEvent({
      adminClient,
      storeId,
      orderId: orderId || null,
      provider: 'paypal',
      eventType,
      providerEventId:
        getNestedString(payload, ['id']) ??
        getNestedString(payload, ['resource', 'id']) ??
        relatedPayPalOrderId,
      payload,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Unexpected PayPal webhook failure.',
      },
      500,
    );
  }
});
