import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import CustomerApp from './CustomerApp.tsx';
import { safeStorage } from './utils/safeStorage.ts';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Terreno Broaster:', error, errorInfo);
  }

  private handleReset = () => {
    safeStorage.removeItem('tb_splash_seen');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-2xl">
              !
            </div>
            <h2 className="text-xl font-black text-white">Terreno Broaster</h2>
            <p className="text-xs text-stone-400">
              Ocurrió un inconveniente al cargar la pantalla. Puedes reiniciar la aplicación con el botón a continuación.
            </p>
            {this.state.error && (
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-left font-mono text-xs text-red-400 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Reiniciar y Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Clean routing boundary:
 * If the user opens the QR link (/cliente, /menu, /catalogo, ?cliente=true, ?menu=true, or #c=...),
 * we mount the dedicated Customer Portal (CustomerApp).
 * It NEVER loads the cashier POS, never initializes SQLite client-side, and never seeds mock products.
 * 
 * If the user opens the root POS URL (/), we mount the cashier POS (App).
 */
function isCustomerPortal(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  return (
    path === '/cliente' ||
    path.startsWith('/cliente/') ||
    path === '/menu' ||
    path.startsWith('/menu/') ||
    path === '/catalogo' ||
    path.startsWith('/catalogo/') ||
    search.includes('cliente=') ||
    search.includes('menu=') ||
    hash.startsWith('#c=')
  );
}

function mountApp() {
  try {
    const container = document.getElementById('root');
    if (!container) {
      console.error('Target container #root not found in document');
      return;
    }
    const root = createRoot(container);
    root.render(
      <ErrorBoundary>
        {isCustomerPortal() ? <CustomerApp /> : <App />}
      </ErrorBoundary>
    );
    (window as any).__tb_app_mounted = true;
  } catch (err: any) {
    console.error('Fatal initialization error in main.tsx:', err);
    if (typeof (window as any).showStartupDiagnostic === 'function') {
      (window as any).showStartupDiagnostic('Error al inicializar la aplicación: ' + (err?.message || err), err);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}

