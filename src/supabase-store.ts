import { type RealtimeChannel } from '@supabase/supabase-js';
import type { SiteConfig } from './site-config';
import type { StorefrontData } from './store';
import {
  getAdminSupabaseClient,
  getPublicSupabaseClient,
  hasSupabaseSync,
  supabaseStoreId,
} from './supabase';

const TABLES = {
  settings: 'storefront_settings',
  home: 'storefront_home',
  meta: 'storefront_meta',
  categories: 'storefront_categories',
  products: 'storefront_products',
} as const;

interface StorefrontSettingsRow {
  store_id: string;
  site_config_public: unknown;
  updated_at: string | null;
}

interface StorefrontHomeRow {
  store_id: string;
  home: unknown;
  updated_at: string | null;
}

interface StorefrontMetaRow {
  store_id: string;
  generated_at: string;
  featured_slugs: unknown;
  updated_at: string | null;
}

interface StorefrontCategoryRow {
  store_id: string;
  id: string;
  position: number;
  category: unknown;
  updated_at: string | null;
}

interface StorefrontProductRow {
  store_id: string;
  slug: string;
  position: number;
  product: unknown;
  updated_at: string | null;
}

export interface RemoteStoreSnapshot {
  storefront: StorefrontData;
  siteConfig: Partial<SiteConfig>;
  updatedAt: string | null;
}

