import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useRef } from 'react';
import { Menu, X } from 'lucide-react';
import type { FooterColumnConfig, FooterLinkItem, HeaderSocialLink } from './site-config';
import {
  type Category,
  type Product,
  type ProductCheckoutProvider,
  useStore,
} from './store';
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
import './admin.css';

const creatorLogoSrc = '/media/logocreadortienda.png';

const adminPages = [
  {
    slug: 'overview',
    label: 'Overview',
    icon: 'fa-solid fa-grid-2',
    eyebrow: 'Dashboard',
    title: 'Vista general del panel',
    description: 'Resumen rápido del storefront, accesos directos y estado visual de la plantilla.',
  },
  {
    slug: 'branding',
    label: 'Branding',
    icon: 'fa-solid fa-gem',
    eyebrow: 'Branding',
    title: 'Nombre, hero y logotipos',
    description: 'Controla la marca principal, los textos del home y todos los logos visibles.',
  },
  {
    slug: 'discount',
    label: 'Banner',
    icon: 'fa-solid fa-percent',
    eyebrow: 'Promoción',
    title: 'Banner, descuento y campaña',
    description: 'Activa o desactiva promociones, cambia el copy y adapta el banner a cada tienda.',
  },
  {
    slug: 'navigation',
    label: 'Navbar y Footer',
    icon: 'fa-solid fa-bars',
    eyebrow: 'Navegación',
    title: 'Cabecera, footer y enlaces',
    description: 'Edita menús, títulos, enlaces y textos legales sin tocar la maquetación.',
  },
  {
    slug: 'categories',
    label: 'Categorías',
    icon: 'fa-solid fa-layer-group',
    eyebrow: 'Catálogo',
    title: 'Categorías y navegación interna',
    description: 'Crea, reordena y muestra categorías diferentes según el tipo de tienda.',
  },
  {
    slug: 'products',
    label: 'Productos',
    icon: 'fa-solid fa-box-open',
    eyebrow: 'Productos',
    title: 'Alta, orden y destacados',
    description: 'Añade productos, edita campos clave y destaca lo que quieras en la portada.',
  },
  {
    slug: 'payments',
    label: 'Payments',
    icon: 'fa-solid fa-credit-card',
    eyebrow: 'Pagos',
    title: 'Gateway, identidad y checkout',
    description: 'Controla qué productos salen por Tebex o PayPal y qué compras exigen identidad validada.',
  },
  {
    slug: 'customers',
    label: 'Customers',
    icon: 'fa-solid fa-users',
    eyebrow: 'Clientes',
    title: 'Sesiones y clientes reales',
    description: 'Consulta los clientes reales de Supabase, su proveedor de acceso y su actividad reciente.',
  },
  {
    slug: 'orders',
    label: 'Orders',
    icon: 'fa-solid fa-receipt',
    eyebrow: 'Pedidos',
    title: 'Pedidos y lineas de compra',
    description: 'Revisa los pedidos guardados en la base de datos y las lineas asociadas a cada checkout.',
  },
  {
    slug: 'admins',
    label: 'Admins',
    icon: 'fa-solid fa-user-shield',
    eyebrow: 'Acceso',
    title: 'Miembros y roles del panel',
    description: 'Gestiona quién puede entrar al dashboard y con qué rol opera dentro de esta tienda.',
  },
  {
    slug: 'content',
    label: 'Contenido',
    icon: 'fa-solid fa-file-lines',
    eyebrow: 'Contenido',
    title: 'Textos, login y bloques visibles',
    description: 'Administra términos, textos del checkout y módulos públicos de la web.',
  },
] as const;

type AdminPageSlug = (typeof adminPages)[number]['slug'];

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

function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="admin-field">
      <span className="admin-field__label">{label}</span>
      {hint ? <span className="admin-field__hint">{hint}</span> : null}
      {children}
    </label>
  );
}

function AdminToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="admin-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span>{label}</span>
    </label>
  );
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

