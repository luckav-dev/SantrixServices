import type { CSSProperties } from 'react';
import type { SiteConfig } from './site-config';
import type { HomeData } from './store';
import { getEmbedMediaSrc, hasOptionalMedia } from './media';
import { SafeImage } from './safe-image';
import {
  AdminField,
  AdminFormCard,
  AdminInlineTip,
  AdminPreviewCard,
  AdminSectionHeading,
  type AdminStatItem,
  AdminStatsGrid,
  AdminToggle,
} from './admin-ui';

function updateArrayItem<T>(items: T[], index: number, nextItem: T) {
  return items.map((item, currentIndex) => (currentIndex === index ? nextItem : item));
}

function parseLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePopupRows(value: string) {
  return parseLines(value).map((line) => {
    const [label = '', oldPrice = '', newPrice = ''] = line.split('|').map((item) => item.trim());

    return {
      label,
      oldPrice,
      newPrice,
    };
  });
}

function serializePopupRows(rows: SiteConfig['entryPopup']['rows']) {
  return rows.map((row) => [row.label, row.oldPrice, row.newPrice].join(' | ')).join('\n');
}

interface AdminAuthSectionProps {
  siteConfig: SiteConfig;
  brandName: string;
  authStats: AdminStatItem[];
  enabledCustomerProvidersCount: number;
  primaryCustomerProviderLabel: string;
  canManageSensitiveSettings: boolean;
  updateSiteConfig: (next: (current: SiteConfig) => SiteConfig) => void;
}

