import type { Product, ProductCheckoutProvider } from './store';
import { hasOptionalMedia } from './media';
import { SafeImage } from './safe-image';
import {
  AdminFormCard,
  AdminField,
  AdminInlineTip,
  AdminSectionHeading,
  type AdminStatItem,
  AdminStatsGrid,
  AdminToggle,
} from './admin-ui';

interface PaymentDraftPreview {
  title: string;
  checkoutProvider: ProductCheckoutProvider;
  requiresIdentity: boolean;
  tebexPackageId: string;
  tebexServerId: string;
  externalCheckoutUrl: string;
  openVersionId: string;
}

interface AdminPaymentsSectionProps {
  products: Product[];
  selectedProductSlug: string | null;
  productDraft: PaymentDraftPreview;
  paymentStats: AdminStatItem[];
  canManageSensitiveSettings: boolean;
  onSelectProduct: (slug: string) => void;
  onCheckoutProviderChange: (provider: ProductCheckoutProvider) => void;
  onRequiresIdentityChange: (checked: boolean) => void;
  onTebexPackageIdChange: (value: string) => void;
  onTebexServerIdChange: (value: string) => void;
  onExternalCheckoutUrlChange: (value: string) => void;
  onSave: () => void;
  onBackToProducts: () => void;
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

export function AdminPaymentsSection({
  products,
  selectedProductSlug,
  productDraft,
  paymentStats,
  canManageSensitiveSettings,
  onSelectProduct,
  onCheckoutProviderChange,
  onRequiresIdentityChange,
  onTebexPackageIdChange,
  onTebexServerIdChange,
  onExternalCheckoutUrlChange,
  onSave,
  onBackToProducts,
}: AdminPaymentsSectionProps) {
  return (
    <section className="admin-section" id="payments">
      <AdminSectionHeading eyebrow="Payments" title="Gateway y requisitos de compra" />

      <AdminStatsGrid
        items={paymentStats}
        ariaLabel="Resumen rápido de gateways y requisitos de identidad"
        className="admin-grid admin-grid--stats"
      />

      <div className="admin-grid admin-grid--products">
        <AdminFormCard
          eyebrow="Catalogue"
          title="Productos y gateway"
          description="Selecciona un producto para tocar su salida de pago sin abrir pantallas pesadas."
          actions={<span className="admin-pill">{products.length} productos</span>}
        >
          <div className="admin-stack admin-product-list">
            {products.map((product) => (
              <button
                className={`admin-product-list__item ${selectedProductSlug === product.slug ? 'is-active' : ''}`}
                key={`payments-${product.slug}`}
                type="button"
                onClick={() => onSelectProduct(product.slug)}
              >
                <div className="admin-product-list__media">
                  {hasOptionalMedia(product.image) ? (
                    <SafeImage className="admin-product-list__thumb" src={product.image} alt={product.title} />
                  ) : null}
                </div>
                <div className="admin-product-list__copy">
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
        </AdminFormCard>

        <AdminFormCard
          eyebrow="Checkout"
          title="Ajustes del producto"
          description="Provider, identidad requerida y referencias técnicas del checkout del producto seleccionado."
          actions={
            selectedProductSlug ? (
              <span className="admin-pill">{getCheckoutProviderLabel(productDraft.checkoutProvider)}</span>
            ) : undefined
          }
          collapsible
        >
          {selectedProductSlug ? (
            <>
              <div className="admin-detail-list">
                <div>
                  <span>Producto</span>
                  <strong>{productDraft.title || 'Producto sin título'}</strong>
                </div>
                <div>
                  <span>Identidad</span>
                  <strong>{productDraft.requiresIdentity ? 'Required' : 'Optional'}</strong>
                </div>
                <div>
                  <span>Tebex package</span>
                  <strong>{productDraft.tebexPackageId || productDraft.openVersionId || 'Sin definir'}</strong>
                </div>
                <div>
                  <span>Tebex server</span>
                  <strong>{productDraft.tebexServerId || 'Opcional'}</strong>
                </div>
              </div>

              {!canManageSensitiveSettings ? (
                <AdminInlineTip icon="fa-solid fa-lock">
                  Esta página es de <strong>solo lectura</strong> para roles que no son
                  <strong> owner</strong>.
                </AdminInlineTip>
              ) : null}

              <div className="admin-grid admin-grid--2">
                <AdminField label="Proveedor checkout">
                  <select
                    value={productDraft.checkoutProvider}
                    disabled={!canManageSensitiveSettings}
                    onChange={(event) =>
                      onCheckoutProviderChange(event.currentTarget.value as ProductCheckoutProvider)
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
                  disabled={!canManageSensitiveSettings}
                  onChange={onRequiresIdentityChange}
                />

                <AdminField label="Tebex package id" hint="Si está vacío, usa open/escrow version id como fallback">
                  <input
                    value={productDraft.tebexPackageId}
                    disabled={!canManageSensitiveSettings}
                    onChange={(event) => onTebexPackageIdChange(event.currentTarget.value)}
                  />
                </AdminField>

                <AdminField label="Tebex server id" hint="Opcional, útil si el package se liga a un server">
                  <input
                    value={productDraft.tebexServerId}
                    disabled={!canManageSensitiveSettings}
                    onChange={(event) => onTebexServerIdChange(event.currentTarget.value)}
                  />
                </AdminField>

                <AdminField label="External checkout URL" hint="Solo para productos external">
                  <input
                    value={productDraft.externalCheckoutUrl}
                    disabled={!canManageSensitiveSettings}
                    onChange={(event) => onExternalCheckoutUrlChange(event.currentTarget.value)}
                  />
                </AdminField>
              </div>

              <AdminInlineTip icon="fa-solid fa-shield-halved">
                <strong>{productDraft.title || 'Este producto'}</strong>{' '}
                saldrá por <strong>{getCheckoutProviderLabel(productDraft.checkoutProvider)}</strong>
                {productDraft.requiresIdentity
                  ? ' y exigirá identidad validada.'
                  : ' sin exigir login de identidad extra.'}
              </AdminInlineTip>

              <div className="admin-row admin-row--wrap">
                {canManageSensitiveSettings ? (
                  <button className="admin-button admin-button--primary" type="button" onClick={onSave}>
                    Guardar ajustes de pago
                  </button>
                ) : null}
                <button className="admin-button admin-button--ghost" type="button" onClick={onBackToProducts}>
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
        </AdminFormCard>
      </div>
    </section>
  );
}
