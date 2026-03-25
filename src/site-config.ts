import {
  achievementStats,
  faqItems,
  footerColumns,
  paymentAvatars,
  reviewCards,
  termsParagraphs,
  videoThumbs,
  whyChooseUs,
} from './site-content';

export interface HeaderSocialLink {
  label: string;
  href: string;
  icon: string;
}

export interface FooterLinkItem {
  label: string;
  href: string;
}

export interface FooterColumnConfig {
  id: string;
  title: string;
  links: FooterLinkItem[];
}

export interface BrandAssetsConfig {
  headerLogoSrc: string;
  headerLogoAlt: string;
  headerPartnerLogoSrc: string;
  headerPartnerLogoAlt: string;
  footerLogoSrc: string;
  footerLogoAlt: string;
  footerPartnerLogoSrc: string;
  footerPartnerLogoAlt: string;
  footerDecorationSrc: string;
  heroSmallLogoSrc: string;
  heroMediumLogoSrc: string;
  heroBigLogoSrc: string;
}

export interface DiscountBannerConfig {
  enabled: boolean;
  logoSrc: string;
  logoAlt: string;
  title: string;
  description: string;
  code: string;
  endAt: string;
  backgroundImageSrc: string;
}

export interface HomeHeroConfig {
  badgeHref: string;
  badgeLogoSrc: string;
  badgeLogoAlt: string;
  badgeText: string;
  titlePrefix: string;
  titleHighlight: string;
  titleSuffix: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  secondaryCtaExternal: boolean;
}

export type EntryPopupMediaType = 'image' | 'video' | 'embed';

export interface EntryPopupRowConfig {
  label: string;
  oldPrice: string;
  newPrice: string;
}

export interface EntryPopupConfig {
  enabled: boolean;
  showOncePerSession: boolean;
  badge: string;
  title: string;
  message: string;
  infoText: string;
  ctaLabel: string;
  ctaHref: string;
  dismissLabel: string;
  logoSrc: string;
  logoAlt: string;
  mediaType: EntryPopupMediaType;
  mediaSrc: string;
  mediaPosterSrc: string;
  mediaAlt: string;
  accentColor: string;
  quantityLabel: string;
  priceLabel: string;
  rows: EntryPopupRowConfig[];
}

export interface HeaderConfig {
  homeLabel: string;
  categoryMenuLabel: string;
  showCategoryMenu: boolean;
  documentationLabel: string;
  documentationHref: string;
  showDocumentationLink: boolean;
  socialLinks: HeaderSocialLink[];
  guestLoginLabel: string;
}

export interface FooterConfig {
  showPoweredBy: boolean;
  poweredByLabel: string;
  legalText: string;
  columns: FooterColumnConfig[];
}

export interface WhyChooseUsItem {
  title: string;
  body: string;
  cta: string;
  href: string;
}

export interface AchievementStat {
  value: string;
  label: string;
  accent?: boolean;
}

export interface ReviewCardConfig {
  name: string;
  date: string;
  product: string;
  quote: string;
  avatar: string;
}

export interface FaqItemConfig {
  question: string;
  answer: string;
}

export interface ReviewSectionConfig {
  enabled: boolean;
  titleLead: string;
  titleAccent: string;
  summaryLabel: string;
  summaryValue: string;
  summarySuffix: string;
  description: string;
  cards: ReviewCardConfig[];
}

export interface WhyChooseUsSectionConfig {
  enabled: boolean;
  titleLead: string;
  titleAccent: string;
  description: string;
  items: WhyChooseUsItem[];
}

export interface AchievementSectionConfig {
  enabled: boolean;
  titleLead: string;
  titleAccent: string;
  description: string;
  stats: AchievementStat[];
}

export interface VideoSectionConfig {
  enabled: boolean;
  channelHref: string;
  channelLogoSrc: string;
  channelLogoAlt: string;
  description: string;
  thumbs: string[];
}

export interface FaqSectionConfig {
  enabled: boolean;
  titleLead: string;
  titleAccent: string;
  description: string;
  searchPlaceholder: string;
  illustrationSrc: string;
  items: FaqItemConfig[];
}

export interface PaymentsSectionConfig {
  enabled: boolean;
  titleLead: string;
  titleAccent: string;
  description: string;
  avatars: string[];
}

export interface DiscordBannerSectionConfig {
  enabled: boolean;
  titleLead: string;
  titleAccent: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
  disclaimer: string;
  imageSrc: string;
}

export interface TermsConfig {
  title: string;
  paragraphs: string[];
}