export function AdminAuthSection({
  siteConfig,
  brandName,
  authStats,
  enabledCustomerProvidersCount,
  primaryCustomerProviderLabel,
  canManageSensitiveSettings,
  updateSiteConfig,
}: AdminAuthSectionProps) {
  return (
    <section className="admin-section" id="auth">
      <AdminSectionHeading eyebrow="Auth" title="Login del cliente y proveedores" />
      <AdminStatsGrid
        items={authStats}
        ariaLabel="Resumen rápido de proveedores de acceso"
        className="admin-grid admin-grid--stats"
      />

      <div className="admin-grid admin-grid--products">
        <div className="admin-card">
          <div className="admin-card__title-row">
            <h3>Página de login</h3>
            <span className="admin-pill">
              {canManageSensitiveSettings ? siteConfig.customerLogin.primaryProviderId : 'Read only'}
            </span>
          </div>

          <AdminPreviewCard
            eyebrow="Login preview"
            title={siteConfig.customerLogin.routeTitle || 'Página de acceso'}
            description={siteConfig.customerLogin.routeSubtitle || 'Configura aquí el copy y los proveedores visibles.'}
            className="admin-preview-card--login"
          >
            <div className="admin-login-preview">
              <div className="admin-login-preview__brand">
                <span className="admin-brand-preview__fallback">{brandName}</span>
                <span className="admin-pill">{primaryCustomerProviderLabel}</span>
              </div>

              <div className="admin-login-preview__copy">
                <h4>{siteConfig.customerLogin.routeTitle || 'Acceso cliente'}</h4>
                <p>{siteConfig.customerLogin.helperText || 'Texto de ayuda del login.'}</p>
              </div>

              <div className="admin-login-preview__providers">
                {siteConfig.customerLogin.providers.map((provider) => (
                  <div
                    className={`admin-login-preview__provider ${provider.enabled ? '' : 'is-disabled'}`.trim()}
                    key={provider.id}
                  >
                    {/* Provider logo removed */}
                    <span>{provider.buttonLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          </AdminPreviewCard>

          {!canManageSensitiveSettings ? (
            <AdminInlineTip icon="fa-solid fa-lock">
              Solo el <strong>owner</strong> puede cambiar proveedores de login y branding de acceso.
            </AdminInlineTip>
          ) : null}

          <div className="admin-grid admin-grid--2">
            <AdminField label="Título página login">
              <input
                value={siteConfig.customerLogin.routeTitle}
                disabled={!canManageSensitiveSettings}
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
                disabled={!canManageSensitiveSettings}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    customerLogin: { ...current.customerLogin, routeSubtitle: event.currentTarget.value },
                  }))
                }
              />
            </AdminField>
            <AdminField label="Texto ayuda login">
              <input
                value={siteConfig.customerLogin.helperText}
                disabled={!canManageSensitiveSettings}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    customerLogin: { ...current.customerLogin, helperText: event.currentTarget.value },
                  }))
                }
              />
            </AdminField>
            <AdminField label="Texto fallback de botón">
              <input
                value={siteConfig.customerLogin.buttonLabel}
                disabled={!canManageSensitiveSettings}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    customerLogin: { ...current.customerLogin, buttonLabel: event.currentTarget.value },
                  }))
                }
              />
            </AdminField>
            <AdminField label="Proveedor principal">
              <select
                value={siteConfig.customerLogin.primaryProviderId}
                disabled={!canManageSensitiveSettings}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    customerLogin: {
                      ...current.customerLogin,
                      primaryProviderId:
                        event.currentTarget.value as SiteConfig['customerLogin']['primaryProviderId'],
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
            <AdminField label="Prefijo usuario conectado" hint="Ejemplo: Connected as">
              <input
                value={siteConfig.customerLogin.headerLoggedInTextPrefix}
                disabled={!canManageSensitiveSettings}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    customerLogin: {
                      ...current.customerLogin,
                      headerLoggedInTextPrefix: event.currentTarget.value,
                    },
                  }))
                }
              />
            </AdminField>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card__title-row">
            <h3>Branding del acceso</h3>
            <span className="admin-pill">{enabledCustomerProvidersCount} activos</span>
          </div>

          <div className="admin-grid admin-grid--2">
            <AdminField label="Logo de la página login">
              <input
                value={siteConfig.customerLogin.brandLogoSrc}
                disabled={!canManageSensitiveSettings}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    customerLogin: { ...current.customerLogin, brandLogoSrc: event.currentTarget.value },
                  }))
                }
              />
            </AdminField>
            <AdminField label="Alt del logo login">
              <input
                value={siteConfig.customerLogin.brandLogoAlt}
                disabled={!canManageSensitiveSettings}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    customerLogin: { ...current.customerLogin, brandLogoAlt: event.currentTarget.value },
                  }))
                }
              />
            </AdminField>
            <AdminField label="Label partner / proveedor">
              <input
                value={siteConfig.customerLogin.providerLabel}
                disabled={!canManageSensitiveSettings}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    customerLogin: { ...current.customerLogin, providerLabel: event.currentTarget.value },
                  }))
                }
              />
            </AdminField>
            <AdminField label="Logo fallback proveedor">
              <input
                value={siteConfig.customerLogin.providerLogoSrc}
                disabled={!canManageSensitiveSettings}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    customerLogin: { ...current.customerLogin, providerLogoSrc: event.currentTarget.value },
                  }))
                }
              />
            </AdminField>
            <AdminField label="Alt fallback proveedor">
              <input
                value={siteConfig.customerLogin.providerLogoAlt}
                disabled={!canManageSensitiveSettings}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    customerLogin: { ...current.customerLogin, providerLogoAlt: event.currentTarget.value },
                  }))
                }
              />
            </AdminField>
            <AdminField label="Texto login header público">
              <input
                value={siteConfig.header.guestLoginLabel}
                disabled={!canManageSensitiveSettings}
                onChange={(event) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    header: { ...current.header, guestLoginLabel: event.currentTarget.value },
                  }))
                }
              />
            </AdminField>
          </div>

          <AdminInlineTip icon="fa-solid fa-circle-info">
            Google y Discord dependen de <strong>Supabase Auth</strong>. FiveM depende del flujo real de
            <strong> Tebex Headless</strong> y de las edge functions desplegadas.
          </AdminInlineTip>
        </div>
      </div>

      <div className="admin-group-card admin-grid admin-grid--2">
        {siteConfig.customerLogin.providers.map((provider, index) => (
          <div className="admin-group-card" key={provider.id}>
            <div className="admin-card__title-row">
              <h3>{provider.label}</h3>
              <span className="admin-pill">{provider.id}</span>
            </div>
              <div className="admin-provider-card__preview">
                <span className="admin-provider-card__fallback">{provider.label.slice(0, 1)}</span>
                <div className="admin-provider-card__meta">
                  <strong>{provider.buttonLabel}</strong>
                  <span>{provider.enabled ? 'Visible en login' : 'Oculto en login'}</span>
                </div>
              </div>
            <div className="admin-stack">
              <AdminToggle
                label={`Activar ${provider.label}`}
                checked={provider.enabled}
                disabled={!canManageSensitiveSettings}
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
                  disabled={!canManageSensitiveSettings}
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
                  disabled={!canManageSensitiveSettings}
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
                  disabled={!canManageSensitiveSettings}
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
              <AdminField label="Alt del logo">
                <input
                  value={provider.logoAlt ?? ''}
                  disabled={!canManageSensitiveSettings}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      customerLogin: {
                        ...current.customerLogin,
                        providers: updateArrayItem(current.customerLogin.providers, index, {
                          ...current.customerLogin.providers[index],
                          logoAlt: event.currentTarget.value || undefined,
                        }),
                      },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Icon class FontAwesome">
                <input
                  value={provider.iconClass ?? ''}
                  disabled={!canManageSensitiveSettings}
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
    </section>
  );
}

interface AdminContentSectionProps {
  siteConfig: SiteConfig;
  home: HomeData;
  updateSiteConfig: (next: (current: SiteConfig) => SiteConfig) => void;
  updateHome: (next: (current: HomeData) => HomeData) => void;
}

interface AdminPopupSectionProps {
  siteConfig: SiteConfig;
  updateSiteConfig: (next: (current: SiteConfig) => SiteConfig) => void;
}

export function AdminPopupSection({
  siteConfig,
  updateSiteConfig,
}: AdminPopupSectionProps) {
  const { entryPopup } = siteConfig;
  const previewRows = entryPopup.rows.filter((row) =>
    [row.label, row.oldPrice, row.newPrice].some((value) => value.trim()),
  );
  const embedSrc =
    entryPopup.mediaType === 'embed' ? getEmbedMediaSrc(entryPopup.mediaSrc) : null;

  return (
    <section className="admin-section" id="popup">
      <AdminSectionHeading eyebrow="Popup" title="Oferta de entrada y anuncio inicial" />

      <div className="admin-stack">
        <div className="admin-editor-column admin-editor-column--preview">
          <AdminPreviewCard
            eyebrow="Popup preview"
            title={entryPopup.title || 'Entry popup'}
            description="Modal que aparece al entrar a la web para campañas, tutoriales, bundles o anuncios."
            className="admin-preview-card--popup"
          >
              <div className="admin-popup-preview admin-popup-preview--landscape">
                <div className="admin-popup-preview__dialog">
                  <div className="admin-popup-preview__layout">
                    <div className="admin-popup-preview__column admin-popup-preview__column--media">
                      {entryPopup.mediaType === 'video' && hasOptionalMedia(entryPopup.mediaSrc) ? (
                        <div className="admin-popup-preview__media">
                          <video
                            className="admin-popup-preview__video"
                            src={entryPopup.mediaSrc}
                            poster={entryPopup.mediaPosterSrc || undefined}
                            muted
                            playsInline
                            autoPlay
                            loop
                          />
                        </div>
                      ) : null}

                      {entryPopup.mediaType === 'embed' && embedSrc ? (
                        <div className="admin-popup-preview__media">
                          <iframe
                            className="admin-popup-preview__embed"
                            src={embedSrc}
                            title={entryPopup.mediaAlt || entryPopup.title || 'Popup media'}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>
                      ) : null}

                      {entryPopup.mediaType === 'image' && hasOptionalMedia(entryPopup.mediaSrc) ? (
                        <div className="admin-popup-preview__media">
                          <SafeImage
                            className="admin-popup-preview__image"
                            src={entryPopup.mediaSrc}
                            alt={entryPopup.mediaAlt}
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="admin-popup-preview__column admin-popup-preview__column--content">
                      <div className="admin-popup-preview__top">
                        <div className="admin-popup-preview__brand">
                          <span className="admin-provider-card__fallback">{siteConfig.brandName.slice(0, 1)}</span>
                          {entryPopup.badge.trim() ? <span className="admin-pill">{entryPopup.badge}</span> : null}
                        </div>
                        <button className="admin-popup-preview__close" type="button" aria-label="Close preview">
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </div>

                      <div className="admin-popup-preview__copy">
                        <h4>{entryPopup.title || 'Entry popup title'}</h4>
                        {entryPopup.message.trim() ? <p>{entryPopup.message}</p> : null}
                      </div>

                      {entryPopup.infoText.trim() ? (
                        <div className="admin-popup-preview__notice">
                          <i className="fa-solid fa-camera" />
                          <p>{entryPopup.infoText}</p>
                        </div>
                      ) : null}

                      {previewRows.length ? (
                        <div className="admin-popup-preview__prices">
                          <div className="admin-popup-preview__prices-head">
                            <span>{entryPopup.quantityLabel || 'Quantity'}</span>
                            <span>{entryPopup.priceLabel || 'New Prices'}</span>
                          </div>
                          <div className="admin-popup-preview__prices-list">
                            {previewRows.map((row, index) => (
                              <div className="admin-popup-preview__price-row" key={`${row.label}-${index}`}>
                                <strong>{row.label || `Option ${index + 1}`}</strong>
                                <span>
                                  {row.oldPrice.trim() ? <del>{row.oldPrice}</del> : null}
                                  {row.newPrice.trim() ? <em>{row.newPrice}</em> : null}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="admin-popup-preview__actions">
                        {entryPopup.ctaLabel.trim() ? (
                          <button className="admin-popup-preview__cta" type="button">
                            <span>{entryPopup.ctaLabel}</span>
                            <i className="fa-solid fa-arrow-right" />
                          </button>
                        ) : null}
                        <span className="admin-popup-preview__dismiss">
                          {entryPopup.dismissLabel || 'Dismiss'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </AdminPreviewCard>
        </div>

        <div className="admin-editor-column">
          <AdminFormCard
            eyebrow="Behaviour"
            title="Activacion y comportamiento"
            description="Controla si aparece al entrar, si se cierra por sesion y el color principal del popup."
            collapsible
          >
            <div className="admin-grid admin-grid--2">
              <AdminToggle
                label="Activar popup de entrada"
                checked={entryPopup.enabled}
                onChange={(checked) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    entryPopup: { ...current.entryPopup, enabled: checked },
                  }))
                }
              />
              <AdminToggle
                label="Mostrar una vez por sesion"
                checked={entryPopup.showOncePerSession}
                onChange={(checked) =>
                  updateSiteConfig((current) => ({
                    ...current,
                    entryPopup: { ...current.entryPopup, showOncePerSession: checked },
                  }))
                }
              />
              <AdminField label="Accent color">
                <input
                  type="color"
                  value={entryPopup.accentColor}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, accentColor: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Texto dismiss">
                <input
                  value={entryPopup.dismissLabel}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, dismissLabel: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
            </div>

            <AdminInlineTip icon="fa-solid fa-bolt">
              El popup se abre automaticamente al entrar en la web publica. Si activas
              <strong> una vez por sesion</strong>, al cerrarlo no volvera a salir hasta recargar una nueva sesion del navegador.
            </AdminInlineTip>
          </AdminFormCard>

          <AdminFormCard
            eyebrow="Copy"
            title="Contenido promocional"
            description="Titular, texto, CTA y filas de oferta para replicar el estilo de popup promocional."
            collapsible
            defaultOpen={false}
          >
            <div className="admin-grid admin-grid--2">
              <AdminField label="Badge">
                <input
                  value={entryPopup.badge}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, badge: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Titulo">
                <input
                  value={entryPopup.title}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, title: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Mensaje principal">
                <textarea
                  value={entryPopup.message}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, message: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Caja informativa">
                <textarea
                  value={entryPopup.infoText}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, infoText: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Texto boton CTA">
                <input
                  value={entryPopup.ctaLabel}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, ctaLabel: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Destino CTA">
                <input
                  value={entryPopup.ctaHref}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, ctaHref: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Titulo columna izquierda">
                <input
                  value={entryPopup.quantityLabel}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, quantityLabel: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Titulo columna derecha">
                <input
                  value={entryPopup.priceLabel}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, priceLabel: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Filas de oferta" hint="Una por linea: label | old price | new price">
                <textarea
                  value={serializePopupRows(entryPopup.rows)}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, rows: parsePopupRows(event.currentTarget.value) },
                    }))
                  }
                />
              </AdminField>
            </div>
          </AdminFormCard>

          <AdminFormCard
            eyebrow="Media"
            title="Logo, imagen, video o embed"
            description="Puedes usar una imagen, un video directo mp4/webm o un enlace de YouTube/Vimeo embebido."
            collapsible
            defaultOpen={false}
          >
            <div className="admin-grid admin-grid--2">
              <AdminField label="Logo popup">
                <input
                  value={entryPopup.logoSrc}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, logoSrc: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Alt logo">
                <input
                  value={entryPopup.logoAlt}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, logoAlt: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Tipo de media">
                <select
                  value={entryPopup.mediaType}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: {
                        ...current.entryPopup,
                        mediaType: event.currentTarget.value as SiteConfig['entryPopup']['mediaType'],
                      },
                    }))
                  }
                >
                  <option value="image">Image</option>
                  <option value="video">Direct Video (MP4)</option>
                  <option value="embed">YouTube / Video URL</option>
                </select>
              </AdminField>
              <AdminField label="Media src">
                <input
                  value={entryPopup.mediaSrc}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, mediaSrc: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Poster video">
                <input
                  value={entryPopup.mediaPosterSrc}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, mediaPosterSrc: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Alt media">
                <input
                  value={entryPopup.mediaAlt}
                  onChange={(event) =>
                    updateSiteConfig((current) => ({
                      ...current,
                      entryPopup: { ...current.entryPopup, mediaAlt: event.currentTarget.value },
                    }))
                  }
                />
              </AdminField>
            </div>
          </AdminFormCard>
        </div>
      </div>
    </section>
  );
}

