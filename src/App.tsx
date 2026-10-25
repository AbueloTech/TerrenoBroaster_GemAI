import React, { useState, useEffect, useRef } from 'react';
import { Plato, CartItem, Venta, DetalleVenta, TipoServicio, Usuario } from './types';
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
import { SplashScreen } from './components/SplashScreen';
import { LoginModal } from './components/LoginModal';
import { WhatsAppOrdersModal } from './components/WhatsAppOrdersModal';
import { WhatsAppQrModal } from './components/WhatsAppQrModal';
import { AlertSettingsModal } from './components/AlertSettingsModal';
import { CustomerMenuView } from './components/CustomerMenuView';
import { menuSyncService } from './services/menuSyncService';
import { playWhatsAppIncomingAlert, playNotificationSound } from './utils/soundAlert';
import { formatCurrency } from './utils/currency';
import { MessageSquare, Bell, ArrowRight, X, Truck, Package, Volume2, Settings } from 'lucide-react';

interface IncomingWhatsAppAlert {
  id: number;
  cliente: string;
  total: number;
  tipo: 'Delivery' | 'Para llevar';
  itemsCount: number;
  itemsSummary: string;
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('pos');
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState<boolean>(false);
  const [activeComandasCount, setActiveComandasCount] = useState<number>(0);
  const [pendingWhatsAppCount, setPendingWhatsAppCount] = useState<number>(0);

