import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StoreContext } from './store-context';
import {
  buildDefaultSiteConfig,
  type CustomerAuthProviderId,
  type SiteConfig,
} from './site-config';
import type {
  PublicPaymentFeedEntry,
  StorefrontMetrics,
  StorefrontReview,
} from './commerce-types';
import {
  fetchPublicCommerceSnapshot,
  subscribeToPublicCommerceSnapshot,
} from './supabase-public-commerce';
import {
  fetchRemoteStoreSnapshot,
  saveRemoteStoreSnapshot,
  subscribeToRemoteStoreSnapshot,
} from './supabase-store';
import { hasSupabaseSync } from './supabase';
import {
  restoreRemoteAdminSession,
  signInAdminWithPassword,
  signInAdminWithOAuth,
  signOutRemoteAdmin,
  subscribeToRemoteAdminSession,
  type RemoteAdminSession,
} from './supabase-admin';
import {
  fetchCustomerReviewState,
  linkRemoteCustomerIdentity,
  restoreRemoteCustomerSession,
  signInStorefrontCustomer,
  signInStorefrontCustomerWithOAuth,
  startFiveMHeadlessLogin,
  signOutRemoteCustomer,
  subscribeToRemoteCustomerSession,
  subscribeToCustomerReviewState,
  type RemoteCustomerSession,
  upsertRemoteProductReview,
} from './supabase-customer';
import {
  startRemoteCheckout,
} from './supabase-checkout';

export type CurrencyCode =
  | 'AUD'
  | 'BRL'
  | 'CAD'
  | 'DKK'
  | 'EUR'
  | 'GBP'
  | 'NOK'
  | 'NZD'
  | 'PLN'
  | 'SEK'
  | 'TRY'
  | 'USD';

export interface FeaturedProduct {
  slug: string;
  title: string;
  fullTitle: string;
  image: string;
  priceText: string;
  oldPriceText: string;
  discountText: string;
  frameworks: string[];
  priceValue: number;
  oldPriceValue: number;
}

export interface Category {
  id: string;
  label: string;
  url: string;
  description: string;
  heading: string;
  productSlugs: string[];
  showInNavigation?: boolean;
}

export type ProductCheckoutProvider = 'tebex' | 'paypal' | 'stripe' | 'external';

export interface Product {
  categoryId: string;
  categoryLabel: string;
  title: string;
  fullTitle: string;
  slug: string;
  href: string;
  image: string;
  excerpt: string;
  descriptionHtml: string;
  features: string[];
  frameworks: string[];
  priceText: string;
  oldPriceText: string;
  discountText: string;
  previewLink: string;
  documentationLink: string;
  openVersionId: string;
  escrowVersionId: string;
  gallery: string[];
  priceValue: number;
  oldPriceValue: number;
  categories: string[];
  checkoutProvider: ProductCheckoutProvider;
  requiresIdentity: boolean;
  tebexPackageId: string;
  tebexServerId: string;
  externalCheckoutUrl: string;
}

export interface CartLine {
  product: Product;
  quantity: number;
  subtotalEur: number;
}

export interface HomeData {
  hero: {
    title: string;
    description: string;
  };
  featuredProducts: FeaturedProduct[];
  recentPayments: Array<{
    name: string;
    time: string;
    amount: string;
  }>;
  videos: Array<{
    name: string;
    url: string;
  }>;
}

export interface StorefrontData {
  generatedAt: string;
  featuredSlugs: string[];
  home: HomeData;
  categories: Category[];
  products: Product[];
}

interface LoggedUser {
  id?: string;
  name: string;
  email?: string | null;
  provider: string;
  authMode?: 'local' | 'supabase';
  isAnonymous?: boolean;
}

interface AdminSession {
  username: string;
  loggedInAt: string;
  email?: string;
  role?: string;
  authMode?: 'local' | 'supabase';
}

type Updater<T> = T | ((current: T) => T);

