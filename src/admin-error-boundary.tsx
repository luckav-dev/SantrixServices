import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './admin.css';

const creatorLogoSrc = '/media/logocreadortienda.png';

interface AdminErrorBoundaryProps {
  children: ReactNode;
  resetKey: string;
}

interface AdminErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AdminErrorBoundaryInner extends Component<
  AdminErrorBoundaryProps,
  AdminErrorBoundaryState
> {
  state: AdminErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): AdminErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'The admin dashboard crashed unexpectedly.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Admin route crashed.', error, errorInfo);
  }

  componentDidUpdate(prevProps: AdminErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({
        hasError: false,
        errorMessage: '',
      });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section className="admin-auth">
        <div className="admin-auth__card admin-auth__card--status">
          <div className="admin-creator-mark admin-creator-mark--login">
            <img src={creatorLogoSrc} alt="Luckav Development" />
          </div>
          <p className="admin-auth__eyebrow">Admin Recovery</p>
          <h1>Panel error</h1>
          <p className="admin-auth__copy">
            El dashboard ha fallado en esta pantalla, pero la tienda publica sigue intacta.
          </p>
          <p className="admin-auth__error">
            {this.state.errorMessage || 'Unknown admin error.'}
          </p>
          <div className="admin-auth__form">
            <button
              className="admin-button admin-button--primary"
              type="button"
              onClick={() => window.location.reload()}
            >
              Recargar admin
            </button>
            <Link className="admin-button admin-button--ghost" to="/admin/dashboard/overview">
              Volver al overview
            </Link>
            <Link className="admin-button admin-button--ghost" to="/">
              Ir a la tienda
            </Link>
          </div>
        </div>
      </section>
    );
  }
}

export function AdminErrorBoundary({
  children,
  resetKey,
}: AdminErrorBoundaryProps) {
  return (
    <AdminErrorBoundaryInner resetKey={resetKey}>
      {children}
    </AdminErrorBoundaryInner>
  );
}
