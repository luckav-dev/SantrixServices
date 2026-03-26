import { createContext, useContext } from 'react';
import type { StoreContextValue } from './store';

// Separamos el contexto del proveedor para evitar problemas de Fast Refresh (HMR)
// y asegurar que la instancia del contexto sea única y estable.

export const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}
