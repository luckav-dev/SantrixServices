import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AdminErrorBoundary } from './admin-error-boundary';
import { SiteShell } from './components';
import {
  AuthCallbackPage,
  CartPage,
  CategoryPage,
  CheckoutReturnPage,
  HomePage,
  LoginPage,
  NotFoundPage,
  ProductPage,
  TermsPage,
} from './pages';
import { StoreProvider } from './store';

const AdminLoginPage = lazy(() => import('./admin-pages').then((module) => ({ default: module.AdminLoginPage })));
const AdminDashboardPage = lazy(() => import('./admin-pages').then((module) => ({ default: module.AdminDashboardPage })));

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return null;
}

function AdminRouteFrame({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <AdminErrorBoundary resetKey={location.pathname}>
      {children}
    </AdminErrorBoundary>
  );
}

function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route
          path="/admin/login"
          element={(
            <AdminRouteFrame>
              <Suspense fallback={<div />}>
                <AdminLoginPage />
              </Suspense>
            </AdminRouteFrame>
          )}
        />
        <Route
          path="/admin/dashboard/:section?"
          element={(
            <AdminRouteFrame>
              <Suspense fallback={<div />}>
                <AdminDashboardPage />
              </Suspense>
            </AdminRouteFrame>
          )}
        />
        <Route element={<SiteShell />}>
          <Route index element={<HomePage />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/package/:productSlug" element={<ProductPage />} />
          <Route path="/checkout/basket" element={<CartPage />} />
          <Route path="/checkout/return" element={<CheckoutReturnPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/terms-conditions-and-refund-policy" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppRouter />
    </StoreProvider>
  );
}