export interface StoreContextValue {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  categories: Category[];
  products: Product[];
  featuredProducts: Product[];
  featuredSlugs: string[];
  home: HomeData;
  siteConfig: SiteConfig;
  commerceMetrics: StorefrontMetrics;
  recentOrders: PublicPaymentFeedEntry[];
  recentReviews: StorefrontReview[];
  purchasedProductSlugs: string[];
  myReviews: StorefrontReview[];
  isStorefrontReady: boolean;
  isAssetsReady: boolean;
  setIsAssetsReady: (ready: boolean) => void;
  isCustomerAuthReady: boolean;
  storefrontSource: 'supabase' | 'local';
  updateSiteConfig: (next: Updater<SiteConfig>) => void;
  resetSiteConfig: () => void;
  updateHome: (next: Updater<HomeData>) => void;
  cartLines: CartLine[];
  cartCount: number;
  subtotalEur: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (slug: string) => void;
  removeFromCart: (slug: string) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
  user: LoggedUser | null;
  login: (
    providerId?: CustomerAuthProviderId,
    options?: { name?: string; redirectPath?: string },
  ) => Promise<{ ok: boolean; message?: string }>;
  completeFiveMLogin: (args: {
    providerUserId?: string;
    providerUsername: string;
    metadata?: Record<string, unknown>;
  }) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  completeCheckout: () => Promise<{
    ok: boolean;
    orderId?: string;
    message?: string;
    redirectUrl?: string;
    provider?: ProductCheckoutProvider;
  }>;
  canReviewProduct: (slug: string) => boolean;
  submitReview: (args: {
    productSlug: string;
    productTitle: string;
    rating: number;
    quote: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  adminSession: AdminSession | null;
  isAdminAuthReady: boolean;
  isRemoteAdminAuth: boolean;
  loginAdmin: (
    username: string,
    password: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  loginAdminWithOAuth: (
    provider: 'google' | 'discord',
  ) => Promise<{ ok: boolean; message?: string }>;
  logoutAdmin: () => Promise<void>;
  getProduct: (slug: string) => Product | undefined;
  getCategory: (id: string) => Category | undefined;
  upsertCategory: (category: Category) => void;
  renameCategoryId: (currentId: string, nextId: string) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, direction: 'up' | 'down') => void;
  upsertProduct: (product: Product) => void;
  deleteProduct: (slug: string) => void;
  moveProduct: (slug: string, direction: 'up' | 'down') => void;
  toggleFeaturedProduct: (slug: string) => void;
}

const STORAGE_KEYS = {
  currency: '0resmon.currency',
  cart: '0resmon.cart',
  user: '0resmon.user',
  storefront: '0resmon.storefront-data',
  siteConfig: '0resmon.site-config',
  adminSession: '0resmon.admin-session',
} as const;

const defaultSiteConfig = buildDefaultSiteConfig();
const emptyCommerceMetrics: StorefrontMetrics = {
  salesCount: 0,
  revenueEur: 0,
  reviewsCount: 0,
  averageRating: 0,
};

export const currencies: Array<{ code: CurrencyCode; label: string; rate: number }> = [
  { code: 'AUD', label: 'AUD', rate: 1.67 },
  { code: 'BRL', label: 'BRL', rate: 5.42 },
  { code: 'CAD', label: 'CAD', rate: 1.48 },
  { code: 'DKK', label: 'DKK', rate: 7.46 },
  { code: 'EUR', label: 'EUR', rate: 1 },
  { code: 'GBP', label: 'GBP', rate: 0.86 },
  { code: 'NOK', label: 'NOK', rate: 11.51 },
  { code: 'NZD', label: 'NZD', rate: 1.82 },
  { code: 'PLN', label: 'PLN', rate: 4.31 },
  { code: 'SEK', label: 'SEK', rate: 11.2 },
  { code: 'TRY', label: 'TRY', rate: 35.41 },
  { code: 'USD', label: 'USD', rate: 1.09 },
];

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createEmptyStorefrontData(): StorefrontData {
  return {
    generatedAt: new Date().toISOString(),
    featuredSlugs: [],
    home: {
      hero: {
        title: '',
        description: '',
      },
      featuredProducts: [],
      recentPayments: [],
      videos: [],
    },
    categories: [],
    products: [],
  };
}

function toPublicSiteConfig(value: SiteConfig) {
  const { adminAccess: _adminAccess, ...publicConfig } = cloneData(value);
  return publicConfig;
}

function serializeSyncedState(storefront: StorefrontData, siteConfig: SiteConfig) {
  return JSON.stringify({
    storefront,
    siteConfig: toPublicSiteConfig(siteConfig),
  });
}

function normalizeStoredAdminSession(value: AdminSession | null): AdminSession | null {
  if (!value) {
    return null;
  }

  return {
    ...value,
    authMode: value.authMode ?? 'local',
  };
}

function normalizeStoredUser(value: LoggedUser | null): LoggedUser | null {
  if (!value) {
    return null;
  }

  return {
    ...value,
    authMode: value.authMode ?? 'local',
  };
}

function mapRemoteAdminSession(value: RemoteAdminSession): AdminSession {
  return {
    username: value.email,
    email: value.email,
    role: value.role,
    loggedInAt: value.loggedInAt,
    authMode: 'supabase',
  };
}

function mapRemoteCustomerSession(value: RemoteCustomerSession): LoggedUser {
  return {
    id: value.userId,
    name: value.displayName,
    email: value.email,
    provider: value.provider,
    authMode: 'supabase',
    isAnonymous: value.isAnonymous,
  };
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures so the storefront still works.
  }
}

function updateValue<T>(current: T, next: Updater<T>) {
  return typeof next === 'function' ? (next as (value: T) => T)(current) : next;
}

function mergeReviewsById(...collections: StorefrontReview[][]) {
  const next = new Map<string, StorefrontReview>();

  for (const collection of collections) {
    for (const review of collection) {
      next.set(review.id, review);
    }
  }

  return Array.from(next.values()).sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function normalizeReturnPath(value?: string) {
  if (!value || !value.startsWith('/')) {
    return '/';
  }

  return value;
}

function normalizeCategory(category: Category): Category {
  return {
    id: category.id,
    label: category.label,
    url: category.url || getCategoryHref(category.id),
    description: category.description,
    heading: category.heading || `Browse ${category.label}`,
    productSlugs: [...category.productSlugs],
    showInNavigation: category.showInNavigation ?? true,
  };
}

function buildPriceText(amount: number) {
  if (!amount) {
    return '';
  }

  return `€${amount.toFixed(2)}`;
}

function inferProductCheckoutProvider(product: Partial<Product>): ProductCheckoutProvider {
  if (
    product.checkoutProvider === 'paypal' ||
    product.checkoutProvider === 'stripe' ||
    product.checkoutProvider === 'external'
  ) {
    return product.checkoutProvider;
  }

  const tebexCandidate =
    product.tebexPackageId ||
    product.escrowVersionId ||
    product.openVersionId ||
    (typeof product.href === 'string' && product.href.includes('tebex.io/package')
      ? product.href
      : '');

  if (tebexCandidate) {
    return 'tebex';
  }

  if (product.externalCheckoutUrl) {
    return 'external';
  }

  return 'paypal';
}

function normalizeProduct(product: Product, categories: Category[]): Product {
  const firstCategoryId = product.categories[0] ?? product.categoryId ?? categories[0]?.id ?? '';
  const category = categories.find((entry) => entry.id === firstCategoryId);
  const priceValue = Number(product.priceValue) || 0;
  const oldPriceValue = Number(product.oldPriceValue) || 0;
  const checkoutProvider = inferProductCheckoutProvider(product);
  const tebexPackageId =
    product.tebexPackageId ||
    product.escrowVersionId ||
    product.openVersionId ||
    '';
  const discountText =
    product.discountText ||
    (oldPriceValue > priceValue && oldPriceValue > 0
      ? `-${Math.round(((oldPriceValue - priceValue) / oldPriceValue) * 100)}%`
      : '');

  return {
    ...product,
    categoryId: firstCategoryId,
    categoryLabel: category?.label ?? product.categoryLabel ?? 'Products',
    fullTitle: product.fullTitle || product.title,
    href: getProductHref(product.slug),
    image: product.image,
    excerpt: product.excerpt || '',
    descriptionHtml: product.descriptionHtml || '',
    features: [...(product.features ?? [])],
    frameworks: [...(product.frameworks ?? [])],
    priceText: product.priceText || buildPriceText(priceValue),
    oldPriceText: product.oldPriceText || buildPriceText(oldPriceValue),
    discountText,
    previewLink: product.previewLink || '',
    documentationLink: product.documentationLink || '',
    openVersionId: product.openVersionId || '',
    escrowVersionId: product.escrowVersionId || '',
    gallery: [...(product.gallery ?? [])],
    priceValue,
    oldPriceValue,
    categories: [...new Set(product.categories?.length ? product.categories : [firstCategoryId])],
    checkoutProvider,
    requiresIdentity:
      typeof product.requiresIdentity === 'boolean'
        ? product.requiresIdentity
        : checkoutProvider === 'tebex' && Boolean(tebexPackageId),
    tebexPackageId,
    tebexServerId: product.tebexServerId || '',
    externalCheckoutUrl:
      product.externalCheckoutUrl ||
      (checkoutProvider === 'external' ? product.href || '' : ''),
  };
}

function getCartCheckoutProviders(cartLines: CartLine[]) {
  return Array.from(new Set(cartLines.map((line) => line.product.checkoutProvider)));
}

function syncCategoryProductSlugs(categories: Category[], products: Product[]) {
  return categories.map((category) => ({
    ...category,
    productSlugs: products
      .filter((product) => product.categories.includes(category.id))
      .map((product) => product.slug),
  }));
}

function normalizeStorefrontData(value: StorefrontData): StorefrontData {
  const categories = value.categories.map(normalizeCategory);
  const products = value.products.map((product) => normalizeProduct(product, categories));
  const syncedCategories = syncCategoryProductSlugs(categories, products);
  const validSlugs = new Set(products.map((product) => product.slug));
  const featuredSlugs = value.featuredSlugs.filter((slug) => validSlugs.has(slug));

  return {
    generatedAt: value.generatedAt,
    featuredSlugs,
    home: {
      hero: {
        title: value.home.hero.title,
        description: value.home.hero.description,
      },
      featuredProducts: [...value.home.featuredProducts],
      recentPayments: [...value.home.recentPayments],
      videos: [...value.home.videos],
    },
    categories: syncedCategories,
    products,
  };
}

function mergeStoredConfig(
  stored: Partial<SiteConfig> | null,
  adminAccessOverride?: SiteConfig['adminAccess'],
): SiteConfig {
  if (!stored) {
    return {
      ...cloneData(defaultSiteConfig),
      adminAccess: cloneData(adminAccessOverride ?? defaultSiteConfig.adminAccess),
    };
  }

  const adminAccessBase = cloneData(adminAccessOverride ?? defaultSiteConfig.adminAccess);

  return {
    ...cloneData(defaultSiteConfig),
    ...stored,
    theme: {
      ...cloneData(defaultSiteConfig.theme),
      ...stored.theme,
    },
    brandAssets: {
      ...cloneData(defaultSiteConfig.brandAssets),
      ...stored.brandAssets,
    },
    header: {
      ...cloneData(defaultSiteConfig.header),
      ...stored.header,
      socialLinks: stored.header?.socialLinks?.length
        ? stored.header.socialLinks
        : cloneData(defaultSiteConfig.header.socialLinks),
    },
    discountBanner: {
      ...cloneData(defaultSiteConfig.discountBanner),
      ...stored.discountBanner,
    },
    entryPopup: {
      ...cloneData(defaultSiteConfig.entryPopup),
      ...stored.entryPopup,
      rows: stored.entryPopup?.rows?.length
        ? stored.entryPopup.rows.map((row) => ({ ...row }))
        : cloneData(defaultSiteConfig.entryPopup.rows),
    },
    homeHero: {
      ...cloneData(defaultSiteConfig.homeHero),
      ...stored.homeHero,
    },
    footer: {
      ...cloneData(defaultSiteConfig.footer),
      ...stored.footer,
      columns: stored.footer?.columns?.length
        ? stored.footer.columns
        : cloneData(defaultSiteConfig.footer.columns),
    },
    whyChooseUs: {
      ...cloneData(defaultSiteConfig.whyChooseUs),
      ...stored.whyChooseUs,
      items: stored.whyChooseUs?.items?.length
        ? stored.whyChooseUs.items
        : cloneData(defaultSiteConfig.whyChooseUs.items),
    },
    achievements: {
      ...cloneData(defaultSiteConfig.achievements),
      ...stored.achievements,
      stats: stored.achievements?.stats?.length
        ? stored.achievements.stats
        : cloneData(defaultSiteConfig.achievements.stats),
    },
    reviews: {
      ...cloneData(defaultSiteConfig.reviews),
      ...stored.reviews,
      cards: stored.reviews?.cards?.length
        ? stored.reviews.cards
        : cloneData(defaultSiteConfig.reviews.cards),
    },
    videos: {
      ...cloneData(defaultSiteConfig.videos),
      ...stored.videos,
      thumbs: stored.videos?.thumbs?.length
        ? stored.videos.thumbs
        : cloneData(defaultSiteConfig.videos.thumbs),
    },
    faq: {
      ...cloneData(defaultSiteConfig.faq),
      ...stored.faq,
      items: stored.faq?.items?.length ? stored.faq.items : cloneData(defaultSiteConfig.faq.items),
    },
    payments: {
      ...cloneData(defaultSiteConfig.payments),
      ...stored.payments,
      avatars: stored.payments?.avatars?.length
        ? stored.payments.avatars
        : cloneData(defaultSiteConfig.payments.avatars),
    },
    discordBanner: {
      ...cloneData(defaultSiteConfig.discordBanner),
      ...stored.discordBanner,
    },
    terms: {
      ...cloneData(defaultSiteConfig.terms),
      ...stored.terms,
      paragraphs: stored.terms?.paragraphs?.length
        ? stored.terms.paragraphs
        : cloneData(defaultSiteConfig.terms.paragraphs),
    },
    customerLogin: {
      ...cloneData(defaultSiteConfig.customerLogin),
      ...stored.customerLogin,
      providers: stored.customerLogin?.providers?.length
        ? stored.customerLogin.providers.map((provider) => ({ ...provider }))
        : cloneData(defaultSiteConfig.customerLogin.providers),
    },
    storeText: {
      ...cloneData(defaultSiteConfig.storeText),
      ...stored.storeText,
    },
    adminAccess: {
      ...adminAccessBase,
      ...stored.adminAccess,
    },
  };
}

function moveItem<T, K extends keyof T>(
  items: T[],
  key: K,
  value: T[K],
  direction: 'up' | 'down',
) {
  const index = items.findIndex((item) => item[key] === value);
  if (index === -1) {
    return items;
  }

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

export function formatPrice(amountEur: number, currency: CurrencyCode) {
  const currentCurrency = currencies.find((entry) => entry.code === currency) ?? currencies[4];
  const convertedAmount = amountEur * currentCurrency.rate;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertedAmount);
}

export function getProductHref(slug: string) {
  return `/package/${slug}`;
}

export function getCategoryHref(categoryId: string) {
  return `/category/${categoryId}`;
}

export function getPrimaryCategory(product: Product) {
  return product.categories[0] ?? product.categoryId;
}

// Context defined in store-context.tsx

export function StoreProvider({ children }: { children: ReactNode }) {
  const remoteSyncConfigured = hasSupabaseSync();
  const emptyStorefront = useRef(normalizeStorefrontData(createEmptyStorefrontData())).current;
  const initialLocalSiteConfig = useRef(
    remoteSyncConfigured
      ? cloneData(defaultSiteConfig)
      : mergeStoredConfig(readStorage<Partial<SiteConfig> | null>(STORAGE_KEYS.siteConfig, null)),
  ).current;
  const [currency, setCurrency] = useState<CurrencyCode>(() => readStorage(STORAGE_KEYS.currency, 'EUR'));
  const [cart, setCart] = useState<Record<string, number>>(() => readStorage(STORAGE_KEYS.cart, {}));
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState<LoggedUser | null>(() =>
    remoteSyncConfigured
      ? null
      : normalizeStoredUser(readStorage(STORAGE_KEYS.user, null)),
  );
  const [storefront, setStorefrontState] = useState<StorefrontData>(() =>
    remoteSyncConfigured
      ? cloneData(emptyStorefront)
      : normalizeStorefrontData(readStorage(STORAGE_KEYS.storefront, cloneData(emptyStorefront))),
  );
  const [siteConfig, setSiteConfigState] = useState<SiteConfig>(() => initialLocalSiteConfig);
  const [commerceMetrics, setCommerceMetrics] = useState<StorefrontMetrics>(emptyCommerceMetrics);
  const [recentOrders, setRecentOrders] = useState<PublicPaymentFeedEntry[]>([]);
  const [recentReviews, setRecentReviews] = useState<StorefrontReview[]>([]);
  const [purchasedProductSlugs, setPurchasedProductSlugs] = useState<string[]>([]);
  const [myReviews, setMyReviews] = useState<StorefrontReview[]>([]);
  const [isStorefrontReady, setIsStorefrontReady] = useState(false);
  const [isAssetsReady, setIsAssetsReady] = useState(false);
  const [isCustomerAuthReady, setIsCustomerAuthReady] = useState(() => !remoteSyncConfigured);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() =>
    remoteSyncConfigured
      ? null
      : normalizeStoredAdminSession(readStorage(STORAGE_KEYS.adminSession, null)),
  );
  const [isAdminAuthReady, setIsAdminAuthReady] = useState(() => !remoteSyncConfigured);
  const storefrontRef = useRef(storefront);
  const siteConfigRef = useRef(siteConfig);
  const adminSessionRef = useRef(adminSession);
  const adminAccessRef = useRef(cloneData(initialLocalSiteConfig.adminAccess));
  const remoteSyncReadyRef = useRef(false);
  const remoteSyncEnabledRef = useRef(remoteSyncConfigured);
  const lastSyncedSnapshotRef = useRef('');
  const remotePersistTimerRef = useRef<number | null>(null);

  function setStorefront(next: Updater<StorefrontData>) {
    const resolved = updateValue(storefrontRef.current, next);
    storefrontRef.current = resolved;
    setStorefrontState(resolved);
  }

  function setSiteConfig(next: Updater<SiteConfig>) {
    const resolved = mergeStoredConfig(updateValue(siteConfigRef.current, next));
    siteConfigRef.current = resolved;
    adminAccessRef.current = cloneData(resolved.adminAccess);
    setSiteConfigState(resolved);
  }

  useEffect(() => {
    writeStorage(STORAGE_KEYS.currency, currency);
  }, [currency]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cart, cart);
  }, [cart]);

  useEffect(() => {
    if (remoteSyncConfigured) {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.user);
      } catch {
        // Ignore storage cleanup failures in remote customer auth mode.
      }
      return;
    }

    writeStorage(STORAGE_KEYS.user, user);
  }, [user]);

  useEffect(() => {
    if (remoteSyncConfigured) {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.storefront);
      } catch {
        // Ignore storage cleanup failures in remote storefront mode.
      }
      return;
    }

    writeStorage(STORAGE_KEYS.storefront, storefront);
  }, [storefront]);

  useEffect(() => {
    if (remoteSyncConfigured) {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.siteConfig);
      } catch {
        // Ignore storage cleanup failures in remote storefront mode.
      }
      return;
    }

    writeStorage(STORAGE_KEYS.siteConfig, siteConfig);
  }, [siteConfig]);

  useEffect(() => {
    if (remoteSyncConfigured) {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.adminSession);
      } catch {
        // Ignore storage cleanup failures in remote auth mode.
      }
      return;
    }

    writeStorage(STORAGE_KEYS.adminSession, adminSession);
  }, [adminSession]);

  useEffect(() => {
    storefrontRef.current = storefront;
  }, [storefront]);

  useEffect(() => {
    siteConfigRef.current = siteConfig;
    adminAccessRef.current = cloneData(siteConfig.adminAccess);
  }, [siteConfig]);

  useEffect(() => {
    adminSessionRef.current = adminSession;
  }, [adminSession]);

  useEffect(() => {
    function syncAcrossTabs(event: StorageEvent) {
      if (event.key === STORAGE_KEYS.currency) {
        setCurrency(readStorage(STORAGE_KEYS.currency, 'EUR'));
      }

      if (event.key === STORAGE_KEYS.cart) {
        setCart(readStorage(STORAGE_KEYS.cart, {}));
      }

      if (!remoteSyncConfigured && event.key === STORAGE_KEYS.user) {
        setUser(normalizeStoredUser(readStorage(STORAGE_KEYS.user, null)));
      }

      if (!remoteSyncConfigured && event.key === STORAGE_KEYS.storefront) {
        setStorefront(
          normalizeStorefrontData(readStorage(STORAGE_KEYS.storefront, cloneData(emptyStorefront))),
        );
      }

      if (!remoteSyncConfigured && event.key === STORAGE_KEYS.siteConfig) {
        setSiteConfig(
          mergeStoredConfig(readStorage<Partial<SiteConfig> | null>(STORAGE_KEYS.siteConfig, null)),
        );
      }

      if (!remoteSyncConfigured && event.key === STORAGE_KEYS.adminSession) {
        setAdminSession(
          normalizeStoredAdminSession(readStorage(STORAGE_KEYS.adminSession, null)),
        );
      }
    }

    window.addEventListener('storage', syncAcrossTabs);
    return () => window.removeEventListener('storage', syncAcrossTabs);
  }, [emptyStorefront, remoteSyncConfigured]);

  useEffect(() => {
    if (!remoteSyncConfigured) {
      setIsCustomerAuthReady(true);
      return undefined;
    }

    let isActive = true;

    function applyRemoteCustomer(session: RemoteCustomerSession | null) {
      if (!isActive) {
        return;
      }

      setUser(session ? mapRemoteCustomerSession(session) : null);
      setIsCustomerAuthReady(true);
    }

    void restoreRemoteCustomerSession()
      .then((session) => {
        applyRemoteCustomer(session);
      })
      .catch((error) => {
        console.error('Supabase customer session restore failed.', error);
        applyRemoteCustomer(null);
      });

    const unsubscribe = subscribeToRemoteCustomerSession((session) => {
      applyRemoteCustomer(session);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [remoteSyncConfigured]);

  useEffect(() => {
    if (!remoteSyncConfigured) {
      setCommerceMetrics(emptyCommerceMetrics);
      setRecentOrders([]);
      setRecentReviews([]);
      return undefined;
    }

    let isActive = true;

    async function loadPublicCommerce() {
      try {
        const snapshot = await fetchPublicCommerceSnapshot();
        if (!isActive) {
          return;
        }

        setCommerceMetrics(snapshot.metrics);
        setRecentOrders(snapshot.recentOrders);
        setRecentReviews(snapshot.recentReviews);
      } catch (error) {
        console.error('Supabase public commerce sync failed.', error);
        if (!isActive) {
          return;
        }

        setCommerceMetrics(emptyCommerceMetrics);
        setRecentOrders([]);
        setRecentReviews([]);
      }
    }

    void loadPublicCommerce();

    const unsubscribe = subscribeToPublicCommerceSnapshot(() => {
      void loadPublicCommerce();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [remoteSyncConfigured]);

  useEffect(() => {
    if (!remoteSyncConfigured || user?.authMode !== 'supabase' || !user.id) {
      setPurchasedProductSlugs([]);
      setMyReviews([]);
      return undefined;
    }

    let isActive = true;

    async function loadCustomerReviews() {
      try {
        const snapshot = await fetchCustomerReviewState();
        if (!isActive) {
          return;
        }

        setPurchasedProductSlugs(snapshot.purchasedProductSlugs);
        setMyReviews(snapshot.reviews);
      } catch (error) {
        console.error('Supabase customer review state failed.', error);
        if (!isActive) {
          return;
        }

        setPurchasedProductSlugs([]);
        setMyReviews([]);
      }
    }

    void loadCustomerReviews();

    const unsubscribe = subscribeToCustomerReviewState(() => {
      void loadCustomerReviews();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [remoteSyncConfigured, user?.authMode, user?.id]);

  useEffect(() => {
    if (!remoteSyncConfigured) {
      setIsAdminAuthReady(true);
      return undefined;
    }

    let isActive = true;

    function applyRemoteSession(session: RemoteAdminSession | null) {
      if (!isActive) {
        return;
      }

      setAdminSession(session ? mapRemoteAdminSession(session) : null);
      setIsAdminAuthReady(true);
    }

    void restoreRemoteAdminSession()
      .then((session) => {
        applyRemoteSession(session);
      })
      .catch((error) => {
        console.error('Supabase admin session restore failed.', error);
        applyRemoteSession(null);
      });

    const unsubscribe = subscribeToRemoteAdminSession((session) => {
      applyRemoteSession(session);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [remoteSyncConfigured]);

  useEffect(() => {
    if (!remoteSyncEnabledRef.current) {
      return undefined;
    }

    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    async function bootstrapRemoteSync() {
      try {
        const remoteState = await fetchRemoteStoreSnapshot();
        if (!isActive) {
          return;
        }

        if (remoteState) {
          const nextStorefront = normalizeStorefrontData(remoteState.storefront as StorefrontData);
          const nextSiteConfig = mergeStoredConfig(
            remoteState.siteConfig as Partial<SiteConfig>,
            adminAccessRef.current,
          );

          lastSyncedSnapshotRef.current = serializeSyncedState(nextStorefront, nextSiteConfig);
          setStorefront(nextStorefront);
          setSiteConfig(nextSiteConfig);
        } else {
          lastSyncedSnapshotRef.current = '';
          setStorefront(cloneData(emptyStorefront));
          setSiteConfig(cloneData(defaultSiteConfig));
        }

        unsubscribe = subscribeToRemoteStoreSnapshot((payload) => {
          if (!isActive) {
            return;
          }

          const nextStorefront = normalizeStorefrontData(payload.storefront);
          const nextSiteConfig = mergeStoredConfig(
            payload.siteConfig,
            adminAccessRef.current,
          );
          const nextSnapshot = serializeSyncedState(nextStorefront, nextSiteConfig);

          if (nextSnapshot === lastSyncedSnapshotRef.current) {
            return;
          }

          lastSyncedSnapshotRef.current = nextSnapshot;
          setStorefront(nextStorefront);
          setSiteConfig(nextSiteConfig);
        });
      } catch (error) {
        console.error('Supabase sync is unavailable for storefront data.', error);
      } finally {
        if (isActive) {
          remoteSyncReadyRef.current = true;
          setIsStorefrontReady(true);
        }
      }
    }

    const failsafeTimer = window.setTimeout(() => {
      if (isActive && !remoteSyncReadyRef.current) {
        console.warn('Supabase sync is taking too long, forcing storefront ready state.');
        setIsStorefrontReady(true);
      }
    }, 3000);

    if (remoteSyncConfigured) {
      void bootstrapRemoteSync();
    } else {
      setIsStorefrontReady(true);
    }

    return () => {
      isActive = false;
      remoteSyncReadyRef.current = false;
      window.clearTimeout(failsafeTimer);
      if (remotePersistTimerRef.current !== null) {
        window.clearTimeout(remotePersistTimerRef.current);
        remotePersistTimerRef.current = null;
      }
      unsubscribe?.();
    };
  }, [emptyStorefront, remoteSyncConfigured]);

  // Failsafe: if auth/data restore hangs, don't leave the admin locked forever.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isStorefrontReady) {
        setIsStorefrontReady(true);
      }
      if (!isAdminAuthReady) {
        setIsAdminAuthReady(true);
      }
    }, 3500);

    return () => {
      clearTimeout(timer);
    };
  }, [isStorefrontReady, isAdminAuthReady]);

  // Extra safeguard for the private dashboard route.
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.location.pathname.startsWith('/admin/dashboard') && (!isStorefrontReady || !isAdminAuthReady)) {
        setIsStorefrontReady(true);
        setIsAdminAuthReady(true);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isStorefrontReady, isAdminAuthReady]);

  useEffect(() => {
    if (
      !remoteSyncEnabledRef.current ||
      !remoteSyncReadyRef.current ||
      adminSession?.authMode !== 'supabase'
    ) {
      return undefined;
    }

    const currentSnapshot = serializeSyncedState(storefront, siteConfig);
    if (currentSnapshot === lastSyncedSnapshotRef.current) {
      return undefined;
    }

    if (remotePersistTimerRef.current !== null) {
      window.clearTimeout(remotePersistTimerRef.current);
    }

    remotePersistTimerRef.current = window.setTimeout(() => {
      if (adminSessionRef.current?.authMode !== 'supabase') {
        return;
      }

      const latestStorefront = storefrontRef.current;
      const latestSiteConfig = siteConfigRef.current;
      const latestSnapshot = serializeSyncedState(latestStorefront, latestSiteConfig);

      if (latestSnapshot === lastSyncedSnapshotRef.current) {
        return;
      }

      void saveRemoteStoreSnapshot({
        storefront: latestStorefront,
        siteConfig: toPublicSiteConfig(latestSiteConfig),
      })
        .then(() => {
          lastSyncedSnapshotRef.current = latestSnapshot;
        })
        .catch((error) => {
          console.error('Supabase save failed, local storage fallback is still active.', error);
        });
    }, 250);

    return () => {
      if (remotePersistTimerRef.current !== null) {
        window.clearTimeout(remotePersistTimerRef.current);
        remotePersistTimerRef.current = null;
      }
    };
  }, [adminSession, siteConfig, storefront]);

  const productLookup = new Map(storefront.products.map((product) => [product.slug, product]));
  const categoryLookup = new Map(storefront.categories.map((category) => [category.id, category]));

  const cartLines = Object.entries(cart)
    .map(([slug, quantity]) => {
      const product = productLookup.get(slug);
      if (!product || quantity <= 0) {
        return null;
      }

      return {
        product,
        quantity,
        subtotalEur: product.priceValue * quantity,
      };
    })
    .filter((line): line is CartLine => line !== null);

  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalEur = cartLines.reduce((sum, line) => sum + line.subtotalEur, 0);

  const featuredProducts = storefront.featuredSlugs
    .map((slug) => productLookup.get(slug))
    .filter((product): product is Product => Boolean(product));

  const visibleFeaturedProducts = featuredProducts.length
    ? featuredProducts
    : storefront.products.slice(0, 8);

  const value: StoreContextValue = {
    currency,
    setCurrency,
    categories: storefront.categories,
    products: storefront.products,
    featuredProducts: visibleFeaturedProducts,
    featuredSlugs: storefront.featuredSlugs,
    home: storefront.home,
    siteConfig,
    commerceMetrics,
    recentOrders,
    recentReviews: mergeReviewsById(recentReviews, myReviews),
    purchasedProductSlugs,
    myReviews,
    // Expose data readiness here. The public storefront applies its own asset gate in SiteShell,
    // but the admin must not depend on storefront image preloading to become accessible.
    isStorefrontReady,
    isAssetsReady,
    setIsAssetsReady,
    isCustomerAuthReady,
    storefrontSource: remoteSyncConfigured ? 'supabase' : 'local',
    updateSiteConfig: (next) => {
      setSiteConfig(next);
    },
    resetSiteConfig: () => setSiteConfig(cloneData(defaultSiteConfig)),
    updateHome: (next) => {
      setStorefront((current) => ({
        ...current,
        home: updateValue(current.home, next),
      }));
    },
    cartLines,
    cartCount,
    subtotalEur,
    isCartOpen,
    openCart: () => setIsCartOpen(true),
    closeCart: () => setIsCartOpen(false),
    addToCart: (slug) => {
      setCart((current) => ({
        ...current,
        [slug]: (current[slug] ?? 0) + 1,
      }));
      setIsCartOpen(true);
    },
    removeFromCart: (slug) => {
      setCart((current) => {
        const next = { ...current };
        delete next[slug];
        return next;
      });
    },
    updateQuantity: (slug, quantity) => {
      setCart((current) => {
        if (quantity <= 0) {
          const next = { ...current };
          delete next[slug];
          return next;
        }

        return {
          ...current,
          [slug]: quantity,
        };
      });
    },
    clearCart: () => setCart({}),
    user,
    login: async (providerId = 'fivem', options) => {
      const name = options?.name ?? 'FiveM Captain';
      const redirectPath = normalizeReturnPath(options?.redirectPath);

      if (remoteSyncConfigured) {
        try {
          if (providerId === 'google' || providerId === 'discord') {
            const redirectTo = `${window.location.origin}/auth/callback?provider=${providerId}&next=${encodeURIComponent(redirectPath)}`;
            const oauthPayload = await signInStorefrontCustomerWithOAuth(providerId, redirectTo);
            if (!oauthPayload?.url) {
              return {
                ok: false,
                message: `No se pudo preparar el acceso con ${providerId}.`,
              };
            }

            window.location.assign(oauthPayload.url);
            return { ok: true };
          }

          if (providerId === 'fivem') {
            const authPayload = await startFiveMHeadlessLogin(redirectPath);
            if (!authPayload?.authUrl) {
              return {
                ok: false,
                message: 'No se pudo iniciar el login de FiveM en Tebex.',
              };
            }

            window.location.assign(authPayload.authUrl);
            return { ok: true };
          }

          const session = await signInStorefrontCustomer(name);
          if (!session) {
            return {
              ok: false,
              message: 'Supabase no está disponible para iniciar sesión ahora mismo.',
            };
          }

          setUser(mapRemoteCustomerSession(session));
          setIsCustomerAuthReady(true);
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : 'No se pudo iniciar sesión en la tienda.',
          };
        }
      }

      setUser({
        name,
        provider: providerId === 'discord' ? 'Discord' : providerId === 'google' ? 'Google' : 'FiveM',
        authMode: 'local',
      });
      return { ok: true };
    },
    completeFiveMLogin: async ({ providerUserId, providerUsername, metadata }) => {
      if (!remoteSyncConfigured) {
        setUser({
          name: providerUsername,
          provider: 'FiveM',
          authMode: 'local',
        });
        return { ok: true };
      }

      try {
        const session = await signInStorefrontCustomer(providerUsername);
        if (!session) {
          return {
            ok: false,
            message: 'No se pudo abrir la sesión del cliente tras validar FiveM.',
          };
        }

        const linkedProfile = await linkRemoteCustomerIdentity({
          provider: 'fivem',
          providerUserId,
          providerUsername,
          metadata,
        });

        setUser(
          mapRemoteCustomerSession(
            linkedProfile ?? {
              ...session,
              provider: 'FiveM',
            },
          ),
        );
        setIsCustomerAuthReady(true);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo completar el acceso con FiveM.',
        };
      }
    },
    logout: async () => {
      if (remoteSyncConfigured) {
        try {
          await signOutRemoteCustomer();
        } catch (error) {
          console.error('Supabase customer sign out failed.', error);
        }
      }

      setUser(null);
    },
    completeCheckout: async () => {
      const cartProviders = getCartCheckoutProviders(cartLines);
      const checkoutProvider = cartProviders[0] ?? 'paypal';
      if (cartProviders.length > 1) {
        return {
          ok: false,
          message:
            'No puedes mezclar productos con proveedores de pago distintos en el mismo checkout.',
        };
      }
      if (!cartLines.length) {
        return {
          ok: false,
          message: 'Tu cesta está vacía.',
        };
      }

      if (remoteSyncConfigured) {
        try {
          const checkout = await startRemoteCheckout({
            cartLines,
            currency,
            successPath: '/checkout/return',
            cancelPath: '/checkout/return?status=cancelled',
          });

          if (!checkout) {
            return {
              ok: false,
              message: 'No se pudo iniciar el checkout en Supabase.',
            };
          }

          return {
            ok: true,
            orderId: checkout.orderId,
            redirectUrl: checkout.redirectUrl,
            provider: checkout.provider,
          };
        } catch (error) {
          return {
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : 'No se pudo completar el pedido.',
          };
        }
      }

      setCart({});
      return { ok: true, provider: checkoutProvider };
    },
    canReviewProduct: (slug) => purchasedProductSlugs.includes(slug),
    submitReview: async ({ productSlug, productTitle, rating, quote }) => {
      if (!remoteSyncConfigured) {
        return {
          ok: false,
          message: 'Las reseñas verificadas solo están disponibles con Supabase activo.',
        };
      }

      if (!user?.id || user.authMode !== 'supabase') {
        return {
          ok: false,
          message: 'Necesitas iniciar sesión antes de dejar una reseña.',
        };
      }

      if (!purchasedProductSlugs.includes(productSlug)) {
        return {
          ok: false,
          message: 'Solo los compradores verificados pueden reseñar este producto.',
        };
      }

      try {
        const review = await upsertRemoteProductReview({
          productSlug,
          productTitle,
          rating,
          quote,
        });

        if (!review) {
          return {
            ok: false,
            message: 'No se pudo guardar la reseña ahora mismo.',
          };
        }

        setMyReviews((current) => mergeReviewsById([review], current));
        setRecentReviews((current) => mergeReviewsById([review], current));

        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo guardar la reseña.',
        };
      }
    },
    adminSession,
    isAdminAuthReady,
    isRemoteAdminAuth: remoteSyncConfigured,
    loginAdmin: async (username, password) => {
      if (remoteSyncConfigured) {
        try {
          const session = await signInAdminWithPassword(username, password);
          if (!session) {
            return {
              ok: false,
              message: 'Supabase no está disponible para iniciar sesión ahora mismo.',
            };
          }

          setAdminSession(mapRemoteAdminSession(session));
          setIsAdminAuthReady(true);
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : 'No se pudo iniciar sesión con Supabase.',
          };
        }
      }

      if (
        username === siteConfig.adminAccess.username &&
        password === siteConfig.adminAccess.password
      ) {
        setAdminSession({
          username,
          loggedInAt: new Date().toISOString(),
          authMode: 'local',
        });
        return { ok: true };
      }

      return {
        ok: false,
        message: 'Usuario o contraseña incorrectos.',
      };
    },
    loginAdminWithOAuth: async (provider) => {
      if (!remoteSyncConfigured) {
        return {
          ok: false,
          message: 'El login social para administradores solo está disponible con Supabase activo.',
        };
      }

      try {
        const redirectTo = `${window.location.origin}/admin/dashboard/overview`;
        const oauthPayload = await signInAdminWithOAuth(provider, redirectTo);
        if (!oauthPayload?.url) {
          return {
            ok: false,
            message: `No se pudo preparar el acceso con ${provider}.`,
          };
        }

        window.location.assign(oauthPayload.url);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : `No se pudo iniciar el login con ${provider}.`,
        };
      }
    },
    logoutAdmin: async () => {
      if (remoteSyncConfigured) {
        try {
          await signOutRemoteAdmin();
        } catch (error) {
          console.error('Supabase admin sign out failed.', error);
        }
      }

      setAdminSession(null);
    },
    getProduct: (slug) => productLookup.get(slug),
    getCategory: (id) => categoryLookup.get(id),
    upsertCategory: (category) => {
      setStorefront((current) => {
        const normalized = normalizeCategory({
          ...category,
          url: category.url || getCategoryHref(category.id),
        });
        const nextCategories = current.categories.some((entry) => entry.id === normalized.id)
          ? current.categories.map((entry) => (entry.id === normalized.id ? normalized : entry))
          : [...current.categories, normalized];
        const nextProducts = current.products.map((product) =>
          product.categories.includes(normalized.id) || product.categoryId === normalized.id
            ? {
              ...product,
              categoryId: product.categoryId === normalized.id ? normalized.id : product.categoryId,
              categoryLabel:
                product.categoryId === normalized.id ? normalized.label : product.categoryLabel,
            }
            : product,
        );

        return {
          ...current,
          categories: syncCategoryProductSlugs(nextCategories, nextProducts),
          products: nextProducts,
        };
      });
    },
    renameCategoryId: (currentId, nextId) => {
      const normalizedNextId = nextId.trim();
      if (!normalizedNextId || currentId === normalizedNextId) {
        return;
      }

      setStorefront((current) => {
        if (current.categories.some((category) => category.id === normalizedNextId)) {
          return current;
        }

        const nextCategories = current.categories.map((category) =>
          category.id === currentId
            ? normalizeCategory({
              ...category,
              id: normalizedNextId,
              url: getCategoryHref(normalizedNextId),
            })
            : category,
        );
        const nextProducts = current.products.map((product) =>
          normalizeProduct(
            {
              ...product,
              categoryId: product.categoryId === currentId ? normalizedNextId : product.categoryId,
              categories: product.categories.map((categoryId) =>
                categoryId === currentId ? normalizedNextId : categoryId,
              ),
            },
            nextCategories,
          ),
        );

        return {
          ...current,
          categories: syncCategoryProductSlugs(nextCategories, nextProducts),
          products: nextProducts,
        };
      });
    },
    deleteCategory: (id) => {
      setStorefront((current) => {
        const nextCategories = current.categories.filter((category) => category.id !== id);
        const fallbackCategory = nextCategories[0];
        const nextProducts = current.products
          .filter((product) => product.slug)
          .map((product) => {
            if (!product.categories.includes(id) && product.categoryId !== id) {
              return product;
            }

            const nextProductCategories = product.categories.filter((entry) => entry !== id);
            const primaryCategoryId = nextProductCategories[0] ?? fallbackCategory?.id ?? product.categoryId;
            const primaryCategory = nextCategories.find((entry) => entry.id === primaryCategoryId);

            return normalizeProduct(
              {
                ...product,
                categoryId: primaryCategoryId,
                categoryLabel: primaryCategory?.label ?? product.categoryLabel,
                categories: nextProductCategories.length ? nextProductCategories : [primaryCategoryId],
              },
              nextCategories,
            );
          });

        return {
          ...current,
          categories: syncCategoryProductSlugs(nextCategories, nextProducts),
          products: nextProducts,
          featuredSlugs: current.featuredSlugs.filter((slug) => nextProducts.some((product) => product.slug === slug)),
        };
      });
    },
    moveCategory: (id, direction) => {
      setStorefront((current) => ({
        ...current,
        categories: moveItem(current.categories, 'id', id, direction),
      }));
    },
    upsertProduct: (product) => {
      setStorefront((current) => {
        const normalized = normalizeProduct(product, current.categories);
        const nextProducts = current.products.some((entry) => entry.slug === normalized.slug)
          ? current.products.map((entry) => (entry.slug === normalized.slug ? normalized : entry))
          : [...current.products, normalized];

        return {
          ...current,
          products: nextProducts,
          categories: syncCategoryProductSlugs(current.categories, nextProducts),
        };
      });
    },
    deleteProduct: (slug) => {
      setStorefront((current) => {
        const nextProducts = current.products.filter((product) => product.slug !== slug);

        return {
          ...current,
          products: nextProducts,
          categories: syncCategoryProductSlugs(current.categories, nextProducts),
          featuredSlugs: current.featuredSlugs.filter((entry) => entry !== slug),
        };
      });
      setCart((current) => {
        const next = { ...current };
        delete next[slug];
        return next;
      });
    },
    moveProduct: (slug, direction) => {
      setStorefront((current) => {
        const nextProducts = moveItem(current.products, 'slug', slug, direction);

        return {
          ...current,
          products: nextProducts,
          categories: syncCategoryProductSlugs(current.categories, nextProducts),
        };
      });
    },
    toggleFeaturedProduct: (slug) => {
      setStorefront((current) => ({
        ...current,
        featuredSlugs: current.featuredSlugs.includes(slug)
          ? current.featuredSlugs.filter((entry) => entry !== slug)
          : [...current.featuredSlugs, slug],
      }));
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// useStore moved to store-context.tsx
