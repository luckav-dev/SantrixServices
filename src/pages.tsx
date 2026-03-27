import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import {
  BadgeCheck,
  CirclePlay,
  ExternalLink,
  Lock,
  LogOut,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams, type Location } from 'react-router-dom';
import {
  AccordionPanel,
  DividerTitle,
  DiscordBannerSection,
  FaqPreview,
  FrameworkBadges,
  MarqueeRow,
  PageBackLink,
  PaymentsSection,
  ProductCard,
  ProductHighlights,
  ReviewSection,
  SectionHeading,
} from './components';
import { formatPrice, getProductHref, type Product } from './store';
import { useStore } from './store-context';
import { completeFiveMHeadlessLogin } from './supabase-customer';
import {
  captureRemotePayPalOrder,
  waitForRemoteOrderSettlement,
} from './supabase-checkout';
import type { CustomerAuthProviderConfig, CustomerAuthProviderId } from './site-config';
import {
  buildCustomerProviderFallback,
  getEnabledCustomerAuthProviders,
  getPrimaryCustomerAuthProvider,
} from './customer-auth-utils';
import { hasOptionalMedia } from './media';
import { SafeImage } from './safe-image';
import {
  buildAbsoluteUrl,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  PageSeo,
  stripHtml,
} from './seo';

function HeroVisual() {
  const { siteConfig } = useStore();
  const { brandAssets, studioName } = siteConfig;

  return (
    <div className="w-1/2 h-full relative hidden xl:flex">
      {hasOptionalMedia(brandAssets.heroSmallLogoSrc) ? (
        <div className="flex-col items-center justify-center absolute hidden xl:flex xl:top-10 2xl:top-20 left-30 w-[66px] h-auto float-slow">
          <SafeImage src={brandAssets.heroSmallLogoSrc} alt={`Small ${studioName} Logo`} />
          <SafeImage
            src={brandAssets.heroSmallLogoSrc}
            alt={`Small ${studioName} Logo`}
            className="absolute top-0 left-0 blur-2xl opacity-45 -z-10"
          />
        </div>
      ) : null}
      {hasOptionalMedia(brandAssets.heroMediumLogoSrc) ? (
        <div className="flex-col items-center justify-center absolute hidden xl:flex xl:left-0 bottom-[15%] 2xl:left-[25%] w-[170px] h-auto float-medium">
          <SafeImage src={brandAssets.heroMediumLogoSrc} alt={`Medium ${studioName} Logo`} />
          <SafeImage
            src={brandAssets.heroMediumLogoSrc}
            alt={`Medium ${studioName} Logo`}
            className="absolute top-0 left-0 blur-2xl opacity-45 -z-10"
          />
        </div>
      ) : null}
      {hasOptionalMedia(brandAssets.heroBigLogoSrc) ? (
        <div className="flex-col items-center justify-center absolute hidden xl:flex xl:right-0 top-1/2 -translate-y-1/2 2xl:left-[50%] w-[416px] h-auto float-fast">
          <SafeImage src={brandAssets.heroBigLogoSrc} alt={`Big ${studioName} Logo`} />
          <SafeImage
            src={brandAssets.heroBigLogoSrc}
            alt={`Big ${studioName} Logo`}
            className="absolute top-0 left-0 blur-2xl opacity-45 -z-10"
          />
        </div>
      ) : null}
    </div>
  );
}

function LoginProviderIcon({ provider }: { provider: CustomerAuthProviderConfig }) {
  if (provider.logoSrc) {
    return (
      <SafeImage
        src={provider.logoSrc}
        alt={provider.logoAlt ?? provider.label}
        className="w-5 h-5 object-contain white-icon"
      />
    );
  }

  if (provider.iconClass) {
    return <i className={`${provider.iconClass} text-base`} />;
  }

  return <i className="fa-solid fa-right-to-bracket text-base" />;
}

function buildAccountInitials(value: string | null | undefined) {
  const parts = (value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return 'ST';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function VideoShowcase() {
  const { home, siteConfig } = useStore();
  const { videos } = siteConfig;

  if (!videos.enabled || !home.videos.length || !videos.thumbs.length) {
    return null;
  }

  const cards = home.videos.map((video, index) => (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer"
      className="video-showcase__card flex flex-col gap-y-3 group youtube-video max-[640px]:min-w-[260px] max-[640px]:max-w-[260px] sm:w-[450px] flex-shrink-0"
      key={video.url}
    >
      <div className="video-showcase__thumb w-full aspect-video sm:aspect-auto sm:h-[250px] rounded-2xl overflow-hidden border-2 border-white/5 group-hover:border-white/10 transition-colors duration-200">
        <SafeImage src={videos.thumbs[index % videos.thumbs.length]} alt={video.name} className="w-full h-full object-cover" />
      </div>
      <p className="text-white/70 group-hover:text-white font-medium text-sm sm:text-lg line-clamp-2 transition-colors duration-200">
        {video.name}
      </p>
    </a>
  ));

  return (
    <section
      id="youtube-video-section"
      className="video-showcase home-video-section w-full flex flex-col items-center mt-16 sm:mt-28 relative px-4 sm:px-6 lg:px-8 py-9"
      style={{
        backgroundImage: "url('/media/white-grid.png')",
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1788px 807px',
      }}
    >
      <div className="container flex flex-col items-center relative z-10">
        <div className="w-full max-w-2xl flex flex-col items-center">
          <a href={videos.channelHref} className="flex items-center gap-x-2 group mb-5">
            <SafeImage src={videos.channelLogoSrc} alt={videos.channelLogoAlt} className="w-[134px] h-[28.93px]" />
            <i className="fa-solid fa-arrow-right text-white opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
          </a>
          <p className="font-medium text-sm lg:text-base text-white/55 leading-relaxed text-center">
            {videos.description}
          </p>
        </div>

        <div className="w-full min-h-[330px] relative overflow-hidden flex items-center justify-center gap-4 mt-7 masked-container">
          <MarqueeRow speed="34s" className="gap-4">
            {cards}
          </MarqueeRow>
        </div>
      </div>
    </section>
  );
}

function formatCompactStat(value: number, style: 'decimal' | 'currency' = 'decimal') {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: style === 'currency' ? 1 : 0,
  }).format(value);
}

