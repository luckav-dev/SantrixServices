export function sanitizeOptionalMediaSrc(value?: string | null) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function hasOptionalMedia(value?: string | null) {
  return Boolean(sanitizeOptionalMediaSrc(value));
}

export function getEmbedMediaSrc(value?: string | null) {
  const safeSrc = sanitizeOptionalMediaSrc(value);

  if (!safeSrc) {
    return null;
  }

  try {
    const url = new URL(safeSrc);
    const hostname = url.hostname.replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      const videoId = url.pathname.replace(/\//g, '');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : safeSrc;
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        const videoId = url.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : safeSrc;
      }

      if (url.pathname.startsWith('/shorts/')) {
        const videoId = url.pathname.split('/').filter(Boolean)[1];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : safeSrc;
      }

      if (url.pathname.startsWith('/embed/')) {
        return safeSrc;
      }
    }

    if (hostname === 'vimeo.com') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : safeSrc;
    }

    return safeSrc;
  } catch {
    return safeSrc;
  }
}
