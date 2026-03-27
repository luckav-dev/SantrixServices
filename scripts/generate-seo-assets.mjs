import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const tempDir = path.join(rootDir, 'node_modules', '.tmp', 'seo-generator');
const siteUrl = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'http://localhost:5173').replace(/\/+$/, '');
const storeDataPath = path.join(rootDir, 'src', 'data', 'store-data.json');
const siteConfigPath = path.join(rootDir, 'src', 'site-config.ts');
const siteContentPath = path.join(rootDir, 'src', 'site-content.ts');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function loadSiteConfig() {
  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(
    path.join(tempDir, 'package.json'),
    JSON.stringify({ type: 'commonjs' }, null, 2),
    'utf8',
  );

  for (const [input, outputName] of [
    [siteContentPath, 'site-content.js'],
    [siteConfigPath, 'site-config.js'],
  ]) {
    const source = await fs.readFile(input, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: input,
    });

    await fs.writeFile(path.join(tempDir, outputName), output.outputText, 'utf8');
  }

  const require = createRequire(import.meta.url);
  const { buildDefaultSiteConfig } = require(path.join(tempDir, 'site-config.js'));
  return buildDefaultSiteConfig();
}

async function loadStorefront() {
  const raw = await fs.readFile(storeDataPath, 'utf8');
  return JSON.parse(raw);
}

function absolute(pathname) {
  return new URL(pathname, `${siteUrl}/`).toString();
}

function buildRobotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /login
Disallow: /account
Disallow: /checkout/
Disallow: /auth/callback

Sitemap: ${absolute('/sitemap.xml')}
`;
}

function buildSitemapXml(storefront) {
  const urls = new Map();
  const generatedAt = storefront.generatedAt ? new Date(storefront.generatedAt).toISOString() : new Date().toISOString();

  const push = (pathname, priority, changefreq) => {
    urls.set(pathname, { pathname, priority, changefreq, lastmod: generatedAt });
  };

  push('/', '1.0', 'daily');
  push('/terms-conditions-and-refund-policy', '0.4', 'monthly');

  for (const category of storefront.categories ?? []) {
    if (category?.id) {
      push(`/category/${category.id}`, '0.8', 'weekly');
    }
  }

  for (const product of storefront.products ?? []) {
    if (product?.slug) {
      push(`/package/${product.slug}`, '0.7', 'weekly');
    }
  }

  const entries = Array.from(urls.values())
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(absolute(entry.pathname))}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

async function buildManifest(siteConfig) {
  const manifest = {
    name: siteConfig.studioName,
    short_name: siteConfig.brandName,
    description: siteConfig.homeHero.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0b',
    theme_color: siteConfig.theme.primaryColor,
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };

  return JSON.stringify(manifest, null, 2);
}

const [siteConfig, storefront] = await Promise.all([loadSiteConfig(), loadStorefront()]);

await fs.mkdir(publicDir, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(publicDir, 'robots.txt'), buildRobotsTxt(), 'utf8'),
  fs.writeFile(path.join(publicDir, 'sitemap.xml'), buildSitemapXml(storefront), 'utf8'),
  fs.writeFile(path.join(publicDir, 'site.webmanifest'), await buildManifest(siteConfig), 'utf8'),
]);

console.log('SEO assets written to public/.');
