import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useLocation, type Location } from 'react-router-dom';
import { AdminErrorBoundary } from './admin-error-boundary';
import { SiteShell } from './components';
import {
  AccountPage,
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
  const state = location.state as { backgroundLocation?: Location } | undefined;

  useEffect(() => {
    if (location.pathname === '/login' && state?.backgroundLocation) {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, state?.backgroundLocation]);

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

function AppRoutes() {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location } | undefined;
  const backgroundLocation = state?.backgroundLocation;
  const routedLocation =
    backgroundLocation ??
    (location.pathname === '/login'
      ? { pathname: '/', search: '', hash: '' }
      : location);
  const showLoginModal = location.pathname === '/login';

  return (
    <>
      <ScrollToTop />
      <Routes location={routedLocation}>
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
          <Route path="/account" element={<AccountPage />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/package/:productSlug" element={<ProductPage />} />
          <Route path="/checkout/basket" element={<CartPage />} />
          <Route path="/checkout/return" element={<CheckoutReturnPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/terms-conditions-and-refund-policy" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>

      {showLoginModal ? (
        <Routes>
          <Route path="/login" element={<LoginPage modal />} />
        </Routes>
      ) : null}
    </>
  );
}

function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
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
