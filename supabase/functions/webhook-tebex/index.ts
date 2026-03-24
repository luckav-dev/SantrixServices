import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  recordPaymentEvent,
  updateOrderPaymentState,
} from '../_shared/commerce.ts';
import { getServiceSupabaseClient, getStoreId } from '../_shared/supabase.ts';

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

function getEventType(payload: Record<string, unknown>) {
  return (
    getNestedString(payload, ['type']) ||
    getNestedString(payload, ['event_type']) ||
    'tebex.unknown'
  );
}

function parseLocalOrderId(payload: Record<string, unknown>) {
  const candidates = [
    getNestedString(payload, ['subject', 'custom', 'local_order_id']),
    getNestedString(payload, ['data', 'custom', 'local_order_id']),
    getNestedString(payload, ['custom', 'local_order_id']),
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate ?? 0);
    if (parsed) {
      return parsed;
    }
  }

  return 0;
}

async function hashSha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((part) => part.toString(16).padStart(2, '0'))
    .join('');
}

async function computeTebexSignature(rawBody: string, secret: string) {
  const bodyHash = await hashSha256Hex(rawBody);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(bodyHash),
  );

  return Array.from(new Uint8Array(signature))
    .map((part) => part.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody || '{}') as Record<string, unknown>;
    const secret = Deno.env.get('TEBEX_WEBHOOK_SECRET')?.trim();
    const signature = request.headers.get('x-signature')?.trim();

    if (secret) {
      if (!signature) {
        return jsonResponse({ error: 'Missing Tebex webhook signature.' }, 401);
      }

      const expectedSignature = await computeTebexSignature(rawBody, secret);
      if (signature !== expectedSignature) {
        return jsonResponse({ error: 'Invalid Tebex webhook signature.' }, 401);
      }
    }

    const eventType = getEventType(payload);
    if (eventType === 'validation.webhook') {
      return jsonResponse({ ok: true });
    }

    const adminClient = getServiceSupabaseClient();
    const storeId = getStoreId();
    let orderId = parseLocalOrderId(payload);
    const basketIdent =
      getNestedString(payload, ['subject', 'id']) ??
      getNestedString(payload, ['data', 'id']) ??
      getNestedString(payload, ['subject', 'basket', 'ident']);

    if (!orderId && basketIdent) {
      const { data: orderRow } = await adminClient
        .from('storefront_orders')
        .select('id')
        .eq('store_id', storeId)
        .eq('provider', 'tebex')
        .eq('provider_order_id', basketIdent)
        .maybeSingle();

      orderId = Number(orderRow?.id ?? 0);
    }

    if (orderId) {
      const lowerEvent = eventType.toLowerCase();
      if (lowerEvent.includes('payment.completed')) {
        await updateOrderPaymentState({
          adminClient,
          orderId,
          storeId,
          provider: 'tebex',
          status: 'completed',
          providerStatus: eventType,
          providerOrderId: basketIdent,
          providerReference:
            getNestedString(payload, ['subject', 'transaction_id']) ??
            getNestedString(payload, ['data', 'transaction_id']),
          providerMetadata: payload,
        });
      } else if (
        lowerEvent.includes('payment.refunded') ||
        lowerEvent.includes('payment.reversed') ||
        lowerEvent.includes('chargeback')
      ) {
        await updateOrderPaymentState({
          adminClient,
          orderId,
          storeId,
          provider: 'tebex',
          status: 'cancelled',
          providerStatus: eventType,
          providerOrderId: basketIdent,
          providerMetadata: payload,
        });
      } else if (
        lowerEvent.includes('payment.failed') ||
        lowerEvent.includes('payment.declined')
      ) {
        await updateOrderPaymentState({
          adminClient,
          orderId,
          storeId,
          provider: 'tebex',
          status: 'failed',
          providerStatus: eventType,
          providerOrderId: basketIdent,
          providerMetadata: payload,
        });
      }
    }

    await recordPaymentEvent({
      adminClient,
      storeId,
      orderId: orderId || null,
      provider: 'tebex',
      eventType,
      providerEventId:
        getNestedString(payload, ['id']) ??
        getNestedString(payload, ['subject', 'transaction_id']) ??
        basketIdent,
      payload,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Unexpected Tebex webhook failure.',
      },
      500,
    );
  }
});
