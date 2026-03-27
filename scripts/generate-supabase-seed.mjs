import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const rootDir = process.cwd();
const tempDir = path.join(rootDir, 'node_modules', '.tmp', 'seed-generator');
const storeId = process.env.STOREFRONT_SEED_ID || 'default';
const outputPath = path.join(rootDir, 'supabase', 'seed_storefront_default.sql');
const setupOutputPath = path.join(rootDir, 'supabase', 'setup.sql');
const migrationPaths = [
  path.join(rootDir, 'supabase', 'migrations', '20260324_storefront_states.sql'),
  path.join(rootDir, 'supabase', 'migrations', '20260324_storefront_admin_security.sql'),
  path.join(rootDir, 'supabase', 'migrations', '20260324_storefront_customer_orders.sql'),
  path.join(rootDir, 'supabase', 'migrations', '20260324_storefront_payments.sql'),
  path.join(rootDir, 'supabase', 'migrations', '20260324_storefront_customer_identities.sql'),
  path.join(rootDir, 'supabase', 'migrations', '20260324_storefront_reviews_public_commerce.sql'),
];

const transpileTargets = [
  {
    input: path.join(rootDir, 'src', 'site-content.ts'),
    output: path.join(tempDir, 'site-content.js'),
  },
  {
    input: path.join(rootDir, 'src', 'site-config.ts'),
    output: path.join(tempDir, 'site-config.js'),
  },
];

const suspiciousEncodingPattern = /[ÂÃâ]/;

function fixMojibake(value) {
  if (!suspiciousEncodingPattern.test(value)) {
    return value;
  }

  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? value : decoded;
}

function sanitizeValue(value) {
  if (typeof value === 'string') {
    return fixMojibake(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeValue(entry)]),
    );
  }

  return value;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

async function loadSiteConfig() {
  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(
    path.join(tempDir, 'package.json'),
    JSON.stringify({ type: 'commonjs' }, null, 2),
    'utf8',
  );

  for (const target of transpileTargets) {
    const source = await fs.readFile(target.input, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: target.input,
    });

    await fs.writeFile(target.output, output.outputText, 'utf8');
  }

  const require = createRequire(import.meta.url);
  const { buildDefaultSiteConfig } = require(path.join(tempDir, 'site-config.js'));
  const siteConfig = sanitizeValue(buildDefaultSiteConfig());
  delete siteConfig.adminAccess;
  return siteConfig;
}

async function loadStorefront() {
  const source = await fs.readFile(
    path.join(rootDir, 'src', 'data', 'store-data.json'),
    'utf8',
  );
  return sanitizeValue(JSON.parse(source));
}

function buildInsertRows(items, keyField, payloadField) {
  return items
    .map((item, index) =>
      `  (${sqlString(storeId)}, ${sqlString(item[keyField])}, ${index}, ${sqlJson(item)}, timezone('utc', now()))`,
    )
    .join(',\n');
}

function buildSql(storefront, siteConfig) {
  const categoryRows = buildInsertRows(storefront.categories, 'id', 'category');
  const productRows = buildInsertRows(storefront.products, 'slug', 'product');

  return `-- Generated from the current storefront source files.
-- If your store id is not "default", replace it below or regenerate with:
-- STOREFRONT_SEED_ID=your-store-id node scripts/generate-supabase-seed.mjs

begin;

insert into public.storefront_settings (store_id, site_config_public, updated_at)
values (
  ${sqlString(storeId)},
  ${sqlJson(siteConfig)},
  timezone('utc', now())
)
on conflict (store_id) do update
set
  site_config_public = excluded.site_config_public,
  updated_at = excluded.updated_at;

insert into public.storefront_home (store_id, home, updated_at)
values (
  ${sqlString(storeId)},
  ${sqlJson(storefront.home)},
  timezone('utc', now())
)
on conflict (store_id) do update
set
  home = excluded.home,
  updated_at = excluded.updated_at;

insert into public.storefront_meta (store_id, generated_at, featured_slugs, updated_at)
values (
  ${sqlString(storeId)},
  ${sqlString(storefront.generatedAt)},
  ${sqlJson(storefront.featuredSlugs)},
  timezone('utc', now())
)
on conflict (store_id) do update
set
  generated_at = excluded.generated_at,
  featured_slugs = excluded.featured_slugs,
  updated_at = excluded.updated_at;

delete from public.storefront_categories where store_id = ${sqlString(storeId)};

insert into public.storefront_categories (store_id, id, position, category, updated_at)
values
${categoryRows};

delete from public.storefront_products where store_id = ${sqlString(storeId)};

insert into public.storefront_products (store_id, slug, position, product, updated_at)
values
${productRows};

commit;

-- Optional admin membership example:
-- insert into public.storefront_admin_members (store_id, user_id, role)
-- values (${sqlString(storeId)}, 'YOUR-AUTH-USER-UUID', 'owner')
-- on conflict (store_id, user_id) do update
-- set role = excluded.role, updated_at = timezone('utc', now());
`;
}

async function buildSetupSql(seedSql) {
  const sections = await Promise.all(
    migrationPaths.map(async (migrationPath) => fs.readFile(migrationPath, 'utf8')),
  );

  return `-- Combined Supabase setup for the current storefront.
-- Includes: base schema, admin security, commerce schema and current storefront seed.
-- If your store id is not "default", regenerate with:
-- STOREFRONT_SEED_ID=your-store-id node scripts/generate-supabase-seed.mjs

${sections[0].trim()}

${sections[1].trim()}

${sections[2].trim()}

${sections[3].trim()}

${sections[4].trim()}

${sections[5].trim()}

${seedSql.trim()}
`;
}

const [siteConfig, storefront] = await Promise.all([
  loadSiteConfig(),
  loadStorefront(),
]);

const sql = buildSql(storefront, siteConfig);
await fs.writeFile(outputPath, sql, 'utf8');
const setupSql = await buildSetupSql(sql);
await fs.writeFile(setupOutputPath, setupSql, 'utf8');
console.log(`Seed SQL written to ${outputPath}`);
console.log(`Setup SQL written to ${setupOutputPath}`);
