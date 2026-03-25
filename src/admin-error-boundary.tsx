import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './admin-redesign.css';
import { SafeImage } from './safe-image';

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
        <div className="admin-auth__layout admin-auth__layout--status">
          <div className="admin-auth__showcase">
            <div className="admin-auth__showcase-copy">
              <p className="admin-auth__eyebrow">Admin Recovery</p>
              <h1>Panel error</h1>
              <p className="admin-auth__copy">
                El dashboard ha fallado en esta pantalla, pero la tienda pública sigue intacta.
              </p>
            </div>
            <div className="admin-auth__signature">
              <SafeImage src={creatorLogoSrc} alt="Luckav Development" />
            </div>
          </div>

          <div className="admin-auth__panel admin-auth__panel--status">
            <p className="admin-auth__error">
              {this.state.errorMessage || 'Unknown admin error.'}
            </p>
            <div className="admin-auth__actions">
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