export interface CustomerLoginConfig {
  routeTitle: string;
  routeSubtitle: string;
  brandLogoSrc: string;
  brandLogoAlt: string;
  providerLabel: string;
  providerLogoSrc: string;
  providerLogoAlt: string;
  buttonLabel: string;
  helperText: string;
  headerLoggedInTextPrefix: string;
  primaryProviderId: CustomerAuthProviderId;
  providers: CustomerAuthProviderConfig[];
}

export type CustomerAuthProviderId = 'google' | 'discord' | 'fivem';

export interface CustomerAuthProviderConfig {
  id: CustomerAuthProviderId;
  enabled: boolean;
  label: string;
  buttonLabel: string;
  logoSrc?: string;
  logoAlt?: string;
  iconClass?: string;
}

export interface StoreTextConfig {
  featuredProductsLabel: string;
  productAddToCartLabel: string;
  productSupportPrimary: string;
  productSupportSecondary: string;
  productPreviewTitle: string;
  productPreviewLinkLabel: string;
  productPreviewEmptyText: string;
  productDocumentationTitle: string;
  productDocumentationLinkLabel: string;
  productDocumentationEmptyText: string;
  productPackageTypeLabel: string;
  productDescriptionTitle: string;
  relatedProductsLead: string;
  relatedProductsAccent: string;
  relatedProductsSubtitle: string;
  cartDrawerCheckoutLabel: string;
  cartDrawerContinueLabel: string;
  checkoutSupportText: string;
  checkoutSuccessTitle: string;
  checkoutSuccessDescription: string;
  checkoutSuccessButtonLabel: string;
  checkoutBasketTitle: string;
  checkoutEmptyTitle: string;
  checkoutEmptyDescription: string;
  checkoutReturnToShopLabel: string;
  checkoutSummaryTitle: string;
  checkoutItemsTotalLabel: string;
  checkoutTaxesLabel: string;
  checkoutEstimatedTotalLabel: string;
  checkoutCompletePaymentLabel: string;
  checkoutContinueShoppingLabel: string;
  notFoundButtonLabel: string;
}

export interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
}

export interface AdminAccessConfig {
  username: string;
  password: string;
}

export interface SiteConfig {
  brandName: string;
  studioName: string;
  theme: ThemeConfig;
  brandAssets: BrandAssetsConfig;
  header: HeaderConfig;
  discountBanner: DiscountBannerConfig;
  entryPopup: EntryPopupConfig;
  homeHero: HomeHeroConfig;
  footer: FooterConfig;
  whyChooseUs: WhyChooseUsSectionConfig;
  achievements: AchievementSectionConfig;
  reviews: ReviewSectionConfig;
  videos: VideoSectionConfig;
  faq: FaqSectionConfig;
  payments: PaymentsSectionConfig;
  discordBanner: DiscordBannerSectionConfig;
  terms: TermsConfig;
  customerLogin: CustomerLoginConfig;
  storeText: StoreTextConfig;
  adminAccess: AdminAccessConfig;
}

function cloneArray<T>(items: T[]) {
  return items.map((item) => ({ ...item }));
}

