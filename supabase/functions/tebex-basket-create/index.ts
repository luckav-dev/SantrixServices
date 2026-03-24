import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  buildCheckoutContext,
  createPendingOrder,
  getFiveMIdentity,
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

    const webstoreId = Deno.env.get('TEBEX_WEBSTORE_ID')?.trim();
    if (!webstoreId) {
      return jsonResponse({ error: 'Missing Tebex webstore configuration.' }, 500);
    }

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

    if (checkout.provider !== 'tebex') {
      return jsonResponse(
        { error: 'The current basket is not configured for Tebex checkout.' },
        409,
      );
    }

    const fiveMIdentity = getFiveMIdentity(checkout.identities);
    const identityRequired = checkout.lines.some((line) => line.requiresIdentity);
    if (identityRequired && !fiveMIdentity) {
      return jsonResponse(
        { error: 'Necesitas iniciar sesión con FiveM antes de comprar este producto.' },
        409,
      );
    }

    const pendingOrder = await createPendingOrder({
      adminClient,
      storeId,
      userId: user.id,
      customer: checkout.customer,
      lines: checkout.lines,
      provider: 'tebex',
      currency: body.currency?.trim() || 'EUR',
      subtotalEur: checkout.subtotalEur,
      totalEur: checkout.totalEur,
    });

    const successUrl = new URL(
      normalizeReturnPath(body.successPath, '/checkout/return'),
      siteUrl,
    );
    successUrl.searchParams.set('provider', 'tebex');
    successUrl.searchParams.set('orderId', String(pendingOrder.orderId));

    const cancelUrl = new URL(
      normalizeReturnPath(body.cancelPath, '/checkout/return?status=cancelled'),
      siteUrl,
    );
    cancelUrl.searchParams.set('provider', 'tebex');
    cancelUrl.searchParams.set('orderId', String(pendingOrder.orderId));
    cancelUrl.searchParams.set('status', 'cancelled');

    const basketCreatePayload = {
      complete_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      username: fiveMIdentity?.provider_username ?? undefined,
      custom: {
        store_id: storeId,
        local_order_id: String(pendingOrder.orderId),
        user_id: user.id,
      },
    };

    const basketResponse = await fetch(
      `https://headless.tebex.io/api/accounts/${webstoreId}/baskets`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(basketCreatePayload),
      },
    );

    const basketPayload = await basketResponse.json();
    if (!basketResponse.ok) {
      await updateOrderPaymentState({
        adminClient,
        orderId: pendingOrder.orderId,
        storeId,
        provider: 'tebex',
        status: 'failed',
        providerStatus: basketPayload?.error_message ?? 'basket_create_failed',
        providerMetadata: basketPayload ?? {},
      });

      return jsonResponse(
        {
          error: basketPayload?.error_message ?? 'Could not create the Tebex basket.',
          details: basketPayload,
        },
        basketResponse.status,
      );
    }

    const basketIdent =
      basketPayload?.data?.ident ??
      basketPayload?.ident ??
      basketPayload?.data?.basket_ident ??
      null;

    if (!basketIdent) {
      return jsonResponse({ error: 'Tebex did not return a basket identifier.' }, 502);
    }

    for (const line of checkout.lines) {
      const packageResponse = await fetch(
        `https://headless.tebex.io/api/accounts/${webstoreId}/baskets/${basketIdent}/packages`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            package_id: line.tebexPackageId,
            quantity: line.quantity,
            variable_data: fiveMIdentity?.provider_user_id
              ? { username_id: fiveMIdentity.provider_user_id }
              : undefined,
            server_id: line.tebexServerId || undefined,
          }),
        },
      );

      const packagePayload = await packageResponse.json();
      if (!packageResponse.ok) {
        await updateOrderPaymentState({
          adminClient,
          orderId: pendingOrder.orderId,
          storeId,
          provider: 'tebex',
          status: 'failed',
          providerStatus: packagePayload?.error_message ?? 'basket_package_failed',
          providerOrderId: String(basketIdent),
          providerMetadata: packagePayload ?? {},
        });

        return jsonResponse(
          {
            error:
              packagePayload?.error_message ??
              `Could not add ${line.title} to the Tebex basket.`,
            details: packagePayload,
          },
          packageResponse.status,
        );
      }
    }

    const checkoutResponse = await fetch(
      `https://headless.tebex.io/api/accounts/${webstoreId}/baskets/${basketIdent}/checkout`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    const checkoutPayload = await checkoutResponse.json();
    if (!checkoutResponse.ok) {
      await updateOrderPaymentState({
        adminClient,
        orderId: pendingOrder.orderId,
        storeId,
        provider: 'tebex',
        status: 'failed',
        providerStatus: checkoutPayload?.error_message ?? 'checkout_url_failed',
        providerOrderId: String(basketIdent),
        providerMetadata: checkoutPayload ?? {},
      });

      return jsonResponse(
        {
          error:
            checkoutPayload?.error_message ??
            'Could not retrieve the Tebex checkout URL.',
          details: checkoutPayload,
        },
        checkoutResponse.status,
      );
    }

    const redirectUrl =
      checkoutPayload?.data?.url ??
      checkoutPayload?.data?.checkout_url ??
      checkoutPayload?.url ??
      null;

    if (!redirectUrl) {
      return jsonResponse({ error: 'Tebex did not return a checkout URL.' }, 502);
    }

    await updateOrderPaymentState({
      adminClient,
      orderId: pendingOrder.orderId,
      storeId,
      provider: 'tebex',
      status: 'pending',
      providerStatus: 'basket_created',
      providerOrderId: String(basketIdent),
      providerCheckoutUrl: String(redirectUrl),
      providerMetadata: {
        basket: basketPayload,
        checkout: checkoutPayload,
      },
    });

    await recordPaymentEvent({
      adminClient,
      storeId,
      orderId: pendingOrder.orderId,
      provider: 'tebex',
      eventType: 'tebex.basket.created',
      providerEventId: String(basketIdent),
      payload: {
        basket: basketPayload,
        checkout: checkoutPayload,
      },
    });

    return jsonResponse({
      orderId: String(pendingOrder.orderId),
      provider: 'tebex',
      redirectUrl: String(redirectUrl),
      basketIdent: String(basketIdent),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected Tebex checkout failure.',
      },
      500,
    );
  }
});
