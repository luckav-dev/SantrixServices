import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  extractTebexErrorMessage,
  getRequestIPv4,
  getTebexHeaders,
  readTebexPayload,
} from '../_shared/tebex.ts';

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
    const clientIpv4 = getRequestIPv4(request);

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
        headers: getTebexHeaders(),
        body: JSON.stringify({
          complete_url: publicReturnUrl,
          cancel_url: publicReturnUrl,
          ip_address: clientIpv4 || undefined,
          custom: {
            login_provider: 'fivem',
            requested_path: returnPath,
          },
        }),
      },
    );

    const basketPayload = await readTebexPayload(basketResponse);
    if (!basketResponse.ok) {
      return jsonResponse(
        {
          error: extractTebexErrorMessage(
            basketPayload,
            'Could not create Tebex basket.',
          ),
          details: basketPayload,
          debug: {
            siteUrl,
            callbackUrl: callbackUrl.toString(),
            publicReturnUrl,
            clientIpv4: clientIpv4 || null,
          },
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
        headers: getTebexHeaders(false),
      },
    );

    const authPayload = await readTebexPayload(authResponse);
    if (!authResponse.ok) {
      return jsonResponse(
        {
          error: extractTebexErrorMessage(
            authPayload,
            'Could not fetch Tebex auth URLs.',
          ),
          details: authPayload,
          debug: {
            siteUrl,
            callbackUrl: callbackUrl.toString(),
            basketIdent: String(basketIdent),
          },
        },
        authResponse.status,
      );
    }

    const authEntries = Array.isArray(authPayload)
      ? authPayload
      : Array.isArray(authPayload?.data)
        ? authPayload.data
        : Array.isArray(authPayload?.data?.providers)
          ? authPayload.data.providers
          : Array.isArray(authPayload?.providers)
            ? authPayload.providers
            : [];

    const preferredAuthEntry =
      authEntries.find((entry) => {
        const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
        return /fivem/i.test(name);
      }) ??
      authEntries[0] ??
      null;

    const authUrl =
      (typeof preferredAuthEntry?.url === 'string' && preferredAuthEntry.url.trim()
        ? preferredAuthEntry.url.trim()
        : null) ??
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