async function syncCollectionTable<T extends object>(args: {
  table: string;
  idField: 'id' | 'slug';
  payloadField: 'category' | 'product';
  rows: T[];
}) {
  const client = getAdminSupabaseClient();
  if (!client) {
    return;
  }

  const { table, idField, payloadField, rows } = args;
  const { data: existingRows, error: existingError } = await client
    .from(table)
    .select(idField)
    .eq('store_id', supabaseStoreId);

  if (existingError) {
    throw existingError;
  }

  const nextIds = rows.map((row) => String((row as Record<string, unknown>)[idField]));
  const staleIds = ((existingRows ?? []) as Array<Record<string, string>>)
    .map((row) => row[idField])
    .filter((value) => !nextIds.includes(value));

  if (rows.length) {
    const payload = rows.map((row, index) => ({
      store_id: supabaseStoreId,
      [idField]: (row as Record<string, unknown>)[idField],
      position: index,
      [payloadField]: row,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client
      .from(table)
      .upsert(payload, { onConflict: `store_id,${idField}` });

    if (error) {
      throw error;
    }
  }

  if (staleIds.length) {
    const { error } = await client
      .from(table)
      .delete()
      .eq('store_id', supabaseStoreId)
      .in(idField, staleIds);

    if (error) {
      throw error;
    }
  }
}

export async function fetchRemoteStoreSnapshot() {
  const client = getPublicSupabaseClient();
  if (!client) {
    return null;
  }

  const [
    settingsResponse,
    homeResponse,
    metaResponse,
    categoriesResponse,
    productsResponse,
  ] = await Promise.all([
    client
      .from(TABLES.settings)
      .select('store_id, site_config_public, updated_at')
      .eq('store_id', supabaseStoreId)
      .maybeSingle(),
    client
      .from(TABLES.home)
      .select('store_id, home, updated_at')
      .eq('store_id', supabaseStoreId)
      .maybeSingle(),
    client
      .from(TABLES.meta)
      .select('store_id, generated_at, featured_slugs, updated_at')
      .eq('store_id', supabaseStoreId)
      .maybeSingle(),
    client
      .from(TABLES.categories)
      .select('store_id, id, position, category, updated_at')
      .eq('store_id', supabaseStoreId)
      .order('position', { ascending: true }),
    client
      .from(TABLES.products)
      .select('store_id, slug, position, product, updated_at')
      .eq('store_id', supabaseStoreId)
      .order('position', { ascending: true }),
  ]);

  if (settingsResponse.error) {
    throw settingsResponse.error;
  }
  if (homeResponse.error) {
    throw homeResponse.error;
  }
  if (metaResponse.error) {
    throw metaResponse.error;
  }
  if (categoriesResponse.error) {
    throw categoriesResponse.error;
  }
  if (productsResponse.error) {
    throw productsResponse.error;
  }

  const settings = settingsResponse.data as StorefrontSettingsRow | null;
  const home = homeResponse.data as StorefrontHomeRow | null;
  const meta = metaResponse.data as StorefrontMetaRow | null;
  const categories = (categoriesResponse.data ?? []) as StorefrontCategoryRow[];
  const products = (productsResponse.data ?? []) as StorefrontProductRow[];

  const hasRemoteState =
    Boolean(settings) ||
    Boolean(home) ||
    Boolean(meta) ||
    categories.length > 0 ||
    products.length > 0;

  if (!hasRemoteState) {
    return null;
  }

  return {
    storefront: {
      generatedAt: meta?.generated_at ?? new Date().toISOString(),
      featuredSlugs: Array.isArray(meta?.featured_slugs) ? (meta?.featured_slugs as string[]) : [],
      home: (home?.home ?? {}) as StorefrontData['home'],
      categories: categories.map((row) => row.category as StorefrontData['categories'][number]),
      products: products.map((row) => row.product as StorefrontData['products'][number]),
    },
    siteConfig: (settings?.site_config_public ?? {}) as Partial<SiteConfig>,
    updatedAt:
      settings?.updated_at ??
      home?.updated_at ??
      meta?.updated_at ??
      categories[0]?.updated_at ??
      products[0]?.updated_at ??
      null,
  };
}

export async function saveRemoteStoreSnapshot(payload: {
  storefront: StorefrontData;
  siteConfig: unknown;
}) {
  const client = getAdminSupabaseClient();
  if (!client) {
    return null;
  }

  const timestamp = new Date().toISOString();

  const settingsPromise = client.from(TABLES.settings).upsert(
    {
      store_id: supabaseStoreId,
      site_config_public: payload.siteConfig,
      updated_at: timestamp,
    },
    { onConflict: 'store_id' },
  );

  const homePromise = client.from(TABLES.home).upsert(
    {
      store_id: supabaseStoreId,
      home: payload.storefront.home,
      updated_at: timestamp,
    },
    { onConflict: 'store_id' },
  );

  const metaPromise = client.from(TABLES.meta).upsert(
    {
      store_id: supabaseStoreId,
      generated_at: payload.storefront.generatedAt,
      featured_slugs: payload.storefront.featuredSlugs,
      updated_at: timestamp,
    },
    { onConflict: 'store_id' },
  );

  const [settingsResult, homeResult, metaResult] = await Promise.all([
    settingsPromise,
    homePromise,
    metaPromise,
    syncCollectionTable({
      table: TABLES.categories,
      idField: 'id',
      payloadField: 'category',
      rows: payload.storefront.categories,
    }),
    syncCollectionTable({
      table: TABLES.products,
      idField: 'slug',
      payloadField: 'product',
      rows: payload.storefront.products,
    }),
  ]);

  if (settingsResult.error) {
    throw settingsResult.error;
  }
  if (homeResult.error) {
    throw homeResult.error;
  }
  if (metaResult.error) {
    throw metaResult.error;
  }

  return {
    storefront: payload.storefront,
    siteConfig: payload.siteConfig as Partial<SiteConfig>,
    updatedAt: timestamp,
  };
}

export function subscribeToRemoteStoreSnapshot(onChange: (payload: RemoteStoreSnapshot) => void) {
  const client = getPublicSupabaseClient();
  if (!client || !hasSupabaseSync()) {
    return () => undefined;
  }

  let refreshTimer: number | null = null;

  function scheduleRefresh() {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
    }

    refreshTimer = window.setTimeout(() => {
      void fetchRemoteStoreSnapshot()
        .then((snapshot) => {
          if (snapshot) {
            onChange(snapshot);
          }
        })
        .catch((error) => {
          console.error('Supabase realtime refresh failed.', error);
        });
    }, 140);
  }

  const channel: RealtimeChannel = client
    .channel(`storefront-sync:${supabaseStoreId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: TABLES.settings,
      filter: `store_id=eq.${supabaseStoreId}`,
    }, scheduleRefresh)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: TABLES.home,
      filter: `store_id=eq.${supabaseStoreId}`,
    }, scheduleRefresh)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: TABLES.meta,
      filter: `store_id=eq.${supabaseStoreId}`,
    }, scheduleRefresh)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: TABLES.categories,
      filter: `store_id=eq.${supabaseStoreId}`,
    }, scheduleRefresh)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: TABLES.products,
      filter: `store_id=eq.${supabaseStoreId}`,
    }, scheduleRefresh)
    .subscribe();

  return () => {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
    }
    void client.removeChannel(channel);
  };
}