export function AdminContentSection({
  siteConfig,
  home,
  updateSiteConfig,
  updateHome,
}: AdminContentSectionProps) {
  const enabledContentModulesCount = [
    siteConfig.whyChooseUs.enabled,
    siteConfig.achievements.enabled,
    siteConfig.reviews.enabled,
    siteConfig.faq.enabled,
    siteConfig.payments.enabled,
    siteConfig.discordBanner.enabled,
  ].filter(Boolean).length;

  return (
    <section className="admin-section" id="content">
      <AdminSectionHeading eyebrow="Contenido" title="Términos, textos y módulos visibles" />

      <div className="admin-editor-layout">
        <div className="admin-editor-column admin-editor-column--preview">
          <AdminPreviewCard
            eyebrow="Storefront modules"
            title="Bloques públicos activos"
            description="Resumen del storefront visible ahora mismo y del copy principal asociado a checkout y producto."
            className="admin-preview-card--content"
          >
            <div className="admin-content-preview">
              <div className="admin-key-metrics">
                <div>
                  <span>Módulos activos</span>
                  <strong>{enabledContentModulesCount}</strong>
                </div>
                <div>
                  <span>Vídeos</span>
                  <strong>{home.videos.length}</strong>
                </div>
                <div>
                  <span>Términos</span>
                  <strong>{siteConfig.terms.paragraphs.length}</strong>
                </div>
              </div>

              <div className="admin-content-preview__modules">
                <span className={siteConfig.whyChooseUs.enabled ? 'is-on' : 'is-off'}>Why Choose Us</span>
                <span className={siteConfig.achievements.enabled ? 'is-on' : 'is-off'}>Achievements</span>
                <span className={siteConfig.reviews.enabled ? 'is-on' : 'is-off'}>Reviews</span>
                <span className={siteConfig.faq.enabled ? 'is-on' : 'is-off'}>FAQ</span>
                <span className={siteConfig.payments.enabled ? 'is-on' : 'is-off'}>Payments</span>
                <span className={siteConfig.discordBanner.enabled ? 'is-on' : 'is-off'}>Discord</span>
              </div>

              <div className="admin-content-preview__copy">
                <div>
                  <span>Destacados</span>
                  <strong>{siteConfig.storeText.featuredProductsLabel}</strong>
                </div>
                <div>
                  <span>CTA producto</span>
                  <strong>{siteConfig.storeText.productAddToCartLabel}</strong>
                </div>
                <div>
                  <span>Checkout</span>
                  <strong>{siteConfig.storeText.checkoutCompletePaymentLabel}</strong>
                </div>
              </div>
            </div>
          </AdminPreviewCard>
        </div>

        <div className="admin-editor-column">
          <AdminFormCard
            eyebrow="Visibility"
            title="Módulos visibles del storefront"
            description="Activa o desactiva bloques públicos sin tocar la composición general de la web."
            collapsible
          >
            <div className="admin-grid admin-grid--2">
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
            </div>
          </AdminFormCard>

          <AdminFormCard
            eyebrow="Store copy"
            title="Textos de tienda y checkout"
            description="Copy base que se reutiliza en cards de producto, checkout, soporte y documentación."
            collapsible
            defaultOpen={false}
          >
            <div className="admin-grid admin-grid--2">
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
              <AdminField label="Botón completar pago">
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
              <AdminField label="Botón seguir comprando">
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
            </div>
          </AdminFormCard>

          <AdminFormCard
            eyebrow="Terms y media"
            title="Términos y vídeos del home"
            description="Textos legales y vídeos que alimentan el bloque de showcase del storefront."
            collapsible
            defaultOpen={false}
          >
            <div className="admin-grid admin-grid--2">
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
            </div>

            <div className="admin-group-card">
              <div className="admin-card__title-row">
                <h3>Actividad comercial en tiempo real</h3>
                <span className="admin-pill">Realtime</span>
              </div>
              <p className="admin-muted-text">
                Los bloques de Payments, Reviews y Achievements ya no usan texto harcodeado. Ahora salen de pedidos y reseñas reales guardados en Supabase.
              </p>
            </div>
          </AdminFormCard>
        </div>
      </div>
    </section>
  );
}