function ProductReviewPanel({ product }: { product: Product }) {
  const {
    canReviewProduct,
    isCustomerAuthReady,
    myReviews,
    recentReviews,
    siteConfig,
    submitReview,
    user,
  } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const existingReview = myReviews.find((review) => review.productSlug === product.slug) ?? null;
  const productReviewMap = new Map<string, (typeof recentReviews)[number]>();

  for (const review of recentReviews) {
    if (review.productSlug === product.slug) {
      productReviewMap.set(review.id, review);
    }
  }

  if (existingReview) {
    productReviewMap.set(existingReview.id, existingReview);
  }

  const productReviews = Array.from(productReviewMap.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const averageRating = productReviews.length
    ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length
    : 0;
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [quote, setQuote] = useState(existingReview?.quote ?? '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setRating(existingReview?.rating ?? 5);
    setQuote(existingReview?.quote ?? '');
    setError('');
    setSuccess('');
  }, [existingReview?.id, existingReview?.quote, existingReview?.rating, product.slug]);

  if (!siteConfig.reviews.enabled) {
    return null;
  }

  return (
    <section className="content-section content-section--reviews product-reviews-section">
      <SectionHeading
        lead="Verified"
        accent="Reviews"
        subtitle={
          productReviews.length
            ? `Feedback real de compradores de ${product.title}.`
            : `Cuando haya reseñas verificadas de ${product.title}, aparecerán aquí.`
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-6 product-reviews-layout">
        <article className="summary-card flex flex-col gap-5 p-6 product-reviews-summary">
          <div className="flex items-start justify-between gap-4 flex-wrap product-reviews-summary__top">
            <div>
              <p className="text-white/45 text-sm font-semibold uppercase tracking-[0.16em]">Review Summary</p>
              <h3 className="text-white text-2xl sm:text-3xl font-bold mt-2">{product.title}</h3>
            </div>
            <div className="px-4 py-3 rounded-2xl border border-white/8 bg-white/[0.04] text-center product-reviews-summary__score">
              <strong className="block text-white text-2xl font-bold">
                {productReviews.length ? averageRating.toFixed(1) : '0.0'}
              </strong>
              <span className="block text-white/45 text-xs mt-1">
                {productReviews.length} reseñas verificadas
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[#FF3A52] text-lg product-reviews-summary__stars">
            {Array.from({ length: 5 }, (_, index) => (
              <i
                className={`fa-solid fa-star ${index < Math.round(averageRating) ? 'opacity-100' : 'opacity-20 text-white'}`}
                key={index}
              />
            ))}
          </div>

          {!isCustomerAuthReady ? (
            <div className="checkout-stage__placeholder">
              <div className="checkout-stage__loader" />
            </div>
          ) : !user ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-white font-semibold">Inicia sesión para reseñar</p>
              <p className="text-white/55 text-sm">
                Solo los compradores verificados pueden dejar una reseña real en este producto.
              </p>
              <button
                className="checkout-summary__secondary px-6"
                type="button"
                onClick={() =>
                  navigate('/login', {
                    state: { backgroundLocation: location },
                  })}
              >
                Ir al login
              </button>
            </div>
          ) : canReviewProduct(product.slug) ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setError('');
                setSuccess('');

                if (!quote.trim() || quote.trim().length < 16) {
                  setError('Escribe una reseña con al menos 16 caracteres.');
                  return;
                }

                setIsSubmitting(true);
                const result = await submitReview({
                  productSlug: product.slug,
                  productTitle: product.title,
                  rating,
                  quote,
                });
                setIsSubmitting(false);

                if (!result.ok) {
                  setError(result.message ?? 'No se pudo guardar la reseña.');
                  return;
                }

                setSuccess(existingReview ? 'Reseña actualizada.' : 'Reseña publicada.');
              }}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-white font-semibold">
                  {existingReview ? 'Edita tu reseña' : 'Deja tu reseña verificada'}
                </p>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1;
                    const active = value <= rating;

                    return (
                      <button
                        className={`w-10 h-10 rounded-xl border transition-colors ${active ? 'border-[#FF3A52]/40 bg-[#FF3A52]/12 text-[#FF3A52]' : 'border-white/8 bg-white/[0.03] text-white/30 hover:text-white hover:border-white/18'}`}
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        aria-label={`Valorar con ${value} estrellas`}
                      >
                        <i className="fa-solid fa-star" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                className="w-full min-h-[148px] rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-white placeholder-white/25 focus:outline-none focus:border-white/16"
                placeholder="Cuéntale al resto qué tal fue la compra, instalación y uso del producto."
                value={quote}
                onChange={(event) => setQuote(event.currentTarget.value)}
              />

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-white/45 text-xs">
                  Tu reseña queda vinculada a una compra real del producto.
                </p>
                <button
                  className="checkout-summary__primary px-8"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : existingReview ? 'Actualizar reseña' : 'Publicar reseña'}
                </button>
              </div>

              {error ? <p className="text-sm text-[#ff95a2]">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
            </form>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-white font-semibold">Compra requerida</p>
              <p className="text-white/55 text-sm">
                Este bloque solo permite reseñas de compradores verificados del producto.
              </p>
            </div>
          )}
        </article>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 product-reviews-list">
          {productReviews.length ? (
            productReviews.map((review) => (
              <article className="review-card product-review-card" key={review.id}>
                <div className="review-card__header">
                  <div className="w-12 h-12 rounded-full border border-white/10 bg-white/[0.06] text-white font-bold flex items-center justify-center">
                    {review.displayName
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? '')
                      .join('')}
                  </div>
                  <div>
                    <h3>{review.displayName}</h3>
                    <p>{new Date(review.createdAt).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
                <div className="review-stars">
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(Math.max(0, 5 - review.rating))}
                </div>
                <p>{review.quote}</p>
                <span>{review.productTitle}</span>
              </article>
            ))
          ) : (
            <article className="summary-card flex flex-col items-start justify-center gap-3 p-6 md:col-span-2 product-reviews-empty">
              <p className="text-white font-semibold">Aún no hay reseñas verificadas</p>
              <p className="text-white/55 text-sm">
                Cuando los compradores de este producto dejen una reseña real, aparecerá aquí.
              </p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const { commerceMetrics, featuredProducts, siteConfig } = useStore();
  const { achievements, homeHero, storeText, whyChooseUs } = siteConfig;
  const socialLinks = siteConfig.header.socialLinks
    .map((link) => link.href)
    .filter((href) => /^https?:\/\//i.test(href));
  const homeTitle = `${siteConfig.brandName} | ${siteConfig.studioName}`;
  const homeDescription = homeHero.description || `${siteConfig.brandName} premium storefront.`;
  const homeImage =
    siteConfig.brandAssets.heroBigLogoSrc ||
    siteConfig.brandAssets.headerLogoSrc ||
    siteConfig.brandAssets.footerLogoSrc;
  const achievementItems = [
    {
      label: achievements.stats[0]?.label || 'Sales',
      value: String(commerceMetrics.salesCount),
      suffix: '',
      accent: false,
    },
    {
      label: achievements.stats[1]?.label || 'Revenue',
      value: formatCompactStat(commerceMetrics.revenueEur, 'currency'),
      suffix: '€',
      accent: true,
    },
    {
      label: achievements.stats[2]?.label || 'Reviews',
      value: String(commerceMetrics.reviewsCount),
      suffix: '',
      accent: false,
    },
  ];

  return (
    <>
      <PageSeo
        title={homeTitle}
        description={homeDescription}
        image={homeImage}
        imageAlt={siteConfig.brandAssets.headerLogoAlt || siteConfig.brandName}
        siteName={siteConfig.brandName}
        themeColor={siteConfig.theme.primaryColor}
        keywords={[
          siteConfig.brandName,
          siteConfig.studioName,
          'FiveM scripts',
          'FiveM store',
          'escrow scripts',
          'server resources',
        ]}
        jsonLd={[
          buildOrganizationJsonLd({
            name: siteConfig.studioName,
            description: homeDescription,
            logo: siteConfig.brandAssets.headerLogoSrc,
            sameAs: socialLinks,
          }),
          buildWebsiteJsonLd({
            name: siteConfig.brandName,
            description: homeDescription,
          }),
        ]}
      />
      <section className="hero-section w-full relative px-4 sm:px-6 lg:px-8">
        <div className="hero-section__inner container mx-auto w-full flex flex-col justify-start items-center xl:flex-row-reverse xl:justify-between">
          <HeroVisual />
          <div className="hero-copy w-full flex flex-col items-center xl:items-start space-y-8">
            <div className="hero-copy__group w-full flex flex-col items-center xl:items-start space-y-4">
              <h1 className="hero-copy__heading uppercase text-white text-center xl:text-left">
                {homeHero.titlePrefix}{' '}
                <span
                  style={{
                    background: 'linear-gradient(90deg, #FF3A52 0%, #ff5e71 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {homeHero.titleHighlight}
                </span>{' '}
                {homeHero.titleSuffix}
              </h1>
              <p className="hero-copy__body font-medium text-center xl:text-left">
                {homeHero.description}
              </p>
            </div>
            <div className="hero-actions flex items-center gap-x-3">
              {homeHero.primaryCtaHref.startsWith('/') ? (
                <Link
                  className="hero-button hero-button--light gap-x-3 flex items-center justify-between font-medium"
                  to={homeHero.primaryCtaHref}
                >
                  <span className="text-black">{homeHero.primaryCtaLabel}</span>
                  <i className="fa-solid fa-chevron-right text-black text-xs" />
                </Link>
              ) : (
                <a
                  className="hero-button hero-button--light gap-x-3 flex items-center justify-between font-medium"
                  href={homeHero.primaryCtaHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="text-black">{homeHero.primaryCtaLabel}</span>
                  <i className="fa-solid fa-chevron-right text-black text-xs" />
                </a>
              )}
              <a
                className="hero-button hero-button--accent gap-x-3 flex items-center justify-between font-medium"
                href={homeHero.secondaryCtaHref}
                target={homeHero.secondaryCtaExternal ? '_blank' : undefined}
                rel={homeHero.secondaryCtaExternal ? 'noreferrer' : undefined}
              >
                {homeHero.secondaryCtaLabel}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="home-featured-section w-full mx-auto flex flex-col items-center gap-y-4 sm:gap-y-7 mt-8 sm:mt-20 lg:mt-28 relative z-10 px-4 sm:px-6 lg:px-8 ">
        <DividerTitle label={storeText.featuredProductsLabel} />
        <div className="featured-strip w-full relative overflow-hidden flex items-center justify-center gap-2 sm:gap-4 mt-4 sm:mt-7 masked-container">
          <MarqueeRow speed="36s" className="gap-2 sm:gap-3 lg:gap-4 pl-8 sm:pl-20 lg:pl-32">
            {featuredProducts.map((product, index) => (
              <div className="w-[280px] sm:w-[312px] lg:w-[352px] flex-shrink-0" key={`${product.slug}-${index}`}>
                <ProductCard product={product} compact />
              </div>
            ))}
          </MarqueeRow>
        </div>
      </section>

      <ReviewSection />

      {whyChooseUs.enabled ? (
        <section
          className="home-benefits-section w-full h-full mt-16 sm:mt-28 px-4 sm:px-6 lg:px-8 py-9"
        >
          <div className="container mx-auto flex flex-col items-center">
            <SectionHeading lead={whyChooseUs.titleLead} accent={whyChooseUs.titleAccent} subtitle={whyChooseUs.description} />

            <div className="grid grid-cols-1 lg:grid-cols-2 mt-12 gap-10">
              {whyChooseUs.items.map((item, index) => {
                const isExternal = item.href.startsWith('http');
                const titleClass = index % 2 === 1 ? 'text-[#FF3A52]' : 'text-white';
                const iconWrapClass =
                  index % 2 === 1
                    ? 'bg-[#FF3A52]/10 border-[#FF3A52]/5'
                    : 'bg-[#FFFFFF]/10 border-white/5';
                const cardBg =
                  index % 2 === 1
                    ? 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(0, 0, 0, 0.31) 0%, rgba(63, 29, 34, 0.31) 100%)'
                    : 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(0, 0, 0, 0) 0%, rgba(49, 49, 49, 0.31) 100%)';
                const iconClass =
                  index === 0
                    ? 'fa-brands fa-discord text-2xl text-white'
                    : index === 1
                      ? 'fa-regular fa-chart-bar text-2xl'
                      : index === 2
                        ? 'fa-solid fa-sliders text-xl text-white'
                        : 'fa-solid fa-shield-halved text-xl';

                const iconStyle =
                  index % 2 === 1
                    ? {
                      background:
                        'linear-gradient(179.74deg, #FF3A52 17.72%, #8E2734 99.04%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }
                    : undefined;

                const content = (
                  <>
                    <div className="flex flex-col items-start gap-y-4">
                      <div className="flex items-center gap-x-4">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center border ${iconWrapClass}`}
                        >
                          <i className={iconClass} style={iconStyle} />
                        </div>
                        <p className={`font-bold text-xl lg:text-2xl line-clamp-1 ${titleClass}`}>
                          {item.title}
                        </p>
                      </div>
                      <p className="max-w-[595px] font-medium text-white/65 text-sm lg:text-base leading-normal">
                        {item.body}
                      </p>
                    </div>
                    <div className="flex items-center mt-5">
                      <p className="text-sm lg:text-base text-white font-medium">{item.cta}</p>
                      <i className="fa-solid fa-link text-[#FF3A52] text-sm ml-2" />
                    </div>
                  </>
                );

                return isExternal ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="benefit-card benefit-card--home flex flex-col items-start p-6 rounded-2xl border-2 border-white/5 hover:border-white/10 transition-colors duration-200 cursor-pointer backdrop-blur-lg"
                    style={{ background: cardBg }}
                    key={item.title}
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    className="benefit-card benefit-card--home flex flex-col items-start p-6 rounded-2xl border-2 border-white/5 hover:border-white/10 transition-colors duration-200 cursor-pointer backdrop-blur-lg"
                    style={{ background: cardBg }}
                    to={item.href}
                    key={item.title}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {achievements.enabled ? (
        <section className="home-achievements-section content-section--achievements container mx-auto flex flex-col items-center mt-16 sm:mt-28 px-4 sm:px-6 lg:px-8">
          <SectionHeading lead={achievements.titleLead} accent={achievements.titleAccent} subtitle={achievements.description} />

          <div className="stats-grid w-full max-w-[1080px] mx-auto items-center justify-items-center gap-y-10 mt-10">
            {achievementItems.map((stat) => {
              const isAccent = Boolean(stat.accent);

              return (
                <div className={`stat-card flex flex-col items-center gap-y-2 ${isAccent ? 'is-accent' : ''}`.trim()} key={stat.label}>
                  <div className="w-max flex items-end">
                    <h2
                      className={`font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl ${isAccent
                        ? 'text-[#FF3A52] drop-shadow-[0_0px_18px_rgba(255,58,82,0.3)]'
                        : 'text-white drop-shadow-[0_0px_18px_rgba(255,255,255,0.3)]'
                        }`}
                    >
                      {stat.value}
                    </h2>
                    {stat.suffix ? (
                      <span
                        className={`font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl ${isAccent
                          ? 'text-[#FF3A52] drop-shadow-[0_0px_18px_rgba(255,58,82,0.3)]'
                          : 'text-white drop-shadow-[0_0px_18px_rgba(255,255,255,0.3)]'
                          }`}
                      >
                        {stat.suffix}
                      </span>
                    ) : null}
                  </div>
                  <p className={`font-medium text-lg sm:text-2xl leading-relaxed ${isAccent ? 'text-[#FF3A52]/55' : 'text-white/55'}`}>
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <VideoShowcase />
      <FaqPreview />
      <PaymentsSection />
      <DiscordBannerSection />
    </>
  );
}

export function CategoryPage() {
  const { categoryId = '' } = useParams();
  const { categories, getCategory, getProduct, siteConfig } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [framework, setFramework] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchTerm);

  const category = getCategory(categoryId);
  if (!category) {
    return <NotFoundPage />;
  }

  const allProducts = category.productSlugs
    .map((slug) => getProduct(slug))
    .filter((product): product is Product => Boolean(product));

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      product.title.toLowerCase().includes(normalizedSearch) ||
      product.fullTitle.toLowerCase().includes(normalizedSearch) ||
      product.excerpt.toLowerCase().includes(normalizedSearch);
    const matchesFramework =
      framework === null || product.frameworks.some((entry) => entry.toLowerCase() === framework);

    return matchesSearch && matchesFramework;
  });
  const categoryDescription = category.description || `Browse ${category.label} packages from ${siteConfig.brandName}.`;
  const categoryImage = allProducts[0]?.image || siteConfig.brandAssets.headerLogoSrc;

  return (
    <>
      <PageSeo
        title={`${category.label} | ${siteConfig.brandName}`}
        description={categoryDescription}
        image={categoryImage}
        imageAlt={category.label}
        type="website"
        siteName={siteConfig.brandName}
        themeColor={siteConfig.theme.primaryColor}
        keywords={[
          category.label,
          category.heading,
          siteConfig.brandName,
          ...allProducts.flatMap((product) => product.frameworks).slice(0, 8),
        ]}
        jsonLd={[
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: category.label, path: `/category/${category.id}` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `${category.label} | ${siteConfig.brandName}`,
            description: categoryDescription,
            url: buildAbsoluteUrl(`/category/${category.id}`),
            isPartOf: buildAbsoluteUrl('/'),
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: allProducts.slice(0, 12).map((product, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: buildAbsoluteUrl(getProductHref(product.slug)),
                name: product.title,
              })),
            },
          },
        ]}
      />
      <section className="category-page__hero container mx-auto flex flex-col items-start pb-8 sm:pb-10 lg:pb-12 px-6">
        <div className="max-w-[860px] w-full flex flex-col items-center md:items-start gap-y-3 mb-8 md:mb-12 px-4 md:px-0">
          <div id="category-header" className="flex items-center gap-x-3 text-center md:text-left">
            <h1 className="font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight md:leading-normal">
              <span className="block md:inline text-[#686868] drop-shadow-[0_0px_12px_rgba(104,104,104,0.6)]">
                {category.heading}
              </span>
            </h1>
          </div>
          <p className="font-medium text-sm sm:text-base text-white/65 text-center md:text-left max-w-xl">
            {category.description}
          </p>
        </div>

        <div className="w-full max-w-3xl flex flex-col items-start gap-y-3">
          <label
            className="category-search w-full h-[54px] sm:h-auto rounded-2xl border-2 border-white/[.04] relative flex items-center"
            style={{ background: 'radial-gradient(74.31% 154.58%, rgba(33, 33, 33, 0.31) 0%, rgba(51, 51, 51, 0.31) 100%)' }}
          >
            <i className="fa-solid fa-magnifying-glass text-[15px] text-white/30 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search for products..."
              value={searchTerm}
              onChange={(event) => {
                const value = event.currentTarget.value;
                startTransition(() => setSearchTerm(value));
              }}
              className="w-full h-full bg-transparent pl-12 pr-12 rounded-2xl font-medium text-white placeholder:text-white/35 focus:outline-none focus:ring-0 focus:border-white/10"
            />
          </label>

          <div className="flex items-center gap-x-3 flex-wrap">
            {[
              { id: 'esx', label: 'ESX', logo: '/media/esx-logo.png' },
              { id: 'qbcore', label: 'QBCore', logo: '/media/qb-logo.png' },
              { id: 'qbox', label: 'QBox', logo: '/media/qbox-logo.png' },
            ].map((chip) => (
              <button
                className={`category-filter-chip min-w-[100px] justify-center sm:min-w-0 sm:justify-start px-4 py-3 sm:py-[10px] flex items-center gap-x-2 rounded-2xl border-2 transition-colors duration-300 backdrop-blur-xl cursor-pointer ${framework === chip.id
                  ? 'border-white/10 bg-white/[.10]'
                  : 'border-white/5 hover:border-white/10'
                  }`}
                key={chip.id}
                type="button"
                onClick={() => setFramework((current) => (current === chip.id ? null : chip.id))}
                style={{ background: framework === chip.id ? undefined : 'radial-gradient(74.31% 154.58%, rgba(33, 33, 33, 0.31) 0%, rgba(51, 51, 51, 0.31) 100%)' }}
              >
                <img src={chip.logo} alt={`${chip.label} Logo`} className="w-5 h-5 object-contain" />
                <p className={`font-medium text-sm ${framework === chip.id ? 'text-white' : 'text-white/55'}`}>
                  {chip.label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-20">
        <div className="category-results w-full flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-6 px-2">
          <p className="font-medium text-white/75 text-sm sm:text-base">
            Showing {filteredProducts.length} of {allProducts.length} products
          </p>
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            {categories.map((entry) => (
              <Link className="font-bold text-white/90 text-sm sm:text-base" key={entry.id} to={`/category/${entry.id}`}>
                {entry.label}
              </Link>
            ))}
          </div>
        </div>

        {filteredProducts.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 px-2">
            {filteredProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty-state empty-state--large">
            <Search size={20} />
            <p>No products matched your search.</p>
            <span>Try another framework filter or search term.</span>
          </div>
        )}
      </section>
    </>
  );
}

export function ProductPage() {
  const { productSlug = '' } = useParams();
  const { getProduct } = useStore();
  const product = getProduct(productSlug);

  if (!product) {
    return <NotFoundPage />;
  }

  return <ProductDetails key={product.slug} product={product} />;
}

function ProductDetails({ product }: { product: Product }) {
  const { addToCart, currency, getCategory, getProduct, recentReviews, siteConfig } = useStore();
  const { storeText } = siteConfig;
  const [selectedImage, setSelectedImage] = useState(0);

  const gallery = [product.image, ...product.gallery].filter(
    (image, index, list) => image && list.indexOf(image) === index,
  );

  const relatedCategory = getCategory(product.categories[0]);
  const productReviews = recentReviews.filter((review) => review.productSlug === product.slug);
  const averageRating = productReviews.length
    ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length
    : 0;
  const relatedProducts = (relatedCategory?.productSlugs ?? [])
    .filter((slug) => slug !== product.slug)
    .map((slug) => getProduct(slug))
    .filter((item): item is Product => Boolean(item))
    .slice(0, 3);
  const checkoutLabel =
    product.checkoutProvider === 'tebex'
      ? 'Tebex'
      : product.checkoutProvider === 'paypal'
        ? 'PayPal'
        : product.checkoutProvider === 'stripe'
          ? 'Stripe'
        : 'External';
  const productDescription = stripHtml(product.excerpt || product.descriptionHtml) || `${product.title} from ${siteConfig.brandName}.`;
  const productTitle = `${product.fullTitle || product.title} | ${siteConfig.brandName}`;
  const productImage = gallery[0] ?? siteConfig.brandAssets.headerLogoSrc;

  return (
    <>
      <PageSeo
        title={productTitle}
        description={productDescription}
        image={productImage}
        imageAlt={product.title}
        type="product"
        siteName={siteConfig.brandName}
        themeColor={siteConfig.theme.primaryColor}
        keywords={[
          product.title,
          product.fullTitle,
          product.categoryLabel,
          checkoutLabel,
          siteConfig.brandName,
          ...product.frameworks,
        ]}
        jsonLd={[
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            {
              name: relatedCategory?.label || product.categoryLabel,
              path: relatedCategory ? `/category/${relatedCategory.id}` : '/',
            },
            { name: product.title, path: getProductHref(product.slug) },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.fullTitle || product.title,
            description: productDescription,
            image: gallery.map((image) => buildAbsoluteUrl(image)),
            sku: product.slug,
            category: product.categoryLabel,
            brand: {
              '@type': 'Brand',
              name: siteConfig.brandName,
            },
            offers: {
              '@type': 'Offer',
              priceCurrency: 'EUR',
              price: product.priceValue.toFixed(2),
              availability: 'https://schema.org/InStock',
              url: buildAbsoluteUrl(getProductHref(product.slug)),
            },
            aggregateRating: productReviews.length
              ? {
                '@type': 'AggregateRating',
                ratingValue: Number(averageRating.toFixed(1)),
                reviewCount: productReviews.length,
              }
              : undefined,
          },
        ]}
      />
      <section className="store-product container mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 items-start justify-between gap-x-10 gap-y-6 py-6 lg:py-16 overflow-hidden">
        <div className="store-product__gallery w-full flex flex-col items-start gap-y-[18px]">
          <PageBackLink product={product} />

          <div className="w-full flex flex-col items-start space-y-4 relative">
            <div className="store-product__gallery-frame w-full flex flex-col items-start overflow-hidden border-2 border-white/10 bg-black">
              <SafeImage
                src={gallery[selectedImage] ?? product.image}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>

            <ul className="store-product__thumbs flex h-max items-center gap-3 flex-wrap">
              {gallery.map((image, index) => (
                <li
                  className={`store-product__thumb h-max cursor-pointer overflow-hidden border-2 ${selectedImage === index ? 'border-white/20' : 'border-white/10'}`}
                  key={image}
                >
                  <button type="button" onClick={() => setSelectedImage(index)}>
                    <SafeImage className="object-cover" src={image} alt="" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="store-product__summary w-full flex flex-col items-start gap-y-2">
          <article
            className="store-product__summary-card w-full flex flex-col items-start gap-y-5 border-2 border-white/[.06] backdrop-blur-xl p-5 sm:p-5"
            style={{ background: 'radial-gradient(74.31% 154.58% at 50% 50%, rgba(42, 42, 42, 0.31) 0%, rgba(51, 51, 51, 0.31) 100%)' }}
          >
            <div className="store-product__heading w-full flex flex-col items-start gap-y-3">
              <h1 className="font-bold text-2xl lg:text-[34px] leading-tight text-white">
                {product.title}
              </h1>
              <FrameworkBadges frameworks={product.frameworks} />
            </div>

            <div className="store-product__price flex items-end gap-x-3 gap-y-2 flex-wrap">
              <strong className="font-bold text-white text-4xl sm:text-5xl leading-none">
                {formatPrice(product.priceValue, currency)}
              </strong>
              {product.oldPriceValue ? (
                <del className="text-white/55 text-xl">
                  {formatPrice(product.oldPriceValue, currency)}
                </del>
              ) : null}
              {product.discountText ? (
                <span className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                  {product.discountText}
                </span>
              ) : null}
            </div>

            <div className="text-sm text-white/55 flex flex-wrap gap-x-4 gap-y-2">
              <span>Checkout: {checkoutLabel}</span>
              {product.requiresIdentity ? <span>Identity required</span> : null}
            </div>

            <div className="store-product__cta w-full flex flex-col sm:flex-row items-start gap-4">
              <div className="w-full sm:w-1/2 flex items-center gap-x-2">
                <button
                  className="store-product__add add inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all shrink-0 outline-none bg-white text-black shadow-xs hover:bg-primary/90 px-4 py-2 w-full cursor-pointer"
                  type="button"
                  onClick={() => addToCart(product.slug)}
                >
                  {storeText.productAddToCartLabel}
                </button>
              </div>
              <ProductHighlights />
            </div>
          </article>

          <div className="store-product__details w-full flex flex-col items-start gap-y-2">
            <AccordionPanel
              title={storeText.productPreviewTitle}
              icon={<CirclePlay size={10} />}
            >
              {product.previewLink ? (
                <a className="flex items-center gap-2 text-white font-semibold text-sm" href={product.previewLink} target="_blank" rel="noreferrer">
                  {storeText.productPreviewLinkLabel}
                  <ExternalLink size={14} />
                </a>
              ) : (
                <p>{storeText.productPreviewEmptyText}</p>
              )}
            </AccordionPanel>

            <AccordionPanel title={storeText.productDocumentationTitle} icon={<ExternalLink size={10} />}>
              {product.documentationLink ? (
                <a className="flex items-center gap-2 text-white font-semibold text-sm" href={product.documentationLink} target="_blank" rel="noreferrer">
                  {storeText.productDocumentationLinkLabel}
                  <ExternalLink size={14} />
                </a>
              ) : (
                <p>{storeText.productDocumentationEmptyText}</p>
              )}
            </AccordionPanel>

            <AccordionPanel title={`${storeText.productPackageTypeLabel} | ${product.categoryLabel}`} icon={<Lock size={10} />}>
              <div className="w-full flex flex-col gap-y-2">
                {product.openVersionId ? (
                  <p className="w-full h-max bg-white/[.02] hover:bg-white/[.03] transition-colors duration-300 rounded-[6px] p-3 font-normal text-white/70 text-sm leading-snug">
                    Open Source Version: {product.openVersionId}
                  </p>
                ) : null}
                {product.escrowVersionId ? (
                  <p className="w-full h-max bg-white/[.02] hover:bg-white/[.03] transition-colors duration-300 rounded-[6px] p-3 font-normal text-white/70 text-sm leading-snug">
                    Escrow Version: {product.escrowVersionId}
                  </p>
                ) : null}
                {!product.openVersionId && !product.escrowVersionId ? (
                  <p className="w-full h-max bg-white/[.02] rounded-[6px] p-3 font-normal text-white/70 text-sm leading-snug">
                    This product belongs to the {product.categoryLabel} catalogue.
                  </p>
                ) : null}
              </div>
            </AccordionPanel>

            <AccordionPanel title={storeText.productDescriptionTitle} icon={<Search size={10} />}>
              {product.descriptionHtml ? (
                <div
                  className="product-description store-product__description w-full min-h-[146px] h-max bg-white/[.04] rounded-[6px] p-3 font-normal text-white/65 text-sm leading-snug overflow-auto"
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              ) : (
                <div className="store-product__description w-full min-h-[146px] h-max bg-white/[.04] rounded-[6px] p-3 font-normal text-white/65 text-sm leading-snug overflow-auto">
                  <p>{product.excerpt || product.fullTitle}</p>
                  {product.features.length ? (
                    <ul className="mt-3 pl-4">
                      {product.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </AccordionPanel>
          </div>
        </div>
      </section>

      {relatedProducts.length ? (
        <section className="content-section content-section--related">
          <SectionHeading
            lead={storeText.relatedProductsLead}
            accent={storeText.relatedProductsAccent}
            subtitle={storeText.relatedProductsSubtitle}
          />
          <div className="product-grid product-grid--related related-products-grid">
            {relatedProducts.map((item) => (
              <ProductCard key={item.slug} product={item} compact />
            ))}
          </div>
        </section>
      ) : null}

      <ProductReviewPanel product={product} />

      <PaymentsSection />
      <ReviewSection />
      <DiscordBannerSection />
    </>
  );
}

function CustomerLoginPanel({
  onLogin,
  standalone = false,
  isBusy = false,
  busyProviderId,
  error,
}: {
  onLogin: (providerId: CustomerAuthProviderId) => void | Promise<void>;
  standalone?: boolean;
  isBusy?: boolean;
  busyProviderId?: CustomerAuthProviderId | null;
  error?: string;
}) {
  const { siteConfig } = useStore();
  const { customerLogin, storeText } = siteConfig;
  const enabledProviders = getEnabledCustomerAuthProviders(customerLogin);
  const primaryProvider =
    getPrimaryCustomerAuthProvider(customerLogin) ??
    buildCustomerProviderFallback('fivem');
  const providerList = enabledProviders.length ? enabledProviders : [primaryProvider];

  return (
    <article className={`checkout-auth${standalone ? ' checkout-auth--standalone checkout-auth--modal' : ''}`}>
      <div className={`checkout-auth__content${standalone ? ' checkout-auth__content--standalone' : ''}`}>
        <div className={`checkout-auth__intro${standalone ? ' checkout-auth__intro--standalone' : ''}`}>
          {standalone ? <span className="checkout-auth__eyebrow">Secure access</span> : null}
          <h2>{customerLogin.routeTitle}</h2>
          <p>{customerLogin.routeSubtitle}</p>
        </div>

        <div className={`checkout-auth__providers${standalone ? ' checkout-auth__providers--standalone' : ''}`}>
          {providerList.map((provider) => {
            const isCurrentBusy = isBusy && busyProviderId === provider.id;

              return (
                <button
                  className={`checkout-auth__button checkout-auth__button--${provider.id}`}
                  key={provider.id}
                  type="button"
                  onClick={() => void onLogin(provider.id)}
                  disabled={isBusy}
                >
                  {isCurrentBusy ? 'Connecting...' : provider.buttonLabel || customerLogin.buttonLabel}
                </button>
              );
            })}
          </div>

          {standalone ? (
            <p className="checkout-auth__provider-note">Choose a secure provider to continue with your basket.</p>
          ) : null}

        <div className={`checkout-auth__meta${standalone ? ' checkout-auth__meta--standalone' : ''}`}>
          <small className="checkout-auth__meta-copy">{customerLogin.helperText}</small>
          {error ? <small className="checkout-auth__meta-error text-[#ff95a2]">{error}</small> : null}
        </div>
      </div>

      <p className={`checkout-auth__support${standalone ? ' checkout-auth__support--standalone' : ''}`}>{storeText.checkoutSupportText}</p>
    </article>
  );
}

export function CartPage() {
  const {
    cartLines,
    completeCheckout,
    currency,
    isCustomerAuthReady,
    subtotalEur,
    updateQuantity,
    user,
    login,
    siteConfig,
  } = useStore();
  const [completed, setCompleted] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authProviderBusy, setAuthProviderBusy] = useState<CustomerAuthProviderId | null>(null);
  const [isCheckoutBusy, setIsCheckoutBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { storeText } = siteConfig;
  const loginRedirectHref = `/login?next=${encodeURIComponent('/checkout/basket')}`;

  const taxEur = 0;
  const totalEur = subtotalEur + taxEur;
  const totalItemsCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const hasMixedProviders = new Set(cartLines.map((line) => line.product.checkoutProvider)).size > 1;
  const checkoutProviderLabel =
    cartLines[0]?.product.checkoutProvider === 'tebex'
      ? 'Tebex'
      : cartLines[0]?.product.checkoutProvider === 'paypal'
        ? 'PayPal'
        : cartLines[0]?.product.checkoutProvider === 'stripe'
          ? 'Stripe'
        : cartLines[0]?.product.checkoutProvider === 'external'
          ? 'External'
          : null;
  const requiresIdentity = cartLines.some((line) => line.product.requiresIdentity);
  const checkoutDescription = cartLines.length
    ? `${totalItemsCount} item${totalItemsCount === 1 ? '' : 's'} ready to validate and pay securely.`
    : storeText.checkoutEmptyDescription;

  if (completed) {
    return (
      <>
        <PageSeo
          title={`${storeText.checkoutSuccessTitle} | ${siteConfig.brandName}`}
          description={storeText.checkoutSuccessDescription}
          noindex
          siteName={siteConfig.brandName}
          themeColor={siteConfig.theme.primaryColor}
        />
        <section className="checkout-page checkout-page--success">
          <div className="success-card">
            <Sparkles size={26} />
            <h1>{storeText.checkoutSuccessTitle}</h1>
            <p>{storeText.checkoutSuccessDescription}</p>
            {completedOrderId ? <small>Order ID: {completedOrderId}</small> : null}
            <button className="button button--primary" type="button" onClick={() => navigate('/')}>
              {storeText.checkoutSuccessButtonLabel}
            </button>
          </div>
        </section>
      </>
    );
  }

  if (isCustomerAuthReady && !user) {
    return <Navigate to={loginRedirectHref} replace />;
  }

  return (
    <>
      <PageSeo
        title={`${storeText.checkoutBasketTitle} | ${siteConfig.brandName}`}
        description={checkoutDescription}
        noindex
        siteName={siteConfig.brandName}
        themeColor={siteConfig.theme.primaryColor}
      />
      <section className="checkout-page">
      <div className="checkout-page__stage">
        <div className="checkout-page__heading">
          <small>Secure checkout</small>
          <h1>{storeText.checkoutBasketTitle}</h1>
          <p>
            {cartLines.length
              ? `${totalItemsCount} item${totalItemsCount === 1 ? '' : 's'} listos para validar y pagar con seguridad.`
              : 'Tu cesta esta vacia por ahora. Cuando anadas productos, los veras aqui.'}
          </p>
        </div>
        {isCustomerAuthReady ? (
          cartLines.length ? (
            <div className="checkout-cart-list">
              {cartLines.map((line) => (
                <article className="checkout-cart-row" key={line.product.slug}>
                  <Link className="checkout-cart-row__media" to={getProductHref(line.product.slug)}>
                    <SafeImage src={line.product.image} alt={line.product.title} />
                  </Link>
                  <div className="checkout-cart-row__content">
                    <div className="checkout-cart-row__meta">
                      <p>{line.product.categoryLabel}</p>
                      <span>
                        {line.product.checkoutProvider === 'tebex'
                          ? 'Tebex'
                          : line.product.checkoutProvider === 'paypal'
                            ? 'PayPal'
                            : line.product.checkoutProvider === 'stripe'
                              ? 'Stripe'
                              : 'External'}
                      </span>
                    </div>
                    <Link to={getProductHref(line.product.slug)}>{line.product.title}</Link>
                    <FrameworkBadges frameworks={line.product.frameworks} />
                  </div>
                  <div className="checkout-cart-row__actions">
                    <div className="quantity-controls">
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.product.slug, Math.max(0, line.quantity - 1))}
                      >
                        -
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.product.slug, line.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="checkout-cart-row__price">
                      <small>Subtotal</small>
                      <strong>{formatPrice(line.subtotalEur, currency)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="checkout-stage__empty">
              <ShoppingCart size={40} className="text-white/20 mb-4" />
              <p>{storeText.checkoutEmptyTitle}</p>
              <span>{storeText.checkoutEmptyDescription}</span>
              <Link to="/" className="checkout-summary__secondary mt-6 px-10 flex items-center">
                {storeText.checkoutReturnToShopLabel}
              </Link>
            </div>
          )
        ) : (
          <div className="checkout-stage__placeholder">
            <div className="checkout-stage__loader" />
          </div>
        )}
      </div>

      <aside className="checkout-page__sidebar">
        {!isCustomerAuthReady ? (
          <div className="checkout-summary summary-card checkout-summary-card">
            <div className="checkout-stage__placeholder">
              <div className="checkout-stage__loader" />
            </div>
          </div>
        ) : user ? (
          <div className="checkout-summary summary-card checkout-summary-card">
            <div className="checkout-summary__header">
              <small>Checkout</small>
              <h2>{storeText.checkoutSummaryTitle}</h2>
              <p>{totalItemsCount} item{totalItemsCount === 1 ? '' : 's'} listos para confirmar.</p>
            </div>
            <div className="checkout-summary__surface">
              <div className="summary-row">
                <span>{storeText.checkoutItemsTotalLabel}</span>
                <strong>{formatPrice(subtotalEur, currency)}</strong>
              </div>
              <div className="summary-row">
                <span>{storeText.checkoutTaxesLabel}</span>
                <strong>{formatPrice(taxEur, currency)}</strong>
              </div>

              <div className="summary-row summary-row--total">
                <span>{storeText.checkoutEstimatedTotalLabel}</span>
                <strong>{formatPrice(totalEur, currency)}</strong>
              </div>

              {(checkoutProviderLabel || requiresIdentity) ? (
                <div className="checkout-summary__badges">
                  {checkoutProviderLabel ? (
                    <span className="checkout-summary__badge">
                      Provider: <strong>{checkoutProviderLabel}</strong>
                    </span>
                  ) : null}
                  {requiresIdentity ? (
                    <span className="checkout-summary__badge checkout-summary__badge--secure">
                      Identity required
                    </span>
                  ) : null}
                </div>
              ) : null}

              {requiresIdentity ? (
                <div className="checkout-summary__notice">
                  Este checkout exige identidad validada antes del pago.
                </div>
              ) : null}

              <div className="checkout-summary__actions">
                <button
                  className="checkout-summary__primary"
                  disabled={!cartLines.length || isCheckoutBusy || hasMixedProviders}
                  type="button"
                  onClick={async () => {
                    setCheckoutError('');
                    setIsCheckoutBusy(true);
                    const result = await completeCheckout();
                    setIsCheckoutBusy(false);

                    if (result.ok) {
                      if (result.redirectUrl) {
                        window.location.assign(result.redirectUrl);
                        return;
                      }

                      setCompletedOrderId(result.orderId ?? null);
                      setCompleted(true);
                      return;
                    }

                    setCheckoutError(result.message ?? 'No se pudo completar el pedido.');
                  }}
                >
                  {isCheckoutBusy ? 'Processing...' : storeText.checkoutCompletePaymentLabel}
                </button>
                <button
                  className="checkout-summary__secondary"
                  type="button"
                  onClick={() => navigate('/')}
                >
                  {storeText.checkoutContinueShoppingLabel}
                </button>
              </div>
              {hasMixedProviders ? (
                <p className="checkout-summary__error">
                  No puedes pagar juntos productos con proveedores distintos. Separa la cesta por proveedor.
                </p>
              ) : null}
              {checkoutError ? <p className="checkout-summary__error">{checkoutError}</p> : null}
            </div>
          </div>
        ) : (
          <CustomerLoginPanel
            error={authError}
            isBusy={isAuthBusy}
            busyProviderId={authProviderBusy}
            onLogin={async (providerId) => {
              setAuthError('');
              setIsAuthBusy(true);
              setAuthProviderBusy(providerId);
              const result = await login(providerId, { redirectPath: location.pathname });
              setIsAuthBusy(false);
              setAuthProviderBusy(null);
              if (!result.ok) {
                setAuthError(result.message ?? 'No se pudo iniciar sesión.');
              }
            }}
          />
        )}
      </aside>
      </section>
    </>
  );
}

export function LoginPage({ modal = false }: { modal?: boolean }) {
  const { isCustomerAuthReady, login, siteConfig, storefrontSource, user } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isBusy, setIsBusy] = useState(false);
  const [busyProviderId, setBusyProviderId] = useState<CustomerAuthProviderId | null>(null);
  const [error, setError] = useState('');
  const state = location.state as { backgroundLocation?: Location } | undefined;
  const backgroundLocation = state?.backgroundLocation;
  const primaryProvider =
    getPrimaryCustomerAuthProvider(siteConfig.customerLogin) ??
    buildCustomerProviderFallback('fivem');
  const nextPath = searchParams.get('next')?.startsWith('/')
    ? searchParams.get('next')!
    : '/';
  const loginSeo = (
    <PageSeo
      title={`${siteConfig.customerLogin.routeTitle} | ${siteConfig.brandName}`}
      description={siteConfig.customerLogin.routeSubtitle}
      image={siteConfig.customerLogin.brandLogoSrc || siteConfig.brandAssets.headerLogoSrc}
      imageAlt={siteConfig.customerLogin.brandLogoAlt || siteConfig.brandName}
      noindex
      siteName={siteConfig.brandName}
      themeColor={siteConfig.theme.primaryColor}
    />
  );

  useEffect(() => {
    if (!modal) {
      return undefined;
    }

    document.body.classList.add('login-modal-open');
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('login-modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modal]);

  function handleClose() {
    if (backgroundLocation) {
      navigate(-1);
      return;
    }

    navigate('/', { replace: true });
  }

  function renderPanel() {
    return (
      <CustomerLoginPanel
        standalone
        error={error}
        isBusy={isBusy}
        busyProviderId={busyProviderId}
        onLogin={async (providerId) => {
          setError('');
          setIsBusy(true);
          setBusyProviderId(providerId);
          const result = await login(providerId, { redirectPath: nextPath });
          setIsBusy(false);
          setBusyProviderId(null);
          if (!result.ok) {
            setError(result.message ?? 'No se pudo iniciar sesión.');
            return;
          }

          if (storefrontSource !== 'supabase') {
            navigate(nextPath, { replace: true });
          }
        }}
      />
    );
  }

  if (!isCustomerAuthReady) {
    const loadingContent = (
      <div className="checkout-stage__placeholder">
        <div className="checkout-stage__loader" />
      </div>
    );

    if (modal) {
      return (
        <div className="login-modal" role="presentation" onClick={handleClose}>
          {loginSeo}
          <div className="login-modal__backdrop" />
          <div
            className="login-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-label={siteConfig.customerLogin.routeTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="login-modal__shell">
              {loadingContent}
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        {loginSeo}
        <section className="login-page">
          <div className="login-page__shell">
            {loadingContent}
          </div>
        </section>
      </>
    );
  }

  if (user) {
    return <Navigate to={nextPath} replace />;
  }

  if (modal) {
    return (
      <div className="login-modal" role="presentation" onClick={handleClose}>
        {loginSeo}
        <div className="login-modal__backdrop" />
        <div
          className="login-modal__dialog"
          role="dialog"
          aria-modal="true"
          aria-label={siteConfig.customerLogin.routeTitle}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="login-modal__shell">
            {renderPanel()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {loginSeo}
      <section className="login-page auth-callback-page">
      <div className="login-page__shell">
        {renderPanel()}
      </div>
      <article className="hidden">
        <div className="login-card__brand">
          <SafeImage src={siteConfig.customerLogin.brandLogoSrc} alt="" />
          <span>×</span>
          <LoginProviderIcon provider={primaryProvider} />
        </div>
        <h1>{siteConfig.customerLogin.routeTitle}</h1>
        <p>{siteConfig.customerLogin.routeSubtitle}</p>
        <small>{siteConfig.customerLogin.helperText}</small>
      </article>
      </section>
    </>
  );
}

export function AccountPage() {
  const {
    cartCount,
    isCustomerAuthReady,
    myReviews,
    purchasedProductSlugs,
    siteConfig,
    user,
    logout,
  } = useStore();
  const navigate = useNavigate();
  const loginRedirectHref = `/login?next=${encodeURIComponent('/account')}`;
  const initials = buildAccountInitials(user?.name ?? siteConfig.brandName);

  if (!isCustomerAuthReady) {
    return (
      <>
        <PageSeo
          title={`Account | ${siteConfig.brandName}`}
          description="Connected customer account."
          noindex
          siteName={siteConfig.brandName}
          themeColor={siteConfig.theme.primaryColor}
        />
        <section className="account-page">
          <div className="account-page__shell">
            <div className="checkout-stage__placeholder">
              <div className="checkout-stage__loader" />
            </div>
          </div>
        </section>
      </>
    );
  }

  if (!user) {
    return <Navigate to={loginRedirectHref} replace />;
  }

  return (
    <>
      <PageSeo
        title={`${user.name || 'Account'} | ${siteConfig.brandName}`}
        description="Customer account, purchases and verified reviews."
        noindex
        siteName={siteConfig.brandName}
        themeColor={siteConfig.theme.primaryColor}
      />
      <section className="account-page">
        <div className="account-page__shell">
          <article className="summary-card account-card">
          <div className="account-card__hero">
            <span className="account-card__avatar">{initials}</span>
            <div className="account-card__copy">
              <small>Cuenta conectada</small>
              <h1>{user.name}</h1>
              {user.email ? <p>{user.email}</p> : null}
              <div className="account-card__meta">
                <span className="account-card__provider-pill">
                  <BadgeCheck size={14} />
                  {user.provider || 'Cliente'}
                </span>
                <span className="account-card__status-pill">
                  <ShieldCheck size={14} />
                  Sesion activa
                </span>
              </div>
            </div>
          </div>

          <div className="account-card__stats">
            <div className="account-card__stat">
              <strong>{cartCount}</strong>
              <span>Productos en cesta</span>
            </div>
            <div className="account-card__stat">
              <strong>{purchasedProductSlugs.length}</strong>
              <span>Productos comprados</span>
            </div>
            <div className="account-card__stat">
              <strong>{myReviews.length}</strong>
              <span>Resenas verificadas</span>
            </div>
          </div>

          <div className="account-card__quick-links">
            <Link className="account-card__quick-link" to="/checkout/basket">
              <ShoppingCart size={18} />
              <div>
                <strong>Ir a mi cesta</strong>
                <span>Revisar productos y continuar el checkout</span>
              </div>
            </Link>
            <Link className="account-card__quick-link" to="/terms-conditions-and-refund-policy">
              <Lock size={18} />
              <div>
                <strong>Ver terminos</strong>
                <span>Refund policy, legal y condiciones</span>
              </div>
            </Link>
          </div>

          <div className="account-card__actions">
            <button
              className="account-card__action account-card__action--ghost"
              type="button"
              onClick={async () => {
                await logout();
                navigate('/', { replace: true });
              }}
            >
              <LogOut size={18} />
              <span>Cerrar sesion</span>
            </button>
            <Link className="account-card__action account-card__action--primary" to="/">
              <UserRound size={18} />
              <span>Volver a la tienda</span>
            </Link>
          </div>
          </article>
        </div>
      </section>
    </>
  );
}

export function AuthCallbackPage() {
  const { completeFiveMLogin, isCustomerAuthReady, siteConfig, storefrontSource, user } = useStore();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const provider = (searchParams.get('provider') ?? '').toLowerCase();
  const nextPath = searchParams.get('next')?.startsWith('/')
    ? searchParams.get('next')!
    : '/';
  const basketIdent = searchParams.get('basketIdent') ?? searchParams.get('basket') ?? '';

  useEffect(() => {
    if (storefrontSource !== 'supabase') {
      navigate(nextPath, { replace: true });
      return;
    }

    if (provider === 'fivem') {
      if (!basketIdent) {
        setError('Falta el identificador del basket para completar el login de FiveM.');
        return;
      }

      let isActive = true;

      void (async () => {
        try {
          const payload = await completeFiveMHeadlessLogin(basketIdent);
          if (!payload || !isActive) {
            return;
          }

          const result = await completeFiveMLogin(payload);
          if (!isActive) {
            return;
          }

          if (!result.ok) {
            setError(result.message ?? 'No se pudo completar el acceso con FiveM.');
            return;
          }

          navigate(nextPath, { replace: true });
        } catch (callbackError) {
          if (!isActive) {
            return;
          }

          setError(
            callbackError instanceof Error
              ? callbackError.message
              : 'No se pudo validar el acceso con Tebex/FiveM.',
          );
        }
      })();

      return () => {
        isActive = false;
      };
    }

    if (!isCustomerAuthReady) {
      return;
    }

    if (user) {
      navigate(nextPath, { replace: true });
      return;
    }

    const authError =
      searchParams.get('error_description') ??
      searchParams.get('error') ??
      '';

    if (authError) {
      setError(authError);
    }
  }, [
    basketIdent,
    completeFiveMLogin,
    isCustomerAuthReady,
    navigate,
    nextPath,
    provider,
    searchParams,
    storefrontSource,
    user,
  ]);

  return (
    <>
      <PageSeo
        title={`Auth Callback | ${siteConfig.brandName}`}
        description="Completing customer sign in."
        noindex
        siteName={siteConfig.brandName}
        themeColor={siteConfig.theme.primaryColor}
      />
      <section className="login-page auth-callback-page">
        <div className="login-page__shell auth-callback-page__shell">
          <article className="auth-callback-card">
          <div className="auth-callback-card__header">
            <span className="auth-callback-card__eyebrow">
              {provider === 'fivem' ? 'FiveM access' : 'Secure session'}
            </span>
            <h1>Completing sign in</h1>
            <p>
                {provider === 'fivem'
                  ? 'Validando la identidad de FiveM con Tebex y sincronizando tu sesión.'
                  : 'Restaurando tu sesión segura con Supabase.'}
            </p>
          </div>

          {!error ? (
            <div className="auth-callback-card__loading">
              <div className="premium-loader premium-loader--compact">
                <div className="premium-loader__spinner-container">
                  <div className="premium-loader__glow" />
                  <div className="premium-loader__spinner" />
                  <div className="premium-loader__spinner-inner" />
                  <ShieldCheck className="premium-loader__icon" size={20} />
                </div>
              </div>

              <div className="auth-callback-card__status">
                <span className="auth-callback-card__status-dot" />
                <strong>Conectando tu cuenta</strong>
                <small>Esto suele tardar solo unos segundos.</small>
              </div>
            </div>
          ) : (
            <div className="auth-callback-card__error">
              <small>{error}</small>
              <button
                className="checkout-summary__secondary auth-callback-card__back"
                type="button"
                onClick={() =>
                  navigate('/login', {
                    replace: true,
                    state: { backgroundLocation: routeLocation },
                  })}
              >
                Volver al login
              </button>
            </div>
          )}
          </article>
        </div>
      </section>
    </>
  );
}

export function CheckoutReturnPage() {
  const { clearCart, isCustomerAuthReady, siteConfig, storefrontSource, user } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'cancelled' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState('');
  const orderId = searchParams.get('orderId') ?? searchParams.get('order') ?? '';
  const provider = (searchParams.get('provider') ?? '').toLowerCase();
  const providerOrderId = searchParams.get('token') ?? searchParams.get('session_id');
  const cancelState = (searchParams.get('status') ?? '').toLowerCase();

  useEffect(() => {
    if (cancelState === 'cancelled') {
      setStatus('cancelled');
      setMessage('El checkout se canceló antes de completar el pago.');
      return;
    }

    if (storefrontSource !== 'supabase') {
      setStatus('success');
      return;
    }

    if (!isCustomerAuthReady) {
      return;
    }

    if (!user) {
      setStatus('error');
      setMessage('Necesitas iniciar sesión para revisar el estado real de tu pedido.');
      return;
    }

    if (!orderId || !provider) {
      setStatus('error');
      setMessage('Faltan datos del proveedor para validar el checkout.');
      return;
    }

    let isActive = true;

    void (async () => {
      try {
        if (provider === 'paypal') {
          const capture = await captureRemotePayPalOrder({
            orderId,
            paypalOrderId: providerOrderId,
          });

          if (!isActive) {
            return;
          }

          if (!capture || capture.status !== 'completed') {
            setStatus('error');
            setMessage('PayPal no confirmó el pago del pedido.');
            return;
          }

          clearCart();
          setStatus('success');
          setMessage('El pago se confirmó correctamente con PayPal.');
          return;
        }

        if (provider === 'tebex' || provider === 'stripe') {
          const order = await waitForRemoteOrderSettlement({ orderId });
          if (!isActive) {
            return;
          }

          if (order?.status === 'completed') {
            clearCart();
            setStatus('success');
            if (provider === 'stripe') {
              setMessage('Stripe confirmó el pedido y ya quedó reflejado en la tienda.');
              return;
            }
            setMessage('Tebex confirmó el pedido y ya quedó reflejado en la tienda.');
            return;
          }

          if (order?.status === 'cancelled' || order?.status === 'failed') {
            setStatus('error');
            if (provider === 'stripe') {
              setMessage('Stripe devolvió un estado no válido para completar el pedido.');
              return;
            }
            setMessage('Tebex devolvió un estado no válido para completar el pedido.');
            return;
          }

          setStatus('pending');
          if (provider === 'stripe') {
            setMessage(
              'Stripe devolvió al cliente, pero la confirmación final todavía no ha llegado. Revisa el estado en unos segundos o en el panel.',
            );
            return;
          }
          setMessage(
            'El pedido volvió desde Tebex, pero la confirmación final todavía no ha llegado. Revisa el estado en unos segundos o en el panel.',
          );
          return;
        }

        setStatus('error');
        setMessage('Proveedor de pago no soportado en la devolución del checkout.');
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : 'No se pudo validar el pago devuelto por el proveedor.',
        );
      }
    })();

    return () => {
      isActive = false;
    };
  }, [
    cancelState,
    clearCart,
    isCustomerAuthReady,
    orderId,
    provider,
    providerOrderId,
    storefrontSource,
    user,
  ]);

  const title =
    status === 'success'
      ? siteConfig.storeText.checkoutSuccessTitle
      : status === 'pending'
        ? 'Payment pending confirmation'
        : status === 'cancelled'
          ? 'Checkout cancelled'
          : status === 'error'
            ? 'Payment validation failed'
            : 'Checking payment status';

  const description =
    status === 'success'
      ? siteConfig.storeText.checkoutSuccessDescription
      : message ||
      'Estamos consultando el estado real del pedido con el proveedor de pago.';

  return (
    <>
      <PageSeo
        title={`${title} | ${siteConfig.brandName}`}
        description={description}
        noindex
        siteName={siteConfig.brandName}
        themeColor={siteConfig.theme.primaryColor}
      />
      <section className="checkout-page checkout-page--success">
        <div className="success-card">
          {status === 'loading' ? <div className="checkout-stage__loader" /> : <Sparkles size={26} />}
          <h1>{title}</h1>
          <p>{description}</p>
          {orderId ? <small>Order ID: {orderId}</small> : null}
          <div className="checkout-summary__actions">
            <button className="button button--primary" type="button" onClick={() => navigate('/')}>
              {status === 'success'
                ? siteConfig.storeText.checkoutSuccessButtonLabel
                : siteConfig.storeText.checkoutContinueShoppingLabel}
            </button>
            {status === 'pending' || status === 'error' ? (
              <button
                className="checkout-summary__secondary"
                type="button"
                onClick={() => window.location.reload()}
              >
                Reintentar estado
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

function renderLinkedParagraph(paragraph: string) {
  const parts = paragraph.split(/(https?:\/\/[^\s]+)/g);

  return parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a href={part} key={`${part}-${index}`} target="_blank" rel="noreferrer">
          {part}
        </a>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function TermsPage() {
  const { siteConfig } = useStore();
  const termsDescription = `Terms, refunds and legal information for ${siteConfig.brandName}.`;

  return (
    <>
      <PageSeo
        title={`${siteConfig.terms.title} | ${siteConfig.brandName}`}
        description={termsDescription}
        siteName={siteConfig.brandName}
        themeColor={siteConfig.theme.primaryColor}
        keywords={[siteConfig.brandName, 'terms', 'refund policy', 'conditions']}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: siteConfig.terms.title,
          description: termsDescription,
          url: buildAbsoluteUrl('/terms-conditions-and-refund-policy'),
        }}
      />
      <section className="terms-page">
        <main className="terms-content">
          <h1>{siteConfig.terms.title}</h1>
          <div className="terms-content__body">
            {siteConfig.terms.paragraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 24)}`} style={{ whiteSpace: 'pre-line' }}>
                {renderLinkedParagraph(paragraph)}
              </p>
            ))}
          </div>
        </main>
      </section>
    </>
  );
}

export function NotFoundPage() {
  const { siteConfig } = useStore();

  return (
    <>
      <PageSeo
        title={`Page Not Found | ${siteConfig.brandName}`}
        description="Requested page not found."
        noindex
        siteName={siteConfig.brandName}
        themeColor={siteConfig.theme.primaryColor}
      />
      <section className="not-found-page">
        <div className="empty-state empty-state--large">
          <ShieldCheck size={22} />
          <p>404</p>
          <span>The page you are attempting to view could not be found.</span>
          <Link className="button button--primary" to="/">
            {siteConfig.storeText.notFoundButtonLabel}
          </Link>
        </div>
      </section>
    </>
  );
}