function getCheckoutProviderLabel(provider: ProductCheckoutProvider | string) {
  if (provider === 'tebex') {
    return 'Tebex';
  }

  if (provider === 'paypal') {
    return 'PayPal';
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

function AdminAccessState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="admin-auth">
      <div className="admin-auth__card admin-auth__card--status">
        <div className="admin-creator-mark admin-creator-mark--login">
          <img src={creatorLogoSrc} alt="Luckav Development" />
        </div>
        <p className="admin-auth__eyebrow">Admin Access</p>
        <h1>{title}</h1>
        <p className="admin-auth__copy">{description}</p>
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
      <div className="admin-auth__card">
        <div className="admin-creator-mark admin-creator-mark--login">
          <img src={creatorLogoSrc} alt="Luckav Development" />
        </div>
        <p className="admin-auth__eyebrow">Admin Access</p>
        <h1>/admin/login</h1>
        <p className="admin-auth__copy">
          Este panel te deja cambiar textos, logos, banner, enlaces, categorías y productos sin tocar la estética de la tienda.
          {isRemoteAdminAuth ? ' El acceso del admin se valida con Supabase Auth.' : ''}
        </p>

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
            />
          </AdminField>

          <AdminField label="Contraseña">
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          </AdminField>

          {error ? <p className="admin-auth__error">{error}</p> : null}

          <button className="admin-button admin-button--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar al dashboard'}
          </button>
          <Link className="admin-button admin-button--ghost" to="/">
            Volver a la tienda
          </Link>
        </form>
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
  const productDraftRef = useRef(productDraft);

  function setProductDraft(next: ProductDraft | ((current: ProductDraft) => ProductDraft)) {
    const resolved = applyValue(productDraftRef.current, next);
    productDraftRef.current = resolved;
    setProductDraftState(resolved);
  }

  useEffect(() => {
    const selectedProduct = products.find((product) => product.slug === selectedProductSlug);
    setProductDraft(
      selectedProduct
        ? productToDraft(selectedProduct)
        : emptyProductDraft(categories[0]?.id ?? ''),
    );
  }, [categories, products, selectedProductSlug]);

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

  useEffect(() => {
    if (!customers.length) {
      setSelectedCustomerId(null);
      return;
    }

    if (!selectedCustomerId || !customers.some((customer) => customer.userId === selectedCustomerId)) {
      setSelectedCustomerId(customers[0].userId);
    }
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    if (!orders.length) {
      setSelectedOrderId(null);
      setExpandedOrderId(null);
      return;
    }

    if (!selectedOrderId || !orders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

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
  const normalizedCustomerQuery = customerQuery.trim().toLowerCase();
  const normalizedOrderQuery = orderQuery.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) =>
    matchesAdminQuery(
      normalizedCustomerQuery,
      customer.displayName,
      customer.email,
      customer.userId,
      customer.provider,
    ),
  );
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
  const canManageAdmins = adminSession.role === 'owner';
  const paymentSummary = {
    tebex: products.filter((product) => product.checkoutProvider === 'tebex').length,
    paypal: products.filter((product) => product.checkoutProvider === 'paypal').length,
    external: products.filter((product) => product.checkoutProvider === 'external').length,
    requiresIdentity: products.filter((product) => product.requiresIdentity).length,
  };

  useEffect(() => {
    if (!filteredCustomers.length) {
      setSelectedCustomerId(null);
      return;
    }

    if (!selectedCustomerId || !filteredCustomers.some((customer) => customer.userId === selectedCustomerId)) {
      setSelectedCustomerId(filteredCustomers[0].userId);
    }
  }, [filteredCustomers, selectedCustomerId]);

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

  const adminStats = [
    {
      label: 'Productos',
      value: String(products.length),
      detail: 'Editables y reordenables',
      icon: 'fa-solid fa-box-open',
    },
    {
      label: 'Categorías',
      value: String(categories.length),
      detail: `${visibleCategoriesCount} visibles en navbar`,
      icon: 'fa-solid fa-layer-group',
    },
    {
      label: 'Featured',
      value: String(featuredSlugs.length),
      detail: 'Cards destacadas en home',
      icon: 'fa-solid fa-fire',
    },
    {
      label: 'Banner',
      value: siteConfig.discountBanner.enabled ? 'ON' : 'OFF',
      detail: siteConfig.discountBanner.enabled ? siteConfig.discountBanner.code || 'Activo' : 'Oculto',
      icon: 'fa-solid fa-percent',
    },
    {
      label: 'Customers',
      value: isRemoteAdminAuth ? String(customers.length) : '--',
      detail: isRemoteAdminAuth ? 'Clientes en Supabase' : 'Disponible con Supabase',
      icon: 'fa-solid fa-users',
    },
    {
      label: 'Orders',
      value: isRemoteAdminAuth ? String(orders.length) : '--',
      detail: isRemoteAdminAuth ? 'Pedidos recientes' : 'Disponible con Supabase',
      icon: 'fa-solid fa-receipt',
    },
    {
      label: 'Revenue',
      value: isRemoteAdminAuth ? `${totalRevenueEur.toFixed(0)}€` : '--',
      detail: isRemoteAdminAuth ? 'Volumen total registrado' : 'Disponible con Supabase',
      icon: 'fa-solid fa-euro-sign',
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

  return (
    <section className="admin-shell">
      <aside className={`mobile-panel admin-sidebar ${isSidebarOpen ? 'is-open' : ''}`} aria-hidden={!isSidebarOpen}>
        <div className="mobile-panel__header admin-sidebar__header">
          <Link className="mobile-panel__brand" to="/">
            <img src={siteConfig.brandAssets.headerLogoSrc} alt={siteConfig.brandAssets.headerLogoAlt} />
          </Link>
          <button
            className="mobile-panel__close admin-sidebar__close"
            type="button"
            aria-label="Cerrar panel admin"
            onClick={closeSidebar}
          >
            <X size={22} />
          </button>
        </div>

        <div className="mobile-panel__body admin-sidebar__body">
          <div className="admin-sidebar__intro">
            <p className="admin-sidebar__eyebrow">Admin Dashboard</p>
            <div className="admin-sidebar__badge">CONTROL PANEL</div>
            <h1>{siteConfig.studioName}</h1>
            <p className="admin-sidebar__copy">
              Cambios guardados al instante. Si tienes la tienda abierta en otra pestaña, se actualiza sola.
            </p>
            <div className="admin-creator-mark admin-creator-mark--sidebar">
              <img src={creatorLogoSrc} alt="Luckav Development" />
            </div>
          </div>

          <nav className="mobile-panel__nav admin-sidebar__nav">
            {adminPages.map((page) => (
              <NavLink
                className={({ isActive }) =>
                  `mobile-panel__link admin-sidebar__nav-link ${isActive ? 'is-active' : ''}`
                }
                to={`/admin/dashboard/${page.slug}`}
                key={page.slug}
                onClick={closeSidebar}
              >
                <span className="mobile-panel__link-copy">
                  <i className={page.icon} />
                  <span>{page.label}</span>
                </span>
                <i className="fa-solid fa-chevron-right admin-sidebar__nav-chevron" />
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mobile-panel__footer admin-sidebar__footer">
          <button
            className="mobile-panel__basket-link admin-sidebar__footer-link"
            type="button"
            onClick={() => {
              closeSidebar();
              navigate('/');
            }}
          >
            <span className="mobile-panel__link-copy">
              <i className="fa-solid fa-store" />
              <span>Ver tienda</span>
            </span>
          </button>
          <button
            className="mobile-panel__login-link admin-sidebar__footer-link"
            type="button"
            onClick={() => {
              closeSidebar();
              void logoutAdmin();
            }}
          >
            <i className="fa-solid fa-right-from-bracket" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <button
        className={`scrim admin-scrim ${isSidebarOpen ? 'is-visible' : ''}`}
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

            <div className="admin-topbar__brand">
              <img
                className="admin-topbar__logo"
                src={siteConfig.brandAssets.headerLogoSrc}
                alt={siteConfig.brandAssets.headerLogoAlt}
              />
              <span className="admin-topbar__divider" />
              <img
                className="admin-topbar__partner"
                src={siteConfig.brandAssets.headerPartnerLogoSrc}
                alt={siteConfig.brandAssets.headerPartnerLogoAlt}
              />
            </div>

            <div className="admin-topbar__copy">
              <p>{siteConfig.brandName}</p>
              <h1>{activePage.label}</h1>
            </div>
          </div>

          <div className="admin-topbar__actions">
            <div className="admin-creator-mark admin-creator-mark--topbar">
              <img src={creatorLogoSrc} alt="Luckav Development" />
            </div>
            <button className="admin-button admin-button--ghost admin-button--small" type="button" onClick={() => navigate('/')}>
              Ver tienda
            </button>
            <button className="admin-button admin-button--primary admin-button--small" type="button" onClick={() => void logoutAdmin()}>
              Cerrar sesión
            </button>
          </div>
        </header>

        <div className="admin-content">
          <section className="admin-hero">
            <div className="admin-hero__copy">
              <p className="admin-section__eyebrow">{activePage.eyebrow}</p>
              <h2>
                <em>{siteConfig.brandName}</em> · {activePage.title}
              </h2>
              <p>{activePage.description}</p>
            </div>

            <div className="admin-hero__meta">
              <span className="admin-hero__panel-pill">{activePage.label}</span>
              <span>{visibleCategoriesCount} categorías visibles</span>
              <span>{siteConfig.footer.columns.length} columnas en footer</span>
              <span>{siteConfig.discountBanner.enabled ? 'Promoción activa' : 'Promoción desactivada'}</span>
            </div>
          </section>

          <div className="admin-panel" data-admin-page={activePage.slug}>
            <section className="admin-section" id="overview">
              <div className="admin-section__head">
                <p className="admin-section__eyebrow">Overview</p>
                <h2>Estado actual de la tienda</h2>
              </div>

              <section className="admin-stats" aria-label="Resumen rápido del dashboard">
                {adminStats.map((item) => (
                  <article className="admin-stat-card" key={item.label}>
                    <div className="admin-stat-card__icon">
                      <i className={item.icon} />
                    </div>
                    <div className="admin-stat-card__copy">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </article>
                ))}
              </section>
            </section>

            <section className="admin-section" id="branding">
              <div className="admin-section__head">
                <p className="admin-section__eyebrow">Branding</p>
                <h2>Nombre, home y logos</h2>
              </div>

              <div className="admin-card admin-grid admin-grid--2">
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
            </section>

            <section className="admin-section" id="discount">
              <div className="admin-section__head">
                <p className="admin-section__eyebrow">Descuento</p>
                <h2>Banner y código</h2>
              </div>

              <div className="admin-card admin-grid admin-grid--2">
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
            </section>

            <section className="admin-section" id="navigation">
              <div className="admin-section__head">
                <p className="admin-section__eyebrow">Navegación</p>
                <h2>Navbar, footer y enlaces</h2>
              </div>

              <div className="admin-card admin-grid admin-grid--2">
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

              <div className="admin-card">
                <div className="admin-card__title-row">
                  <h3>Redes cabecera</h3>
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
                </div>

                <div className="admin-stack">
                  {siteConfig.header.socialLinks.map((link, index) => (
                    <div className="admin-inline-card" key={`${link.label}-${index}`}>
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
              </div>

              <div className="admin-card">
                <div className="admin-card__title-row">
                  <h3>Columnas footer</h3>
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
                </div>

                <div className="admin-stack">
                  {siteConfig.footer.columns.map((column, columnIndex) => (
                    <div className="admin-group-card" key={column.id}>
                      <div className="admin-card__title-row">
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
                          <div className="admin-inline-card" key={`${link.label}-${linkIndex}`}>
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
              </div>
            </section>

            <section className="admin-section" id="categories">
              <div className="admin-section__head">
                <p className="admin-section__eyebrow">Categorías</p>
                <h2>Texto, orden y visibilidad</h2>
              </div>

              <div className="admin-card">
                <div className="admin-card__title-row">
                  <h3>Listado</h3>
                  <button className="admin-button admin-button--small" type="button" onClick={() => upsertCategory(createEmptyCategory())}>
                    Añadir categoría
                  </button>
                </div>

                <div className="admin-stack">
                  {categories.map((category) => (
                    <div className="admin-group-card" key={category.id}>
                      <div className="admin-grid admin-grid--2">
                        <AdminField label="ID / slug">
                          <input
                            value={category.id}
                            onChange={(event) => renameCategoryId(category.id, slugify(event.currentTarget.value))}
                          />
                        </AdminField>

                        <AdminField label="Nombre">
                          <input
                            value={category.label}
                            onChange={(event) => upsertCategory({ ...category, label: event.currentTarget.value })}
                          />
                        </AdminField>

                        <AdminField label="Heading página">
                          <input
                            value={category.heading}
                            onChange={(event) => upsertCategory({ ...category, heading: event.currentTarget.value })}
                          />
                        </AdminField>

                        <AdminField label="Descripción">
                          <textarea
                            value={category.description}
                            onChange={(event) => upsertCategory({ ...category, description: event.currentTarget.value })}
                          />
                        </AdminField>
                      </div>

                      <div className="admin-row">
                        <AdminToggle
                          label="Mostrar en navbar"
                          checked={category.showInNavigation !== false}
                          onChange={(checked) => upsertCategory({ ...category, showInNavigation: checked })}
                        />
                        <button className="admin-button admin-button--small" type="button" onClick={() => moveCategory(category.id, 'up')}>
                          Subir
                        </button>
                        <button className="admin-button admin-button--small" type="button" onClick={() => moveCategory(category.id, 'down')}>
                          Bajar
                        </button>
                        <button className="admin-button admin-button--danger admin-button--small" type="button" onClick={() => deleteCategory(category.id)}>
                          Borrar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="admin-section" id="products">
              <div className="admin-section__head">
                <p className="admin-section__eyebrow">Productos</p>
                <h2>Alta, baja y destacados</h2>
              </div>

              <div className="admin-grid admin-grid--products">
                <div className="admin-card">
                  <div className="admin-card__title-row">
                    <h3>Listado</h3>
                    <button
                      className="admin-button admin-button--small"
                      type="button"
                      onClick={() => {
                        setSelectedProductSlug(null);
                        setProductDraft(emptyProductDraft(categories[0]?.id ?? ''));
                      }}
                    >
                      Nuevo producto
                    </button>
                  </div>

                  <div className="admin-stack admin-product-list">
                    {products.map((product) => (
                      <button
                        className={`admin-product-list__item ${selectedProductSlug === product.slug ? 'is-active' : ''}`}
                        key={product.slug}
                        type="button"
                        onClick={() => setSelectedProductSlug(product.slug)}
                      >
                        <div>
                          <strong>{product.title}</strong>
                          <span>{product.categoryLabel} · {product.checkoutProvider}</span>
                        </div>
                        {featuredSlugs.includes(product.slug) ? <span className="admin-pill">Featured</span> : null}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card__title-row">
                    <h3>{selectedProductSlug ? 'Editar producto' : 'Crear producto'}</h3>
                    {productSavedMessage ? <span className="admin-pill">{productSavedMessage}</span> : null}
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

                  <div className="admin-inline-tip">
                    <i className="fa-solid fa-credit-card" />
                    <p>
                      La configuración de gateway, identidad y referencias de checkout está ahora en la página
                      {' '}
                      <strong>Payments</strong>
                      .
                    </p>
                  </div>

                  <div className="admin-row admin-row--wrap">
                    <button className="admin-button admin-button--primary" type="button" onClick={saveProduct}>
                      Guardar producto
                    </button>
                    {selectedProductSlug ? (
                      <>
                        <button className="admin-button admin-button--small" type="button" onClick={() => moveProduct(selectedProductSlug, 'up')}>
                          Subir
                        </button>
                        <button className="admin-button admin-button--small" type="button" onClick={() => moveProduct(selectedProductSlug, 'down')}>
                          Bajar
                        </button>
                        <button className="admin-button admin-button--small" type="button" onClick={() => toggleFeaturedProduct(selectedProductSlug)}>
                          {featuredSlugs.includes(selectedProductSlug) ? 'Quitar featured' : 'Marcar featured'}
                        </button>
                        <button
                          className="admin-button admin-button--danger admin-button--small"
                          type="button"
                          onClick={() => {
                            const currentIndex = products.findIndex((product) => product.slug === selectedProductSlug);
                            const fallbackSlug =
                              products[currentIndex + 1]?.slug ??
                              products[currentIndex - 1]?.slug ??
                              null;
                            deleteProduct(selectedProductSlug);
                            setSelectedProductSlug(fallbackSlug);
                          }}
                        >
                          Borrar
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="admin-section" id="payments">
              <div className="admin-section__head">
                <p className="admin-section__eyebrow">Payments</p>
                <h2>Gateway y requisitos de compra</h2>
              </div>

              <div className="admin-grid admin-grid--stats">
                <div className="admin-card admin-stat-card">
                  <span className="admin-stat-card__label">Tebex</span>
                  <strong>{paymentSummary.tebex}</strong>
                  <p>Productos que salen por checkout oficial de Tebex.</p>
                </div>
                <div className="admin-card admin-stat-card">
                  <span className="admin-stat-card__label">PayPal</span>
                  <strong>{paymentSummary.paypal}</strong>
                  <p>Productos preparados para Orders API y captura server-side.</p>
                </div>
                <div className="admin-card admin-stat-card">
                  <span className="admin-stat-card__label">External</span>
                  <strong>{paymentSummary.external}</strong>
                  <p>Modelados, pero bloqueados hasta integrar confirmación real.</p>
                </div>
                <div className="admin-card admin-stat-card">
                  <span className="admin-stat-card__label">Identity</span>
                  <strong>{paymentSummary.requiresIdentity}</strong>
                  <p>Productos que exigen identidad validada antes del pago.</p>
                </div>
              </div>

              <div className="admin-grid admin-grid--products">
                <div className="admin-card">
                  <div className="admin-card__title-row">
                    <h3>Productos y gateway</h3>
                    <span className="admin-pill">{products.length} productos</span>
                  </div>

                  <div className="admin-stack admin-product-list">
                    {products.map((product) => (
                      <button
                        className={`admin-product-list__item ${selectedProductSlug === product.slug ? 'is-active' : ''}`}
                        key={`payments-${product.slug}`}
                        type="button"
                        onClick={() => setSelectedProductSlug(product.slug)}
                      >
                        <div>
                          <strong>{product.title}</strong>
                          <span>
                            {getCheckoutProviderLabel(product.checkoutProvider)}
                            {product.requiresIdentity ? ' · Identity required' : ''}
                          </span>
                        </div>
                        <span className="admin-pill">{product.categoryLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card__title-row">
                    <h3>Checkout del producto</h3>
                    {selectedProductSlug ? (
                      <span className="admin-pill">
                        {getCheckoutProviderLabel(productDraft.checkoutProvider)}
                      </span>
                    ) : null}
                  </div>

                  {selectedProductSlug ? (
                    <>
                      <div className="admin-grid admin-grid--2">
                        <AdminField label="Proveedor checkout">
                          <select
                            value={productDraft.checkoutProvider}
                            onChange={(event) =>
                              setProductDraft((current) => ({
                                ...current,
                                checkoutProvider: event.currentTarget.value as ProductCheckoutProvider,
                              }))
                            }
                          >
                            <option value="tebex">Tebex</option>
                            <option value="paypal">PayPal</option>
                            <option value="external">External</option>
                          </select>
                        </AdminField>

                        <AdminToggle
                          label="Requiere identidad validada"
                          checked={productDraft.requiresIdentity}
                          onChange={(checked) =>
                            setProductDraft((current) => ({
                              ...current,
                              requiresIdentity: checked,
                            }))
                          }
                        />

                        <AdminField label="Tebex package id" hint="Si está vacío, usa open/escrow version id como fallback">
                          <input
                            value={productDraft.tebexPackageId}
                            onChange={(event) =>
                              setProductDraft((current) => ({
                                ...current,
                                tebexPackageId: event.currentTarget.value,
                              }))
                            }
                          />
                        </AdminField>

                        <AdminField label="Tebex server id" hint="Opcional, útil si el package se liga a un server">
                          <input
                            value={productDraft.tebexServerId}
                            onChange={(event) =>
                              setProductDraft((current) => ({
                                ...current,
                                tebexServerId: event.currentTarget.value,
                              }))
                            }
                          />
                        </AdminField>

                        <AdminField label="External checkout URL" hint="Solo para productos external">
                          <input
                            value={productDraft.externalCheckoutUrl}
                            onChange={(event) =>
                              setProductDraft((current) => ({
                                ...current,
                                externalCheckoutUrl: event.currentTarget.value,
                              }))
                            }
                          />
                        </AdminField>
                      </div>

                      <div className="admin-inline-tip">
                        <i className="fa-solid fa-shield-halved" />
                        <p>
                          <strong>{productDraft.title || 'Este producto'}</strong>
                          {' '}
                          saldrá por
                          {' '}
                          <strong>{getCheckoutProviderLabel(productDraft.checkoutProvider)}</strong>
                          {productDraft.requiresIdentity
                            ? ' y exigirá identidad validada.'
                            : ' sin exigir login de identidad extra.'}
                        </p>
                      </div>

                      <div className="admin-row admin-row--wrap">
                        <button className="admin-button admin-button--primary" type="button" onClick={saveProduct}>
                          Guardar ajustes de pago
                        </button>
                        <button
                          className="admin-button admin-button--ghost"
                          type="button"
                          onClick={() => navigate('/admin/dashboard/products')}
                        >
                          Volver a Productos
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="admin-empty-panel">
                      <i className="fa-solid fa-credit-card" />
                      <h3>Selecciona un producto</h3>
                      <p>Elige un producto del listado para configurar su gateway de pago.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="admin-section" id="customers">
              <div className="admin-section__head">
                <p className="admin-section__eyebrow">Customers</p>
                <h2>Clientes sincronizados</h2>
              </div>

              {!isRemoteAdminAuth ? (
                <div className="admin-card admin-empty-panel">
                  <i className="fa-solid fa-database" />
                  <h3>Disponible en modo Supabase</h3>
                  <p>
                    Esta vista solo muestra datos reales cuando el panel está conectado a Supabase Auth y a la base de datos.
                  </p>
                </div>
              ) : !isCommerceReady ? (
                <div className="admin-card admin-empty-panel">
                  <div className="checkout-stage__loader" />
                  <p>Cargando clientes reales desde Supabase...</p>
                </div>
              ) : commerceError ? (
                <div className="admin-card admin-empty-panel">
                  <i className="fa-solid fa-triangle-exclamation" />
                  <h3>No se pudieron cargar los clientes</h3>
                  <p>{commerceError}</p>
                </div>
              ) : customers.length ? (
                <>
                  <div className="admin-card admin-toolbar">
                    <label className="admin-toolbar__search">
                      <i className="fa-solid fa-magnifying-glass" />
                      <input
                        placeholder="Buscar por nombre, email, proveedor o user id"
                        value={customerQuery}
                        onChange={(event) => setCustomerQuery(event.currentTarget.value)}
                      />
                    </label>
                    <div className="admin-toolbar__meta">
                      <span className="admin-pill">
                        {filteredCustomers.length} / {customers.length} clientes
                      </span>
                      <span className="admin-pill">
                        {orders.length} pedidos totales
                      </span>
                    </div>
                  </div>

                  {filteredCustomers.length ? (
                    <div className="admin-data-grid admin-data-grid--split">
                      <div className="admin-data-stack">
                        {filteredCustomers.map((customer) => {
                          const customerOrders = ordersByCustomer[customer.userId] ?? [];
                          const customerRevenue = customerOrders.reduce((sum, order) => sum + order.totalEur, 0);
                          const isActive = selectedCustomer?.userId === customer.userId;

                          return (
                            <article
                              className={`admin-card admin-list-card admin-customer-card ${isActive ? 'is-active' : ''}`}
                              key={customer.userId}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedCustomerId(customer.userId)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setSelectedCustomerId(customer.userId);
                                }
                              }}
                            >
                              <div className="admin-card__title-row">
                                <div>
                                  <h3>{customer.displayName}</h3>
                                  <p className="admin-muted-text">{customer.email ?? 'Sin email visible'}</p>
                                </div>
                                <span className="admin-pill">
                                  {customer.isAnonymous ? 'Anonymous' : customer.provider}
                                </span>
                              </div>
                              <div className="admin-list-card__meta">
                                <span>{customerOrders.length} pedidos</span>
                                <span>{formatAdminCurrency(customerRevenue)}</span>
                                <span>{formatAdminDate(customer.updatedAt)}</span>
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <aside className="admin-card admin-detail-panel">
                        {selectedCustomer ? (
                          <>
                            <div className="admin-card__title-row">
                              <div>
                                <p className="admin-section__eyebrow">Customer Detail</p>
                                <h3>{selectedCustomer.displayName}</h3>
                                <p className="admin-muted-text">{selectedCustomer.email ?? 'Sin email visible'}</p>
                              </div>
                              <span className="admin-pill">
                                {selectedCustomer.isAnonymous ? 'Anonymous' : selectedCustomer.provider}
                              </span>
                            </div>

                            <div className="admin-key-metrics">
                              <div>
                                <span>Pedidos</span>
                                <strong>{selectedCustomerOrders.length}</strong>
                              </div>
                              <div>
                                <span>Facturación</span>
                                <strong>{formatAdminCurrency(selectedCustomerRevenue)}</strong>
                              </div>
                              <div>
                                <span>Último acceso</span>
                                <strong>{formatAdminDate(selectedCustomer.updatedAt)}</strong>
                              </div>
                            </div>

                            <div className="admin-detail-list">
                              <div>
                                <span>User ID</span>
                                <strong>{selectedCustomer.userId}</strong>
                              </div>
                              <div>
                                <span>Creado</span>
                                <strong>{formatAdminDate(selectedCustomer.createdAt)}</strong>
                              </div>
                              <div>
                                <span>Actualizado</span>
                                <strong>{formatAdminDate(selectedCustomer.updatedAt)}</strong>
                              </div>
                              <div>
                                <span>Proveedor</span>
                                <strong>{selectedCustomer.isAnonymous ? 'anonymous' : selectedCustomer.provider}</strong>
                              </div>
                            </div>

                            <div className="admin-subsection">
                              <div className="admin-card__title-row">
                                <h3>Pedidos recientes</h3>
                                <span className="admin-pill">
                                  {selectedCustomerOrders.length}
                                </span>
                              </div>

                              {selectedCustomerOrders.length ? (
                                <div className="admin-order-items">
                                  {selectedCustomerOrders.slice(0, 6).map((order) => (
                                    <article
                                      className="admin-order-item admin-order-item--button"
                                      key={order.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => {
                                        setSelectedOrderId(order.id);
                                        setExpandedOrderId(order.id);
                                        navigate('/admin/dashboard/orders');
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          setSelectedOrderId(order.id);
                                          setExpandedOrderId(order.id);
                                          navigate('/admin/dashboard/orders');
                                        }
                                      }}
                                    >
                                      <div>
                                        <strong>Order #{order.id}</strong>
                                        <span>{formatAdminDate(order.createdAt)}</span>
                                      </div>
                                      <div className="admin-order-item__meta">
                                        <span>{order.status}</span>
                                        <strong>{formatAdminCurrency(order.totalEur)}</strong>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              ) : (
                                <p className="admin-muted-text">
                                  Este cliente todavía no tiene pedidos registrados en la tienda.
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="admin-empty-panel">
                            <i className="fa-solid fa-user-check" />
                            <h3>Selecciona un cliente</h3>
                            <p>El detalle ampliado aparece aquí cuando eliges un cliente de la lista.</p>
                          </div>
                        )}
                      </aside>
                    </div>
                  ) : (
                    <div className="admin-card admin-empty-panel">
                      <i className="fa-solid fa-magnifying-glass" />
                      <h3>Sin coincidencias</h3>
                      <p>Prueba con otro nombre, email, proveedor o user id.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="admin-card admin-empty-panel">
                  <i className="fa-solid fa-users-slash" />
                  <h3>Aún no hay clientes</h3>
                  <p>Cuando alguien inicie sesión en la tienda con Supabase aparecerá aquí.</p>
                </div>
              )}
            </section>

            <section className="admin-section" id="orders">
              <div className="admin-section__head">
                <p className="admin-section__eyebrow">Orders</p>
                <h2>Pedidos guardados</h2>
              </div>

              {!isRemoteAdminAuth ? (
                <div className="admin-card admin-empty-panel">
                  <i className="fa-solid fa-database" />
                  <h3>Disponible en modo Supabase</h3>
                  <p>
                    Los pedidos solo se guardan y se muestran aquí cuando la tienda está trabajando contra Supabase.
                  </p>
                </div>
              ) : !isCommerceReady ? (
                <div className="admin-card admin-empty-panel">
                  <div className="checkout-stage__loader" />
                  <p>Cargando pedidos reales desde Supabase...</p>
                </div>
              ) : commerceError ? (
                <div className="admin-card admin-empty-panel">
                  <i className="fa-solid fa-triangle-exclamation" />
                  <h3>No se pudieron cargar los pedidos</h3>
                  <p>{commerceError}</p>
                </div>
              ) : orders.length ? (
                <>
                  <div className="admin-card admin-toolbar">
                    <label className="admin-toolbar__search">
                      <i className="fa-solid fa-magnifying-glass" />
                      <input
                        placeholder="Buscar por order id, cliente, email o producto"
                        value={orderQuery}
                        onChange={(event) => setOrderQuery(event.currentTarget.value)}
                      />
                    </label>
                    <div className="admin-toolbar__filters">
                      <select
                        value={orderStatusFilter}
                        onChange={(event) => setOrderStatusFilter(event.currentTarget.value)}
                      >
                        <option value="all">Todos los estados</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <select
                        value={orderTimeFilter}
                        onChange={(event) => setOrderTimeFilter(event.currentTarget.value)}
                      >
                        <option value="all">Cualquier fecha</option>
                        <option value="today">Últimas 24h</option>
                        <option value="7d">Últimos 7 días</option>
                        <option value="30d">Últimos 30 días</option>
                      </select>
                      <select
                        value={orderSort}
                        onChange={(event) => setOrderSort(event.currentTarget.value)}
                      >
                        <option value="newest">Más recientes</option>
                        <option value="oldest">Más antiguos</option>
                        <option value="highest">Mayor importe</option>
                        <option value="lowest">Menor importe</option>
                      </select>
                      <span className="admin-pill">
                        {sortedOrders.length} / {orders.length} pedidos
                      </span>
                    </div>
                  </div>

                  {sortedOrders.length ? (
                    <div className="admin-data-grid admin-data-grid--split">
                      <div className="admin-data-stack">
                        {sortedOrders.map((order) => {
                          const isExpanded = expandedOrderId === order.id;
                          const isActive = selectedOrder?.id === order.id;

                          return (
                            <article
                              className={`admin-card admin-list-card admin-order-card ${isActive ? 'is-active' : ''}`}
                              key={order.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedOrderId(order.id);
                                setExpandedOrderId((current) => (current === order.id ? null : order.id));
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setSelectedOrderId(order.id);
                                  setExpandedOrderId((current) => (current === order.id ? null : order.id));
                                }
                              }}
                            >
                              <div className="admin-card__title-row">
                                <div>
                                  <h3>Order #{order.id}</h3>
                                  <p className="admin-muted-text">
                                    {order.customerName}
                                    {order.customerEmail ? ` · ${order.customerEmail}` : ''}
                                  </p>
                                </div>
                                <div className="admin-row">
                                  <span className="admin-pill">{order.status}</span>
                                  <span className="admin-pill">{getCheckoutProviderLabel(order.provider)}</span>
                                </div>
                              </div>

                              <div className="admin-detail-list">
                                <div>
                                  <span>Cliente</span>
                                  <strong>{order.customerName}</strong>
                                </div>
                                <div>
                                  <span>Total</span>
                                  <strong>{order.totalEur.toFixed(2)} EUR</strong>
                                </div>
                                <div>
                                  <span>Subtotal</span>
                                  <strong>{order.subtotalEur.toFixed(2)} EUR</strong>
                                </div>
                                <div>
                                  <span>Fecha</span>
                                  <strong>{formatAdminDate(order.createdAt)}</strong>
                                </div>
                                <div>
                                <span>Currency</span>
                                <strong>{order.currency}</strong>
                              </div>
                              {order.providerStatus ? (
                                <div>
                                  <span>Provider status</span>
                                  <strong>{order.providerStatus}</strong>
                                </div>
                              ) : null}
                              </div>

                              {isExpanded ? (
                                <div className="admin-order-items">
                                  {order.items.length ? (
                                    order.items.map((item) => (
                                      <div className="admin-order-item" key={`${order.id}-${item.productSlug}`}>
                                        <div>
                                          <strong>{item.productTitle}</strong>
                                          <span>{item.productSlug}</span>
                                        </div>
                                        <div className="admin-order-item__meta">
                                          <span>x{item.quantity}</span>
                                          <strong>{item.subtotalEur.toFixed(2)} EUR</strong>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="admin-muted-text">Este pedido todavía no tiene líneas visibles.</p>
                                  )}
                                </div>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>

                      <aside className="admin-card admin-detail-panel">
                        {selectedOrder ? (
                          <>
                            <div className="admin-card__title-row">
                              <div>
                                <p className="admin-section__eyebrow">Order Detail</p>
                                <h3>Order #{selectedOrder.id}</h3>
                                <p className="admin-muted-text">
                                  {selectedOrder.customerName}
                                  {selectedOrder.customerEmail ? ` · ${selectedOrder.customerEmail}` : ''}
                                </p>
                              </div>
                              <div className="admin-chip-row">
                                <span className="admin-pill">{selectedOrder.status}</span>
                                <span className="admin-pill">{getCheckoutProviderLabel(selectedOrder.provider)}</span>
                              </div>
                            </div>

                            <div className="admin-key-metrics">
                              <div>
                                <span>Total</span>
                                <strong>{formatAdminCurrency(selectedOrder.totalEur)}</strong>
                              </div>
                              <div>
                                <span>Subtotal</span>
                                <strong>{formatAdminCurrency(selectedOrder.subtotalEur)}</strong>
                              </div>
                              <div>
                                <span>Items</span>
                                <strong>{selectedOrder.items.length}</strong>
                              </div>
                            </div>

                            <div className="admin-detail-list">
                              <div>
                                <span>Cliente</span>
                                <strong>{selectedOrder.customerName}</strong>
                              </div>
                              <div>
                                <span>Email</span>
                                <strong>{selectedOrder.customerEmail ?? 'Sin email visible'}</strong>
                              </div>
                              <div>
                                <span>Fecha</span>
                                <strong>{formatAdminDate(selectedOrder.createdAt)}</strong>
                              </div>
                              <div>
                                <span>Actualizado</span>
                                <strong>{formatAdminDate(selectedOrder.updatedAt)}</strong>
                              </div>
                              <div>
                                <span>Currency</span>
                                <strong>{selectedOrder.currency}</strong>
                              </div>
                              <div>
                                <span>User ID</span>
                                <strong>{selectedOrder.userId}</strong>
                              </div>
                              <div>
                                <span>Provider status</span>
                                <strong>{selectedOrder.providerStatus ?? 'Sin dato'}</strong>
                              </div>
                              <div>
                                <span>Provider order</span>
                                <strong>{selectedOrder.providerOrderId ?? 'Sin dato'}</strong>
                              </div>
                              <div>
                                <span>Reference</span>
                                <strong>{selectedOrder.providerReference ?? 'Sin dato'}</strong>
                              </div>
                              <div>
                                <span>Paid at</span>
                                <strong>{selectedOrder.paidAt ? formatAdminDate(selectedOrder.paidAt) : 'Pendiente'}</strong>
                              </div>
                              <div>
                                <span>Cancelled at</span>
                                <strong>{selectedOrder.cancelledAt ? formatAdminDate(selectedOrder.cancelledAt) : 'No'}</strong>
                              </div>
                            </div>

                            {selectedOrderCustomer ? (
                              <div className="admin-subsection">
                                <div className="admin-card__title-row">
                                  <h3>Cliente vinculado</h3>
                                  <button
                                    className="admin-button admin-button--small"
                                    type="button"
                                    onClick={() => {
                                      setSelectedCustomerId(selectedOrderCustomer.userId);
                                      navigate('/admin/dashboard/customers');
                                    }}
                                  >
                                    Ver cliente
                                  </button>
                                </div>
                                <div className="admin-detail-list">
                                  <div>
                                    <span>Nombre</span>
                                    <strong>{selectedOrderCustomer.displayName}</strong>
                                  </div>
                                  <div>
                                    <span>Proveedor</span>
                                    <strong>{selectedOrderCustomer.isAnonymous ? 'anonymous' : selectedOrderCustomer.provider}</strong>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            <div className="admin-subsection">
                              <div className="admin-card__title-row">
                                <h3>Líneas del pedido</h3>
                                <span className="admin-pill">
                                  {selectedOrder.items.length}
                                </span>
                              </div>

                              {selectedOrder.items.length ? (
                                <div className="admin-order-items">
                                  {selectedOrder.items.map((item) => (
                                    <div className="admin-order-item" key={`${selectedOrder.id}-${item.productSlug}`}>
                                      <div>
                                        <strong>{item.productTitle}</strong>
                                        <span>{item.productSlug}</span>
                                      </div>
                                      <div className="admin-order-item__meta">
                                        <span>x{item.quantity}</span>
                                        <strong>{formatAdminCurrency(item.subtotalEur)}</strong>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="admin-muted-text">Este pedido todavía no tiene líneas visibles.</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="admin-empty-panel">
                            <i className="fa-solid fa-receipt" />
                            <h3>Selecciona un pedido</h3>
                            <p>El detalle completo del checkout aparecerá aquí cuando elijas uno de la lista.</p>
                          </div>
                        )}
                      </aside>
                    </div>
                  ) : (
                    <div className="admin-card admin-empty-panel">
                      <i className="fa-solid fa-magnifying-glass" />
                      <h3>Sin coincidencias</h3>
                      <p>Prueba con otro order id, cliente, email, estado o producto.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="admin-card admin-empty-panel">
                  <i className="fa-solid fa-box-open" />
                  <h3>Aún no hay pedidos</h3>
                  <p>Cuando un cliente complete una compra en la tienda aparecerá aquí en tiempo real.</p>
                </div>
              )}
            </section>

            <section className="admin-section" id="admins">
              <div className="admin-section__head">
                <p className="admin-section__eyebrow">Admins</p>
                <h2>Miembros del dashboard</h2>
              </div>

              {!isRemoteAdminAuth ? (
                <div className="admin-card admin-empty-panel">
                  <i className="fa-solid fa-database" />
                  <h3>Disponible en modo Supabase</h3>
                  <p>Los roles y miembros del panel se gestionan desde `storefront_admin_members`.</p>
                </div>
              ) : !isAdminMembersReady ? (
                <div className="admin-card admin-empty-panel">
                  <div className="checkout-stage__loader" />
                  <p>Cargando miembros reales del panel...</p>
                </div>
              ) : adminMembersError ? (
                <div className="admin-card admin-empty-panel">
                  <i className="fa-solid fa-triangle-exclamation" />
                  <h3>No se pudieron cargar los miembros</h3>
                  <p>{adminMembersError}</p>
                </div>
              ) : (
                <>
                  <div className="admin-grid admin-grid--stats">
                    <div className="admin-card admin-stat-card">
                      <span className="admin-stat-card__label">Owners</span>
                      <strong>{adminMembers.filter((member) => member.role === 'owner').length}</strong>
                      <p>Control total del panel y de los miembros.</p>
                    </div>
                    <div className="admin-card admin-stat-card">
                      <span className="admin-stat-card__label">Admins</span>
                      <strong>{adminMembers.filter((member) => member.role === 'admin').length}</strong>
                      <p>Gestión operativa sin control sobre miembros.</p>
                    </div>
                    <div className="admin-card admin-stat-card">
                      <span className="admin-stat-card__label">Editors</span>
                      <strong>{adminMembers.filter((member) => member.role === 'editor').length}</strong>
                      <p>Edición de contenido con permisos limitados.</p>
                    </div>
                    <div className="admin-card admin-stat-card">
                      <span className="admin-stat-card__label">Your role</span>
                      <strong>{adminSession.role ?? 'unknown'}</strong>
                      <p>{canManageAdmins ? 'Puedes gestionar miembros.' : 'Vista de solo lectura.'}</p>
                    </div>
                  </div>

                  <div className="admin-grid admin-grid--products">
                    <div className="admin-card">
                      <div className="admin-card__title-row">
                        <h3>Miembros actuales</h3>
                        <span className="admin-pill">{adminMembers.length} miembros</span>
                      </div>

                      <div className="admin-stack">
                        {adminMembers.map((member) => (
                          <article className="admin-group-card" key={member.userId}>
                            <div className="admin-card__title-row">
                              <div>
                                <h3>{member.email ?? member.userId}</h3>
                                <p className="admin-muted-text">{member.userId}</p>
                              </div>
                              <span className="admin-pill">{member.role}</span>
                            </div>

                            <div className="admin-detail-list">
                              <div>
                                <span>Creado</span>
                                <strong>{formatAdminDate(member.createdAt)}</strong>
                              </div>
                              <div>
                                <span>Actualizado</span>
                                <strong>{formatAdminDate(member.updatedAt)}</strong>
                              </div>
                            </div>

                            <div className="admin-row admin-row--wrap">
                              <select
                                value={member.role}
                                disabled={!canManageAdmins || isAdminActionBusy}
                                onChange={(event) =>
                                  void handleAdminRoleChange(
                                    member.userId,
                                    event.currentTarget.value as AdminMemberRecord['role'],
                                  )
                                }
                              >
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                              </select>
                              <button
                                className="admin-button admin-button--danger admin-button--small"
                                type="button"
                                disabled={!canManageAdmins || isAdminActionBusy}
                                onClick={() => void handleRemoveAdmin(member.userId)}
                              >
                                Quitar
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>

                    <div className="admin-card">
                      <div className="admin-card__title-row">
                        <h3>Vincular miembro</h3>
                        <span className="admin-pill">{canManageAdmins ? 'Owner only' : 'Read only'}</span>
                      </div>

                      <div className="admin-grid admin-grid--2">
                        <AdminField label="Email o user id" hint="La cuenta ya debe existir en Supabase Auth">
                          <input
                            value={adminLookup}
                            disabled={!canManageAdmins || isAdminActionBusy}
                            onChange={(event) => setAdminLookup(event.currentTarget.value)}
                          />
                        </AdminField>

                        <AdminField label="Rol">
                          <select
                            value={adminRoleDraft}
                            disabled={!canManageAdmins || isAdminActionBusy}
                            onChange={(event) =>
                              setAdminRoleDraft(event.currentTarget.value as AdminMemberRecord['role'])
                            }
                          >
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        </AdminField>
                      </div>

                      <div className="admin-inline-tip">
                        <i className="fa-solid fa-user-shield" />
                        <p>
                          Solo el <strong>owner</strong> puede añadir, quitar o cambiar roles. El usuario debe existir primero en
                          {' '}
                          <strong>Supabase Auth</strong>.
                        </p>
                      </div>

                      {adminActionMessage ? <p className="admin-auth__error">{adminActionMessage}</p> : null}

                      <div className="admin-row admin-row--wrap">
                        <button
                          className="admin-button admin-button--primary"
                          type="button"
                          disabled={!canManageAdmins || isAdminActionBusy}
                          onClick={() => void handleAddAdminMember()}
                        >
                          {isAdminActionBusy ? 'Guardando...' : 'Vincular miembro'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="admin-section" id="content">
              <div className="admin-section__head">
                <p className="admin-section__eyebrow">Contenido</p>
                <h2>Términos, login y módulos visibles</h2>
              </div>

              <div className="admin-card admin-grid admin-grid--2">
                <AdminToggle
                  label="Mostrar Why Choose Us"
                  checked={siteConfig.whyChooseUs.enabled}
                  onChange={(checked) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      whyChooseUs: { ...current.whyChooseUs, enabled: checked },
                    }))
                  }
                />
                <AdminToggle
                  label="Mostrar Achievements"
                  checked={siteConfig.achievements.enabled}
                  onChange={(checked) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      achievements: { ...current.achievements, enabled: checked },
                    }))
                  }
                />
                <AdminToggle
                  label="Mostrar Reviews"
                  checked={siteConfig.reviews.enabled}
                  onChange={(checked) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      reviews: { ...current.reviews, enabled: checked },
                    }))
                  }
                />
                <AdminToggle
                  label="Mostrar FAQ"
                  checked={siteConfig.faq.enabled}
                  onChange={(checked) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      faq: { ...current.faq, enabled: checked },
                    }))
                  }
                />
                <AdminToggle
                  label="Mostrar Payments"
                  checked={siteConfig.payments.enabled}
                  onChange={(checked) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      payments: { ...current.payments, enabled: checked },
                    }))
                  }
                />
                <AdminToggle
                  label="Mostrar Discord banner"
                  checked={siteConfig.discordBanner.enabled}
                  onChange={(checked) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      discordBanner: { ...current.discordBanner, enabled: checked },
                    }))
                  }
                />

                <AdminField label="Título página login">
                  <input
                    value={siteConfig.customerLogin.routeTitle}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        customerLogin: { ...current.customerLogin, routeTitle: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Subtítulo página login">
                  <input
                    value={siteConfig.customerLogin.routeSubtitle}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        customerLogin: { ...current.customerLogin, routeSubtitle: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Texto botón login">
                  <input
                    value={siteConfig.customerLogin.buttonLabel}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        customerLogin: { ...current.customerLogin, buttonLabel: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

            <AdminField label="Texto ayuda login">
              <input
                value={siteConfig.customerLogin.helperText}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                        ...current,
                        customerLogin: { ...current.customerLogin, helperText: event.currentTarget.value },
                      }))
                }
              />
            </AdminField>

            <AdminField label="Proveedor principal">
              <select
                value={siteConfig.customerLogin.primaryProviderId}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    customerLogin: {
                      ...current.customerLogin,
                      primaryProviderId: event.currentTarget.value as typeof current.customerLogin.primaryProviderId,
                    },
                  }))
                }
              >
                {siteConfig.customerLogin.providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField label="Título destacados home">
              <input
                value={siteConfig.storeText.featuredProductsLabel}
                onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, featuredProductsLabel: event.currentTarget.value },
                      }))
                    }
              />
            </AdminField>

            <div className="admin-group-card admin-grid admin-grid--2">
              {siteConfig.customerLogin.providers.map((provider, index) => (
                <div className="admin-group-card" key={provider.id}>
                  <div className="admin-card__title-row">
                    <h3>{provider.label}</h3>
                    <span className="admin-pill">{provider.id}</span>
                  </div>

                  <div className="admin-stack">
                    <AdminToggle
                      label={`Activar ${provider.label}`}
                      checked={provider.enabled}
                      onChange={(checked) =>
                        updateSiteConfig((current) => ({
                          ...current,
                          customerLogin: {
                            ...current.customerLogin,
                            providers: updateArrayItem(current.customerLogin.providers, index, {
                              ...current.customerLogin.providers[index],
                              enabled: checked,
                            }),
                          },
                        }))
                      }
                    />

                    <AdminField label="Nombre visible">
                      <input
                        value={provider.label}
                        onChange={(event) =>
                          updateSiteConfig((current) => ({
                            ...current,
                            customerLogin: {
                              ...current.customerLogin,
                              providers: updateArrayItem(current.customerLogin.providers, index, {
                                ...current.customerLogin.providers[index],
                                label: event.currentTarget.value,
                              }),
                            },
                          }))
                        }
                      />
                    </AdminField>

                    <AdminField label="Texto botón">
                      <input
                        value={provider.buttonLabel}
                        onChange={(event) =>
                          updateSiteConfig((current) => ({
                            ...current,
                            customerLogin: {
                              ...current.customerLogin,
                              providers: updateArrayItem(current.customerLogin.providers, index, {
                                ...current.customerLogin.providers[index],
                                buttonLabel: event.currentTarget.value,
                              }),
                            },
                          }))
                        }
                      />
                    </AdminField>

                    <AdminField label="Logo / imagen">
                      <input
                        value={provider.logoSrc ?? ''}
                        onChange={(event) =>
                          updateSiteConfig((current) => ({
                            ...current,
                            customerLogin: {
                              ...current.customerLogin,
                              providers: updateArrayItem(current.customerLogin.providers, index, {
                                ...current.customerLogin.providers[index],
                                logoSrc: event.currentTarget.value || undefined,
                              }),
                            },
                          }))
                        }
                      />
                    </AdminField>

                    <AdminField label="Icon class FontAwesome">
                      <input
                        value={provider.iconClass ?? ''}
                        onChange={(event) =>
                          updateSiteConfig((current) => ({
                            ...current,
                            customerLogin: {
                              ...current.customerLogin,
                              providers: updateArrayItem(current.customerLogin.providers, index, {
                                ...current.customerLogin.providers[index],
                                iconClass: event.currentTarget.value || undefined,
                              }),
                            },
                          }))
                        }
                      />
                    </AdminField>
                  </div>
                </div>
              ))}
            </div>

                <AdminField label="Texto Add to cart">
                  <input
                    value={siteConfig.storeText.productAddToCartLabel}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, productAddToCartLabel: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Texto soporte producto 1">
                  <input
                    value={siteConfig.storeText.productSupportPrimary}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, productSupportPrimary: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Texto soporte producto 2">
                  <input
                    value={siteConfig.storeText.productSupportSecondary}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, productSupportSecondary: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Título cesta / checkout">
                  <input
                    value={siteConfig.storeText.checkoutBasketTitle}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, checkoutBasketTitle: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Título order summary">
                  <input
                    value={siteConfig.storeText.checkoutSummaryTitle}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, checkoutSummaryTitle: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Boton completar pago">
                  <input
                    value={siteConfig.storeText.checkoutCompletePaymentLabel}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, checkoutCompletePaymentLabel: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Boton seguir comprando">
                  <input
                    value={siteConfig.storeText.checkoutContinueShoppingLabel}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, checkoutContinueShoppingLabel: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Título bloque preview">
                  <input
                    value={siteConfig.storeText.productPreviewTitle}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, productPreviewTitle: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Título bloque documentación">
                  <input
                    value={siteConfig.storeText.productDocumentationTitle}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, productDocumentationTitle: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Texto link documentación">
                  <input
                    value={siteConfig.storeText.productDocumentationLinkLabel}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, productDocumentationLinkLabel: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Texto sin documentación">
                  <input
                    value={siteConfig.storeText.productDocumentationEmptyText}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, productDocumentationEmptyText: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Texto soporte checkout">
                  <input
                    value={siteConfig.storeText.checkoutSupportText}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, checkoutSupportText: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Texto 404 botón">
                  <input
                    value={siteConfig.storeText.notFoundButtonLabel}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        storeText: { ...current.storeText, notFoundButtonLabel: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Título términos">
                  <input
                    value={siteConfig.terms.title}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        terms: { ...current.terms, title: event.currentTarget.value },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Párrafos términos" hint="Uno por línea">
                  <textarea
                    value={siteConfig.terms.paragraphs.join('\n')}
                    onChange={(event) =>
                      updateSiteConfig((current) => ({
                        ...current,
                        terms: { ...current.terms, paragraphs: parseLines(event.currentTarget.value) },
                      }))
                    }
                  />
                </AdminField>

                <AdminField label="Vídeos home" hint="Uno por línea: Título | URL">
                  <textarea
                    value={home.videos.map((video) => `${video.name} | ${video.url}`).join('\n')}
                    onChange={(event) =>
                      updateHome((current) => ({
                        ...current,
                        videos: parseLines(event.currentTarget.value).map((line) => {
                          const [name, url] = line.split('|').map((entry) => entry.trim());
                          return { name: name || 'Video', url: url || 'https://youtube.com/' };
                        }),
                      }))
                    }
                  />
                </AdminField>

                <div className="admin-group-card">
                  <div className="admin-card__title-row">
                    <h3>Actividad comercial en tiempo real</h3>
                    <span className="admin-pill">Realtime</span>
                  </div>
                  <p className="admin-muted-text">
                    Los bloques de Payments, Reviews y Achievements ya no usan texto harcodeado. Ahora salen de pedidos y reseñas reales guardados en Supabase.
                  </p>
                </div>
              </div>
            </section>

            <section className="admin-credit" aria-label="Creditos del creador">
              <img className="admin-credit__logo" src={creatorLogoSrc} alt="Luckav Development" />
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
