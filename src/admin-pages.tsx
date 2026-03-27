import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useRef } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import {
  Bell,
  Boxes,
  CreditCard,
  ExternalLink,
  FileText,
  Gem,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  PanelsTopLeft,
  ReceiptText,
  Search,
  ShieldUser,
  Store,
  UserSquare2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { FooterColumnConfig, FooterLinkItem, HeaderSocialLink } from './site-config';
import {
  type Category,
  type Product,
  type ProductCheckoutProvider,
} from './store';
import { useStore } from './store-context';
import {
  fetchAdminCommerceSnapshot,
  subscribeToAdminCommerceSnapshot,
  type AdminCustomerRecord,
  type AdminOrderRecord,
} from './supabase-admin-commerce';
import {
  addAdminMember,
  fetchAdminMembers,
  removeAdminMember,
  updateAdminMemberRole,
  type AdminMemberRecord,
} from './supabase-admin-members';
import { subscribeToAdminMembershipChanges } from './supabase-admin';
import { AdminAdminsSection } from './admin-access-sections';
import { AdminCustomersSection, AdminOrdersSection } from './admin-commerce-sections';
import { AdminOverviewSection } from './admin-overview-section';
import { AdminPaymentsSection } from './admin-payment-section';
import { AdminAuthSection, AdminContentSection, AdminPopupSection } from './admin-storefront-sections';
import {
  AdminField,
  AdminFormCard,
  type AdminStatItem,
  AdminPreviewCard,
  AdminSectionHeading,
  AdminToggle,
} from './admin-ui';
import { hasOptionalMedia } from './media';
import { SafeImage } from './safe-image';
import './admin-redesign.css';

// Creator logo removed

interface AdminPageDefinition {
  slug: string;
  label: string;
  group: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: ReactNode;
}

const adminPages = [
  {
    slug: 'overview',
    label: 'Overview',
    group: 'Storefront',
    icon: 'fa-solid fa-grid-2',
    eyebrow: 'Dashboard',
    title: 'Vista general del panel',
    description: 'Resumen rápido del storefront, accesos directos y estado visual de la plantilla.',
  },
  {
    slug: 'branding',
    label: 'Branding',
    group: 'Storefront',
    icon: 'fa-solid fa-gem',
    eyebrow: 'Branding',
    title: 'Nombre, hero y logotipos',
    description: 'Controla la marca principal, los textos del home y todos los logos visibles.',
  },
  {
    slug: 'discount',
    label: 'Banner',
    group: 'Storefront',
    icon: 'fa-solid fa-percent',
    eyebrow: 'Promoción',
    title: 'Banner, descuento y campaña',
    description: 'Activa o desactiva promociones, cambia el copy y adapta el banner a cada tienda.',
  },
  {
    slug: 'popup',
    label: 'Popup',
    group: 'Storefront',
    icon: 'fa-solid fa-badge-percent',
    eyebrow: 'Launch modal',
    title: 'Oferta de entrada y popup promocional',
    description: 'Crea un popup inicial con imagen, video o embed para campañas, tutoriales y ofertas.',
  },
  {
    slug: 'navigation',
    label: 'Navbar y Footer',
    group: 'Storefront',
    icon: 'fa-solid fa-bars',
    eyebrow: 'Navegación',
    title: 'Cabecera, footer y enlaces',
    description: 'Edita menús, títulos, enlaces y textos legales sin tocar la maquetación.',
  },
  {
    slug: 'categories',
    label: 'Categorías',
    group: 'Storefront',
    icon: 'fa-solid fa-layer-group',
    eyebrow: 'Catálogo',
    title: 'Categorías y navegación interna',
    description: 'Crea, reordena y muestra categorías diferentes según el tipo de tienda.',
  },
  {
    slug: 'products',
    label: 'Productos',
    group: 'Storefront',
    icon: 'fa-solid fa-box-open',
    eyebrow: 'Productos',
    title: 'Alta, orden y destacados',
    description: 'Añade productos, edita campos clave y destaca lo que quieras en la portada.',
  },
  {
    slug: 'payments',
    label: 'Payments',
    group: 'Commerce',
    icon: 'fa-solid fa-credit-card',
    eyebrow: 'Pagos',
    title: 'Gateway, identidad y checkout',
    description: 'Controla qué productos salen por Tebex, PayPal o Stripe y qué compras exigen identidad validada.',
  },
  {
    slug: 'auth',
    label: 'Auth',
    group: 'Access',
    icon: 'fa-solid fa-right-to-bracket',
    eyebrow: 'Acceso',
    title: 'Login del cliente y proveedores',
    description: 'Configura la pantalla de acceso, el proveedor principal y qué login reales están activos.',
  },
  {
    slug: 'customers',
    label: 'Customers',
    group: 'Commerce',
    icon: 'fa-solid fa-users',
    eyebrow: 'Clientes',
    title: 'Sesiones y clientes reales',
    description: 'Consulta los clientes reales de Supabase, su proveedor de acceso y su actividad reciente.',
  },
  {
    slug: 'orders',
    label: 'Orders',
    group: 'Commerce',
    icon: 'fa-solid fa-receipt',
    eyebrow: 'Pedidos',
    title: 'Pedidos y lineas de compra',
    description: 'Revisa los pedidos guardados en la base de datos y las lineas asociadas a cada checkout.',
  },
  {
    slug: 'admins',
    label: 'Admins',
    group: 'Access',
    icon: 'fa-solid fa-user-shield',
    eyebrow: 'Acceso',
    title: 'Miembros y roles del panel',
    description: 'Gestiona quién puede entrar al dashboard y con qué rol opera dentro de esta tienda.',
  },
  {
    slug: 'content',
    label: 'Contenido',
    group: 'Storefront',
    icon: 'fa-solid fa-file-lines',
    eyebrow: 'Contenido',
    title: 'Textos, login y bloques visibles',
    description: 'Administra términos, textos del checkout y módulos públicos de la web.',
  },
] as const satisfies readonly AdminPageDefinition[];

type AdminPageSlug = (typeof adminPages)[number]['slug'];
type AdminPageGroup = (typeof adminPages)[number]['group'];

const adminPageIcons: Record<AdminPageSlug, LucideIcon> = {
  overview: LayoutDashboard,
  branding: Gem,
  discount: CreditCard,
  popup: Bell,
  navigation: PanelsTopLeft,
  categories: Layers3,
  products: Boxes,
  payments: CreditCard,
  auth: ShieldUser,
  customers: Users,
  orders: ReceiptText,
  admins: UserSquare2,
  content: FileText,
};

const adminGroupLabels: Record<AdminPageGroup, string> = {
  Storefront: 'Storefront',
  Commerce: 'Commerce',
  Access: 'Access',
};

interface ProductDraft {
  title: string;
  fullTitle: string;
  slug: string;
  categoryId: string;
  categoriesText: string;
  image: string;
  excerpt: string;
  descriptionHtml: string;
  featuresText: string;
  frameworksText: string;
  priceValue: string;
  oldPriceValue: string;
  discountText: string;
  previewLink: string;
  documentationLink: string;
  openVersionId: string;
  escrowVersionId: string;
  galleryText: string;
  checkoutProvider: ProductCheckoutProvider;
  requiresIdentity: boolean;
  tebexPackageId: string;
  tebexServerId: string;
  externalCheckoutUrl: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values: string[]) {
  return values.join('\n');
}

function joinCsv(values: string[]) {
  return values.join(', ');
}

function createEmptyCategory(): Category {
  return {
    id: `category-${Date.now()}`,
    label: 'New Category',
    url: '',
    description: '',
    heading: 'Browse Products',
    productSlugs: [],
    showInNavigation: true,
  };
}

function cloneCategory(category: Category): Category {
  return {
    ...category,
    productSlugs: [...category.productSlugs],
  };
}

function emptyProductDraft(categoryId = ''): ProductDraft {
  return {
    title: '',
    fullTitle: '',
    slug: '',
    categoryId,
    categoriesText: categoryId,
    image: '',
    excerpt: '',
    descriptionHtml: '',
    featuresText: '',
    frameworksText: '',
    priceValue: '',
    oldPriceValue: '',
    discountText: '',
    previewLink: '',
    documentationLink: '',
    openVersionId: '',
    escrowVersionId: '',
    galleryText: '',
    checkoutProvider: 'tebex',
    requiresIdentity: true,
    tebexPackageId: '',
    tebexServerId: '',
    externalCheckoutUrl: '',
  };
}

function productToDraft(product: Product): ProductDraft {
  return {
    title: product.title,
    fullTitle: product.fullTitle,
    slug: product.slug,
    categoryId: product.categoryId,
    categoriesText: joinCsv(product.categories),
    image: product.image,
    excerpt: product.excerpt,
    descriptionHtml: product.descriptionHtml,
    featuresText: joinLines(product.features),
    frameworksText: joinCsv(product.frameworks),
    priceValue: product.priceValue ? String(product.priceValue) : '',
    oldPriceValue: product.oldPriceValue ? String(product.oldPriceValue) : '',
    discountText: product.discountText,
    previewLink: product.previewLink,
    documentationLink: product.documentationLink,
    openVersionId: product.openVersionId,
    escrowVersionId: product.escrowVersionId,
    galleryText: joinLines(product.gallery),
    checkoutProvider: product.checkoutProvider,
    requiresIdentity: product.requiresIdentity,
    tebexPackageId: product.tebexPackageId,
    tebexServerId: product.tebexServerId,
    externalCheckoutUrl: product.externalCheckoutUrl,
  };
}

function draftToProduct(draft: ProductDraft, categories: Category[]): Product {
  const slug = slugify(draft.slug || draft.title || `product-${Date.now()}`);
  const selectedCategory =
    categories.find((category) => category.id === draft.categoryId) ?? categories[0];
  const categoryIds = parseCsv(draft.categoriesText).filter((id) =>
    categories.some((category) => category.id === id),
  );
  const resolvedCategoryIds = categoryIds.length
    ? categoryIds
    : selectedCategory
      ? [selectedCategory.id]
      : [];
  const primaryCategory = categories.find((category) => category.id === resolvedCategoryIds[0]);
  const priceValue = Number.parseFloat(draft.priceValue) || 0;
  const oldPriceValue = Number.parseFloat(draft.oldPriceValue) || 0;

  return {
    categoryId: primaryCategory?.id ?? draft.categoryId,
    categoryLabel: primaryCategory?.label ?? 'Products',
    title: draft.title.trim(),
    fullTitle: (draft.fullTitle || draft.title).trim(),
    slug,
    href: `/package/${slug}`,
    image: draft.image.trim(),
    excerpt: draft.excerpt.trim(),
    descriptionHtml: draft.descriptionHtml.trim(),
    features: parseLines(draft.featuresText),
    frameworks: parseCsv(draft.frameworksText),
    priceText: '',
    oldPriceText: '',
    discountText: draft.discountText.trim(),
    previewLink: draft.previewLink.trim(),
    documentationLink: draft.documentationLink.trim(),
    openVersionId: draft.openVersionId.trim(),
    escrowVersionId: draft.escrowVersionId.trim(),
    gallery: parseLines(draft.galleryText),
    priceValue,
    oldPriceValue,
    categories: resolvedCategoryIds,
    checkoutProvider: draft.checkoutProvider,
    requiresIdentity: draft.requiresIdentity,
    tebexPackageId: draft.tebexPackageId.trim(),
    tebexServerId: draft.tebexServerId.trim(),
    externalCheckoutUrl: draft.externalCheckoutUrl.trim(),
  };
}

function updateArrayItem<T>(items: T[], index: number, nextItem: T) {
  return items.map((item, currentIndex) => (currentIndex === index ? nextItem : item));
}

function applyValue<T>(current: T, next: T | ((value: T) => T)) {
  return typeof next === 'function' ? (next as (value: T) => T)(current) : next;
}

function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatAdminCurrency(value: number, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function toLocalDayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatCompactDayLabel(value: Date) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(value);
}

function getAdminInitials(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return '??';
  }

  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function getCheckoutProviderLabel(provider: ProductCheckoutProvider | string) {
  if (provider === 'tebex') {
    return 'Tebex';
  }

  if (provider === 'paypal') {
    return 'PayPal';
  }

  if (provider === 'stripe') {
    return 'Stripe';
  }

  if (provider === 'external') {
    return 'External';
  }

  return provider;
}

function matchesAdminQuery(query: string, ...values: Array<string | null | undefined>) {
  if (!query) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(query));
}

