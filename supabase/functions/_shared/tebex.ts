const IPV4_PATTERN =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function normalizeIpCandidate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice(7);
  }

  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(trimmed)) {
    return trimmed.replace(/:\d+$/, '');
  }

  return trimmed;
}

export function getRequestIPv4(request: Request) {
  const headerNames = [
    'x-forwarded-for',
    'cf-connecting-ip',
    'x-real-ip',
    'x-client-ip',
    'fly-client-ip',
  ];

  for (const headerName of headerNames) {
    const rawHeader = request.headers.get(headerName);
    if (!rawHeader) {
      continue;
    }

    const candidates = rawHeader
      .split(',')
      .map((part) => normalizeIpCandidate(part))
      .filter(Boolean);

    for (const candidate of candidates) {
      if (IPV4_PATTERN.test(candidate)) {
        return candidate;
      }
    }
  }

  return '';
}

export function getTebexHeaders(includeJsonContentType = true) {
  const publicToken = Deno.env.get('TEBEX_PUBLIC_TOKEN')?.trim() || '';
  const privateKey = Deno.env.get('TEBEX_PRIVATE_KEY')?.trim() || '';

  if ((publicToken && !privateKey) || (!publicToken && privateKey)) {
    throw new Error(
      'Tebex Headless authentication is partially configured. Set both TEBEX_PUBLIC_TOKEN and TEBEX_PRIVATE_KEY or remove both.',
    );
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (publicToken && privateKey) {
    headers.Authorization = `Basic ${btoa(`${publicToken}:${privateKey}`)}`;
  }

  return headers;
}

export async function readTebexPayload(response: Response) {
  try {
    return await response.json();
  } catch {
    try {
      const text = await response.text();
      return text ? { message: text } : {};
    } catch {
      return {};
    }
  }
}

export function extractTebexErrorMessage(payload: unknown, fallback: string) {
  const objectPayload =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

  const directMessageCandidates = [
    objectPayload.error_message,
    objectPayload.error,
    objectPayload.message,
    objectPayload.msg,
    objectPayload.detail,
  ];

  for (const candidate of directMessageCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  const details = objectPayload.details;
  if (details && typeof details === 'object') {
    const detailRecord = details as Record<string, unknown>;
    for (const key of ['error_message', 'error', 'message', 'msg', 'detail']) {
      const value = detailRecord[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }

  const errors = objectPayload.errors;
  if (Array.isArray(errors) && errors.length) {
    const firstError = errors[0];

    if (typeof firstError === 'string' && firstError.trim()) {
      return firstError.trim();
    }

    if (firstError && typeof firstError === 'object') {
      const errorRecord = firstError as Record<string, unknown>;
      for (const key of ['message', 'msg', 'detail', 'error']) {
        const value = errorRecord[key];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }

      const field = typeof errorRecord.field === 'string' ? errorRecord.field.trim() : '';
      const reason =
        typeof errorRecord.reason === 'string'
          ? errorRecord.reason.trim()
          : typeof errorRecord.code === 'string'
            ? errorRecord.code.trim()
            : '';

      if (field || reason) {
        return [field, reason].filter(Boolean).join(': ');
      }
    }
  }

  return fallback;
}
