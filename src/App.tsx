import React, { useState, useEffect } from 'react';
import { Plato, CartItem, Venta, DetalleVenta, TipoServicio } from './types';
import { sqliteService } from './db/sqliteService';
import { imageService } from './services/imageService';
import { Navbar, NavTab } from './components/Navbar';
import { POSView } from './components/POSView';
import { ComandasMonitorView } from './components/ComandasMonitorView';
import { PlatosView } from './components/PlatosView';
import { HistorialVentasView } from './components/HistorialVentasView';
import { DashboardView } from './components/DashboardView';
import { DatabaseModal } from './components/DatabaseModal';
import { ImageFolderModal } from './components/ImageFolderModal';
import { GitHubModal } from './components/GitHubModal';
import { TicketModal } from './components/TicketModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('pos');
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState<boolean>(false);
  const [activeComandasCount, setActiveComandasCount] = useState<number>(0);

  // Preselected table location when jumping from Comandas/Mesas map to POS
  const [posPreselectedTipo, setPosPreselectedTipo] = useState<TipoServicio | undefined>(undefined);
  const [posPreselectedUbicacion, setPosPreselectedUbicacion] = useState<string | undefined>(undefined);

  // Modals state
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);

  // Completed sale ticket modal
  const [latestSaleTicket, setLatestSaleTicket] = useState<Venta | null>(null);
  const [latestSaleDetalles, setLatestSaleDetalles] = useState<DetalleVenta[]>([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const updateComandasCount = () => {
    const comandas = sqliteService.getComandas();
    const active = comandas.filter((c) => c.Estado === 'Cocina' || c.Estado === 'Entregado').length;
    setActiveComandasCount(active);
  };

  // Load initial data & subscribe to DB changes
  useEffect(() => {
    sqliteService.ensureReady().then(() => {
      setPlatos(sqliteService.getPlatos());
      updateComandasCount();
      setIsDbLoaded(true);
    });

    const unsubscribeDb = sqliteService.subscribe(() => {
      setPlatos(sqliteService.getPlatos());
      updateComandasCount();
    });

    const unsubscribeImages = imageService.subscribe(() => {
      setPlatos([...sqliteService.getPlatos()]);
    });

    return () => {
      unsubscribeDb();
      unsubscribeImages();
    };
  }, []);

  const handleSaleComplete = (venta: Venta, detalles: DetalleVenta[]) => {
    setLatestSaleTicket(venta);
    setLatestSaleDetalles(detalles);
    setIsTicketModalOpen(true);
    updateComandasCount();
  };

  const handleOpenPosWithLocation = (tipo: TipoServicio, ubicacion: string) => {
    setPosPreselectedTipo(tipo);
    setPosPreselectedUbicacion(ubicacion);
    setCurrentTab('pos');
  };

  const cartTotalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      
      {/* Top Main Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenDbModal={() => setIsDbModalOpen(true)}
        onOpenGithubModal={() => setIsGithubModalOpen(true)}
        onOpenImageModal={() => setIsImageModalOpen(true)}
        cartCount={cartTotalItems}
        totalPlatosCount={platos.length}
        activeComandasCount={activeComandasCount}
      />

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {currentTab === 'pos' && (
          <POSView
            platos={platos}
            cart={cart}
            setCart={setCart}
            onSaleComplete={handleSaleComplete}
            onOpenComandas={() => setCurrentTab('comandas')}
            preselectedTipoServicio={posPreselectedTipo}
            preselectedUbicacion={posPreselectedUbicacion}
          />
        )}

        {currentTab === 'comandas' && (
          <ComandasMonitorView
            onSaleComplete={handleSaleComplete}
            onOpenPosWithLocation={handleOpenPosWithLocation}
            onViewTicket={(venta, detalles) => {
              setLatestSaleTicket(venta);
              setLatestSaleDetalles(detalles);
              setIsTicketModalOpen(true);
            }}
          />
        )}

        {currentTab === 'platos' && (
          <PlatosView
            platos={platos}
            onRefresh={() => setPlatos(sqliteService.getPlatos())}
            onOpenImageModal={() => setIsImageModalOpen(true)}
          />
        )}

        {currentTab === 'historial' && (
          <HistorialVentasView />
        )}

        {currentTab === 'dashboard' && (
          <DashboardView />
        )}
      </main>

      {/* Global Modals */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onDbUpdated={() => {
          setPlatos(sqliteService.getPlatos());
          updateComandasCount();
        }}
      />

      <ImageFolderModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onImagesUpdated={() => setPlatos([...sqliteService.getPlatos()])}
      />

      <GitHubModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
      />

      <TicketModal
        venta={latestSaleTicket}
        detalles={latestSaleDetalles}
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
      />

    </div>
  );
}
