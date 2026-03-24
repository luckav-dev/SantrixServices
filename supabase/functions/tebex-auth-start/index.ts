import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

function normalizeReturnPath(value: string | undefined) {
  if (!value || !value.startsWith('/')) {
    return '/';
  }

  return value;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webstoreId = Deno.env.get('TEBEX_WEBSTORE_ID')?.trim();
    const siteUrl = Deno.env.get('SITE_URL')?.trim() || request.headers.get('origin') || '';

    if (!webstoreId || !siteUrl) {
      return jsonResponse(
        { error: 'Missing Tebex webstore configuration.' },
        500,
      );
    }

    const body = (await request.json().catch(() => ({}))) as { returnPath?: string };
    const returnPath = normalizeReturnPath(body.returnPath);
    const publicReturnUrl = new URL(returnPath, siteUrl).toString();
    const callbackUrl = new URL('/auth/callback', siteUrl);
    callbackUrl.searchParams.set('provider', 'fivem');
    callbackUrl.searchParams.set('next', returnPath);

    const basketResponse = await fetch(
      `https://headless.tebex.io/api/accounts/${webstoreId}/baskets`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          complete_url: publicReturnUrl,
          cancel_url: publicReturnUrl,
          custom: {
            login_provider: 'fivem',
            requested_path: returnPath,
          },
        }),
      },
    );

    const basketPayload = await basketResponse.json();
    if (!basketResponse.ok) {
      return jsonResponse(
        {
          error: basketPayload?.error_message ?? 'Could not create Tebex basket.',
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
      return jsonResponse(
        { error: 'Tebex did not return a basket identifier.' },
        502,
      );
    }

    callbackUrl.searchParams.set('basketIdent', String(basketIdent));

    const authResponse = await fetch(
      `https://headless.tebex.io/api/accounts/${webstoreId}/baskets/${basketIdent}/auth?returnUrl=${encodeURIComponent(callbackUrl.toString())}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    const authPayload = await authResponse.json();
    if (!authResponse.ok) {
      return jsonResponse(
        {
          error: authPayload?.error_message ?? 'Could not fetch Tebex auth URLs.',
          details: authPayload,
        },
        authResponse.status,
      );
    }

    const authUrl =
      authPayload?.data?.url ??
      authPayload?.url ??
      authPayload?.data?.redirect_url ??
      null;

    if (!authUrl) {
      return jsonResponse(
        { error: 'Tebex did not return an auth URL.' },
        502,
      );
    }

    return jsonResponse({
      basketIdent: String(basketIdent),
      authUrl: String(authUrl),
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected Tebex auth start failure.',
      },
      500,
    );
  }
});
