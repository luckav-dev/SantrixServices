import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  extractTebexErrorMessage,
  getTebexHeaders,
  readTebexPayload,
} from '../_shared/tebex.ts';

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webstoreId = Deno.env.get('TEBEX_WEBSTORE_ID')?.trim();
    if (!webstoreId) {
      return jsonResponse({ error: 'Missing Tebex webstore configuration.' }, 500);
    }

    const body = (await request.json().catch(() => ({}))) as { basketIdent?: string };
    const basketIdent = body.basketIdent?.trim();

    if (!basketIdent) {
      return jsonResponse({ error: 'Missing basket identifier.' }, 400);
    }

    const basketResponse = await fetch(
      `https://headless.tebex.io/api/accounts/${webstoreId}/baskets/${basketIdent}`,
      {
        headers: getTebexHeaders(false),
      },
    );

    const basketPayload = await readTebexPayload(basketResponse);
    if (!basketResponse.ok) {
      return jsonResponse(
        {
          error: extractTebexErrorMessage(
            basketPayload,
            'Could not resolve Tebex basket.',
          ),
          details: basketPayload,
        },
        basketResponse.status,
      );
    }

    const basket = basketPayload?.data ?? basketPayload;
    const providerUsername = pickFirstString(
      basket?.username,
      basket?.username_id,
      basket?.user?.username,
      basket?.user?.name,
      basket?.creator_name,
      basket?.name,
      basket?.email,
    );
    const providerUserId = pickFirstString(
      basket?.username_id,
      basket?.user?.id,
      basket?.creator_id,
      basket?.email,
    );

    if (!providerUsername) {
      return jsonResponse(
        { error: 'The Tebex basket is not authenticated yet.' },
        409,
      );
    }

    return jsonResponse({
      providerUserId,
      providerUsername,
      metadata: {
        basketIdent,
        email: basket?.email ?? null,
        completeUrl: basket?.complete_url ?? null,
        cancelUrl: basket?.cancel_url ?? null,
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected Tebex auth completion failure.',
      },
      500,
    );
  }
});