function orderMatchesTimeFilter(createdAt: string, filter: string) {
  if (filter === 'all') {
    return true;
  }

  const createdAtTime = new Date(createdAt).getTime();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  if (filter === 'today') {
    return now - createdAtTime <= dayMs;
  }

  if (filter === '7d') {
    return now - createdAtTime <= 7 * dayMs;
  }

  if (filter === '30d') {
    return now - createdAtTime <= 30 * dayMs;
  }

  return true;
}

function getSidebarInsightText(group: AdminPageGroup) {
  if (group === 'Commerce') {
    return 'Pedidos, pagos y clientes';
  }

  if (group === 'Access') {
    return 'Accesos y miembros del panel';
  }

  return 'Marca, navegación y catálogo';
}

function AdminSidebarNavigation({
  groupedAdminPages,
  onClose,
  onVisitStore,
  onLogout,
}: {
  groupedAdminPages: Record<AdminPageGroup, Array<(typeof adminPages)[number]>>;
  onClose: () => void;
  onVisitStore: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="admin-sidebar-shell__inner">
      <div className="admin-sidebar-shell__brand">
        <div className="admin-sidebar-shell__brand-main">
          {/* Brand mark/copy removed */}
        </div>
        <button className="admin-sidebar-shell__close" type="button" onClick={onClose} aria-label="Cerrar navegación admin">
          <X size={16} />
        </button>
      </div>

      {/* Workspace button removed */}

      <ScrollArea.Root className="admin-sidebar-shell__scroll">
        <ScrollArea.Viewport className="admin-sidebar-shell__viewport">
          <div className="admin-sidebar-shell__groups">
            {(Object.entries(groupedAdminPages) as Array<[AdminPageGroup, Array<(typeof adminPages)[number]>]>).map(
              ([group, pages]) =>
                pages.length ? (
                  <section className="admin-nav-group" key={group}>
                    <div className="admin-nav-group__head">
                      <span>{adminGroupLabels[group]}</span>
                      <p>{getSidebarInsightText(group)}</p>
                    </div>
                    <div className="admin-nav-group__links">
                      {pages.map((page) => {
                        const Icon = adminPageIcons[page.slug];

                        return (
                          <NavLink
                            className={({ isActive }) =>
                              `admin-nav-link ${isActive ? 'is-active' : ''}`.trim()
                            }
                            key={page.slug}
                            to={`/admin/dashboard/${page.slug}`}
                            onClick={onClose}
                          >
                            <span className="admin-nav-link__icon">
                              <Icon size={16} />
                            </span>
                            <span className="admin-nav-link__copy">
                              <strong>{page.label}</strong>
                              <small>{page.eyebrow}</small>
                            </span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </section>
                ) : null,
            )}
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="admin-scrollbar" orientation="vertical">
          <ScrollArea.Thumb className="admin-scrollbar__thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <div className="admin-sidebar-shell__footer">
        <div className="admin-sidebar-shell__footer-actions">
          <button className="admin-utility-button" type="button" onClick={onVisitStore}>
            <Store size={15} />
            <span>Ver tienda</span>
          </button>
          <button className="admin-utility-button admin-utility-button--danger" type="button" onClick={onLogout}>
            <LogOut size={15} />
            <span>Salir</span>
          </button>
        </div>
        {/* Sidebar signature removed */}
      </div>
    </div>
  );
}

function AdminAccessState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="admin-auth">
      <div className="admin-auth__layout admin-auth__layout--status">
        <div className="admin-auth__showcase">
          <div className="admin-auth__showcase-copy">
            <p className="admin-auth__eyebrow">Admin Console</p>
            <h1>Operational control panel</h1>
            <p className="admin-auth__copy">
              Panel compacto para contenido, catálogo, pagos, accesos y sincronización en tiempo real.
            </p>
          </div>
          {/* Showcase signature removed */}
        </div>

        <div className="admin-auth__panel admin-auth__panel--status">
          <p className="admin-auth__eyebrow">System state</p>
          <h2>{title}</h2>
          <p className="admin-auth__copy">{description}</p>
        </div>
      </div>
    </section>
  );
}

export function AdminLoginPage() {
  const {
    adminSession,
    isAdminAuthReady,
    isRemoteAdminAuth,
    isStorefrontReady,
    loginAdmin,
    loginAdminWithOAuth,
    products,
    categories,
    siteConfig,
  } = useStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdminAuthReady) {
    return (
      <AdminAccessState
        title="Comprobando acceso"
        description="Restaurando la sesión del panel antes de mostrar el login."
      />
    );
  }

  if (!isStorefrontReady) {
    return (
      <AdminAccessState
        title="Cargando configuración"
        description="Esperando a que el branding, los textos y el catálogo lleguen desde Supabase."
      />
    );
  }

  if (adminSession) {
    return <Navigate to="/admin/dashboard/overview" replace />;
  }

  return (
    <section className="admin-auth">
      <div className="admin-auth__layout">
        <div className="admin-auth__showcase">
          <div className="admin-auth__showcase-copy">
            <p className="admin-auth__eyebrow">Private admin panel</p>
            <h1>{siteConfig.studioName}</h1>
            <p className="admin-auth__copy">
              Gestión premium del storefront con catálogo, pagos, auth y sincronización instantánea.
            </p>
          </div>

          <div className="admin-auth__showcase-brand">
            {hasOptionalMedia(siteConfig.brandAssets.headerLogoSrc) ? (
              <SafeImage
                className="admin-auth__brand-logo"
                src={siteConfig.brandAssets.headerLogoSrc}
                alt={siteConfig.brandAssets.headerLogoAlt}
              />
            ) : (
              <span className="admin-auth__brand-fallback">{siteConfig.brandName}</span>
            )}
            <span className="admin-pill">{isRemoteAdminAuth ? 'Supabase auth' : 'Local mode'}</span>
          </div>

          <div className="admin-auth__feature-grid">
            <article className="admin-auth__feature-card">
              <span>Products</span>
              <strong>{products.length}</strong>
              <p>Catálogo editable con rutas, medios y featured.</p>
            </article>
            <article className="admin-auth__feature-card">
              <span>Categories</span>
              <strong>{categories.length}</strong>
              <p>Navegación configurable por tienda sin rehacer frontend.</p>
            </article>
            <article className="admin-auth__feature-card">
              <span>Realtime</span>
              <strong>{isRemoteAdminAuth ? 'Live' : 'Local'}</strong>
              <p>Cambios sincronizados entre panel y storefront.</p>
            </article>
          </div>

          <div className="admin-auth__showcase-list">
            <div>
              <strong>Compact UI</strong>
              <span>Panel limpio, denso y rápido de escanear.</span>
            </div>
            <div>
              <strong>Store control</strong>
              <span>Branding, navbar, footer, auth y pagos desde el mismo panel.</span>
            </div>
            <div>
              <strong>Luckav Development</strong>
              <span>Crédito de creador integrado en la superficie privada del admin.</span>
            </div>
          </div>

          {/* Showcase signature removed */}
        </div>

        <div className="admin-auth__panel">
          <div className="admin-auth__panel-head">
            <p className="admin-auth__eyebrow">/admin/login</p>
            <h2>Sign in to dashboard</h2>
            <p className="admin-auth__copy">
              Usa tus credenciales de admin para entrar en el panel operativo.
            </p>
          </div>

          <form
            className="admin-auth__form"
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              setIsSubmitting(true);
              const result = await loginAdmin(username.trim(), password);
              setIsSubmitting(false);

              if (result.ok) {
                navigate('/admin/dashboard/overview');
                return;
              }

              setError(result.message ?? 'No se pudo iniciar sesión.');
            }}
          >
            <AdminField label={isRemoteAdminAuth ? 'Email admin' : 'Usuario'}>
              <input
                type={isRemoteAdminAuth ? 'email' : 'text'}
                autoComplete={isRemoteAdminAuth ? 'email' : 'username'}
                value={username}
                onChange={(event) => setUsername(event.currentTarget.value)}
                placeholder={isRemoteAdminAuth ? 'owner@store.com' : 'admin'}
              />
            </AdminField>

            <AdminField label="Contraseña">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                placeholder="••••••••••"
              />
            </AdminField>

            {error ? <p className="admin-auth__error">{error}</p> : null}

            <div className="admin-auth__actions">
              <button className="admin-button admin-button--primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Entrando...' : 'Entrar al dashboard'}
              </button>
              <Link className="admin-button admin-button--ghost" to="/">
                Volver a la tienda
              </Link>
            </div>
          </form>

          {isRemoteAdminAuth ? (
            <div className="admin-auth__social">
              <div className="admin-auth__separator">
                <span>O continuar con</span>
              </div>
              <button
                className="admin-button admin-button--social admin-button--google"
                type="button"
                onClick={() => loginAdminWithOAuth('google')}
                disabled={isSubmitting}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.71v2.25h2.91c1.7-1.56 2.68-3.87 2.68-6.61z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.25c-.81.54-1.85.87-3.05.87-2.34 0-4.32-1.58-5.03-3.71H.95v2.3C2.43 15.98 5.45 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.97 10.73c-.18-.54-.28-1.12-.28-1.73s.1-1.19.28-1.73V4.97H.95A8.996 8.996 0 000 9c0 1.45.35 2.82.95 4.03l3.02-2.3z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.45 0 2.43 2.02.95 4.97l3.02 2.3c.71-2.13 2.69-3.71 5.03-3.71z"
                  />
                </svg>
                <span>Acceder con Google</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function AdminDashboardPage() {
  const {
    adminSession,
    categories,
    deleteCategory,
    deleteProduct,
    featuredSlugs,
    home,
    logoutAdmin,
    moveCategory,
    moveProduct,
    products,
    renameCategoryId,
    siteConfig,
    isAdminAuthReady,
    isRemoteAdminAuth,
    isStorefrontReady,
    toggleFeaturedProduct,
    updateHome,
    updateSiteConfig,
    upsertCategory,
    upsertProduct,
  } = useStore();
  const navigate = useNavigate();
  const { section = 'overview' } = useParams<{ section?: string }>();
  const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false);
  const [editingCategorySourceId, setEditingCategorySourceId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraftState] = useState<Category>(() =>
    categories[0] ? cloneCategory(categories[0]) : createEmptyCategory(),
  );
  const [categorySavedMessage, setCategorySavedMessage] = useState('');
  const [isProductEditorOpen, setIsProductEditorOpen] = useState(false);
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(products[0]?.slug ?? null);
  const [productDraft, setProductDraftState] = useState<ProductDraft>(() =>
    products[0] ? productToDraft(products[0]) : emptyProductDraft(categories[0]?.id ?? ''),
  );
  const [productSavedMessage, setProductSavedMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState<AdminCustomerRecord[]>([]);
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [isCommerceReady, setIsCommerceReady] = useState(() => !isRemoteAdminAuth);
  const [commerceError, setCommerceError] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderTimeFilter, setOrderTimeFilter] = useState('all');
  const [orderSort, setOrderSort] = useState('newest');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [adminMembers, setAdminMembers] = useState<AdminMemberRecord[]>([]);
  const [isAdminMembersReady, setIsAdminMembersReady] = useState(() => !isRemoteAdminAuth);
  const [adminMembersError, setAdminMembersError] = useState('');
  const [adminLookup, setAdminLookup] = useState('');
  const [adminRoleDraft, setAdminRoleDraft] = useState<AdminMemberRecord['role']>('editor');
  const [adminActionMessage, setAdminActionMessage] = useState('');
  const [isAdminActionBusy, setIsAdminActionBusy] = useState(false);
  const categoryDraftRef = useRef(categoryDraft);
  const productDraftRef = useRef(productDraft);

  function setCategoryDraft(next: Category | ((current: Category) => Category)) {
    const resolved = applyValue(categoryDraftRef.current, next);
    categoryDraftRef.current = resolved;
    setCategoryDraftState(resolved);
  }

  function setProductDraft(next: ProductDraft | ((current: ProductDraft) => ProductDraft)) {
    const resolved = applyValue(productDraftRef.current, next);
    productDraftRef.current = resolved;
    setProductDraftState(resolved);
  }

  useEffect(() => {
    if (!categories.length) {
      setCategoryDraft(createEmptyCategory());
      setEditingCategorySourceId(null);
      setIsCategoryEditorOpen(false);
      return;
    }

    if (!editingCategorySourceId) {
      return;
    }

    const selectedCategory = categories.find((category) => category.id === editingCategorySourceId);

    if (!selectedCategory) {
      setEditingCategorySourceId(null);
      setIsCategoryEditorOpen(false);
      setCategoryDraft(createEmptyCategory());
      return;
    }

    setCategoryDraft(cloneCategory(selectedCategory));
  }, [categories, editingCategorySourceId]);

  useEffect(() => {
    if (!isCategoryEditorOpen && !isProductEditorOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCategoryEditor();
        closeProductEditor();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCategoryEditorOpen, isProductEditorOpen]);

  useEffect(() => {
    const selectedProduct = products.find((product) => product.slug === selectedProductSlug);
    setProductDraft(
      selectedProduct
        ? productToDraft(selectedProduct)
        : emptyProductDraft(categories[0]?.id ?? ''),
    );
  }, [categories, products, selectedProductSlug]);

  useEffect(() => {
    categoryDraftRef.current = categoryDraft;
  }, [categoryDraft]);

  useEffect(() => {
    productDraftRef.current = productDraft;
  }, [productDraft]);

  useEffect(() => {
    document.body.classList.toggle('menu-open', isSidebarOpen);
    return () => document.body.classList.remove('menu-open');
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isSidebarOpen) {
      return undefined;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isRemoteAdminAuth || adminSession?.authMode !== 'supabase') {
      setCustomers([]);
      setOrders([]);
      setCommerceError('');
      setIsCommerceReady(true);
      return undefined;
    }

    let isActive = true;

    async function loadCommerce() {
      try {
        const snapshot = await fetchAdminCommerceSnapshot();
        if (!isActive) {
          return;
        }

        setCustomers(snapshot.customers);
        setOrders(snapshot.orders);
        setCommerceError('');
      } catch (error) {
        if (!isActive) {
          return;
        }

        setCommerceError(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar clientes y pedidos desde Supabase.',
        );
      } finally {
        if (isActive) {
          setIsCommerceReady(true);
        }
      }
    }

    void loadCommerce();

    const unsubscribe = subscribeToAdminCommerceSnapshot(() => {
      void loadCommerce();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [adminSession?.authMode, isRemoteAdminAuth]);

  useEffect(() => {
    if (!isRemoteAdminAuth || adminSession?.authMode !== 'supabase') {
      setAdminMembers([]);
      setAdminMembersError('');
      setIsAdminMembersReady(true);
      return undefined;
    }

    let isActive = true;

    async function loadAdminMembers() {
      try {
        const members = await fetchAdminMembers();
        if (!isActive) {
          return;
        }

        setAdminMembers(members);
        setAdminMembersError('');
      } catch (error) {
        if (!isActive) {
          return;
        }

        setAdminMembersError(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los miembros del dashboard.',
        );
      } finally {
        if (isActive) {
          setIsAdminMembersReady(true);
        }
      }
    }

    void loadAdminMembers();
    const unsubscribe = subscribeToAdminMembershipChanges(() => {
      void loadAdminMembers();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [adminSession?.authMode, isRemoteAdminAuth]);

  const normalizedCustomerQuery = customerQuery.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) =>
    matchesAdminQuery(
      normalizedCustomerQuery,
      customer.displayName,
      customer.email,
      customer.userId,
      customer.provider,
    ),
  );

  const normalizedOrderQuery = orderQuery.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesQuery = matchesAdminQuery(
      normalizedOrderQuery,
      order.id,
      order.customerName,
      order.customerEmail,
      order.provider,
      ...order.items.flatMap((item) => [item.productTitle, item.productSlug]),
    );
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    const matchesTime = orderMatchesTimeFilter(order.createdAt, orderTimeFilter);
    return matchesQuery && matchesStatus && matchesTime;
  });

  const sortedOrders = [...filteredOrders].sort((left, right) => {
    if (orderSort === 'highest') {
      return right.totalEur - left.totalEur;
    }

    if (orderSort === 'lowest') {
      return left.totalEur - right.totalEur;
    }

    const leftTime = new Date(left.createdAt).getTime();
    const rightTime = new Date(right.createdAt).getTime();

    return orderSort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
  });

  useEffect(() => {
    if (!isCommerceReady) {
      return;
    }

    if (!filteredCustomers.length) {
      setSelectedCustomerId(null);
      return;
    }

    if (!selectedCustomerId || !filteredCustomers.some((customer) => customer.userId === selectedCustomerId)) {
      setSelectedCustomerId(filteredCustomers[0].userId);
    }
  }, [filteredCustomers, isCommerceReady, selectedCustomerId]);

  useEffect(() => {
    if (!sortedOrders.length) {
      setSelectedOrderId(null);
      setExpandedOrderId(null);
      return;
    }

    if (!selectedOrderId || !sortedOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(sortedOrders[0].id);
    }

    if (expandedOrderId && !sortedOrders.some((order) => order.id === expandedOrderId)) {
      setExpandedOrderId(null);
    }
  }, [expandedOrderId, selectedOrderId, sortedOrders]);

  if (!isAdminAuthReady) {
    return (
      <AdminAccessState
        title="Cargando dashboard"
        description="Verificando la sesión del panel y los permisos de esta tienda."
      />
    );
  }

  if (!isStorefrontReady) {
    return (
      <AdminAccessState
        title="Sincronizando dashboard"
        description="Cargando desde Supabase las categorías, productos, textos y branding del storefront."
      />
    );
  }

  if (!adminSession) {
    return <Navigate to="/admin/login" replace />;
  }

  const activePage =
    adminPages.find((page) => page.slug === (section as AdminPageSlug)) ??
    adminPages[0];
  const groupedAdminPages = adminPages.reduce<Record<AdminPageGroup, Array<(typeof adminPages)[number]>>>(
    (groups, page) => {
      const nextGroup = groups[page.group] ?? [];
      groups[page.group] = [...nextGroup, page];
      return groups;
    },
    {
      Storefront: [],
      Commerce: [],
      Access: [],
    } as Record<AdminPageGroup, Array<(typeof adminPages)[number]>>,
  );

  if (!adminPages.some((page) => page.slug === (section as AdminPageSlug))) {
    return <Navigate to="/admin/dashboard/overview" replace />;
  }

  function updateHeaderSocialLink(index: number, field: keyof HeaderSocialLink, value: string) {
    updateSiteConfig((current) => ({
      ...current,
      header: {
        ...current.header,
        socialLinks: updateArrayItem(current.header.socialLinks, index, {
          ...current.header.socialLinks[index],
          [field]: value,
        }),
      },
    }));
  }

  function updateFooterColumn(index: number, nextColumn: FooterColumnConfig) {
    updateSiteConfig((current) => ({
      ...current,
      footer: {
        ...current.footer,
        columns: updateArrayItem(current.footer.columns, index, nextColumn),
      },
    }));
  }

  function updateFooterLink(columnIndex: number, linkIndex: number, nextLink: FooterLinkItem) {
    const column = siteConfig.footer.columns[columnIndex];
    updateFooterColumn(columnIndex, {
      ...column,
      links: updateArrayItem(column.links, linkIndex, nextLink),
    });
  }

  function openCategoryEditor(category?: Category) {
    const nextCategory = category ? cloneCategory(category) : createEmptyCategory();
    setEditingCategorySourceId(category?.id ?? null);
    setCategoryDraft(nextCategory);
    setIsCategoryEditorOpen(true);
    setCategorySavedMessage('');
  }

  function closeCategoryEditor() {
    setIsCategoryEditorOpen(false);
    setCategorySavedMessage('');
  }

  function saveCategoryDraft() {
    const normalizedId = slugify(categoryDraft.id || categoryDraft.label || `category-${Date.now()}`);
    const nextCategory: Category = {
      ...categoryDraft,
      id: normalizedId,
      label: categoryDraft.label.trim() || 'New Category',
      heading: categoryDraft.heading.trim() || 'Browse Products',
      description: categoryDraft.description.trim(),
      url: categoryDraft.url.trim(),
      productSlugs: [...categoryDraft.productSlugs],
    };

    if (editingCategorySourceId && editingCategorySourceId !== normalizedId) {
      renameCategoryId(editingCategorySourceId, normalizedId);
    }

    upsertCategory(nextCategory);
    setEditingCategorySourceId(normalizedId);
    setCategoryDraft(nextCategory);
    setCategorySavedMessage('Categoría guardada.');
    window.setTimeout(() => setCategorySavedMessage(''), 1800);
  }

  function deleteCategoryDraft() {
    const categoryId = editingCategorySourceId ?? categoryDraft.id;

    if (!categoryId) {
      closeCategoryEditor();
      return;
    }

    deleteCategory(categoryId);
    closeCategoryEditor();
  }

  function openProductEditor(product?: Product) {
    if (product) {
      setSelectedProductSlug(product.slug);
      setProductDraft(productToDraft(product));
    } else {
      setSelectedProductSlug(null);
      setProductDraft(emptyProductDraft(categories[0]?.id ?? ''));
    }

    setIsProductEditorOpen(true);
    setProductSavedMessage('');
  }

  function closeProductEditor() {
    setIsProductEditorOpen(false);
    setProductSavedMessage('');
  }

  function deleteCurrentProduct() {
    if (!selectedProductSlug) {
      closeProductEditor();
      return;
    }

    const currentIndex = products.findIndex((product) => product.slug === selectedProductSlug);
    const fallbackSlug =
      products[currentIndex + 1]?.slug ??
      products[currentIndex - 1]?.slug ??
      null;

    deleteProduct(selectedProductSlug);
    setSelectedProductSlug(fallbackSlug);
    setIsProductEditorOpen(false);
  }

  function saveProduct() {
    if (!categories.length) {
      return;
    }

    const nextProduct = draftToProduct(productDraft, categories);
    upsertProduct(nextProduct);
    if (selectedProductSlug && selectedProductSlug !== nextProduct.slug) {
      deleteProduct(selectedProductSlug);
    }
    setSelectedProductSlug(nextProduct.slug);
    setProductSavedMessage('Producto guardado.');
    window.setTimeout(() => setProductSavedMessage(''), 1800);
  }

  const visibleCategoriesCount = categories.filter((category) => category.showInNavigation !== false).length;
  const selectedCustomer =
    filteredCustomers.find((customer) => customer.userId === selectedCustomerId) ??
    filteredCustomers[0] ??
    null;
  const selectedOrder =
    sortedOrders.find((order) => order.id === selectedOrderId) ??
    sortedOrders[0] ??
    null;
  const ordersByCustomer = orders.reduce<Record<string, AdminOrderRecord[]>>((groups, order) => {
    const nextGroup = groups[order.userId] ?? [];
    nextGroup.push(order);
    groups[order.userId] = nextGroup;
    return groups;
  }, {});
  const selectedCustomerOrders = selectedCustomer
    ? [...(ordersByCustomer[selectedCustomer.userId] ?? [])].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    : [];
  const selectedCustomerRevenue = selectedCustomerOrders.reduce(
    (sum, order) => sum + order.totalEur,
    0,
  );
  const selectedOrderCustomer =
    (selectedOrder && customers.find((customer) => customer.userId === selectedOrder.userId)) ??
    null;
  const totalRevenueEur = orders.reduce((sum, order) => sum + order.totalEur, 0);
  const canManageSensitiveSettings = adminSession.role === 'owner';
  const canManageAdmins = canManageSensitiveSettings;
  const paymentSummary = {
    tebex: products.filter((product) => product.checkoutProvider === 'tebex').length,
    paypal: products.filter((product) => product.checkoutProvider === 'paypal').length,
    stripe: products.filter((product) => product.checkoutProvider === 'stripe').length,
    external: products.filter((product) => product.checkoutProvider === 'external').length,
    requiresIdentity: products.filter((product) => product.requiresIdentity).length,
  };
  const enabledCustomerProviders = siteConfig.customerLogin.providers.filter((provider) => provider.enabled);
  const primaryCustomerProvider =
    siteConfig.customerLogin.providers.find(
      (provider) => provider.id === siteConfig.customerLogin.primaryProviderId,
    ) ??
    siteConfig.customerLogin.providers[0] ??
    null;
  const footerLinkCount = siteConfig.footer.columns.reduce((sum, column) => sum + column.links.length, 0);
  const heroHeadline = [
    siteConfig.homeHero.titlePrefix,
    siteConfig.homeHero.titleHighlight,
    siteConfig.homeHero.titleSuffix,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');
  const productPreviewPrice = productDraft.priceValue
    ? formatAdminCurrency(Number(productDraft.priceValue) || 0)
    : 'Sin precio';
  const productPreviewOldPrice = productDraft.oldPriceValue
    ? formatAdminCurrency(Number(productDraft.oldPriceValue) || 0)
    : '';
  const productPreviewBadges = [
    productDraft.categoryId,
    productDraft.checkoutProvider ? getCheckoutProviderLabel(productDraft.checkoutProvider) : '',
    productDraft.requiresIdentity ? 'Identity required' : '',
  ].filter(Boolean);
  const anonymousCustomersCount = customers.filter((customer) => customer.isAnonymous).length;
  const completedOrdersCount = orders.filter((order) => order.status === 'completed').length;
  const pendingOrdersCount = orders.filter((order) => order.status === 'pending').length;
  const categoryPreviewItems = categories.map((category) => ({
    ...category,
    totalProducts: products.filter((product) =>
      product.categoryId === category.id || product.categories.includes(category.id),
    ).length,
  }));
  const adminRoleSummary = {
    owner: adminMembers.filter((member) => member.role === 'owner').length,
    admin: adminMembers.filter((member) => member.role === 'admin').length,
    editor: adminMembers.filter((member) => member.role === 'editor').length,
  };
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const overviewSeries = lastSevenDays.map((date) => {
    const dayKey = toLocalDayKey(date);
    const revenue = orders.reduce((sum, order) => (
      toLocalDayKey(order.createdAt) === dayKey ? sum + order.totalEur : sum
    ), 0);
    const orderCount = orders.filter((order) => toLocalDayKey(order.createdAt) === dayKey).length;
    const customerCount = customers.filter((customer) => toLocalDayKey(customer.createdAt) === dayKey).length;

    return {
      label: formatCompactDayLabel(date),
      revenue: Number(revenue.toFixed(2)),
      orders: orderCount,
      customers: customerCount,
    };
  });
  const latestCompletedOrders = orders.filter((order) => order.status === 'completed').slice(0, 6);
  const topProducts = Object.values(
    orders.reduce<Record<string, { title: string; quantity: number; revenue: number }>>((groups, order) => {
      order.items.forEach((item) => {
        const current = groups[item.productSlug] ?? {
          title: item.productTitle,
          quantity: 0,
          revenue: 0,
        };
        current.quantity += item.quantity;
        current.revenue += item.subtotalEur;
        groups[item.productSlug] = current;
      });
      return groups;
    }, {}),
  )
    .sort((left, right) => {
      if (right.quantity === left.quantity) {
        return right.revenue - left.revenue;
      }

      return right.quantity - left.quantity;
    })
    .slice(0, 5)
    .map((product) => ({
      title: product.title,
      quantity: product.quantity,
      revenueLabel: formatAdminCurrency(product.revenue),
    }));
  const overviewSignals = [
    {
      label: 'Sync',
      value: isRemoteAdminAuth ? 'Supabase' : 'Local',
      detail: isRemoteAdminAuth ? 'Realtime activo con la base de datos.' : 'Modo local sin backend remoto.',
      tone: isRemoteAdminAuth ? 'success' : 'warning',
    },
    {
      label: 'Primary auth',
      value: primaryCustomerProvider?.label ?? 'Disabled',
      detail: `${enabledCustomerProviders.length} proveedores disponibles para cliente.`,
      tone: enabledCustomerProviders.length ? 'success' : 'warning',
    },
    {
      label: 'Discount',
      value: siteConfig.discountBanner.enabled ? 'Enabled' : 'Disabled',
      detail: siteConfig.discountBanner.enabled
        ? siteConfig.discountBanner.code || 'Campaña configurada'
        : 'Sin campaña activa en storefront.',
      tone: siteConfig.discountBanner.enabled ? 'success' : 'neutral',
    },
    {
      label: 'Footer',
      value: `${siteConfig.footer.columns.length} cols`,
      detail: `${footerLinkCount} enlaces visibles ahora mismo.`,
      tone: 'neutral',
    },
  ] as const;

  // Stats and summaries moved after all hooks


  const adminStats = [
    {
      label: 'Revenue',
      value: isRemoteAdminAuth ? formatAdminCurrency(totalRevenueEur) : '--',
      detail: isRemoteAdminAuth ? 'Ingresos registrados en pedidos sincronizados.' : 'Disponible con Supabase',
      icon: 'fa-solid fa-euro-sign',
    },
    {
      label: 'Orders',
      value: isRemoteAdminAuth ? String(orders.length) : '--',
      detail: isRemoteAdminAuth ? `${completedOrdersCount} completados` : 'Disponible con Supabase',
      icon: 'fa-solid fa-receipt',
    },
    {
      label: 'Customers',
      value: isRemoteAdminAuth ? String(customers.length) : '--',
      detail: isRemoteAdminAuth ? `${anonymousCustomersCount} anónimos` : 'Disponible con Supabase',
      icon: 'fa-solid fa-users',
    },
    {
      label: 'Catalog',
      value: `${products.length} / ${categories.length}`,
      detail: `${visibleCategoriesCount} categorías visibles y ${featuredSlugs.length} destacados`,
      icon: 'fa-solid fa-box-open',
    },
  ];
  const paymentStats: AdminStatItem[] = [
    {
      label: 'Tebex',
      value: paymentSummary.tebex,
      detail: 'Productos que salen por checkout oficial de Tebex.',
    },
    {
      label: 'PayPal',
      value: paymentSummary.paypal,
      detail: 'Productos preparados para Orders API y captura server-side.',
    },
    {
      label: 'Stripe',
      value: paymentSummary.stripe,
      detail: 'Productos que salen por Checkout Session alojada y webhook real.',
    },
    {
      label: 'External',
      value: paymentSummary.external,
      detail: 'Modelados, pero bloqueados hasta integrar confirmación real.',
    },
    {
      label: 'Identity',
      value: paymentSummary.requiresIdentity,
      detail: 'Productos que exigen identidad validada antes del pago.',
    },
  ];
  const authStats: AdminStatItem[] = [
    {
      label: 'Enabled',
      value: enabledCustomerProviders.length,
      detail: 'Proveedores visibles ahora mismo en la página de login.',
    },
    {
      label: 'Primary',
      value: primaryCustomerProvider?.label ?? 'Sin definir',
      detail: 'Proveedor principal mostrado en header y login.',
    },
    {
      label: 'Header',
      value: siteConfig.header.guestLoginLabel,
      detail: 'Texto del CTA de acceso en la cabecera pública.',
    },
    {
      label: 'Session',
      value: siteConfig.customerLogin.headerLoggedInTextPrefix || 'Sin prefijo',
      detail: 'Prefijo visible cuando el cliente ya está conectado.',
    },
  ];
  const customerStats: AdminStatItem[] = [
    {
      label: 'Customers',
      value: customers.length,
      detail: 'Total de clientes detectados en Supabase.',
    },
    {
      label: 'Anonymous',
      value: anonymousCustomersCount,
      detail: 'Sesiones anónimas creadas sin proveedor social.',
    },
    {
      label: 'Orders linked',
      value: orders.length,
      detail: 'Pedidos asociados a clientes reales en la tienda.',
    },
    {
      label: 'Revenue',
      value: formatAdminCurrency(totalRevenueEur),
      detail: 'Facturación total agregada desde los pedidos registrados.',
    },
  ];
  const orderStats: AdminStatItem[] = [
    {
      label: 'Orders',
      value: orders.length,
      detail: 'Total de checkouts guardados para esta tienda.',
    },
    {
      label: 'Completed',
      value: completedOrdersCount,
      detail: 'Pedidos finalizados y listos para contabilidad real.',
    },
    {
      label: 'Pending',
      value: pendingOrdersCount,
      detail: 'Pedidos todavía a la espera de confirmación o webhook.',
    },
    {
      label: 'Revenue',
      value: formatAdminCurrency(totalRevenueEur),
      detail: 'Volumen acumulado en pedidos sincronizados.',
    },
  ];
  const adminAccessStats: AdminStatItem[] = [
    {
      label: 'Owners',
      value: adminRoleSummary.owner,
      detail: 'Control total del panel y de los miembros.',
    },
    {
      label: 'Admins',
      value: adminRoleSummary.admin,
      detail: 'Gestión operativa sin control sobre miembros.',
    },
    {
      label: 'Editors',
      value: adminRoleSummary.editor,
      detail: 'Edición de contenido con permisos limitados.',
    },
    {
      label: 'Your role',
      value: adminSession.role ?? 'unknown',
      detail: canManageAdmins ? 'Puedes gestionar miembros.' : 'Vista de solo lectura.',
    },
  ];

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  async function handleAddAdminMember() {
    if (!adminLookup.trim()) {
      setAdminActionMessage('Introduce un email o user id de Supabase Auth.');
      return;
    }

    setIsAdminActionBusy(true);
    setAdminActionMessage('');

    try {
      await addAdminMember({
        emailOrUserId: adminLookup.trim(),
        role: adminRoleDraft,
      });
      setAdminLookup('');
      setAdminActionMessage('Miembro actualizado en el panel.');
    } catch (error) {
      setAdminActionMessage(
        error instanceof Error ? error.message : 'No se pudo vincular el admin.',
      );
    } finally {
      setIsAdminActionBusy(false);
    }
  }

  async function handleAdminRoleChange(userId: string, role: AdminMemberRecord['role']) {
    setIsAdminActionBusy(true);
    setAdminActionMessage('');

    try {
      await updateAdminMemberRole({ userId, role });
      setAdminActionMessage('Rol actualizado correctamente.');
    } catch (error) {
      setAdminActionMessage(
        error instanceof Error ? error.message : 'No se pudo actualizar el rol.',
      );
    } finally {
      setIsAdminActionBusy(false);
    }
  }

  async function handleRemoveAdmin(userId: string) {
    setIsAdminActionBusy(true);
    setAdminActionMessage('');

    try {
      await removeAdminMember(userId);
      setAdminActionMessage('Miembro eliminado del panel.');
    } catch (error) {
      setAdminActionMessage(
        error instanceof Error ? error.message : 'No se pudo eliminar el miembro.',
      );
    } finally {
      setIsAdminActionBusy(false);
    }
  }

  const todayChipLabel = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(new Date());

  return (
    <section className="admin-shell">
      <aside className={`admin-sidebar ${isSidebarOpen ? 'is-open' : ''}`} aria-hidden={!isSidebarOpen}>
        <AdminSidebarNavigation
          groupedAdminPages={groupedAdminPages}
          onClose={closeSidebar}
          onVisitStore={() => {
            closeSidebar();
            navigate('/');
          }}
          onLogout={() => {
            closeSidebar();
            void logoutAdmin();
          }}
        />
      </aside>

      <button
        className={`admin-scrim ${isSidebarOpen ? 'is-visible' : ''}`}
        type="button"
        aria-hidden={!isSidebarOpen}
        onClick={closeSidebar}
      />

      <div className="admin-app">
        <header className="admin-topbar">
          <div className="admin-topbar__main">
            <button
              className="admin-topbar__menu"
              type="button"
              aria-label="Abrir navegacion admin"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div className="admin-topbar__copy">
              <p>{activePage.eyebrow}</p>
              <h1>{activePage.title}</h1>
            </div>

            <div className="admin-topbar__meta">
              <span className="admin-topbar__meta-pill">
                <Search size={14} />
                {activePage.label}
              </span>
              <span className="admin-topbar__meta-pill">
                <Bell size={14} />
                {isRemoteAdminAuth ? 'Live sync' : 'Local mode'}
              </span>
            </div>
          </div>

          <div className="admin-topbar__actions">
            <span className="admin-topbar__chip">
              <Store size={14} />
              {siteConfig.brandName}
            </span>
            <span className="admin-topbar__chip">
              <Bell size={14} />
              {todayChipLabel}
            </span>
            <button className="admin-utility-button" type="button" onClick={() => navigate('/')}>
              <ExternalLink size={14} />
              <span>Ver tienda</span>
            </button>
            <button className="admin-utility-button admin-utility-button--primary" type="button" onClick={() => void logoutAdmin()}>
              <LogOut size={14} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </header>

        <div className="admin-content">
          <section className="admin-page-hero">
            <div className="admin-page-hero__copy">
              <p className="admin-section__eyebrow">{activePage.eyebrow}</p>
              <h2>{activePage.label}</h2>
              <p>{activePage.description}</p>
            </div>

            <div className="admin-page-hero__meta">
              <span className="admin-page-hero__meta-pill">{adminSession.role} role</span>
              <span className="admin-page-hero__meta-pill">{visibleCategoriesCount} categorías visibles</span>
              <span className="admin-page-hero__meta-pill">{products.length} productos</span>
              <span className="admin-page-hero__meta-pill">
                {siteConfig.discountBanner.enabled ? 'Promoción activa' : 'Promoción off'}
              </span>
            </div>
          </section>

          <div className="admin-panel" data-admin-page={activePage.slug}>
            <AdminOverviewSection
              stats={adminStats}
              series={{
                labels: overviewSeries.map((entry) => entry.label),
                revenue: overviewSeries.map((entry) => entry.revenue),
                orders: overviewSeries.map((entry) => entry.orders),
                customers: overviewSeries.map((entry) => entry.customers),
              }}
              signals={[...overviewSignals]}
              latestCompletedOrders={latestCompletedOrders}
              topProducts={topProducts}
              customers={customers}
              totalRevenueLabel={formatAdminCurrency(totalRevenueEur)}
              formatAdminCurrency={formatAdminCurrency}
              formatAdminDate={formatAdminDate}
              getCheckoutProviderLabel={getCheckoutProviderLabel}
            />

            <section className="admin-section" id="branding">
              <AdminSectionHeading eyebrow="Branding" title="Nombre, home y logos" />

              <div className="admin-editor-layout">
                <div className="admin-editor-column admin-editor-column--preview">
                  <AdminPreviewCard
                    eyebrow="Live preview"
                    title="Identidad de marca"
                    description="Así se ve ahora mismo la cabecera principal y el home hero con los textos y logos actuales."
                    className="admin-preview-card--hero"
                  >
                    <div className="admin-brand-preview">
                      <div className="admin-brand-preview__bar">
                        <div className="admin-brand-preview__logos">
                          {hasOptionalMedia(siteConfig.brandAssets.headerLogoSrc) ? (
                            <SafeImage
                              className="admin-brand-preview__header-logo"
                              src={siteConfig.brandAssets.headerLogoSrc}
                              alt={siteConfig.brandAssets.headerLogoAlt}
                            />
                          ) : (
                            <span className="admin-brand-preview__fallback">{siteConfig.brandName}</span>
                          )}
                          {hasOptionalMedia(siteConfig.brandAssets.headerPartnerLogoSrc) ? (
                            <SafeImage
                              className="admin-brand-preview__partner-logo"
                              src={siteConfig.brandAssets.headerPartnerLogoSrc}
                              alt={siteConfig.brandAssets.headerPartnerLogoAlt}
                            />
                          ) : null}
                        </div>
                        <span className="admin-pill">{siteConfig.studioName}</span>
                      </div>

                      <div className="admin-brand-preview__hero-copy">
                        <p className="admin-section__eyebrow">Home hero</p>
                        <h3>{heroHeadline || siteConfig.brandName}</h3>
                        <p>{siteConfig.homeHero.description || 'Añade una descripción principal para la portada.'}</p>
                      </div>

                      <div className="admin-brand-preview__actions">
                        <span>{siteConfig.homeHero.primaryCtaLabel || 'CTA principal'}</span>
                        <span>{siteConfig.homeHero.secondaryCtaLabel || 'CTA secundario'}</span>
                      </div>

                      <div className="admin-brand-preview__logos-grid">
                        {hasOptionalMedia(siteConfig.brandAssets.heroBigLogoSrc) ? (
                          <SafeImage
                            className="admin-brand-preview__floating admin-brand-preview__floating--big"
                            src={siteConfig.brandAssets.heroBigLogoSrc}
                            alt="Logo hero grande"
                          />
                        ) : null}
                        {hasOptionalMedia(siteConfig.brandAssets.heroMediumLogoSrc) ? (
                          <SafeImage
                            className="admin-brand-preview__floating admin-brand-preview__floating--medium"
                            src={siteConfig.brandAssets.heroMediumLogoSrc}
                            alt="Logo hero medio"
                          />
                        ) : null}
                        {hasOptionalMedia(siteConfig.brandAssets.heroSmallLogoSrc) ? (
                          <SafeImage
                            className="admin-brand-preview__floating admin-brand-preview__floating--small"
                            src={siteConfig.brandAssets.heroSmallLogoSrc}
                            alt="Logo hero pequeño"
                          />
                        ) : null}
                      </div>
                    </div>
                  </AdminPreviewCard>
                </div>

                <div className="admin-editor-column">
                  <AdminFormCard
                    eyebrow="Identidad"
                    title="Nombre y naming"
                    description="Controla el nombre corto de la tienda y el nombre largo visible en panel y créditos."
                    collapsible
                  >
                    <div className="admin-grid admin-grid--2">
                      <AdminField label="Nombre corto">
                        <input
                          value={siteConfig.brandName}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({ ...current, brandName: event.currentTarget.value }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Nombre completo">
                        <input
                          value={siteConfig.studioName}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({ ...current, studioName: event.currentTarget.value }))
                          }
                        />
                      </AdminField>
                    </div>
                  </AdminFormCard>

                  <AdminFormCard
                    eyebrow="Theme"
                    title="Color principal y accent"
                    description="Estos colores alimentan las variables principales del storefront sin tocar el CSS a mano."
                    collapsible
                    defaultOpen={false}
                  >
                    <div className="admin-grid admin-grid--2">
                      <AdminField label="Primary">
                        <input
                          type="color"
                          value={siteConfig.theme.primaryColor}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              theme: { ...current.theme, primaryColor: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Accent">
                        <input
                          type="color"
                          value={siteConfig.theme.accentColor}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              theme: { ...current.theme, accentColor: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>
                    </div>

                    <div className="admin-chip-row">
                      <span className="admin-pill">Primary {siteConfig.theme.primaryColor}</span>
                      <span className="admin-pill">Accent {siteConfig.theme.accentColor}</span>
                    </div>
                  </AdminFormCard>

                  <AdminFormCard
                    eyebrow="Hero"
                    title="Copy principal y CTAs"
                    description="Ajusta los tres tramos del titular y los botones principales del hero sin tocar la maquetación."
                    collapsible
                    defaultOpen={false}
                  >
                    <div className="admin-grid admin-grid--2">
                      <AdminField label="Título home, inicio">
                        <input
                          value={siteConfig.homeHero.titlePrefix}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              homeHero: { ...current.homeHero, titlePrefix: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Título home, resaltado">
                        <input
                          value={siteConfig.homeHero.titleHighlight}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              homeHero: { ...current.homeHero, titleHighlight: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Título home, final">
                        <input
                          value={siteConfig.homeHero.titleSuffix}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              homeHero: { ...current.homeHero, titleSuffix: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Descripción home">
                        <textarea
                          value={siteConfig.homeHero.description}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              homeHero: { ...current.homeHero, description: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="CTA principal">
                        <input
                          value={siteConfig.homeHero.primaryCtaLabel}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              homeHero: { ...current.homeHero, primaryCtaLabel: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Ruta CTA principal">
                        <input
                          value={siteConfig.homeHero.primaryCtaHref}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              homeHero: { ...current.homeHero, primaryCtaHref: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="CTA secundario">
                        <input
                          value={siteConfig.homeHero.secondaryCtaLabel}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              homeHero: { ...current.homeHero, secondaryCtaLabel: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="URL CTA secundario">
                        <input
                          value={siteConfig.homeHero.secondaryCtaHref}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              homeHero: { ...current.homeHero, secondaryCtaHref: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>
                    </div>
                  </AdminFormCard>

                  <AdminFormCard
                    eyebrow="Media"
                    title="Logotipos y assets"
                    description="Deja la URL vacía si no quieres mostrar el recurso. La tienda ocultará el bloque automáticamente."
                    collapsible
                    defaultOpen={false}
                  >
                    <div className="admin-grid admin-grid--2">
                      <AdminField label="Logo header">
                        <input
                          value={siteConfig.brandAssets.headerLogoSrc}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              brandAssets: { ...current.brandAssets, headerLogoSrc: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Logo footer">
                        <input
                          value={siteConfig.brandAssets.footerLogoSrc}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              brandAssets: { ...current.brandAssets, footerLogoSrc: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Logo partner">
                        <input
                          value={siteConfig.brandAssets.headerPartnerLogoSrc}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              brandAssets: {
                                ...current.brandAssets,
                                headerPartnerLogoSrc: event.currentTarget.value,
                                footerPartnerLogoSrc: event.currentTarget.value,
                              },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Decoración footer">
                        <input
                          value={siteConfig.brandAssets.footerDecorationSrc}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              brandAssets: { ...current.brandAssets, footerDecorationSrc: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Logo rojo grande">
                        <input
                          value={siteConfig.brandAssets.heroBigLogoSrc}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              brandAssets: { ...current.brandAssets, heroBigLogoSrc: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Logo rojo medio">
                        <input
                          value={siteConfig.brandAssets.heroMediumLogoSrc}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              brandAssets: { ...current.brandAssets, heroMediumLogoSrc: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Logo rojo pequeño">
                        <input
                          value={siteConfig.brandAssets.heroSmallLogoSrc}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              brandAssets: { ...current.brandAssets, heroSmallLogoSrc: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>
                    </div>
                  </AdminFormCard>
                </div>
              </div>
            </section>

            <section className="admin-section" id="discount">
              <AdminSectionHeading eyebrow="Descuento" title="Banner y código" />

              <div className="admin-editor-layout">
                <div className="admin-editor-column admin-editor-column--preview">
                  <AdminPreviewCard
                    eyebrow="Campaign preview"
                    title="Banner promocional"
                    description="Vista previa compacta del bloque de descuento. Si los assets están vacíos, el panel los oculta."
                    className="admin-preview-card--banner"
                  >
                    <div className={`admin-banner-preview ${siteConfig.discountBanner.enabled ? 'is-active' : 'is-muted'}`}>
                      {hasOptionalMedia(siteConfig.discountBanner.backgroundImageSrc) ? (
                        <SafeImage
                          className="admin-banner-preview__background"
                          src={siteConfig.discountBanner.backgroundImageSrc}
                          alt="Banner background"
                        />
                      ) : null}
                      <div className="admin-banner-preview__overlay" />
                      <div className="admin-banner-preview__content">
                        {hasOptionalMedia(siteConfig.discountBanner.logoSrc) ? (
                          <SafeImage
                            className="admin-banner-preview__logo"
                            src={siteConfig.discountBanner.logoSrc}
                            alt={siteConfig.discountBanner.title}
                          />
                        ) : null}
                        <p className="admin-section__eyebrow">
                          {siteConfig.discountBanner.enabled ? 'Promotion enabled' : 'Promotion disabled'}
                        </p>
                        <h3>{siteConfig.discountBanner.title || 'Título de campaña'}</h3>
                        <p>{siteConfig.discountBanner.description || 'Añade una descripción corta para el banner.'}</p>
                        <div className="admin-banner-preview__meta">
                          <span>{siteConfig.discountBanner.code || 'SIN-CODIGO'}</span>
                          <span>{siteConfig.discountBanner.endAt || 'Sin fecha final'}</span>
                        </div>
                      </div>
                    </div>
                  </AdminPreviewCard>
                </div>

                <div className="admin-editor-column">
                  <AdminFormCard
                    eyebrow="Switch"
                    title="Estado y ventana de campaña"
                    description="Activa o apaga la promoción y define el cierre del countdown."
                    collapsible
                  >
                    <div className="admin-grid admin-grid--2">
                      <AdminToggle
                        label="Mostrar banner"
                        checked={siteConfig.discountBanner.enabled}
                        onChange={(checked) =>
                          updateSiteConfig((current) => ({
                            ...current,
                            discountBanner: { ...current.discountBanner, enabled: checked },
                          }))
                        }
                      />

                      <AdminField label="Fecha final countdown">
                        <input
                          value={siteConfig.discountBanner.endAt}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              discountBanner: { ...current.discountBanner, endAt: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Código">
                        <input
                          value={siteConfig.discountBanner.code}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              discountBanner: { ...current.discountBanner, code: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>
                    </div>
                  </AdminFormCard>

                  <AdminFormCard
                    eyebrow="Copy y media"
                    title="Texto e imagen del banner"
                    description="Edita el copy principal y los assets opcionales sin romper el layout si se quedan vacíos."
                    collapsible
                    defaultOpen={false}
                  >
                    <div className="admin-grid admin-grid--2">
                      <AdminField label="Título banner">
                        <input
                          value={siteConfig.discountBanner.title}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              discountBanner: { ...current.discountBanner, title: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Descripción banner">
                        <input
                          value={siteConfig.discountBanner.description}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              discountBanner: { ...current.discountBanner, description: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Logo banner">
                        <input
                          value={siteConfig.discountBanner.logoSrc}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              discountBanner: { ...current.discountBanner, logoSrc: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Imagen fondo banner">
                        <input
                          value={siteConfig.discountBanner.backgroundImageSrc}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              discountBanner: { ...current.discountBanner, backgroundImageSrc: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>
                    </div>
                  </AdminFormCard>
                </div>
              </div>
            </section>

            <section className="admin-section" id="navigation">
              <AdminSectionHeading eyebrow="Navegación" title="Navbar, footer y enlaces" />

              <div className="admin-editor-layout">
                <div className="admin-editor-column admin-editor-column--preview">
                  <AdminPreviewCard
                    eyebrow="Navigation preview"
                    title="Header público"
                    description="Resumen limpio de la navegación principal, enlaces secundarios y CTA de acceso."
                  >
                    <div className="admin-nav-preview">
                      <div className="admin-nav-preview__bar">
                        <span>{siteConfig.header.homeLabel}</span>
                        {siteConfig.header.showCategoryMenu ? (
                          <span>{siteConfig.header.categoryMenuLabel}</span>
                        ) : null}
                        {siteConfig.header.showDocumentationLink ? (
                          <span>{siteConfig.header.documentationLabel}</span>
                        ) : null}
                      </div>
                      <div className="admin-chip-row">
                        {siteConfig.header.socialLinks.map((link) => (
                          <span key={`${link.label}-${link.href}`}>{link.label}</span>
                        ))}
                      </div>
                      <div className="admin-nav-preview__footer-line">
                        <span>{siteConfig.header.guestLoginLabel}</span>
                      </div>
                    </div>
                  </AdminPreviewCard>

                  <AdminPreviewCard
                    eyebrow="Footer preview"
                    title="Footer y legal"
                    description="Columnas activas, enlaces totales y copy legal visible al final de la tienda."
                  >
                    <div className="admin-footer-preview">
                      <div className="admin-key-metrics">
                        <div>
                          <span>Columnas</span>
                          <strong>{siteConfig.footer.columns.length}</strong>
                        </div>
                        <div>
                          <span>Enlaces</span>
                          <strong>{footerLinkCount}</strong>
                        </div>
                        <div>
                          <span>Powered by</span>
                          <strong>{siteConfig.footer.showPoweredBy ? 'ON' : 'OFF'}</strong>
                        </div>
                      </div>
                      <p className="admin-footer-preview__legal">
                        {siteConfig.footer.legalText || 'Texto legal del footer.'}
                      </p>
                    </div>
                  </AdminPreviewCard>
                </div>

                <div className="admin-editor-column">
                  <AdminFormCard
                    eyebrow="Header"
                    title="Navbar y CTA"
                    description="Controla el copy principal de la cabecera sin tocar el diseño del storefront."
                    collapsible
                  >
                    <div className="admin-grid admin-grid--2">
                      <AdminField label="Texto Home navbar">
                        <input
                          value={siteConfig.header.homeLabel}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              header: { ...current.header, homeLabel: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Texto dropdown categorías">
                        <input
                          value={siteConfig.header.categoryMenuLabel}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              header: { ...current.header, categoryMenuLabel: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminToggle
                        label="Mostrar dropdown categorías"
                        checked={siteConfig.header.showCategoryMenu}
                        onChange={(checked) =>
                          updateSiteConfig((current) => ({
                            ...current,
                            header: { ...current.header, showCategoryMenu: checked },
                          }))
                        }
                      />

                      <AdminToggle
                        label="Mostrar link de documentación"
                        checked={siteConfig.header.showDocumentationLink}
                        onChange={(checked) =>
                          updateSiteConfig((current) => ({
                            ...current,
                            header: { ...current.header, showDocumentationLink: checked },
                          }))
                        }
                      />

                      <AdminField label="Texto documentación">
                        <input
                          value={siteConfig.header.documentationLabel}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              header: { ...current.header, documentationLabel: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="URL documentación">
                        <input
                          value={siteConfig.header.documentationHref}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              header: { ...current.header, documentationHref: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Texto botón login">
                        <input
                          value={siteConfig.header.guestLoginLabel}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              header: { ...current.header, guestLoginLabel: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>
                    </div>
                  </AdminFormCard>

                  <AdminFormCard
                    eyebrow="Social links"
                    title="Redes en cabecera"
                    description="Cada fila representa un enlace social o externo visible en la parte superior."
                    collapsible
                    defaultOpen={false}
                    actions={(
                      <button
                        className="admin-button admin-button--small"
                        type="button"
                        onClick={() =>
                          updateSiteConfig((current) => ({
                            ...current,
                            header: {
                              ...current.header,
                              socialLinks: [
                                ...current.header.socialLinks,
                                { label: 'New Link', href: 'https://example.com', icon: 'fa-solid fa-link' },
                              ],
                            },
                          }))
                        }
                      >
                        Añadir red
                      </button>
                    )}
                  >
                    <div className="admin-stack">
                      {siteConfig.header.socialLinks.map((link, index) => (
                        <div className="admin-inline-card admin-inline-card--link-row" key={`${link.label}-${index}`}>
                          <input value={link.label} onChange={(event) => updateHeaderSocialLink(index, 'label', event.currentTarget.value)} />
                          <input value={link.href} onChange={(event) => updateHeaderSocialLink(index, 'href', event.currentTarget.value)} />
                          <input value={link.icon} onChange={(event) => updateHeaderSocialLink(index, 'icon', event.currentTarget.value)} />
                          <button
                            className="admin-button admin-button--danger admin-button--small"
                            type="button"
                            onClick={() =>
                              updateSiteConfig((current) => ({
                                ...current,
                                header: {
                                  ...current.header,
                                  socialLinks: current.header.socialLinks.filter((_, currentIndex) => currentIndex !== index),
                                },
                              }))
                            }
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  </AdminFormCard>

                  <AdminFormCard
                    eyebrow="Footer"
                    title="Footer, columnas y legal"
                    description="Edita texto legal, etiqueta powered by y la estructura de columnas del footer."
                    collapsible
                    defaultOpen={false}
                    actions={(
                      <button
                        className="admin-button admin-button--small"
                        type="button"
                        onClick={() =>
                          updateSiteConfig((current) => ({
                            ...current,
                            footer: {
                              ...current.footer,
                              columns: [
                                ...current.footer.columns,
                                { id: `footer-column-${Date.now()}`, title: 'New Column', links: [] },
                              ],
                            },
                          }))
                        }
                      >
                        Añadir columna
                      </button>
                    )}
                  >
                    <div className="admin-grid admin-grid--2">
                      <AdminToggle
                        label="Mostrar Powered by"
                        checked={siteConfig.footer.showPoweredBy}
                        onChange={(checked) =>
                          updateSiteConfig((current) => ({
                            ...current,
                            footer: { ...current.footer, showPoweredBy: checked },
                          }))
                        }
                      />

                      <AdminField label="Texto Powered by">
                        <input
                          value={siteConfig.footer.poweredByLabel}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              footer: { ...current.footer, poweredByLabel: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>

                      <AdminField label="Texto legal footer">
                        <textarea
                          value={siteConfig.footer.legalText}
                          onChange={(event) =>
                            updateSiteConfig((current) => ({
                              ...current,
                              footer: { ...current.footer, legalText: event.currentTarget.value },
                            }))
                          }
                        />
                      </AdminField>
                    </div>

                    <div className="admin-stack">
                      {siteConfig.footer.columns.map((column, columnIndex) => (
                        <div className="admin-group-card admin-group-card--editor" key={column.id}>
                          <div className="admin-card__title-row admin-card__title-row--inline-input">
                            <input
                              value={column.title}
                              onChange={(event) =>
                                updateFooterColumn(columnIndex, { ...column, title: event.currentTarget.value })
                              }
                            />
                            <button
                              className="admin-button admin-button--danger admin-button--small"
                              type="button"
                              onClick={() =>
                                updateSiteConfig((current) => ({
                                  ...current,
                                  footer: {
                                    ...current.footer,
                                    columns: current.footer.columns.filter((entry) => entry.id !== column.id),
                                  },
                                }))
                              }
                            >
                              Quitar columna
                            </button>
                          </div>

                          <div className="admin-stack">
                            {column.links.map((link, linkIndex) => (
                              <div className="admin-inline-card admin-inline-card--footer-link" key={`${link.label}-${linkIndex}`}>
                                <input
                                  value={link.label}
                                  onChange={(event) =>
                                    updateFooterLink(columnIndex, linkIndex, {
                                      ...link,
                                      label: event.currentTarget.value,
                                    })
                                  }
                                />
                                <input
                                  value={link.href}
                                  onChange={(event) =>
                                    updateFooterLink(columnIndex, linkIndex, {
                                      ...link,
                                      href: event.currentTarget.value,
                                    })
                                  }
                                />
                                <button
                                  className="admin-button admin-button--danger admin-button--small"
                                  type="button"
                                  onClick={() =>
                                    updateFooterColumn(columnIndex, {
                                      ...column,
                                      links: column.links.filter((_, currentIndex) => currentIndex !== linkIndex),
                                    })
                                  }
                                >
                                  Quitar
                                </button>
                              </div>
                            ))}
                            <button
                              className="admin-button admin-button--small"
                              type="button"
                              onClick={() =>
                                updateFooterColumn(columnIndex, {
                                  ...column,
                                  links: [...column.links, { label: 'New Link', href: '/' }],
                                })
                              }
                            >
                              Añadir enlace
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AdminFormCard>
                </div>
              </div>
            </section>

            <section className="admin-section" id="categories">
              <AdminSectionHeading eyebrow="Categorías" title="Texto, orden y visibilidad" />

              <AdminFormCard
                eyebrow="Category manager"
                title="Listado de categorias"
                description="Gestiona el catalogo desde tarjetas compactas. El formulario completo solo aparece cuando editas una categoria."
                actions={(
                  <button className="admin-button admin-button--small admin-button--primary" type="button" onClick={() => openCategoryEditor()}>
                    Añadir categoria
                  </button>
                )}
              >
                <div className="admin-key-metrics">
                  <div>
                    <span>Total</span>
                    <strong>{categories.length}</strong>
                  </div>
                  <div>
                    <span>Visibles</span>
                    <strong>{visibleCategoriesCount}</strong>
                  </div>
                  <div>
                    <span>Productos</span>
                    <strong>{products.length}</strong>
                  </div>
                </div>

                <div className="admin-category-grid">
                  {categoryPreviewItems.map((category) => (
                    <article className="admin-category-card" key={category.id}>
                      <div className="admin-category-card__head">
                        <div className="admin-category-card__copy">
                          <strong>{category.label}</strong>
                          <span>/{category.id}</span>
                          <p>{category.description || category.heading || 'Sin descripcion adicional.'}</p>
                        </div>
                        <div className="admin-chip-row">
                          <span className="admin-pill">{category.totalProducts} productos</span>
                          <span className="admin-pill">
                            {category.showInNavigation !== false ? 'Visible' : 'Oculta'}
                          </span>
                        </div>
                      </div>

                      <div className="admin-category-card__actions">
                        <button
                          className="admin-button admin-button--small admin-button--primary"
                          type="button"
                          onClick={() => openCategoryEditor(category)}
                        >
                          Editar
                        </button>
                        <button className="admin-button admin-button--small" type="button" onClick={() => moveCategory(category.id, 'up')}>
                          Subir
                        </button>
                        <button className="admin-button admin-button--small" type="button" onClick={() => moveCategory(category.id, 'down')}>
                          Bajar
                        </button>
                        <button
                          className="admin-button admin-button--danger admin-button--small"
                          type="button"
                          onClick={() => deleteCategory(category.id)}
                        >
                          Borrar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </AdminFormCard>

              {isCategoryEditorOpen ? (
                <div
                  className="admin-editor-drawer-scrim"
                  onClick={(event) => {
                    if (event.target === event.currentTarget) {
                      closeCategoryEditor();
                    }
                  }}
                >
                  <aside
                    className="admin-editor-drawer"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Editor de categoria"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="admin-editor-drawer__header">
                      <div>
                        <p className="admin-section__eyebrow">Category editor</p>
                        <h3>{editingCategorySourceId ? 'Editar categoria' : 'Nueva categoria'}</h3>
                        <p className="admin-muted-text">
                          Cambia nombre, slug, copy y visibilidad sin tener todos los campos abiertos en la lista.
                        </p>
                      </div>

                      <div className="admin-row admin-row--wrap">
                        {categorySavedMessage ? <span className="admin-pill">{categorySavedMessage}</span> : null}
                        <button className="admin-utility-button" type="button" onClick={closeCategoryEditor} aria-label="Cerrar editor">
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="admin-editor-drawer__body">
                      <div className="admin-grid admin-grid--2">
                        <AdminField label="ID / slug">
                          <input
                            value={categoryDraft.id}
                            onChange={(event) =>
                              setCategoryDraft((current) => ({
                                ...current,
                                id: slugify(event.currentTarget.value),
                              }))
                            }
                          />
                        </AdminField>

                        <AdminField label="Nombre">
                          <input
                            value={categoryDraft.label}
                            onChange={(event) =>
                              setCategoryDraft((current) => ({
                                ...current,
                                label: event.currentTarget.value,
                              }))
                            }
                          />
                        </AdminField>

                        <AdminField label="Heading pagina">
                          <input
                            value={categoryDraft.heading}
                            onChange={(event) =>
                              setCategoryDraft((current) => ({
                                ...current,
                                heading: event.currentTarget.value,
                              }))
                            }
                          />
                        </AdminField>

                        <AdminField label="URL manual" hint="Opcional. Si lo dejas vacio, la tienda usa la ruta generada por categoria.">
                          <input
                            value={categoryDraft.url}
                            onChange={(event) =>
                              setCategoryDraft((current) => ({
                                ...current,
                                url: event.currentTarget.value,
                              }))
                            }
                          />
                        </AdminField>

                        <div className="admin-grid admin-grid--2" style={{ gridColumn: '1 / -1' }}>
                          <AdminField label="Descripcion">
                            <textarea
                              value={categoryDraft.description}
                              onChange={(event) =>
                                setCategoryDraft((current) => ({
                                  ...current,
                                  description: event.currentTarget.value,
                                }))
                              }
                            />
                          </AdminField>

                          <div className="admin-stack">
                            <AdminToggle
                              label="Mostrar en navbar"
                              checked={categoryDraft.showInNavigation !== false}
                              onChange={(checked) =>
                                setCategoryDraft((current) => ({
                                  ...current,
                                  showInNavigation: checked,
                                }))
                              }
                            />

                            <div className="admin-detail-list">
                              <div>
                                <span>Productos enlazados</span>
                                <strong>
                                  {products.filter((product) =>
                                    product.categoryId === categoryDraft.id || product.categories.includes(categoryDraft.id),
                                  ).length}
                                </strong>
                              </div>
                              <div>
                                <span>Estado</span>
                                <strong>{categoryDraft.showInNavigation !== false ? 'Visible en navbar' : 'Oculta en navbar'}</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="admin-editor-drawer__footer">
                      <div className="admin-row admin-row--wrap">
                        {editingCategorySourceId ? (
                          <button className="admin-button admin-button--danger" type="button" onClick={deleteCategoryDraft}>
                            Eliminar
                          </button>
                        ) : null}
                      </div>

                      <div className="admin-row admin-row--wrap">
                        <button className="admin-button admin-button--ghost" type="button" onClick={closeCategoryEditor}>
                          Cancelar
                        </button>
                        <button className="admin-button admin-button--primary" type="button" onClick={saveCategoryDraft}>
                          Guardar categoria
                        </button>
                      </div>
                    </div>
                  </aside>
                </div>
              ) : null}
            </section>

            <section className="admin-section" id="products">
              <AdminSectionHeading eyebrow="Productos" title="Alta, baja y destacados" />

              <AdminFormCard
                eyebrow="Product manager"
                title="Listado de productos"
                description="Primero ves tarjetas compactas. El formulario completo se abre solo al crear o editar un producto."
                actions={(
                  <button
                    className="admin-button admin-button--small admin-button--primary"
                    type="button"
                    onClick={() => openProductEditor()}
                  >
                    Nuevo producto
                  </button>
                )}
              >
                <div className="admin-product-card-grid">
                  {products.map((product) => (
                    <article className="admin-product-card" key={product.slug}>
                      <div className="admin-product-card__head">
                        <div className="admin-product-card__identity">
                          <div className="admin-product-card__media">
                            {hasOptionalMedia(product.image) ? (
                              <SafeImage className="admin-product-card__thumb" src={product.image} alt={product.title} />
                            ) : (
                              <div className="admin-product-card__placeholder">
                                {product.title.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="admin-product-card__copy">
                            <strong>{product.title}</strong>
                            <span>/{product.slug}</span>
                            <p>{product.excerpt || `${product.categoryLabel} · ${getCheckoutProviderLabel(product.checkoutProvider)}`}</p>
                          </div>
                        </div>

                        <div className="admin-chip-row">
                          <span className="admin-pill">{formatAdminCurrency(product.priceValue || 0)}</span>
                          <span className="admin-pill">{getCheckoutProviderLabel(product.checkoutProvider)}</span>
                          {featuredSlugs.includes(product.slug) ? <span className="admin-pill">Featured</span> : null}
                        </div>
                      </div>

                      <div className="admin-category-card__actions">
                        <button
                          className="admin-button admin-button--small admin-button--primary"
                          type="button"
                          onClick={() => openProductEditor(product)}
                        >
                          Editar
                        </button>
                        <button className="admin-button admin-button--small" type="button" onClick={() => moveProduct(product.slug, 'up')}>
                          Subir
                        </button>
                        <button className="admin-button admin-button--small" type="button" onClick={() => moveProduct(product.slug, 'down')}>
                          Bajar
                        </button>
                        <button className="admin-button admin-button--small" type="button" onClick={() => toggleFeaturedProduct(product.slug)}>
                          {featuredSlugs.includes(product.slug) ? 'Quitar featured' : 'Marcar featured'}
                        </button>
                        <button
                          className="admin-button admin-button--danger admin-button--small"
                          type="button"
                          onClick={() => deleteProduct(product.slug)}
                        >
                          Borrar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </AdminFormCard>

              {isProductEditorOpen ? (
                <div
                  className="admin-editor-drawer-scrim"
                  onClick={(event) => {
                    if (event.target === event.currentTarget) {
                      closeProductEditor();
                    }
                  }}
                >
                  <aside
                    className="admin-editor-drawer"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Editor de producto"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="admin-editor-drawer__header">
                      <div>
                        <p className="admin-section__eyebrow">Product editor</p>
                        <h3>{selectedProductSlug ? 'Editar producto' : 'Nuevo producto'}</h3>
                        <p className="admin-muted-text">
                          Edita el producto en una superficie dedicada. La parte de gateway e identidad sigue en
                          <strong> Payments</strong>.
                        </p>
                      </div>

                      <div className="admin-row admin-row--wrap">
                        {productSavedMessage ? <span className="admin-pill">{productSavedMessage}</span> : null}
                        <button className="admin-utility-button" type="button" onClick={closeProductEditor} aria-label="Cerrar editor">
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="admin-editor-drawer__body">
                      <div className="admin-detail-list">
                        <div>
                          <span>Precio actual</span>
                          <strong>{productPreviewPrice}</strong>
                        </div>
                        <div>
                          <span>Precio anterior</span>
                          <strong>{productPreviewOldPrice || 'Sin precio anterior'}</strong>
                        </div>
                        <div>
                          <span>Badges</span>
                          <strong>{productPreviewBadges.join(' · ') || 'Sin badges'}</strong>
                        </div>
                      </div>

                      <div className="admin-grid admin-grid--2">
                        <AdminField label="Título">
                          <input value={productDraft.title} onChange={(event) => setProductDraft((current) => ({ ...current, title: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Slug">
                          <input value={productDraft.slug} onChange={(event) => setProductDraft((current) => ({ ...current, slug: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Título completo">
                          <input value={productDraft.fullTitle} onChange={(event) => setProductDraft((current) => ({ ...current, fullTitle: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Categoría principal">
                          <select value={productDraft.categoryId} onChange={(event) => setProductDraft((current) => ({ ...current, categoryId: event.currentTarget.value }))}>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.label}
                              </option>
                            ))}
                          </select>
                        </AdminField>
                        <AdminField label="Categorías" hint="Separadas por comas">
                          <input value={productDraft.categoriesText} onChange={(event) => setProductDraft((current) => ({ ...current, categoriesText: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Imagen">
                          <input value={productDraft.image} onChange={(event) => setProductDraft((current) => ({ ...current, image: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Precio">
                          <input value={productDraft.priceValue} onChange={(event) => setProductDraft((current) => ({ ...current, priceValue: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Precio anterior">
                          <input value={productDraft.oldPriceValue} onChange={(event) => setProductDraft((current) => ({ ...current, oldPriceValue: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Descuento visible">
                          <input value={productDraft.discountText} onChange={(event) => setProductDraft((current) => ({ ...current, discountText: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Frameworks">
                          <input value={productDraft.frameworksText} onChange={(event) => setProductDraft((current) => ({ ...current, frameworksText: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Extracto">
                          <textarea value={productDraft.excerpt} onChange={(event) => setProductDraft((current) => ({ ...current, excerpt: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Features" hint="Uno por línea">
                          <textarea value={productDraft.featuresText} onChange={(event) => setProductDraft((current) => ({ ...current, featuresText: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Descripción HTML">
                          <textarea value={productDraft.descriptionHtml} onChange={(event) => setProductDraft((current) => ({ ...current, descriptionHtml: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Galería" hint="Una URL por línea">
                          <textarea value={productDraft.galleryText} onChange={(event) => setProductDraft((current) => ({ ...current, galleryText: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Preview link">
                          <input value={productDraft.previewLink} onChange={(event) => setProductDraft((current) => ({ ...current, previewLink: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Documentation link">
                          <input value={productDraft.documentationLink} onChange={(event) => setProductDraft((current) => ({ ...current, documentationLink: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Open version id">
                          <input value={productDraft.openVersionId} onChange={(event) => setProductDraft((current) => ({ ...current, openVersionId: event.currentTarget.value }))} />
                        </AdminField>
                        <AdminField label="Escrow version id">
                          <input value={productDraft.escrowVersionId} onChange={(event) => setProductDraft((current) => ({ ...current, escrowVersionId: event.currentTarget.value }))} />
                        </AdminField>
                      </div>
                    </div>

                    <div className="admin-editor-drawer__footer">
                      <div className="admin-row admin-row--wrap">
                        {selectedProductSlug ? (
                          <button className="admin-button admin-button--danger" type="button" onClick={deleteCurrentProduct}>
                            Borrar
                          </button>
                        ) : null}
                      </div>

                      <div className="admin-row admin-row--wrap">
                        <button className="admin-button admin-button--ghost" type="button" onClick={closeProductEditor}>
                          Cancelar
                        </button>
                        <button className="admin-button admin-button--primary" type="button" onClick={saveProduct}>
                          Guardar producto
                        </button>
                      </div>
                    </div>
                  </aside>
                </div>
              ) : null}
            </section>

            <AdminPaymentsSection
              products={products}
              selectedProductSlug={selectedProductSlug}
              productDraft={productDraft}
              paymentStats={paymentStats}
              canManageSensitiveSettings={canManageSensitiveSettings}
              onSelectProduct={setSelectedProductSlug}
              onCheckoutProviderChange={(provider) =>
                setProductDraft((current) => ({
                  ...current,
                  checkoutProvider: provider,
                }))
              }
              onRequiresIdentityChange={(checked) =>
                setProductDraft((current) => ({
                  ...current,
                  requiresIdentity: checked,
                }))
              }
              onTebexPackageIdChange={(value) =>
                setProductDraft((current) => ({
                  ...current,
                  tebexPackageId: value,
                }))
              }
              onTebexServerIdChange={(value) =>
                setProductDraft((current) => ({
                  ...current,
                  tebexServerId: value,
                }))
              }
              onExternalCheckoutUrlChange={(value) =>
                setProductDraft((current) => ({
                  ...current,
                  externalCheckoutUrl: value,
                }))
              }
              onSave={saveProduct}
              onBackToProducts={() => navigate('/admin/dashboard/products')}
            />

            <AdminAuthSection
              siteConfig={siteConfig}
              brandName={siteConfig.brandName}
              authStats={authStats}
              enabledCustomerProvidersCount={enabledCustomerProviders.length}
              primaryCustomerProviderLabel={primaryCustomerProvider?.label ?? 'Sin proveedor'}
              canManageSensitiveSettings={canManageSensitiveSettings}
              updateSiteConfig={updateSiteConfig}
            />

            <AdminPopupSection
              siteConfig={siteConfig}
              updateSiteConfig={updateSiteConfig}
            />

            <AdminCustomersSection
              isRemoteAdminAuth={isRemoteAdminAuth}
              isCommerceReady={isCommerceReady}
              commerceError={commerceError}
              customers={customers}
              orders={orders}
              customerStats={customerStats}
              customerQuery={customerQuery}
              onCustomerQueryChange={setCustomerQuery}
              filteredCustomers={filteredCustomers}
              selectedCustomer={selectedCustomer}
              selectedCustomerOrders={selectedCustomerOrders}
              selectedCustomerRevenue={selectedCustomerRevenue}
              ordersByCustomer={ordersByCustomer}
              onSelectCustomer={setSelectedCustomerId}
              onOpenOrder={(orderId) => {
                setSelectedOrderId(orderId);
                setExpandedOrderId(orderId);
                navigate('/admin/dashboard/orders');
              }}
              formatAdminCurrency={formatAdminCurrency}
              formatAdminDate={formatAdminDate}
              getAdminInitials={getAdminInitials}
            />

            <AdminOrdersSection
              isRemoteAdminAuth={isRemoteAdminAuth}
              isCommerceReady={isCommerceReady}
              commerceError={commerceError}
              orders={orders}
              orderStats={orderStats}
              orderQuery={orderQuery}
              onOrderQueryChange={setOrderQuery}
              orderStatusFilter={orderStatusFilter}
              onOrderStatusFilterChange={setOrderStatusFilter}
              orderTimeFilter={orderTimeFilter}
              onOrderTimeFilterChange={setOrderTimeFilter}
              orderSort={orderSort}
              onOrderSortChange={setOrderSort}
              sortedOrders={sortedOrders}
              selectedOrder={selectedOrder}
              selectedOrderCustomer={selectedOrderCustomer}
              expandedOrderId={expandedOrderId}
              onSelectOrder={setSelectedOrderId}
              onToggleExpandedOrder={(orderId) =>
                setExpandedOrderId((current) => (current === orderId ? null : orderId))
              }
              onOpenCustomer={(userId) => {
                setSelectedCustomerId(userId);
                navigate('/admin/dashboard/customers');
              }}
              formatAdminCurrency={formatAdminCurrency}
              formatAdminDate={formatAdminDate}
              getCheckoutProviderLabel={getCheckoutProviderLabel}
            />

            <AdminAdminsSection
              isRemoteAdminAuth={isRemoteAdminAuth}
              isAdminMembersReady={isAdminMembersReady}
              adminMembersError={adminMembersError}
              adminAccessStats={adminAccessStats}
              adminRoleSummary={adminRoleSummary}
              adminMembers={adminMembers}
              canManageAdmins={canManageAdmins}
              isAdminActionBusy={isAdminActionBusy}
              adminLookup={adminLookup}
              adminRoleDraft={adminRoleDraft}
              adminActionMessage={adminActionMessage}
              onAdminLookupChange={setAdminLookup}
              onAdminRoleDraftChange={setAdminRoleDraft}
              onAddAdminMember={handleAddAdminMember}
              onAdminRoleChange={handleAdminRoleChange}
              onRemoveAdmin={handleRemoveAdmin}
              formatAdminDate={formatAdminDate}
              getAdminInitials={getAdminInitials}
            />

            <AdminContentSection
              siteConfig={siteConfig}
              home={home}
              updateSiteConfig={updateSiteConfig}
              updateHome={updateHome}
            />

            {/* Sidebar credit removed */}
          </div>
        </div>
      </div>
    </section>
  );
}
