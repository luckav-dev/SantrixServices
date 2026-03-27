import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type JsonLdObject = Record<string, unknown>;
type JsonLdValue = JsonLdObject | JsonLdObject[];

interface PageSeoProps {
  title: string;
  description: string;
  image?: string | null;
  imageAlt?: string;
  type?: 'website' | 'article' | 'product';
  canonicalPath?: string;
  noindex?: boolean;
  keywords?: string[];
  jsonLd?: JsonLdValue;
  themeColor?: string;
  siteName?: string;
}

function getSiteOrigin() {
  const configured = import.meta.env.VITE_SITE_URL?.trim().replace(/\/+$/, '');
  if (configured) {
    return configured;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }

  return 'http://localhost:5173';
}

export function buildAbsoluteUrl(path = '/') {
  try {
    return new URL(path, `${getSiteOrigin()}/`).toString();
  } catch {
    return `${getSiteOrigin()}/`;
  }
}

export function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function dedupeKeywords(keywords: string[] | undefined) {
  if (!keywords?.length) {
    return '';
  }

  return Array.from(
    new Set(
      keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  ).join(', ');
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string | null) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!content) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string | null) {
  const selector = `link[rel="${rel}"]`;
  let element = document.head.querySelector(selector) as HTMLLinkElement | null;

  if (!href) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function upsertJsonLd(jsonLd: JsonLdValue | undefined) {
  const selector = 'script[data-seo-jsonld="page"]';
  const existing = document.head.querySelector(selector) as HTMLScriptElement | null;

  if (!jsonLd) {
    existing?.remove();
    return;
  }

  const script = existing ?? document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.seoJsonld = 'page';
  script.textContent = JSON.stringify(jsonLd);

  if (!existing) {
    document.head.appendChild(script);
  }
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(item.path),
    })),
  };
}

export function buildOrganizationJsonLd(args: {
  name: string;
  description: string;
  logo?: string | null;
  sameAs?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: args.name,
    description: cleanText(args.description),
    url: buildAbsoluteUrl('/'),
    logo: args.logo ? buildAbsoluteUrl(args.logo) : undefined,
    sameAs: args.sameAs?.filter((href) => /^https?:\/\//i.test(href)),
  };
}

export function buildWebsiteJsonLd(args: {
  name: string;
  description: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: args.name,
    url: buildAbsoluteUrl('/'),
    description: cleanText(args.description),
  };
}

export function PageSeo({
  title,
  description,
  image,
  imageAlt,
  type = 'website',
  canonicalPath,
  noindex = false,
  keywords,
  jsonLd,
  themeColor,
  siteName,
}: PageSeoProps) {
  const location = useLocation();

  useEffect(() => {
    const finalDescription = cleanText(description);
    const canonicalUrl = buildAbsoluteUrl(canonicalPath ?? location.pathname);
    const imageUrl = image ? buildAbsoluteUrl(image) : null;
    const finalKeywords = dedupeKeywords(keywords);
    const robots = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';

    document.title = title;
    document.documentElement.lang = 'en';

    upsertMeta('name', 'description', finalDescription);
    upsertMeta('name', 'robots', robots);
    upsertMeta('name', 'keywords', finalKeywords || null);
    upsertMeta('name', 'theme-color', themeColor ?? null);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', finalDescription);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:image:alt', imageAlt ?? null);
    upsertMeta('property', 'og:site_name', siteName ?? null);
    upsertMeta('name', 'twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', finalDescription);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertLink('canonical', canonicalUrl);
    upsertJsonLd(jsonLd);
  }, [
    canonicalPath,
    description,
    image,
    imageAlt,
    jsonLd,
    keywords,
    location.pathname,
    noindex,
    siteName,
    themeColor,
    title,
    type,
  ]);

  return null;
}