export function buildDefaultSiteConfig(): SiteConfig {
  return {
    brandName: 'LUCKAV PRODUCTS',
    studioName: 'LUCKAV Studio',
    theme: {
      primaryColor: '#ff334f',
      accentColor: '#ff4c63',
    },
    brandAssets: {
      headerLogoSrc: '/media/logo.png',
      headerLogoAlt: '0Resmon Logo',
      headerPartnerLogoSrc: '/media/tebex.png',
      headerPartnerLogoAlt: 'Tebex Logo',
      footerLogoSrc: '/media/0resmon-logo-gray.png',
      footerLogoAlt: '0Resmon Logo',
      footerPartnerLogoSrc: '/media/tebex-logo-gray.png',
      footerPartnerLogoAlt: 'Tebex Logo',
      footerDecorationSrc: '/media/0resmon-drag.png',
      heroSmallLogoSrc: '/media/small-red-resmon-logo.png',
      heroMediumLogoSrc: '/media/medium-red-resmon-logo.png',
      heroBigLogoSrc: '/media/big-red-resmon-logo.png',
    },
    header: {
      homeLabel: 'Home',
      categoryMenuLabel: 'Scripts',
      showCategoryMenu: true,
      documentationLabel: 'Documentation',
      documentationHref: 'https://docs.0resmon.org/0resmon/',
      showDocumentationLink: true,
      socialLinks: [
        { label: 'Discord', href: 'https://discord.gg/0resmon', icon: 'fa-brands fa-discord' },
        { label: 'YouTube', href: 'https://www.youtube.com/@0resmonstudio', icon: 'fa-brands fa-youtube' },
        { label: 'GitHub', href: 'https://github.com/0resmon', icon: 'fa-brands fa-github' },
      ],
      guestLoginLabel: 'Login In',
    },
    discountBanner: {
      enabled: true,
      logoSrc: '/media/discount-banner-logo.png',
      logoAlt: 'Discount Banner Logo',
      title: 'Big Discount Started',
      description: 'The 40% discount is now valid on all scripts.',
      code: 'RES40',
      endAt: '2026-04-03T11:59:59+01:00',
      backgroundImageSrc: '/media/big-discount-new-banner-2.png',
    },
    entryPopup: {
      enabled: false,
      showOncePerSession: true,
      badge: 'PRICE DROP & TUTORIAL',
      title: 'Featured launch offer',
      message: 'Highlight a launch, tutorial, bundle or seasonal campaign right when the customer enters the storefront.',
      infoText: 'Add a video, image or embed and combine it with offer rows to push the campaign without changing the page layout.',
      ctaLabel: 'Buy now',
      ctaHref: '/category/open-source',
      dismissLabel: 'Dismiss, maybe later',
      logoSrc: '/media/discount-banner-logo.png',
      logoAlt: 'Popup Logo',
      mediaType: 'image',
      mediaSrc: '/media/big-discount-new-banner-2.png',
      mediaPosterSrc: '',
      mediaAlt: 'Launch Offer',
      accentColor: '#2ee96d',
      quantityLabel: 'Quantity',
      priceLabel: 'New Prices',
      rows: [
        { label: '1 KEY', oldPrice: '6.50EUR', newPrice: '5.45EUR' },
        { label: '5 KEYS', oldPrice: '5.46EUR', newPrice: '4.90EUR' },
        { label: '10 KEYS', oldPrice: '5.00EUR', newPrice: '4.50EUR' },
      ],
    },
    homeHero: {
      badgeHref: 'https://www.youtube.com/@0resmonstudio',
      badgeLogoSrc: '/media/youtube-logo.png',
      badgeLogoAlt: 'YouTube Logo',
      badgeText: '',
      titlePrefix: 'Take your server beyond limits with',
      titleHighlight: 'LUCKAV',
      titleSuffix: 'PRODUCTS',
      description:
        'Carefully crafted resources focused on performance, stability, and seamless server integration.',
      primaryCtaLabel: 'Browse Products',
      primaryCtaHref: '/category/open-source',
      secondaryCtaLabel: 'Join Discord',
      secondaryCtaHref: 'https://discord.gg/0resmon',
      secondaryCtaExternal: true,
    },
    footer: {
      showPoweredBy: true,
      poweredByLabel: 'Powered by',
      legalText:
        'Copyright © 2026 0Resmon Studio. Not affiliated with or endorsed by Rockstar North, Take-Two Interactive or other rights holders. FiveM is a copyright and registered trademark of Take-Two Interactive Software, Inc.\n\nOur checkout process is owned & operated by Tebex Limited, who handle product fulfilment, billing support and refunds. All displayed prices, except GBP, are estimates using a conversion rate updated once per day. Checkout is always in GBP regardless of currency selected; so final price may differ depending on bank/payment processor exchange rate.',
      columns: footerColumns.map((column, index) => ({
        id: `footer-column-${index + 1}`,
        title: column.title,
        links: cloneArray(column.links),
      })),
    },
    whyChooseUs: {
      enabled: true,
      titleLead: 'Why',
      titleAccent: 'Choose Us',
      description:
        'We deliver optimized, reliable solutions that integrate smoothly and perform consistently on your server.',
      items: cloneArray(whyChooseUs),
    },
    achievements: {
      enabled: true,
      titleLead: 'Our',
      titleAccent: 'Achievements',
      description: 'Started in 2020, trusted by servers worldwide for quality FiveM resources.',
      stats: cloneArray(achievementStats),
    },
    reviews: {
      enabled: true,
      titleLead: 'Customer',
      titleAccent: 'Reviews',
      summaryLabel: 'Average',
      summaryValue: '4.8',
      summarySuffix: 'Based on 10.000+ reviews',
      description: 'Real feedback from our community after installing and using our FiveM resources.',
      cards: cloneArray(reviewCards),
    },
    videos: {
      enabled: true,
      channelHref: 'https://www.youtube.com/@0resmonstudio',
      channelLogoSrc: '/media/youtube-logo.png',
      channelLogoAlt: 'YouTube Logo',
      description: 'Check out our YouTube channel to learn about features you didn’t even know existed.',
      thumbs: [...videoThumbs],
    },
    faq: {
      enabled: true,
      titleLead: 'Frequently',
      titleAccent: 'Asked Questions',
      description: 'Find answers to common questions about our FiveM resources and Tebex checkout.',
      searchPlaceholder: 'Search FAQs...',
      illustrationSrc: '/media/faq-image.png',
      items: cloneArray(faqItems),
    },
    payments: {
      enabled: true,
      titleLead: 'Recent',
      titleAccent: 'Payments',
      description: 'Trusted by thousands of customers with over 42,000+ successful sales worldwide.',
      avatars: [...paymentAvatars],
    },
    discordBanner: {
      enabled: true,
      titleLead: 'Join our',
      titleAccent: 'Discord',
      description:
        'Discord is great for playing games and chilling with friends, or even building a worldwide community. Customize your own space to talk, play, and hang out.',
      buttonLabel: 'Discord',
      buttonHref: 'https://discord.gg/0resmon',
      disclaimer: 'By clicking subscribe you accept our privacy statement.',
      imageSrc: '/media/discord-banner.png',
    },
    terms: {
      title: 'Terms , Conditions & Refund Policy',
      paragraphs: [...termsParagraphs],
    },
    customerLogin: {
      routeTitle: 'PLEASE LOG IN',
      routeSubtitle: 'Enter your credentials to continue',
      brandLogoSrc: '/media/discount-banner-logo.png',
      brandLogoAlt: '0Resmon Logo',
      providerLabel: 'Cfx.re',
      providerLogoSrc: '/media/6870ab2b-1626-4134-8069-9ae703b3219f.svg',
      providerLogoAlt: 'FiveM Logo',
      buttonLabel: 'Login via FiveM',
      helperText: 'Secure login powered by your game server',
      headerLoggedInTextPrefix: '',
      primaryProviderId: 'fivem',
      providers: [
        {
          id: 'google',
          enabled: false,
          label: 'Google',
          buttonLabel: 'Login via Google',
          iconClass: 'fa-brands fa-google',
        },
        {
          id: 'discord',
          enabled: false,
          label: 'Discord',
          buttonLabel: 'Login via Discord',
          iconClass: 'fa-brands fa-discord',
        },
        {
          id: 'fivem',
          enabled: true,
          label: 'Cfx.re',
          buttonLabel: 'Login via FiveM',
          logoSrc: '/media/6870ab2b-1626-4134-8069-9ae703b3219f.svg',
          logoAlt: 'FiveM Logo',
        },
      ],
    },
    storeText: {
      featuredProductsLabel: 'Top-Selling Products',
      productAddToCartLabel: 'Add to Cart',
      productSupportPrimary: 'Performance certified by stress tests',
      productSupportSecondary: '7/24 Always-on customer support',
      productPreviewTitle: 'Preview',
      productPreviewLinkLabel: 'Watch preview',
      productPreviewEmptyText: 'No preview video was attached to this package.',
      productDocumentationTitle: 'Documentation',
      productDocumentationLinkLabel: 'Open documentation',
      productDocumentationEmptyText: 'No documentation link was attached to this package.',
      productPackageTypeLabel: 'Package Type',
      productDescriptionTitle: 'Description',
      relatedProductsLead: 'Related',
      relatedProductsAccent: 'Products',
      relatedProductsSubtitle: 'More resources from the same category.',
      cartDrawerCheckoutLabel: 'Secure Checkout',
      cartDrawerContinueLabel: 'Continue Shopping',
      checkoutSupportText: 'Need help? Contact support',
      checkoutSuccessTitle: 'Purchase completed',
      checkoutSuccessDescription:
        'Your payment was confirmed and the order was synchronized with the storefront successfully.',
      checkoutSuccessButtonLabel: 'Back to home',
      checkoutBasketTitle: 'Shopping Basket',
      checkoutEmptyTitle: 'Your basket is empty.',
      checkoutEmptyDescription: 'Add something from the catalogue to continue.',
      checkoutReturnToShopLabel: 'Return to Shop',
      checkoutSummaryTitle: 'Order Summary',
      checkoutItemsTotalLabel: 'Items Total',
      checkoutTaxesLabel: 'Taxes',
      checkoutEstimatedTotalLabel: 'Estimated Total',
      checkoutCompletePaymentLabel: 'Complete Payment',
      checkoutContinueShoppingLabel: 'Continue Shopping',
      notFoundButtonLabel: 'Return home',
    },
    adminAccess: {
      username: 'admin',
      password: 'admin123',
    },
  };
}
