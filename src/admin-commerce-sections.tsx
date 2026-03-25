import type { AdminCustomerRecord, AdminOrderRecord } from './supabase-admin-commerce';
import {
  type AdminStatItem,
  AdminEmptyState,
  AdminSectionHeading,
  AdminStatsGrid,
} from './admin-ui';

interface AdminCustomersSectionProps {
  isRemoteAdminAuth: boolean;
  isCommerceReady: boolean;
  commerceError: string;
  customers: AdminCustomerRecord[];
  orders: AdminOrderRecord[];
  customerStats: AdminStatItem[];
  customerQuery: string;
  onCustomerQueryChange: (value: string) => void;
  filteredCustomers: AdminCustomerRecord[];
  selectedCustomer: AdminCustomerRecord | null;
  selectedCustomerOrders: AdminOrderRecord[];
  selectedCustomerRevenue: number;
  ordersByCustomer: Record<string, AdminOrderRecord[]>;
  onSelectCustomer: (userId: string) => void;
  onOpenOrder: (orderId: string) => void;
  formatAdminCurrency: (value: number) => string;
  formatAdminDate: (value: string) => string;
  getAdminInitials: (value: string | null | undefined) => string;
}

export function AdminCustomersSection({
  isRemoteAdminAuth,
  isCommerceReady,
  commerceError,
  customers,
  orders,
  customerStats,
  customerQuery,
  onCustomerQueryChange,
  filteredCustomers,
  selectedCustomer,
  selectedCustomerOrders,
  selectedCustomerRevenue,
  ordersByCustomer,
  onSelectCustomer,
  onOpenOrder,
  formatAdminCurrency,
  formatAdminDate,
  getAdminInitials,
}: AdminCustomersSectionProps) {
  return (
    <section className="admin-section" id="customers">
      <AdminSectionHeading eyebrow="Customers" title="Clientes sincronizados" />

      {isRemoteAdminAuth && isCommerceReady && !commerceError && customers.length ? (
        <AdminStatsGrid
          items={customerStats}
          ariaLabel="Resumen rápido de clientes y facturación"
          className="admin-grid admin-grid--stats"
        />
      ) : null}

      {!isRemoteAdminAuth ? (
        <AdminEmptyState
          icon="fa-solid fa-database"
          title="Disponible en modo Supabase"
          description="Esta vista solo muestra datos reales cuando el panel está conectado a Supabase Auth y a la base de datos."
        />
      ) : !isCommerceReady ? (
        <div className="admin-card admin-empty-panel">
          <div className="checkout-stage__loader" />
          <p>Cargando clientes reales desde Supabase...</p>
        </div>
      ) : commerceError ? (
        <AdminEmptyState
          icon="fa-solid fa-triangle-exclamation"
          title="No se pudieron cargar los clientes"
          description={commerceError}
        />
      ) : customers.length ? (
        <>
          <div className="admin-card admin-toolbar">
            <label className="admin-toolbar__search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                placeholder="Buscar por nombre, email, proveedor o user id"
                value={customerQuery}
                onChange={(event) => onCustomerQueryChange(event.currentTarget.value)}
              />
            </label>
            <div className="admin-toolbar__meta">
              <span className="admin-pill">
                {filteredCustomers.length} / {customers.length} clientes
              </span>
              <span className="admin-pill">{orders.length} pedidos totales</span>
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
                      onClick={() => onSelectCustomer(customer.userId)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectCustomer(customer.userId);
                        }
                      }}
                    >
                      <div className="admin-card__title-row admin-list-card__head">
                        <div className="admin-list-card__identity">
                          <span className="admin-list-card__avatar">
                            {getAdminInitials(customer.displayName || customer.email || customer.userId)}
                          </span>
                          <div>
                            <h3>{customer.displayName}</h3>
                            <p className="admin-muted-text">{customer.email ?? 'Sin email visible'}</p>
                          </div>
                        </div>
                        <span className="admin-pill">{customer.isAnonymous ? 'Anonymous' : customer.provider}</span>
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
                    <div className="admin-card__title-row admin-list-card__head">
                      <div className="admin-list-card__identity">
                        <span className="admin-list-card__avatar admin-list-card__avatar--large">
                          {getAdminInitials(
                            selectedCustomer.displayName || selectedCustomer.email || selectedCustomer.userId,
                          )}
                        </span>
                        <div>
                          <p className="admin-section__eyebrow">Customer Detail</p>
                          <h3>{selectedCustomer.displayName}</h3>
                          <p className="admin-muted-text">{selectedCustomer.email ?? 'Sin email visible'}</p>
                        </div>
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

                    <div className="admin-subsection">
                      <div className="admin-card__title-row admin-subsection__head">
                        <h3>Perfil del cliente</h3>
                        <span className="admin-pill">Cuenta</span>
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
                    </div>

                    <div className="admin-subsection">
                      <div className="admin-card__title-row">
                        <h3>Pedidos recientes</h3>
                        <span className="admin-pill">{selectedCustomerOrders.length}</span>
                      </div>

                      {selectedCustomerOrders.length ? (
                        <div className="admin-order-items">
                          {selectedCustomerOrders.slice(0, 4).map((order) => (
                            <article
                              className="admin-order-item admin-order-item--button"
                              key={order.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => onOpenOrder(order.id)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  onOpenOrder(order.id);
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
            <AdminEmptyState
              icon="fa-solid fa-magnifying-glass"
              title="Sin coincidencias"
              description="Prueba con otro nombre, email, proveedor o user id."
            />
          )}
        </>
      ) : (
        <AdminEmptyState
          icon="fa-solid fa-users-slash"
          title="Aún no hay clientes"
          description="Cuando alguien inicie sesión en la tienda con Supabase aparecerá aquí."
        />
      )}
    </section>
  );
}

interface AdminOrdersSectionProps {
  isRemoteAdminAuth: boolean;
  isCommerceReady: boolean;
  commerceError: string;
  orders: AdminOrderRecord[];
  orderStats: AdminStatItem[];
  orderQuery: string;
  onOrderQueryChange: (value: string) => void;
  orderStatusFilter: string;
  onOrderStatusFilterChange: (value: string) => void;
  orderTimeFilter: string;
  onOrderTimeFilterChange: (value: string) => void;
  orderSort: string;
  onOrderSortChange: (value: string) => void;
  sortedOrders: AdminOrderRecord[];
  selectedOrder: AdminOrderRecord | null;
  selectedOrderCustomer: AdminCustomerRecord | null;
  expandedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  onToggleExpandedOrder: (orderId: string) => void;
  onOpenCustomer: (userId: string) => void;
  formatAdminCurrency: (value: number) => string;
  formatAdminDate: (value: string) => string;
  getCheckoutProviderLabel: (provider: string) => string;
}

export function AdminOrdersSection({
  isRemoteAdminAuth,
  isCommerceReady,
  commerceError,
  orders,
  orderStats,
  orderQuery,
  onOrderQueryChange,
  orderStatusFilter,
  onOrderStatusFilterChange,
  orderTimeFilter,
  onOrderTimeFilterChange,
  orderSort,
  onOrderSortChange,
  sortedOrders,
  selectedOrder,
  selectedOrderCustomer,
  expandedOrderId,
  onSelectOrder,
  onToggleExpandedOrder,
  onOpenCustomer,
  formatAdminCurrency,
  formatAdminDate,
  getCheckoutProviderLabel,
}: AdminOrdersSectionProps) {
  return (
    <section className="admin-section" id="orders">
      <AdminSectionHeading eyebrow="Orders" title="Pedidos guardados" />

      {isRemoteAdminAuth && isCommerceReady && !commerceError && orders.length ? (
        <AdminStatsGrid
          items={orderStats}
          ariaLabel="Resumen rápido de pedidos"
          className="admin-grid admin-grid--stats"
        />
      ) : null}

      {!isRemoteAdminAuth ? (
        <AdminEmptyState
          icon="fa-solid fa-database"
          title="Disponible en modo Supabase"
          description="Los pedidos solo se guardan y se muestran aquí cuando la tienda está trabajando contra Supabase."
        />
      ) : !isCommerceReady ? (
        <div className="admin-card admin-empty-panel">
          <div className="checkout-stage__loader" />
          <p>Cargando pedidos reales desde Supabase...</p>
        </div>
      ) : commerceError ? (
        <AdminEmptyState
          icon="fa-solid fa-triangle-exclamation"
          title="No se pudieron cargar los pedidos"
          description={commerceError}
        />
      ) : orders.length ? (
        <>
          <div className="admin-card admin-toolbar">
            <label className="admin-toolbar__search">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                placeholder="Buscar por order id, cliente, email o producto"
                value={orderQuery}
                onChange={(event) => onOrderQueryChange(event.currentTarget.value)}
              />
            </label>
            <div className="admin-toolbar__filters">
              <select value={orderStatusFilter} onChange={(event) => onOrderStatusFilterChange(event.currentTarget.value)}>
                <option value="all">Todos los estados</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select value={orderTimeFilter} onChange={(event) => onOrderTimeFilterChange(event.currentTarget.value)}>
                <option value="all">Cualquier fecha</option>
                <option value="today">Últimas 24h</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
              </select>
              <select value={orderSort} onChange={(event) => onOrderSortChange(event.currentTarget.value)}>
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
                        onSelectOrder(order.id);
                        onToggleExpandedOrder(order.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectOrder(order.id);
                          onToggleExpandedOrder(order.id);
                        }
                      }}
                    >
                      <div className="admin-card__title-row admin-list-card__head">
                        <div className="admin-list-card__identity">
                          <span className="admin-list-card__avatar admin-list-card__avatar--order">
                            {getCheckoutProviderLabel(order.provider).slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <h3>Order #{order.id}</h3>
                            <p className="admin-muted-text">
                              {order.customerName}
                              {order.customerEmail ? ` · ${order.customerEmail}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="admin-chip-row">
                          <span className="admin-pill">{order.status}</span>
                          <span className="admin-pill">{getCheckoutProviderLabel(order.provider)}</span>
                        </div>
                      </div>

                      <div className="admin-order-card__summary">
                        <span>{formatAdminDate(order.createdAt)}</span>
                        <span>{order.currency}</span>
                        {order.providerStatus ? <span>{order.providerStatus}</span> : null}
                        <strong>{order.totalEur.toFixed(2)} EUR</strong>
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
                    <div className="admin-card__title-row admin-list-card__head">
                      <div className="admin-list-card__identity">
                        <span className="admin-list-card__avatar admin-list-card__avatar--large admin-list-card__avatar--order">
                          {getCheckoutProviderLabel(selectedOrder.provider).slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="admin-section__eyebrow">Order Detail</p>
                          <h3>Order #{selectedOrder.id}</h3>
                          <p className="admin-muted-text">
                            {selectedOrder.customerName}
                            {selectedOrder.customerEmail ? ` · ${selectedOrder.customerEmail}` : ''}
                          </p>
                        </div>
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

                    <div className="admin-subsection">
                      <div className="admin-card__title-row admin-subsection__head">
                        <h3>Checkout</h3>
                        <span className="admin-pill">Order core</span>
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
                      </div>
                    </div>

                    <div className="admin-subsection">
                      <div className="admin-card__title-row admin-subsection__head">
                        <h3>Proveedor y cobro</h3>
                        <span className="admin-pill">Provider</span>
                      </div>
                      <div className="admin-detail-list">
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
                    </div>

                    {selectedOrderCustomer ? (
                      <div className="admin-subsection">
                        <div className="admin-card__title-row">
                          <h3>Cliente vinculado</h3>
                          <button
                            className="admin-button admin-button--small"
                            type="button"
                            onClick={() => onOpenCustomer(selectedOrderCustomer.userId)}
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
                        <span className="admin-pill">{selectedOrder.items.length}</span>
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
            <AdminEmptyState
              icon="fa-solid fa-magnifying-glass"
              title="Sin coincidencias"
              description="Prueba con otro order id, cliente, email, estado o producto."
            />
          )}
        </>
      ) : (
        <AdminEmptyState
          icon="fa-solid fa-box-open"
          title="Aún no hay pedidos"
          description="Cuando un cliente complete una compra en la tienda aparecerá aquí en tiempo real."
        />
      )}
    </section>
  );
}
