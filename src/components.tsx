import { useEffect, useState, type ReactNode } from 'react';
import {
  ChevronDown,
  Clipboard,
  Menu,
  ShoppingCart,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  currencies,
  formatPrice,
  getCategoryHref,
  getPrimaryCategory,
  getProductHref,
  type CurrencyCode,
  type Product,
  useStore,
} from './store';
import { getPrimaryCustomerAuthProvider } from './customer-auth-utils';

const frameworkLogoMap: Record<string, string> = {
  ESX: '/media/esx-logo.png',
  QBCore: '/media/qb-logo.png',
  QBox: '/media/qbox-logo.png',
};

function getCountdownTarget(target: number) {
  return target > Date.now()
    ? target
    : Date.now() + 10 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000;
}

function getTimeParts(target: number) {
  const diff = Math.max(target - Date.now(), 0);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return [
    { label: 'Days', value: String(days).padStart(2, '0') },
    { label: 'HRS', value: String(hours).padStart(2, '0') },
    { label: 'MINS', value: String(minutes).padStart(2, '0') },
    { label: 'SECS', value: String(seconds).padStart(2, '0') },
  ];
}

function ExternalAnchor({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function ProviderVisual({
  iconClass,
  logoAlt,
  logoSrc,
}: {
  iconClass?: string;
  logoAlt?: string;
  logoSrc?: string;
}) {
  if (logoSrc) {
    return <img src={logoSrc} alt={logoAlt ?? ''} className="w-4 h-4 object-contain white-icon" />;
  }

  if (iconClass) {
    return <i className={`${iconClass} text-sm`} />;
  }

  return <i className="fa-solid fa-right-to-bracket text-sm" />;
}

function formatRelativeAdminTime(value: string) {
  const timestamp = new Date(value).getTime();
  const diff = timestamp - Date.now();
  const absDiff = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absDiff < 60 * 60 * 1000) {
    return rtf.format(Math.round(diff / (60 * 1000)), 'minute');
  }

  if (absDiff < 24 * 60 * 60 * 1000) {
    return rtf.format(Math.round(diff / (60 * 60 * 1000)), 'hour');
  }

  return rtf.format(Math.round(diff / (24 * 60 * 60 * 1000)), 'day');
}

function renderReviewStars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => {
    const isFilled = index < Math.round(rating);
    return (
      <i
        className={`fa-solid fa-star text-xl ${isFilled ? 'text-[#FF3A52]' : 'text-white/15'}`}
        key={index}
        style={isFilled ? { filter: 'drop-shadow(0 2px 4px rgba(255,58,82,0.5))' } : undefined}
      />
    );
  });
}

function buildInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return 'ST';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function SiteShell() {
  const { isStorefrontReady, siteConfig, storefrontSource } = useStore();

  if (!isStorefrontReady) {
    return (
      <div className="site-shell">
        <main className="site-main">
          <section className="container mx-auto min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-16 h-16 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center">
              <i className="fa-solid fa-database text-[#FF3A52] text-xl" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-white font-semibold text-xl">Cargando tienda</p>
              <p className="max-w-lg text-white/55 text-sm sm:text-base">
                Sincronizando branding, categorías, productos y textos desde {storefrontSource === 'supabase' ? 'Supabase' : 'almacenamiento local'}.
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell">
      {siteConfig.discountBanner.enabled ? <DiscountBanner /> : null}
      <SiteHeader />
      <main className="site-main">
        <Outlet />
      </main>
      <SiteFooter />
      <CartDrawer />
    </div>
  );
}

function DiscountBanner() {
  const { siteConfig } = useStore();
  const { discountBanner } = siteConfig;
  const [copied, setCopied] = useState(false);
  const [parts, setParts] = useState(() =>
    getTimeParts(getCountdownTarget(new Date(discountBanner.endAt).getTime())),
  );

  useEffect(() => {
    const target = getCountdownTarget(new Date(discountBanner.endAt).getTime());
    setParts(getTimeParts(target));
    const timer = window.setInterval(() => {
      setParts(getTimeParts(target));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [discountBanner.endAt]);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(discountBanner.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      className="discount-banner w-full min-h-[62.65px] py-3 sm:py-0 sm:h-[62.65px] relative flex items-center justify-center"
      style={{ background: 'radial-gradient(50% 366.3% at 50% 50%, #B4101A 0%, #4C0101 100%)' }}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between w-[768px] max-w-full gap-3 sm:gap-0 px-4 sm:px-0 relative z-10">
        <div className="flex items-center">
          <img
            src={discountBanner.logoSrc}
            alt={discountBanner.logoAlt}
            className="w-6 sm:w-[27.5px] h-6 sm:h-[27.5px] object-contain mr-2 sm:mr-3"
          />
          <div className="text-center sm:text-left">
            <p className="font-bold text-xs sm:text-sm text-white leading-tight">{discountBanner.title}</p>
            <p className="font-medium text-[11px] sm:text-[13px] text-white leading-tight">
              {discountBanner.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-x-2 sm:gap-x-3">
          <button
            className="flex items-center gap-x-1.5 bg-black/[.28] rounded-[2.30px] px-2.5 sm:px-3 py-1.5 sm:py-2 cursor-pointer hover:bg-black/[.35] transition-colors relative z-20"
            type="button"
            onClick={handleCopyCode}
            title="Click to copy"
          >
            <div className="text-center">
              <p className="font-bold text-white/50 text-[7px] sm:text-[8px] leading-none uppercase mb-0.5">Code</p>
              <p className="font-bold text-white text-[11px] sm:text-xs leading-none uppercase">{discountBanner.code}</p>
            </div>
            <Clipboard className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/70" />
            {copied ? <span className="text-[10px] text-white/70">Copied</span> : null}
          </button>

          <div className="flex items-center gap-x-1 sm:gap-x-1.5">
            {parts.map((part) => (
              <div
                className="w-[30px] sm:w-[35.15px] h-[38px] sm:h-[45.08px] bg-black/[.28] rounded-[2.30px] flex flex-col items-center justify-center gap-y-0.5 sm:gap-y-1"
                key={part.label}
              >
                <p className="font-bold text-white text-lg sm:text-2xl leading-none uppercase">{part.value}</p>
                <p className="font-bold text-white/50 text-[7px] sm:text-[8px] leading-none uppercase">{part.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <img
        src={discountBanner.backgroundImageSrc}
        alt="Black Friday Banner"
        className="w-full h-full absolute top-0 left-0 object-cover object-center pointer-events-none"
      />
    </section>
  );
}

function SiteHeader() {
  const {
    cartCount,
    categories,
    currency,
    setCurrency,
    isCartOpen,
    openCart,
    closeCart,
    user,
    logout,
    siteConfig,
  } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileScriptsOpen, setIsMobileScriptsOpen] = useState(false);
  const headerScriptLinks = categories
    .filter((category) => category.showInNavigation !== false)
    .map((category) => ({ label: category.label, href: getCategoryHref(category.id) }));
  const { brandAssets, customerLogin, header } = siteConfig;
  const primaryLoginProvider = getPrimaryCustomerAuthProvider(customerLogin);

  useEffect(() => {
    document.body.classList.toggle('menu-open', isMenuOpen || isCartOpen);
    return () => document.body.classList.remove('menu-open');
  }, [isCartOpen, isMenuOpen]);

  function closeMobileMenu() {
    setIsMenuOpen(false);
    setIsMobileScriptsOpen(false);
  }

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `site-header__link ${isActive ? 'is-active' : ''}`;

  return (
    <>
      <header
        className="site-header bg-transparent w-full relative py-6 sm:py-8 transition-all duration-300 flex items-center justify-center"
        id="navbar"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between h-12 sm:h-16">
            <div className="h-full flex items-center gap-x-4 sm:gap-x-6 lg:gap-x-10">
              <Link className="h-full flex items-center gap-x-2 sm:gap-x-5" to="/" aria-label={siteConfig.studioName}>
                <img src={brandAssets.headerLogoSrc} alt={brandAssets.headerLogoAlt} className="w-20 sm:w-28 md:w-32 lg:w-[160px] h-auto" />
                <div className="hidden sm:block w-px h-10 bg-white/10"></div>
                <img
                  src={brandAssets.headerPartnerLogoSrc}
                  alt={brandAssets.headerPartnerLogoAlt}
                  className="hidden sm:block w-8 sm:w-10 h-8 sm:h-10 object-contain"
                />
              </Link>

              <nav className="site-header__nav hidden xl:flex items-center gap-x-6 lg:gap-x-8">
                <NavLink className={desktopLinkClass} to="/">
                  {header.homeLabel}
                </NavLink>
                {header.showCategoryMenu && headerScriptLinks.length ? (
                  <div className="header-dropdown w-max h-max flex flex-col items-start relative group">
                    <button
                      className="site-header__link site-header__link--button flex items-center gap-x-1"
                      type="button"
                    >
                      {header.categoryMenuLabel}
                      <ChevronDown className="w-4 h-auto" size={16} />
                    </button>
                    <div className="header-dropdown__menu absolute top-full left-0 hidden pt-2 group-hover:flex">
                      <div className="w-max h-max outline-2 outline-white/5 p-2 rounded-2xl flex flex-col items-start gap-y-1 z-[100] bg-[#171717]">
                        {headerScriptLinks.map((link) => (
                          <NavLink
                            key={link.href}
                            to={link.href}
                            className={({ isActive }) =>
                              `w-56 p-1 font-medium flex items-center justify-between border rounded-lg transition-colors duration-200 group/item ${isActive
                                ? 'bg-white/15 text-white border-white/10'
                                : 'border-transparent text-white/50 hover:bg-white/15 hover:text-white hover:border-white/10'
                              }`
                            }
                          >
                            <div className="flex items-center gap-x-2.5 text-sm">
                              <span>{link.label}</span>
                            </div>
                            <i className="fa-solid fa-chevron-right text-[11px] text-white/40 group-hover/item:text-white" />
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
                {header.showDocumentationLink ? (
                  <ExternalAnchor
                    className="site-header__link"
                    href={header.documentationHref}
                  >
                    {header.documentationLabel}
                  </ExternalAnchor>
                ) : null}
              </nav>
            </div>

            <div className="site-header__actions flex h-full items-center gap-x-3">
              <div className="site-header__socials hidden xl:flex items-center gap-x-2 sm:gap-x-3">
                {header.socialLinks.map((link) => (
                  <ExternalAnchor
                    key={link.label}
                    className="site-header__social-link flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-white border border-transparent transition-colors duration-200 rounded-full"
                    href={link.href}
                  >
                    <i className={`${link.icon} text-lg sm:text-xl`} />
                  </ExternalAnchor>
                ))}
              </div>

              <div className="hidden xl:block w-px h-full bg-white/10"></div>

              <button
                className="header-cart-link w-8 h-8 sm:w-10 sm:h-10 hidden xl:flex items-center justify-center text-white cursor-pointer relative rounded-full"
                type="button"
                onClick={openCart}
              >
                <ShoppingCart className="sm:w-[18px] sm:h-[18px]" size={16} />
                {cartCount ? <span className="cart-pill">{cartCount}</span> : null}
              </button>

              <details className="header-dropdown header-dropdown--currency hidden xl:flex w-max h-max flex-col items-start relative group">
                <summary className="w-max h-[30px] sm:h-[34px] flex items-center gap-x-1.5 px-2 sm:px-2.5 rounded-lg border border-[#282828] bg-white hover:bg-[#FF3A52] hover:text-white hover:border-[#FF3A52] text-black font-bold italic text-sm sm:text-base cursor-pointer transition-colors duration-200">
                  {currency}
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" size={16} />
                </summary>
                <div className="header-dropdown__menu header-dropdown__menu--currency w-max h-max p-2 border-2 border-[#FFFFFF]/5 rounded-xl bg-[#171717]">
                  <div className="grid grid-cols-3 gap-1.5">
                    {currencies.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={(event) => {
                          setCurrency(item.code);
                          (event.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open');
                        }}
                        className={`w-14 sm:w-16 h-[34px] sm:h-[38px] flex items-center justify-center font-bold text-sm sm:text-base rounded-lg border transition-colors duration-200 ${currency === item.code
                          ? 'bg-white text-black border-white'
                          : 'bg-white/[.08] text-white/40 border-white/5 hover:bg-white/[.12] hover:text-white/70 hover:border-white/10'
                          }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </details>

              {user ? (
                <button
                  className="header-login hidden xl:flex w-max h-[30px] sm:h-[34px] items-center gap-x-1.5 px-2 sm:px-2.5 rounded-lg border border-white/15 text-white font-bold italic text-sm sm:text-base transition-colors duration-200"
                  style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, #323232 0%, #555555 100%)' }}
                  type="button"
                  onClick={logout}
                >
                  {user.name}
                </button>
              ) : (
                <Link
                  className="header-login hidden xl:flex w-max h-[30px] sm:h-[34px] items-center gap-x-1.5 px-2 sm:px-2.5 rounded-lg border border-white/15 text-white font-bold italic text-sm sm:text-base transition-colors duration-200"
                  style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, #323232 0%, #555555 100%)' }}
                  to="/login"
                >
                  <ProviderVisual
                    iconClass={primaryLoginProvider?.iconClass}
                    logoAlt={primaryLoginProvider?.logoAlt ?? customerLogin.providerLogoAlt}
                    logoSrc={primaryLoginProvider?.logoSrc ?? customerLogin.providerLogoSrc}
                  />
                  {header.guestLoginLabel}
                </Link>
              )}

              <button
                className="header-menu-toggle"
                type="button"
                onClick={() =>
                  setIsMenuOpen((current) => {
                    if (current) {
                      setIsMobileScriptsOpen(false);
                    }

                    return !current;
                  })
                }
                aria-label="Toggle navigation"
              >
                {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={`mobile-panel fixed inset-0 z-[100] ${isMenuOpen ? 'is-open' : ''} overflow-y-auto`}>
        <div className="mobile-panel__header">
          <Link className="mobile-panel__brand" onClick={closeMobileMenu} to="/">
            <img src={brandAssets.headerLogoSrc} alt={brandAssets.headerLogoAlt} />
          </Link>
          <button
            className="mobile-panel__close"
            type="button"
            aria-label="Close navigation"
            onClick={closeMobileMenu}
          >
            <X size={22} />
          </button>
        </div>

        <div className="mobile-panel__body">
          <nav className="mobile-panel__nav">
            <NavLink className="mobile-panel__link" onClick={closeMobileMenu} to="/">
              <span className="mobile-panel__link-copy">
                <i className="fa-solid fa-house" />
                <span>{header.homeLabel}</span>
              </span>
            </NavLink>

            {header.showCategoryMenu && headerScriptLinks.length ? (
              <div className="mobile-panel__group">
                <button
                  className="mobile-panel__link mobile-panel__link--button"
                  type="button"
                  onClick={() => setIsMobileScriptsOpen((current) => !current)}
                >
                  <span className="mobile-panel__link-copy">
                    <i className="fa-solid fa-code" />
                    <span>{header.categoryMenuLabel}</span>
                  </span>
                  <ChevronDown
                    className={`mobile-panel__chevron ${isMobileScriptsOpen ? 'rotate-180' : ''}`}
                    size={18}
                  />
                </button>
                <div className={`mobile-panel__submenu ${isMobileScriptsOpen ? 'is-open' : ''}`}>
                  {headerScriptLinks.map((link) => (
                    <NavLink
                      key={link.href}
                      className="mobile-panel__sublink"
                      onClick={closeMobileMenu}
                      to={link.href}
                    >
                      <i className="fa-solid fa-infinity" />
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ) : null}

            {header.showDocumentationLink ? (
              <a
                className="mobile-panel__link"
                href={header.documentationHref}
                target="_blank"
                rel="noreferrer"
                onClick={closeMobileMenu}
              >
                <span className="mobile-panel__link-copy">
                  <i className="fa-solid fa-file-lines" />
                  <span>{header.documentationLabel}</span>
                </span>
              </a>
            ) : null}
          </nav>

          <div className="mobile-panel__social-section">
            <p>FOLLOW US</p>
            <div className="mobile-panel__social-grid">
              {header.socialLinks.map((link) => (
                <a
                  key={link.label}
                  className="mobile-panel__social-card"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMobileMenu}
                >
                  <i className={link.icon} />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mobile-panel__footer">
          <label className="mobile-panel__currency-row">
            <span>Currency</span>
            <span className="mobile-panel__currency-select">
              <span>{currency}</span>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.currentTarget.value as CurrencyCode)}
              >
                {currencies.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </span>
          </label>

          <Link className="mobile-panel__basket-link" onClick={closeMobileMenu} to="/checkout/basket">
            <span className="mobile-panel__basket-copy">
              <i className="fa-solid fa-cart-shopping" />
              <span>Basket</span>
            </span>
            {cartCount ? <span className="mobile-panel__basket-count">{cartCount}</span> : null}
          </Link>

          {user ? (
            <button
              className="mobile-panel__login-link"
              type="button"
              onClick={() => {
                void logout();
                closeMobileMenu();
              }}
            >
              <i className="fa-solid fa-right-from-bracket" />
              <span>{user.name}</span>
            </button>
          ) : (
            <Link className="mobile-panel__login-link" onClick={closeMobileMenu} to="/login">
              <i className="fa-solid fa-link" />
              <span>{header.guestLoginLabel}</span>
            </Link>
          )}
        </div>
      </div>

      <button
        className={`scrim ${isMenuOpen ? 'is-visible' : ''}`}
        type="button"
        aria-hidden={!isMenuOpen}
        onClick={closeMobileMenu}
      />
      <button
        className={`scrim ${isCartOpen ? 'is-visible' : ''}`}
        type="button"
        aria-hidden={!isCartOpen}
        onClick={closeCart}
      />
    </>
  );
}

function CartDrawer() {
  const {
    cartCount,
    cartLines,
    closeCart,
    currency,
    isCartOpen,
    removeFromCart,
    siteConfig,
    subtotalEur,
  } = useStore();
  const { storeText } = siteConfig;

  return (
    <aside className={`cart-drawer ${isCartOpen ? 'is-open' : ''}`}>
      <div className="cart-drawer__header">
        <div className="cart-drawer__meta">
          <span className="cart-drawer__badge">
            <ShoppingCart size={18} />
          </span>
          <div>
            <h3>Shopping Cart</h3>
            <p>
              <span>{cartCount}</span> item(s)
            </p>
          </div>
        </div>
        <button type="button" onClick={closeCart} aria-label="Close basket">
          <X size={18} />
        </button>
      </div>

      <div className="cart-drawer__body">
        {cartLines.length ? (
          cartLines.map((line) => (
            <article className="cart-line" key={line.product.slug}>
              <Link className="cart-line__image" onClick={closeCart} to={getProductHref(line.product.slug)}>
                <img src={line.product.image} alt={line.product.title} />
              </Link>
              <div className="cart-line__copy">
                <Link className="cart-line__title" to={getProductHref(line.product.slug)} onClick={closeCart}>
                  {line.product.title}
                </Link>
                <p className="cart-line__price">{formatPrice(line.subtotalEur, currency)}</p>
              </div>
              <button className="cart-line__remove" type="button" onClick={() => removeFromCart(line.product.slug)}>
                <i className="fa-solid fa-trash-can" />
              </button>
            </article>
          ))
        ) : (
          <div className="empty-state">
            <ShoppingCart size={20} />
            <p>Your basket is empty.</p>
            <span>Add products from the home page, categories or any product detail page.</span>
          </div>
        )}
      </div>

      <div className="cart-drawer__footer">
        <div className="cart-drawer__summary-row">
          <span>Subtotal</span>
          <strong>{formatPrice(subtotalEur, currency)}</strong>
        </div>
        <div className="cart-drawer__total-row">
          <span>Total</span>
          <strong>{formatPrice(subtotalEur, currency)}</strong>
        </div>
        <Link className="cart-drawer__primary" onClick={closeCart} to="/checkout/basket">
          {storeText.cartDrawerCheckoutLabel}
        </Link>
        <button className="cart-drawer__secondary" type="button" onClick={closeCart}>
          {storeText.cartDrawerContinueLabel}
        </button>
      </div>
    </aside>
  );
}

function SiteFooter() {
  const { siteConfig } = useStore();
  const { brandAssets, footer } = siteConfig;

  return (
    <footer className="bg-[#1B1B1B] border-t-2 border-white/5 mt-16">
      <div className="container mx-auto py-8 flex flex-col items-start px-4 sm:px-6 lg:px-8">
        <div className="w-full h-max flex flex-col md:flex-row items-start gap-x-20 gap-y-20">
          <div className="flex flex-col items-start">
            <img src={brandAssets.footerLogoSrc} alt={brandAssets.footerLogoAlt} className="w-[133px] h-[32px]" />
            {footer.showPoweredBy ? (
              <div className="flex items-center gap-x-2 mt-2">
                <p className="font-medium text-xs text-white/10 line-clamp-1">{footer.poweredByLabel}</p>
                <img src={brandAssets.footerPartnerLogoSrc} alt={brandAssets.footerPartnerLogoAlt} className="w-[55px] h-[26px]" />
              </div>
            ) : null}
            {brandAssets.footerDecorationSrc ? (
              <img src={brandAssets.footerDecorationSrc} alt="" className="mt-4 w-[140px] h-[48px]" />
            ) : null}
          </div>

          <div className="grid gap-20 grid-cols-2 lg:grid-cols-3">
            {footer.columns.map((column) => (
              <div className="flex flex-col items-start" key={column.title}>
                <h3 className="mb-2 font-bold text-base text-white line-clamp-1">{column.title}</h3>
                <ul className="flex flex-col items-start gap-y-1">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('/') ? (
                        <Link
                          className="font-normal text-base text-white/55 hover:text-white/80 line-clamp-1 transition-colors duration-200"
                          to={link.href}
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <ExternalAnchor
                          className="font-normal text-base text-white/55 hover:text-white/80 line-clamp-1 transition-colors duration-200"
                          href={link.href}
                        >
                          {link.label}
                        </ExternalAnchor>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full h-max border-t border-white/[.06] mt-8 mb-4 pt-8">
          <p className="max-w-full text-sm text-white/38 font-medium leading-relaxed" style={{ whiteSpace: 'pre-line' }}>
            {footer.legalText}
          </p>
        </div>
      </div>
    </footer>
  );
}

export function DividerTitle({ label }: { label: string }) {
  return (
    <div className="w-full flex items-center gap-x-3 sm:gap-x-[18px] px-2 sm:px-4">
      <div
        className="w-full h-px"
        style={{ background: 'linear-gradient(90deg, rgba(0, 0, 0, 0) 10%, #D9D9D9 100%)' }}
      />
      <h3 className="min-w-max font-bold text-base sm:text-lg lg:text-xl text-white drop-shadow-[0_0px_12px_rgba(255,255,255,0.5)] whitespace-nowrap">
        {label}
      </h3>
      <div
        className="w-full h-px"
        style={{ background: 'linear-gradient(270deg, rgba(0, 0, 0, 0) 10%, #D9D9D9 100%)' }}
      />
    </div>
  );
}

export function MarqueeRow({
  children,
  speed = '40s',
  className,
}: {
  children: ReactNode;
  speed?: string;
  className?: string;
}) {
  return (
    <div className={`marquee-track ${className ?? ''}`.trim()} style={{ ['--marquee-duration' as string]: speed }}>
      {children}
      {children}
    </div>
  );
}

export function SectionHeading({
  lead,
  accent,
  subtitle,
  align = 'center',
}: {
  lead: string;
  accent: string;
  subtitle?: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={`section-heading section-heading--${align}`}>
      <h2>
        <span>{lead} </span>
        <em>{accent}</em>
      </h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
  );
}

export function FrameworkBadges({ frameworks }: { frameworks: string[] }) {
  return (
    <div className="framework-badges">
      {frameworks.map((framework) => (
        <span
          className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-white/10 border border-white/5 rounded-md text-[10px] sm:text-xs font-medium text-white/55"
          key={framework}
        >
          {frameworkLogoMap[framework] ? (
            <img
              src={frameworkLogoMap[framework]}
              alt={`${framework} Logo`}
              className="w-3 h-3 sm:w-4 sm:h-4 object-contain"
            />
          ) : null}
          {framework}
        </span>
      ))}
    </div>
  );
}

export function ProductCard({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const { addToCart, currency } = useStore();
  const checkoutLabel =
    product.checkoutProvider === 'tebex'
      ? 'Tebex'
      : product.checkoutProvider === 'paypal'
        ? 'PayPal'
        : 'External';

  return (
    <article
      className={`product-card border border-white/5 rounded-lg overflow-hidden hover:border-white/10 transition-all duration-300 group package-card featured-package ${compact ? 'product-card--compact' : ''
        }`}
      style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(0, 0, 0, 0.31) 0%, rgba(51, 51, 51, 0.31) 100%)' }}
    >
      <Link className="block product-card__image" to={getProductHref(product.slug)}>
        <div className="relative w-full overflow-hidden bg-muted cursor-pointer" style={{ aspectRatio: '16 / 9' }}>
          <img
            alt={product.fullTitle || product.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={product.image}
          />
        </div>
      </Link>
      <div className="p-2.5 sm:p-3 space-y-2 sm:space-y-3 product-card__body">
        <Link className="product-card__title text-base sm:text-lg h-[48px] sm:h-[56px] font-semibold text-white line-clamp-2 package-name" to={getProductHref(product.slug)}>
          {product.title}
        </Link>
        {!compact ? (
          <p className="product-card__excerpt text-xs !text-white/55 line-clamp-2 leading-relaxed preview-desc">
            {product.excerpt}
          </p>
        ) : null}
        <div className="product-card__checkout text-[11px] text-white/50 flex flex-wrap gap-2">
          <span>Checkout: {checkoutLabel}</span>
          {product.requiresIdentity ? <span>Identity required</span> : null}
        </div>
        <FrameworkBadges frameworks={product.frameworks} />
        <div className="product-card__footer product-actions">
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <p className="product-card__price text-2xl font-bold text-white">{formatPrice(product.priceValue, currency)}</p>
            {product.oldPriceValue ? (
              <del className="text-sm text-white/40 package-price">{formatPrice(product.oldPriceValue, currency)}</del>
            ) : null}
            {product.discountText ? (
              <span className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">{product.discountText}</span>
            ) : null}
          </div>
        </div>
        <div className="pt-2">
          <button
            className="product-card__button add inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-white text-black shadow-xs hover:bg-primary/90 h-9 px-4 py-2 w-full cursor-pointer"
            type="button"
            onClick={() => addToCart(product.slug)}
          >
            Add to Basket
          </button>
        </div>
      </div>
    </article>
  );
}

export function ReviewSection() {
  const { commerceMetrics, recentReviews, siteConfig } = useStore();
  const { reviews } = siteConfig;

  if (!reviews.enabled || !recentReviews.length) {
    return null;
  }

  const cards = recentReviews.map((review) => (
    <article
      className="w-[350px] max-w-[calc(100vw-48px)] h-[306px] border-2 border-white/5 rounded-2xl p-[22px] flex flex-col items-start justify-between flex-shrink-0 backdrop-blur-lg"
      key={review.id}
      style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(0, 0, 0, 0.31) 0%, rgba(51, 51, 51, 0.31) 100%)' }}
    >
      <div className="flex flex-col items-start gap-y-3">
        <div className="flex items-center gap-x-3">
          <div className="w-10 h-10 rounded-md border border-white/10 bg-white/[0.06] text-white font-bold text-sm flex items-center justify-center">
            {buildInitials(review.displayName)}
          </div>
          <div className="flex flex-col items-start">
            <h3 className="font-bold text-base text-white line-clamp-1">{review.displayName}</h3>
            <p className="font-normal text-white/50 line-clamp-1 text-xs">{formatRelativeAdminTime(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-x-1">
          {renderReviewStars(review.rating)}
        </div>
        <p className="max-w-[296px] font-medium text-sm text-white/55 line-clamp-5">{review.quote}</p>
      </div>
      <div className="w-full h-10 flex items-center px-4 bg-white/10 border border-white/[.04] rounded-lg gap-x-2">
        <ShoppingCart className="text-white/55" size={16} />
        <p className="font-semibold text-white/55 line-clamp-1">{review.productTitle}</p>
      </div>
    </article>
  ));

  return (
    <section
      className="w-full h-max flex flex-col items-center justify-center mt-16 sm:mt-28 relative px-4 sm:px-6 lg:px-8 py-9"
      style={{
        backgroundImage: "url('/media/red-grid.png')",
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1788px 807px',
      }}
    >
      <div className="w-full max-w-2xl flex flex-col items-center">
        <div className="flex items-center mb-4">
          <h2 className="font-bold text-3xl lg:text-5xl leading-snug text-center">
            <span className="text-white drop-shadow-[0_0px_12px_rgba(255,255,255,0.5)]">
              {reviews.titleLead}
            </span>{' '}
            <span className="text-[#FF3A52] drop-shadow-[0_0px_12px_rgba(255,58,82,0.5)]">
              {reviews.titleAccent}
            </span>
          </h2>
        </div>
        <div
          className="w-full md:w-max h-max flex flex-col md:flex-row items-center border-2 border-white/5 gap-x-3 rounded-2xl backdrop-blur-xl px-3.5 py-2 mb-[22px]"
          style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(0, 0, 0, 0.31) 0%, rgba(51, 51, 51, 0.31) 100%)' }}
        >
          <p className="font-medium text-white/50 text-sm line-clamp-1 leading-normal">{reviews.summaryLabel}</p>
          <p className="font-bold text-white text-xl line-clamp-1 leading-snug">
            {commerceMetrics.averageRating ? commerceMetrics.averageRating.toFixed(1) : '0.0'}
          </p>
          <div className="flex items-center gap-x-1">
            {renderReviewStars(commerceMetrics.averageRating)}
          </div>
          <p className="font-medium text-white/50 text-xs line-clamp-1 leading-normal">
            Based on {commerceMetrics.reviewsCount} verified reviews
          </p>
        </div>
        <p className="font-medium text-sm lg:text-base text-white/55 leading-relaxed text-center">
          {reviews.description}
        </p>
      </div>

      <div className="container min-h-[330px] relative overflow-hidden flex items-center justify-center mt-5 masked-container">
        <MarqueeRow speed="42s" className="gap-4">
          {cards}
        </MarqueeRow>
      </div>
    </section>
  );
}

export function FaqPreview() {
  const { siteConfig } = useStore();
  const { faq } = siteConfig;
  const [openIndex, setOpenIndex] = useState(-1);
  const [query, setQuery] = useState('');
  const icons = [
    'fa-circle-question',
    'fa-credit-card',
    'fa-shield-halved',
    'fa-arrows-rotate',
    'fa-headset',
    'fa-sliders',
  ];
  const filteredItems = faq.items.filter((item) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return true;
    }

    return (
      item.question.toLowerCase().includes(normalized) ||
      item.answer.toLowerCase().includes(normalized)
    );
  });

  if (!faq.enabled || !faq.items.length) {
    return null;
  }

  return (
    <section
      className="w-full flex flex-col items-center mt-16 sm:mt-28 gap-y-12 sm:gap-y-20 relative px-4 sm:px-6 lg:px-8 py-9 bg-none lg:bg-[url('/media/red-grid.png')] bg-[position:center_center] bg-no-repeat bg-[length:1788px_807px]"
    >
      <div className="container flex flex-col items-center mt-28 gap-y-8 relative z-10">
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="flex items-center mb-3">
            <h2 className="font-bold text-3xl lg:text-5xl leading-relaxed text-center">
              <span className="text-white drop-shadow-[0_0px_12px_rgba(255,255,255,0.5)]">
                {faq.titleLead}{' '}
              </span>
              <span className="text-[#FF3A52] drop-shadow-[0_0px_12px_rgba(255,58,82,0.5)]">
                {faq.titleAccent}
              </span>
            </h2>
          </div>
          <p className="font-medium text-sm lg:text-base text-white/55 leading-relaxed w-full text-center px-4">
            {faq.description}
          </p>
        </div>

        <div className="w-full flex flex-col items-start gap-y-4">
          <div className="w-full h-12 relative bg-transparent">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-white/55 z-2" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={faq.searchPlaceholder}
              className="w-full h-full px-11 py-3 rounded-[36px] border-2 border-white/5 text-sm lg:text-base text-white placeholder-white/40 focus:outline-none focus:border-white/10 transition-colors duration-200 backdrop-blur-lg"
              style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(31, 31, 31, 0.31) 0%, rgba(71, 71, 71, 0.31) 100%)' }}
            />
            <p className="text-sm lg:text-base absolute right-4 top-1/2 -translate-y-1/2 text-white/55 z-2 line-clamp-1">
              {filteredItems.length} answers
            </p>
          </div>

          <div
            className="w-full h-max flex flex-col xl:flex-row-reverse border border-white/5 rounded-3xl backdrop-blur-lg p-7 gap-x-[20px]"
            style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(0, 0, 0, 0.31) 0%, rgba(71, 71, 71, 0.31) 100%)' }}
          >
            <img
              src={faq.illustrationSrc}
              alt="FAQ Image"
              className="!hidden 2xl:!flex w-[453px] h-[344px] mb-3 xl:mb-0 object-cover rounded-xl flex-shrink-0"
            />
            <div className="w-full flex flex-col items-center gap-y-[10px] overflow-y-auto max-h-[350px] pr-2">
              {filteredItems.map((item, index) => {
                const isOpen = openIndex === index;
                return (
                  <div className="w-full" key={item.question}>
                    <button
                      className="w-full h-[49px] flex items-center justify-between bg-[#FFFFFF]/[.08] border border-white/5 rounded-xl p-[9px] cursor-pointer"
                      type="button"
                      onClick={() => setOpenIndex((current) => (current === index ? -1 : index))}
                    >
                      <div className="flex items-center gap-x-3 min-w-0">
                        <div className="min-w-8 w-8 h-8 flex items-center justify-center rounded-md border border-[#FF3A52]/5 bg-[#FF3A52]/10">
                          <i
                            className={`fa-solid ${icons[index % icons.length]}`}
                            style={{
                              background:
                                'linear-gradient(179.74deg, #FF3A52 17.72%, #8E2734 99.04%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          />
                        </div>
                        <p
                          className={`text-xs md:text-sm font-semibold line-clamp-1 ${isOpen ? 'text-white' : 'text-[#5E5E5E]'
                            }`}
                        >
                          {item.question}
                        </p>
                      </div>
                      <i
                        className={`fa-solid fa-chevron-down text-white/40 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-white' : ''}`}
                      />
                    </button>

                    {isOpen ? (
                      <div className="overflow-hidden">
                        <div className="text-xs md:text-sm text-white/60 leading-relaxed bg-[#FFFFFF]/[.08] border border-white/5 rounded-xl p-[9px] mt-2">
                          <p>{item.answer}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PaymentsSection() {
  const { currency, recentOrders, siteConfig } = useStore();
  const { payments } = siteConfig;

  if (!payments.enabled || !recentOrders.length) {
    return null;
  }

  const cards = recentOrders.map((payment) => {
    return (
      <article
        className="w-[350px] max-w-[calc(100vw-48px)] h-max flex items-center justify-between p-[18px] rounded-2xl border-2 border-white/5 backdrop-blur-lg payment-item flex-shrink-0"
        key={payment.orderId}
        style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(0, 0, 0, 0.31) 0%, rgba(51, 51, 51, 0.31) 100%)' }}
      >
        <div className="flex items-center gap-x-3">
          <div className="w-[55px] h-[55px] rounded-md border border-white/10 bg-white/[0.06] text-white font-bold text-base flex items-center justify-center">
            {buildInitials(payment.customerLabel)}
          </div>
          <div className="flex flex-col items-start max-w-[130px]">
            <p className="font-medium text-base text-white line-clamp-1">{payment.customerLabel}</p>
            <p className="text-white/40 font-normal text-sm line-clamp-1">{formatRelativeAdminTime(payment.createdAt)}</p>
          </div>
        </div>
        <p className="font-bold text-base text-white line-clamp-1 package-price">
          {formatPrice(payment.totalEur, currency as CurrencyCode)}
        </p>
      </article>
    );
  });

  return (
    <section className="container mx-auto flex flex-col items-center mt-16 sm:mt-28 gap-y-12 sm:gap-y-20 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <div className="flex items-center mb-3">
          <h2 className="font-bold text-3xl lg:text-5xl leading-relaxed text-center">
            <span className="text-white drop-shadow-[0_0px_12px_rgba(255,255,255,0.5)]">
              {payments.titleLead}{' '}
            </span>
            <span className="text-[#FF3A52] drop-shadow-[0_0px_12px_rgba(255,58,82,0.5)]">
              {payments.titleAccent}
            </span>
          </h2>
        </div>
        <p className="font-medium text-sm lg:text-base text-white/55 leading-relaxed w-full px-4 text-center">
          {payments.description}
        </p>
      </div>

      <div className="w-full min-h-[100px] relative overflow-hidden flex items-center justify-center masked-container">
        <MarqueeRow speed="30s" className="gap-4">
          {cards}
        </MarqueeRow>
      </div>
    </section>
  );
}

export function DiscordBannerSection() {
  const { siteConfig } = useStore();
  const { discordBanner } = siteConfig;

  if (!discordBanner.enabled) {
    return null;
  }

  return (
    <section className="w-full flex items-center justify-center py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div
        className="discord-banner container max-w-7xl mx-auto min-h-[200px] sm:min-h-[240px] md:h-[274px] flex items-center border-2 border-white/[.04] backdrop-blur-lg rounded-2xl sm:rounded-[25px] relative overflow-hidden"
        style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(0, 0, 0, 0.31) 0%, rgba(71, 71, 71, 0.31) 100%)' }}
      >
        <div className="discord-banner__copy h-full w-full flex flex-col items-start justify-between px-4 sm:px-6 md:px-8 lg:px-[42px] py-4 sm:py-6 md:py-[24px] z-10">
          <div className="max-w-full sm:max-w-[480px] xl:max-w-[600px] w-full">
            <h2 className="font-bold text-xl lg:text-2xl sm:text-3xl md:text-[36px] text-white">
              {discordBanner.titleLead} <span className="text-[#0474F3]">{discordBanner.titleAccent}</span>
            </h2>
            <p className="text-white/65 text-sm sm:text-base font-medium leading-snug mt-2">
              {discordBanner.description}
            </p>
          </div>

          <ExternalAnchor
            className="discord-banner__button px-6 sm:px-8 md:px-[30px] h-10 sm:h-11 md:h-[42px] rounded-lg flex items-center justify-center font-bold text-sm sm:text-lg mt-4 transition-colors"
            href={discordBanner.buttonHref}
          >
            <i className="fa-brands fa-discord" />
            {discordBanner.buttonLabel}
          </ExternalAnchor>

          <p className="text-xs sm:text-sm text-white/35 font-medium max-w-full sm:max-w-[576px] mt-3 sm:mt-4">
            {discordBanner.disclaimer}
          </p>
        </div>

        <img
          src={discordBanner.imageSrc}
          alt="Discord Banner"
          className="!hidden 2xl:!block absolute bottom-0 right-0 w-full h-full object-cover rounded-[25px] pointer-events-none"
          style={{ zIndex: 0 }}
        />
      </div>
    </section>
  );
}

export function PageBackLink({ product }: { product: Product }) {
  return (
    <Link className="flex items-center gap-x-1.5" to={getCategoryHref(getPrimaryCategory(product))}>
      <i className="fa-solid fa-arrow-left text-sm text-white" />
      <p className="font-normal text-sm sm:text-base text-white/65 leading-snug">
        Back to <span className="text-white font-medium">Products</span>
      </p>
    </Link>
  );
}

export function AccordionPanel({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="accordion-panel accordion-item w-full">
      <button
        className="w-full flex items-center justify-between border-2 border-white/[.04] hover:border-white/[.08] rounded-2xl backdrop-blur-xl p-3 group transition-colors duration-300 cursor-pointer"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(42, 42, 42, 0.31) 0%, rgba(51, 51, 51, 0.31) 100%)' }}
      >
        <span className="flex items-center gap-x-2 min-w-0">
          <span className="w-[22px] h-[22px] flex items-center justify-center bg-white/[.08] border border-white/[.06] rounded-[6px] flex-shrink-0">
            {icon}
          </span>
          <span className="text-white font-semibold text-sm line-clamp-1">{title}</span>
        </span>
        <i
          className={`fa-solid fa-chevron-down text-sm text-white/55 group-hover:text-white transition-all duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-white' : ''}`}
        />
      </button>
      {isOpen ? (
        <div
          className="accordion-panel__content w-full border-2 border-white/[.04] hover:border-white/[.08] rounded-2xl backdrop-blur-xl group transition-colors duration-300 p-3 mt-2"
          style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(42, 42, 42, 0.31) 0%, rgba(51, 51, 51, 0.31) 100%)' }}
        >
          <div className="w-full text-white/60 text-sm leading-relaxed">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export function ProductHighlights() {
  const { siteConfig } = useStore();
  const { storeText } = siteConfig;

  return (
    <div className="product-highlights flex flex-col items-start gap-y-1 w-full sm:w-auto">
      <div className="product-highlights__item flex items-center gap-x-2">
        <i className="fa-solid fa-arrow-trend-up text-xs text-white/55" />
        <p className="text-white/55 font-normal text-sm">{storeText.productSupportPrimary}</p>
      </div>
      <div className="product-highlights__item flex items-center gap-x-2">
        <i className="fa-solid fa-shield-halved text-xs text-white/55" />
        <p className="text-white/55 font-normal text-sm">{storeText.productSupportSecondary}</p>
      </div>
    </div>
  );
}
