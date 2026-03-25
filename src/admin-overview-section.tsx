import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import type { ApexOptions } from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import type { AdminCustomerRecord, AdminOrderRecord } from './supabase-admin-commerce';
import { AdminSectionHeading, type AdminStatItem, AdminStatsGrid } from './admin-ui';

interface OverviewSeriesSet {
  labels: string[];
  revenue: number[];
  orders: number[];
  customers: number[];
}

interface OverviewSignal {
  label: string;
  value: string;
  detail: string;
  tone?: 'success' | 'warning' | 'neutral';
}

interface OverviewProductPulse {
  title: string;
  quantity: number;
  revenueLabel: string;
}

interface AdminOverviewSectionProps {
  stats: AdminStatItem[];
  series: OverviewSeriesSet;
  signals: OverviewSignal[];
  latestCompletedOrders: AdminOrderRecord[];
  topProducts: OverviewProductPulse[];
  customers: AdminCustomerRecord[];
  totalRevenueLabel: string;
  formatAdminCurrency: (value: number) => string;
  formatAdminDate: (value: string) => string;
  getCheckoutProviderLabel: (provider: string) => string;
}

function buildChartOptions(
  labels: string[],
  color: string,
  label: string,
): ApexOptions {
  return {
    chart: {
      type: 'area',
      toolbar: { show: false },
      background: 'transparent',
      animations: { speed: 450 },
      sparkline: { enabled: false },
      foreColor: '#9d9d9d',
      fontFamily: 'Manrope, sans-serif',
    },
    colors: [color],
    dataLabels: { enabled: false },
    grid: {
      borderColor: 'rgba(130, 144, 184, 0.12)',
      strokeDashArray: 4,
      padding: { left: 10, right: 10, top: 0, bottom: 0 },
    },
    legend: { show: false },
    stroke: {
      curve: 'smooth',
      width: 3,
      lineCap: 'round',
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.28,
        opacityTo: 0.02,
        stops: [0, 100],
      },
    },
    xaxis: {
      categories: labels,
      labels: {
        style: {
          colors: '#8a8a8a',
          fontSize: '10px',
          fontWeight: 500,
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      labels: {
        style: {
          colors: '#8a8a8a',
          fontSize: '10px',
          fontWeight: 500,
        },
        formatter: (value) => `${Math.round(value)}`,
      },
    },
    tooltip: {
      theme: 'dark',
      x: { show: true },
      marker: { show: false },
      y: {
        formatter: (value) => `${label}: ${value.toFixed(0)}`,
      },
    },
  };
}

function buildRevenueOptions(labels: string[]): ApexOptions {
  return {
    chart: {
      type: 'area',
      toolbar: { show: false },
      background: 'transparent',
      animations: { speed: 450 },
      foreColor: '#9d9d9d',
      fontFamily: 'Manrope, sans-serif',
    },
    colors: ['#ff4d63', '#d8d8d8'],
    dataLabels: { enabled: false },
    grid: {
      borderColor: 'rgba(130, 144, 184, 0.12)',
      strokeDashArray: 4,
      padding: { left: 10, right: 10, top: 0, bottom: 0 },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: '#9d9d9d' },
      itemMargin: { horizontal: 12 },
    },
    stroke: {
      curve: 'smooth',
      width: [3, 2],
      lineCap: 'round',
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.22,
        opacityTo: 0.04,
        stops: [0, 100],
      },
    },
    xaxis: {
      categories: labels,
      labels: {
        style: {
          colors: '#8a8a8a',
          fontSize: '10px',
          fontWeight: 500,
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        min: 0,
        labels: {
          style: {
            colors: '#8a8a8a',
            fontSize: '10px',
            fontWeight: 500,
          },
          formatter: (value) => `${Math.round(value)} EUR`,
        },
      },
      {
        opposite: true,
        min: 0,
        labels: {
          style: {
            colors: '#8a8a8a',
            fontSize: '10px',
            fontWeight: 500,
          },
          formatter: (value) => `${Math.round(value)}`,
        },
      },
    ],
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
    },
  };
}

function renderEmptyState(message: ReactNode) {
  return (
    <div className="admin-overview__chart-empty">
      <span>No data yet</span>
      <p>{message}</p>
    </div>
  );
}