  // Check if client is in mobile Customer Menu mode (via URL ?menu=true, ?cliente=true, or #menu)
  const [isCustomerMenuMode, setIsCustomerMenuMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    return search.includes('menu=true') || search.includes('cliente=true') || hash === '#menu';
  });

  const [restaurantPhone, setRestaurantPhone] = useState<string>(() => sqliteService.getWhatsAppPhone());

  // Floating notification toast for newly arrived WhatsApp orders
  const [incomingAlert, setIncomingAlert] = useState<IncomingWhatsAppAlert | null>(null);

  // Track known pending WhatsApp order IDs so we only alert on brand new orders
  const previousPendingIdsRef = useRef<Set<number>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  // Splash & User Authentication State
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    try {
      const saved = localStorage.getItem('tb_logged_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Preselected table location when jumping from Comandas/Mesas map to POS
  const [posPreselectedTipo, setPosPreselectedTipo] = useState<TipoServicio | undefined>(undefined);
  const [posPreselectedUbicacion, setPosPreselectedUbicacion] = useState<string | undefined>(undefined);

  // Modals state
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isAlertSettingsModalOpen, setIsAlertSettingsModalOpen] = useState(false);
  const [isDirectQrModalOpen, setIsDirectQrModalOpen] = useState(false);

  // Completed sale ticket modal
  const [latestSaleTicket, setLatestSaleTicket] = useState<Venta | null>(null);
  const [latestSaleDetalles, setLatestSaleDetalles] = useState<DetalleVenta[]>([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const updateCounts = () => {
    const comandas = sqliteService.getComandas();
    const active = comandas.filter((c) => c.Estado === 'Cocina' || c.Estado === 'Entregado').length;
    setActiveComandasCount(active);

    const waOrders = sqliteService.getPedidosWhatsApp('Pendiente');
    setPendingWhatsAppCount(waOrders.length);
  };

  // Load initial data & subscribe to DB changes
  useEffect(() => {
    sqliteService.ensureReady().then(() => {
      const initialPlatos = sqliteService.getPlatos();
      const initialPhone = sqliteService.getWhatsAppPhone();
      setPlatos(initialPlatos);
      setRestaurantPhone(initialPhone);

      // Force push active database dishes to backend server so customer QR code shows live dishes
      menuSyncService.pushMenuToServer(initialPlatos, initialPhone, true);

      const comandas = sqliteService.getComandas();
      const active = comandas.filter((c) => c.Estado === 'Cocina' || c.Estado === 'Entregado').length;
      setActiveComandasCount(active);

      // Hydrate existing pending orders without playing sound on initial render
      const initialPending = sqliteService.getPedidosWhatsApp('Pendiente');
      setPendingWhatsAppCount(initialPending.length);
      previousPendingIdsRef.current = new Set(initialPending.map((p) => p.Id));
      isInitialLoadRef.current = false;

      setIsDbLoaded(true);
    });

    const unsubscribeDb = sqliteService.subscribe(() => {
      const livePlatos = sqliteService.getPlatos();
      const livePhone = sqliteService.getWhatsAppPhone();
      setPlatos(livePlatos);
      setRestaurantPhone(livePhone);

      // Keep server menu in sync whenever SQLite database is updated
      menuSyncService.pushMenuToServer(livePlatos, livePhone);

      const comandas = sqliteService.getComandas();
      const active = comandas.filter((c) => c.Estado === 'Cocina' || c.Estado === 'Entregado').length;
      setActiveComandasCount(active);

      // Check for new incoming WhatsApp orders in 'Pendiente' status
      const currentPending = sqliteService.getPedidosWhatsApp('Pendiente');
      setPendingWhatsAppCount(currentPending.length);

      if (!isInitialLoadRef.current) {
        // Find orders whose ID was not in previousPendingIdsRef
        const newOrders = currentPending.filter((order) => !previousPendingIdsRef.current.has(order.Id));

        if (newOrders.length > 0) {
          // Play energetic audio alert chime through PC speakers
          playWhatsAppIncomingAlert();

          // Show floating visual alert notification on screen
          const latest = newOrders[0];
          setIncomingAlert({
            id: latest.Id,
            cliente: latest.NombreCliente,
            total: latest.Total,
            tipo: latest.TipoEntrega,
            itemsCount: latest.Items.length,
            itemsSummary: latest.Items.map((i) => `${i.cantidad}x ${i.platoNombre}`).join(', '),
          });
        }
      }

      // Update known IDs
      previousPendingIdsRef.current = new Set(currentPending.map((p) => p.Id));
    });

    const unsubscribeImages = imageService.subscribe(() => {
      setPlatos([...sqliteService.getPlatos()]);
    });

    return () => {
      unsubscribeDb();
      unsubscribeImages();
    };
  }, []);

  // Push active dishes and phone to server API so mobile clients can view them
  useEffect(() => {
    if (platos.length > 0) {
      menuSyncService.pushMenuToServer(platos, restaurantPhone);
    }
  }, [platos, restaurantPhone]);

  // Real-time listener: Poll server for new customer orders placed from the mobile digital menu
  useEffect(() => {
    let isActive = true;

    const pollIncomingOrders = async () => {
      try {
        const queued = await menuSyncService.fetchPendingOrders();
        if (!isActive || !queued || queued.length === 0) return;

        const ackIds: string[] = [];

        for (const entry of queued) {
          const raw = entry.order;
          if (!raw) continue;

          // Convert items to PedidoWhatsAppItem format
          const formattedItems = (raw.items || []).map((it: any) => ({
            platoId: it.plato?.ID,
            platoNombre: it.plato?.Plato || 'Plato',
            cantidad: it.cantidad || 1,
            precioUnitario: it.plato?.Precio || 0,
            notas: it.nota,
          }));

          const now = new Date();
          const fechaStr = now.toISOString().split('T')[0];
          const horaStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

          sqliteService.addPedidoWhatsApp({
            Fecha: `${fechaStr} ${horaStr}`,
            TelefonoCliente: raw.telefonoCliente || '',
            NombreCliente: raw.nombreCliente || 'Cliente Web',
            TipoEntrega: raw.tipoEntrega || 'Delivery',
            DireccionEntrega: raw.direccionEntrega || '',
            MensajeOriginal: `Pedido en vivo desde Menú Digital:\n${(raw.items || []).map((i: any) => `• ${i.cantidad}x ${i.plato?.Plato}`).join('\n')}`,
            Items: formattedItems,
            Total: raw.total || 0,
            FormaPago: raw.formaPago || 'Efectivo',
            Estado: 'Pendiente',
            FechaCreacion: now.toISOString(),
            Notas: raw.notas || '',
          });

          ackIds.push(entry.id);
        }

        if (ackIds.length > 0) {
          await menuSyncService.ackOrders(ackIds);
        }
      } catch (err) {
        console.warn('Error polling incoming orders:', err);
      }
    };

    const interval = setInterval(pollIncomingOrders, 3500);
    pollIncomingOrders();

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  // Auto-dismiss floating alert toast after 14 seconds
  useEffect(() => {
    if (!incomingAlert) return;
    const timer = setTimeout(() => {
      setIncomingAlert(null);
    }, 14000);
    return () => clearTimeout(timer);
  }, [incomingAlert]);

  const handleSaleComplete = (venta: Venta, detalles: DetalleVenta[]) => {
    setLatestSaleTicket(venta);
    setLatestSaleDetalles(detalles);
    setIsTicketModalOpen(true);
    updateCounts();
  };

  const handleOpenPosWithLocation = (tipo: TipoServicio, ubicacion: string) => {
    setPosPreselectedTipo(tipo);
    setPosPreselectedUbicacion(ubicacion);
    setCurrentTab('pos');
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
    if (!currentUser) {
      setIsLoginModalOpen(true);
    }
  };

  const handleLoginSuccess = (user: Usuario) => {
    setCurrentUser(user);
    localStorage.setItem('tb_logged_user', JSON.stringify(user));
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tb_logged_user');
    setIsLoginModalOpen(true);
  };

  const cartTotalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);

  // If in customer digital menu mode (either via QR/URL or cashier preview)
  if (isCustomerMenuMode) {
    return (
      <CustomerMenuView
        platos={platos}
        restaurantPhone={restaurantPhone}
        onExitMenu={() => {
          if (typeof window !== 'undefined' && window.history?.pushState) {
            const url = new URL(window.location.href);
            url.searchParams.delete('menu');
            url.searchParams.delete('cliente');
            if (url.hash === '#menu') url.hash = '';
            window.history.pushState({}, '', url.toString());
          }
          setIsCustomerMenuMode(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      
      {/* Top Main Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenDbModal={() => setIsDbModalOpen(true)}
        onOpenGithubModal={() => setIsGithubModalOpen(true)}
        onOpenImageModal={() => setIsImageModalOpen(true)}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
        onOpenAlertSettingsModal={() => setIsAlertSettingsModalOpen(true)}
        onOpenCustomerMenu={() => setIsCustomerMenuMode(true)}
        onOpenQrModal={() => setIsDirectQrModalOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onShowSplash={() => setShowSplash(true)}
        onLogout={handleLogout}
        currentUser={currentUser}
        cartCount={cartTotalItems}
        totalPlatosCount={platos.length}
        activeComandasCount={activeComandasCount}
        pendingWhatsAppCount={pendingWhatsAppCount}
      />

      {/* PERSISTENT ATTENTION BANNER WHEN THERE ARE PENDING WHATSAPP ORDERS */}
      {pendingWhatsAppCount > 0 && (
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 border-b-2 border-emerald-500/80 px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 z-20">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-3.5 h-3.5 bg-emerald-400 rounded-full animate-ping absolute"></span>
              <span className="w-3 h-3 bg-emerald-500 rounded-full relative"></span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-stone-950 flex items-center justify-center font-black shadow-md shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                  ⚠️ ¡Atención: Tienes {pendingWhatsAppCount} pedido{pendingWhatsAppCount > 1 ? 's' : ''} pendiente{pendingWhatsAppCount > 1 ? 's' : ''} vía WhatsApp Web!
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-stone-950 animate-pulse">
                  Esperando Atención
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/90 hidden sm:block">
                Hay pedidos recibidos esperando ser revisados y despachados al monitor de cocina.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => playWhatsAppIncomingAlert()}
              title="Reproducir alarma sonora en la PC"
              className="px-2.5 py-1.5 bg-emerald-900/60 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sonar Alarma</span>
            </button>

            <button
              onClick={() => setIsAlertSettingsModalOpen(true)}
              title="Ajustar volumen y tonos de alarma"
              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-emerald-400 rounded-xl border border-stone-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/30 transition-all active:scale-95"
            >
              <span>Atender Pedidos ({pendingWhatsAppCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* FLOATING LIVE INCOMING WHATSAPP ORDER ALERT TOAST */}
      {incomingAlert && (
        <div className="fixed top-24 right-4 sm:right-6 z-50 max-w-md w-full animate-in slide-in-from-top-4 duration-300">
          <div className="bg-stone-900 border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl shadow-emerald-950/60 flex flex-col space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-stone-950 font-black shadow-lg shadow-emerald-600/40 animate-bounce">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <h4 className="font-black text-white text-sm tracking-wide">
                      ¡Nuevo Pedido de WhatsApp!
                    </h4>
                  </div>
                  <p className="text-xs text-stone-300 font-bold">
                    {incomingAlert.cliente} • <span className="text-emerald-400 font-mono">{formatCurrency(incomingAlert.total)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsAlertSettingsModalOpen(true)}
                  title="Configurar volumen y tonos"
                  className="p-1 rounded-lg bg-stone-800 text-stone-400 hover:text-emerald-300 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => playWhatsAppIncomingAlert()}
                  title="Repetir timbre de alerta"
                  className="p-1 rounded-lg bg-stone-800 text-stone-400 hover:text-emerald-300 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIncomingAlert(null)}
                  className="p-1 rounded-lg bg-stone-800 text-stone-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Details preview */}
            <div className="bg-stone-950/80 rounded-xl p-2.5 border border-stone-800 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <span className="flex items-center space-x-1">
                  {incomingAlert.tipo === 'Delivery' ? (
                    <span className="text-purple-400 flex items-center space-x-1 font-semibold">
                      <Truck className="w-3 h-3" />
                      <span>Delivery</span>
                    </span>
                  ) : (
                    <span className="text-blue-400 flex items-center space-x-1 font-semibold">
                      <Package className="w-3 h-3" />
                      <span>Para Llevar</span>
                    </span>
                  )}
                </span>
                <span className="text-stone-400">
                  {incomingAlert.itemsCount} plato{incomingAlert.itemsCount > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-stone-300 font-medium truncate" title={incomingAlert.itemsSummary}>
                {incomingAlert.itemsSummary}
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="flex items-center space-x-2 pt-0.5">
              <button
                onClick={() => {
                  setIncomingAlert(null);
                  setIsWhatsAppModalOpen(true);
                }}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/30 transition-all active:scale-95"
              >
                <span>Ver y Procesar Pedido</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIncomingAlert(null)}
                className="py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {currentTab === 'pos' && (
          <POSView
            platos={platos}
            cart={cart}
            setCart={setCart}
            onSaleComplete={handleSaleComplete}
            onOpenComandas={() => setCurrentTab('comandas')}
            onOpenQrModal={() => setIsDirectQrModalOpen(true)}
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

      {/* Splash Screen (Animated 30s entrance or on demand) */}
      {showSplash && (
        <SplashScreen
          onFinish={handleSplashFinish}
          defaultDurationSeconds={30}
        />
      )}

      {/* Login & User Setup Modal */}
      <LoginModal
        isOpen={!showSplash && (isLoginModalOpen || !currentUser)}
        onLoginSuccess={handleLoginSuccess}
        onCancel={() => setIsLoginModalOpen(false)}
      />

      {/* Global Modals */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onDbUpdated={() => {
          setPlatos(sqliteService.getPlatos());
          updateCounts();
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

      {/* WhatsApp Orders Management Modal */}
      <WhatsAppOrdersModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onOpenComandas={() => setCurrentTab('comandas')}
        onOpenCustomerMenu={() => {
          setIsWhatsAppModalOpen(false);
          setIsCustomerMenuMode(true);
        }}
        onLoadOrderToCart={(items) => {
          setCart((prev) => [...prev, ...items]);
          setCurrentTab('pos');
        }}
      />

      {/* Direct QR Code & Digital Menu Flyer Modal */}
      <WhatsAppQrModal
        isOpen={isDirectQrModalOpen}
        onClose={() => setIsDirectQrModalOpen(false)}
        restaurantPhone={restaurantPhone}
        platos={platos}
        onUpdatePhone={(newPhone) => {
          sqliteService.setWhatsAppPhone(newPhone);
          setRestaurantPhone(newPhone);
        }}
        onOpenCustomerMenu={() => {
          setIsDirectQrModalOpen(false);
          setIsCustomerMenuMode(true);
        }}
      />

      {/* Sound & Alert Configuration Modal */}
      <AlertSettingsModal
        isOpen={isAlertSettingsModalOpen}
        onClose={() => setIsAlertSettingsModalOpen(false)}
      />

    </div>
  );
}