export function AdminOverviewSection({
  stats,
  series,
  signals,
  latestCompletedOrders,
  topProducts,
  customers,
  totalRevenueLabel,
  formatAdminCurrency,
  formatAdminDate,
  getCheckoutProviderLabel,
}: AdminOverviewSectionProps) {
  const hasRevenueData = series.revenue.some((value) => value > 0) || series.orders.some((value) => value > 0);
  const hasCustomerData = series.customers.some((value) => value > 0);

  return (
    <section className="admin-section admin-overview" id="overview">
      <div className="admin-overview__intro">
        <AdminSectionHeading
          eyebrow="Overview"
          title="Store pulse"
          description="Panel compacto con ingresos, pedidos, clientes y estado operativo en tiempo real."
        />
        <div className="admin-chip-row admin-chip-row--overview">
          <span className="admin-pill">Revenue {totalRevenueLabel}</span>
          <span className="admin-pill">{latestCompletedOrders.length} completed</span>
          <span className="admin-pill">{customers.length} customers</span>
        </div>
      </div>

      <AdminStatsGrid
        items={stats}
        ariaLabel="Resumen principal del dashboard"
        className="admin-grid admin-grid--stats admin-grid--stats-compact"
      />

      <div className="admin-overview__grid">
        <Tabs.Root className="admin-card admin-chart-card" defaultValue="revenue">
          <div className="admin-card__title-row">
            <div>
              <p className="admin-section__eyebrow">Analytics</p>
              <h3>Revenue, orders and customers</h3>
            </div>
            <Tabs.List className="admin-tabs__list" aria-label="Overview chart tabs">
              <Tabs.Trigger className="admin-tabs__trigger" value="revenue">
                Revenue & Orders
              </Tabs.Trigger>
              <Tabs.Trigger className="admin-tabs__trigger" value="customers">
                Customers
              </Tabs.Trigger>
            </Tabs.List>
          </div>

          <Tabs.Content className="admin-tabs__content" value="revenue">
            {hasRevenueData ? (
              <ReactApexChart
                type="area"
                height={224}
                options={buildRevenueOptions(series.labels)}
                series={[
                  { name: 'Revenue', data: series.revenue },
                  { name: 'Orders', data: series.orders },
                ]}
              />
            ) : (
              renderEmptyState('Cuando entren pedidos reales, aquí verás su evolución por día.')
            )}
          </Tabs.Content>

          <Tabs.Content className="admin-tabs__content" value="customers">
            {hasCustomerData ? (
              <ReactApexChart
                type="area"
                height={224}
                options={buildChartOptions(series.labels, '#ff6f81', 'Customers')}
                series={[{ name: 'Customers', data: series.customers }]}
              />
            ) : (
              renderEmptyState('Todavía no hay altas de cliente en esta ventana temporal.')
            )}
          </Tabs.Content>
        </Tabs.Root>

        <div className="admin-overview__stack">
          <article className="admin-card admin-feed-card">
            <div className="admin-card__title-row">
              <div>
                <p className="admin-section__eyebrow">Operational</p>
                <h3>Live status</h3>
              </div>
            </div>
            <div className="admin-feed-list">
              {signals.map((signal) => (
                <div className={`admin-feed-item admin-feed-item--${signal.tone ?? 'neutral'}`} key={signal.label}>
                  <div>
                    <strong>{signal.label}</strong>
                    <p>{signal.detail}</p>
                  </div>
                  <span>{signal.value}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="admin-card admin-feed-card">
            <div className="admin-card__title-row">
              <div>
                <p className="admin-section__eyebrow">Shortcuts</p>
                <h3>Control surface</h3>
              </div>
            </div>
            <div className="admin-shortcuts">
              <Link className="admin-shortcut-card" to="/admin/dashboard/products">
                <span>Products</span>
                <strong>Edit catalogue and highlights</strong>
              </Link>
              <Link className="admin-shortcut-card" to="/admin/dashboard/payments">
                <span>Payments</span>
                <strong>Review gateways and checkout rules</strong>
              </Link>
              <Link className="admin-shortcut-card" to="/admin/dashboard/auth">
                <span>Auth</span>
                <strong>Control login providers and access copy</strong>
              </Link>
              <Link className="admin-shortcut-card" to="/admin/dashboard/navigation">
                <span>Navigation</span>
                <strong>Adjust navbar, footer and legal links</strong>
              </Link>
            </div>
          </article>
        </div>
      </div>

      <div className="admin-overview__bottom">
        <article className="admin-card admin-table-card">
          <div className="admin-card__title-row">
            <div>
              <p className="admin-section__eyebrow">Orders</p>
              <h3>Latest completed orders</h3>
            </div>
            <span className="admin-pill">{latestCompletedOrders.length} visible</span>
          </div>

          {latestCompletedOrders.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Provider</th>
                    <th>Total</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {latestCompletedOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>#{order.id}</strong>
                      </td>
                      <td>
                        <div className="admin-table__identity">
                          <strong>{order.customerName}</strong>
                          <span>{order.customerEmail ?? order.userId}</span>
                        </div>
                      </td>
                      <td>{getCheckoutProviderLabel(order.provider)}</td>
                      <td>{formatAdminCurrency(order.totalEur)}</td>
                      <td>{formatAdminDate(order.paidAt ?? order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-overview__chart-empty admin-overview__chart-empty--table">
              <span>No completed orders</span>
              <p>Los pedidos completados aparecerán aquí cuando lleguen los primeros cobros reales.</p>
            </div>
          )}
        </article>

        <article className="admin-card admin-feed-card">
          <div className="admin-card__title-row">
            <div>
              <p className="admin-section__eyebrow">Products</p>
              <h3>Best movers</h3>
            </div>
          </div>
          {topProducts.length ? (
            <div className="admin-feed-list admin-feed-list--products">
              {topProducts.map((product) => (
                <div className="admin-feed-item" key={product.title}>
                  <div>
                    <strong>{product.title}</strong>
                    <p>{product.quantity} units sold</p>
                  </div>
                  <span>{product.revenueLabel}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-overview__chart-empty admin-overview__chart-empty--table">
              <span>Waiting for sales</span>
              <p>El ranking de productos aparecerá cuando se registren pedidos con líneas reales.</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
