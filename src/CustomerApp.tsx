import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Flame,
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  Send,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  Package,
  Check,
  Sparkles,
  UtensilsCrossed,
  FileText,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Plato, FormaPago } from './types';
import { imageService } from './services/imageService';
import { menuSyncService } from './services/menuSyncService';
import { formatCurrency } from './utils/currency';
import { DigitalMenuOrderPayload } from './utils/whatsappParser';
import { BrandLogo } from './components/BrandLogo';

interface CustomerCartItem {
  plato: Plato;
  cantidad: number;
  nota?: string;
}

export const CustomerApp: React.FC = () => {
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [restaurantPhone, setRestaurantPhone] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CustomerCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Customer Checkout Form
  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [tipoEntrega, setTipoEntrega] = useState<'Delivery' | 'Para llevar'>('Delivery');
  const [direccion, setDireccion] = useState<string>('');
  const [formaPago, setFormaPago] = useState<FormaPago>('Efectivo');
  const [notas, setNotas] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<{
    id: string;
    payload: DigitalMenuOrderPayload;
  } | null>(null);

  // Load menu dishes from server or URL hash
  const loadCatalog = async () => {
    setIsLoading(true);
    setLoadError(null);

    // 1. Try URL hash payload first for instant 0ms offline loading
    if (typeof window !== 'undefined' && window.location.hash) {
      const decoded = menuSyncService.decodeCatalogHash(window.location.hash);
      if (decoded && decoded.length > 0) {
        setPlatos(decoded);
        setIsLoading(false);
      }
    }

    // 2. Query the live restaurant server menu
    try {
      const serverMenu = await menuSyncService.fetchMenuFromServer();
      if (serverMenu && Array.isArray(serverMenu.platos) && serverMenu.platos.length > 0) {
        setPlatos(serverMenu.platos);
        if (serverMenu.restaurantPhone) {
          setRestaurantPhone(serverMenu.restaurantPhone);
        }
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('Error fetching menu from server:', err);
    }

    // Check phone from query string if present
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const phoneParam = params.get('phone');
      if (phoneParam) {
        setRestaurantPhone(phoneParam);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Unique categories derived dynamically from live dishes
  const categories = useMemo(() => {
    const set = new Set<string>();
    platos.forEach((p) => {
      if (p.Categoria) set.add(p.Categoria.trim());
    });
    return ['Todos', ...Array.from(set)];
  }, [platos]);

  // Filtered dishes
  const filteredPlatos = useMemo(() => {
    return platos.filter((p) => {
      const matchCat =
        selectedCategory === 'Todos' || p.Categoria.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        p.Plato.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.Categoria.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [platos, selectedCategory, searchQuery]);

  // Cart calculations
  const cartTotalItems = useMemo(() => {
    return cart.reduce((acc, i) => acc + i.cantidad, 0);
  }, [cart]);

  const cartTotalPrice = useMemo(() => {
    return cart.reduce((acc, i) => acc + i.cantidad * i.plato.Precio, 0);
  }, [cart]);

  const addToCart = (plato: Plato) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.plato.ID === plato.ID);
      if (existing) {
        return prev.map((i) =>
          i.plato.ID === plato.ID ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { plato, cantidad: 1 }];
    });
  };

  const updateCartQty = (platoId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.plato.ID === platoId) {
            const next = i.cantidad + delta;
            return next > 0 ? { ...i, cantidad: next } : null;
          }
          return i;
        })
        .filter(Boolean) as CustomerCartItem[];
    });
  };

  const updateCartItemNote = (platoId: number, nota: string) => {
    setCart((prev) =>
      prev.map((i) => (i.plato.ID === platoId ? { ...i, nota } : i))
    );
  };

  const removeFromCart = (platoId: number) => {
    setCart((prev) => prev.filter((i) => i.plato.ID !== platoId));
  };

  // Submit Order via Internet
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (cart.length === 0) {
      setFormError('El carrito está vacío. Agrega al menos un plato.');
      return;
    }

    if (!nombre.trim()) {
      setFormError('Por favor ingresa tu nombre completo.');
      return;
    }

    if (!telefono.trim()) {
      setFormError('Por favor ingresa tu número de teléfono.');
      return;
    }

    if (tipoEntrega === 'Delivery' && !direccion.trim()) {
      setFormError('Por favor ingresa la dirección de entrega.');
      return;
    }

    const payload: DigitalMenuOrderPayload = {
      nombreCliente: nombre.trim(),
      telefonoCliente: telefono.trim(),
      tipoEntrega,
      direccionEntrega: tipoEntrega === 'Delivery' ? direccion.trim() : undefined,
      items: cart.map((i) => ({
        plato: i.plato,
        cantidad: i.cantidad,
        nota: i.nota,
      })),
      total: cartTotalPrice,
      formaPago,
      notas: notas.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      const res = await menuSyncService.submitCustomerOrder(payload);
      if (res.success) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#f59e0b', '#3b82f6', '#ffffff'],
        });

        const orderId = res.orderId || `ord_${Date.now()}`;
        setCompletedOrder({ id: orderId, payload });
        setCart([]);
        setIsCartOpen(false);
      } else {
        setFormError('No se pudo enviar el pedido al restaurante. Por favor intenta de nuevo.');
      }
    } catch (err: any) {
      setFormError('Error de conexión al enviar el pedido: ' + (err.message || 'Error de red'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate friendly WhatsApp tracking message (optional)
  const buildWhatsAppPingLink = (orderId: string, clientName: string) => {
    const cleanPhone = restaurantPhone.replace(/[^\d]/g, '');
    const text = `¡Hola Terreno Broaster! 🍗 Acabo de realizar el pedido en línea #${orderId} a nombre de *${clientName}*. ¿Podrían confirmarme la recepción? ¡Muchas gracias!`;
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : '#';
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Header / Branding */}
      <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BrandLogo className="w-10 h-10 sm:w-12 sm:h-12" />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  Terreno <span className="text-amber-400">Broaster</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  Abierto
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-400">
                Menú Digital Oficial • Pedidos Directos en Línea
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {restaurantPhone && (
              <a
                href={`https://wa.me/${restaurantPhone.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs border border-stone-700 transition-colors"
                title="Contactar al restaurante por WhatsApp"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono">{restaurantPhone}</span>
              </a>
            )}

            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Mi Pedido</span>
              {cartTotalItems > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-stone-950 text-amber-400 text-xs font-black">
                  {cartTotalItems}
                </span>
              )}
              {cartTotalPrice > 0 && (
                <span className="font-mono text-xs hidden md:inline ml-1">
                  ({formatCurrency(cartTotalPrice)})
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Banner with Restaurant Message */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-stone-900 to-stone-900 border border-amber-500/20 p-4 sm:p-6 shadow-xl">
          <div className="relative z-10 space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Pollo Broaster Crujiente y Tradicional</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Haz tu pedido en línea y recíbelo caliente en tu mesa o domicilio
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 max-w-2xl">
              Selecciona tus platos favoritos, especifica si es para delivery o retiro en el local, y envía tu orden directamente a la cocina del restaurante en un clic.
            </p>
          </div>
        </div>

        {/* Search & Categories Toolbar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar combos, piezas, hamburguesas, raciones o bebidas..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Refresh Catalog Button */}
            <button
              onClick={loadCatalog}
              title="Refrescar catálogo"
              className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 scale-102'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-800'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dishes Grid */}
        {isLoading && platos.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-sm text-stone-400">Cargando el menú en línea de Terreno Broaster...</p>
          </div>
        ) : platos.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-stone-900/50 rounded-2xl border border-stone-800 p-8">
            <UtensilsCrossed className="w-12 h-12 text-stone-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-stone-200">Menú en sincronización</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                El restaurante está actualizando los platos de su base de datos. Si eres el administrador del POS, abre el sistema y pulsa "Publicar Catálogo" para enviar tus platos a este menú digital.
              </p>
            </div>
            <button
              onClick={loadCatalog}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-md shadow-amber-500/20"
            >
              Reintentar Carga
            </button>
          </div>
        ) : filteredPlatos.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-stone-900/40 rounded-2xl border border-stone-800 p-8">
            <Search className="w-10 h-10 text-stone-600 mx-auto" />
            <p className="text-sm text-stone-400">No encontramos platos que coincidan con tu búsqueda.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Todos');
              }}
              className="px-4 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs hover:bg-stone-700 font-bold"
            >
              Limpiar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredPlatos.map((plato) => {
              const inCartItem = cart.find((i) => i.plato.ID === plato.ID);
              const imageUrl = imageService.getImageUrl(plato.Imagen, plato.Categoria, plato.Plato, plato.ID);

              return (
                <div
                  key={plato.ID}
                  className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden hover:border-amber-500/40 transition-all duration-200 shadow-md flex flex-col justify-between group"
                >
                  {/* Dish Image */}
                  <div className="relative aspect-video w-full bg-stone-950 overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={plato.Plato}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = imageService.getSmartFoodImage(plato.Plato, plato.Categoria);
                      }}
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-950/80 backdrop-blur-sm text-amber-400 border border-stone-800">
                        {plato.Categoria || 'Especialidad'}
                      </span>
                    </div>
                  </div>

                  {/* Dish Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-white text-base leading-snug group-hover:text-amber-400 transition-colors">
                        {plato.Plato}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 block font-medium">Precio</span>
                        <span className="text-lg font-black text-amber-400 font-mono">
                          {formatCurrency(plato.Precio)}
                        </span>
                      </div>

                      {inCartItem ? (
                        <div className="flex items-center space-x-1.5 bg-stone-800 border border-stone-700 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => updateCartQty(plato.ID, -1)}
                            className="w-7 h-7 rounded-lg bg-stone-700 hover:bg-stone-600 text-white flex items-center justify-center active:scale-95 transition-transform"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-bold text-sm font-mono text-white">
                            {inCartItem.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(plato.ID, 1)}
                            className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center font-bold active:scale-95 transition-transform"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(plato)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Button on Mobile */}
      {cartTotalItems > 0 && (
        <aside
          aria-label="Resumen de pedido flotante"
          className="fixed bottom-4 left-4 right-4 z-30 sm:hidden animate-in slide-in-from-bottom duration-200"
        >
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow-2xl flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-stone-950 text-amber-400 text-xs font-black flex items-center justify-center">
                {cartTotalItems}
              </span>
              <span>Ver mi pedido</span>
            </div>
            <span className="font-mono text-base font-black">
              {formatCurrency(cartTotalPrice)}
            </span>
          </button>
        </aside>
      )}

      {/* SHOPPING CART & CHECKOUT DRAWER / MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="bg-stone-900 border-l border-stone-800 w-full max-w-lg h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Cart Header */}
            <div className="p-4 sm:p-5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-white text-base">
                  Tu Pedido ({cartTotalItems} plato{cartTotalItems > 1 ? 's' : ''})
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <ShoppingBag className="w-12 h-12 text-stone-700 mx-auto" />
                  <p className="text-sm text-stone-400">Tu carrito de pedido está vacío.</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="px-4 py-2 bg-stone-800 text-amber-400 text-xs font-bold rounded-xl"
                  >
                    Ver el Menú
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitOrder} className="space-y-5">
                  {/* Items List */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Platos Seleccionados
                    </span>
                    <div className="space-y-2.5">
                      {cart.map((item) => (
                        <div
                          key={item.plato.ID}
                          className="bg-stone-950/70 p-3 rounded-xl border border-stone-800/80 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                              <img
                                src={imageService.getImageUrl(item.plato.Imagen, item.plato.Categoria, item.plato.Plato, item.plato.ID)}
                                alt={item.plato.Plato}
                                className="w-10 h-10 rounded-lg object-cover bg-stone-900 border border-stone-800 shrink-0"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;
                                  target.src = imageService.getSmartFoodImage(item.plato.Plato, item.plato.Categoria);
                                }}
                              />
                              <div>
                                <h4 className="font-bold text-white text-xs sm:text-sm">
                                  {item.plato.Plato}
                                </h4>
                                <span className="text-[11px] text-stone-400 font-mono">
                                  {formatCurrency(item.plato.Precio)} c/u
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-amber-400 text-sm">
                                {formatCurrency(item.plato.Precio * item.cantidad)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.plato.ID)}
                                className="text-stone-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <input
                              type="text"
                              value={item.nota || ''}
                              onChange={(e) => updateCartItemNote(item.plato.ID, e.target.value)}
                              placeholder="Nota (ej: sin mayonesa, salsa extra)..."
                              className="w-3/5 text-[11px] bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-stone-300 placeholder:text-stone-600"
                            />

                            <div className="flex items-center space-x-1.5 bg-stone-900 border border-stone-800 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.plato.ID, -1)}
                                className="w-6 h-6 rounded bg-stone-800 text-stone-300 flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-xs font-mono text-white">
                                {item.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.plato.ID, 1)}
                                className="w-6 h-6 rounded bg-amber-500 text-stone-950 flex items-center justify-center font-bold"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Mode Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Tipo de Servicio
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTipoEntrega('Delivery')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                          tipoEntrega === 'Delivery'
                            ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white'
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                        <span>Delivery (Domicilio)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoEntrega('Para llevar')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                          tipoEntrega === 'Para llevar'
                            ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-white'
                        }`}
                      >
                        <Package className="w-4 h-4" />
                        <span>Para Llevar (Pick-up)</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-3 bg-stone-950/60 p-3.5 rounded-xl border border-stone-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                      Datos de Contacto
                    </span>

                    <div>
                      <label className="text-[11px] text-stone-400 block mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Carlos Mendoza"
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-stone-400 block mb-1">Teléfono Móvil *</label>
                      <input
                        type="tel"
                        required
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="Ej: +58 412 123 4567"
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    {tipoEntrega === 'Delivery' && (
                      <div>
                        <label className="text-[11px] text-stone-400 block mb-1">
                          Dirección de Entrega Exacta *
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          placeholder="Calle, avenida, edificio, número de casa, punto de referencia..."
                          className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] text-stone-400 block mb-1">Forma de Pago</label>
                      <select
                        value={formaPago}
                        onChange={(e) => setFormaPago(e.target.value as FormaPago)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Efectivo">Efectivo en Entrega</option>
                        <option value="Punto de Venta">Punto de Venta / Tarjeta</option>
                        <option value="Pago Movil">Pago Móvil / Transferencia Local</option>
                        <option value="Transferencia">Transferencia Bancaria / Zelle</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-stone-400 block mb-1">
                        Instrucciones Adicionales (Opcional)
                      </label>
                      <input
                        type="text"
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        placeholder="Ej: Tocar timbre 3B, cambio para billete de $20..."
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between pb-3 text-sm">
                      <span className="text-stone-400">Total a Pagar:</span>
                      <span className="font-mono font-black text-xl text-amber-400">
                        {formatCurrency(cartTotalPrice)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-50 text-stone-950 font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Enviando al Restaurante...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Confirmar y Enviar Pedido vía Internet</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-stone-500 mt-2 flex items-center justify-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Llega directo al monitor de comandas del restaurante</span>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ORDER CONFIRMATION MODAL */}
      {completedOrder && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-emerald-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">¡Pedido Recibido con Éxito!</h3>
              <p className="text-xs text-stone-400">
                Tu orden ha sido transmitida vía internet en tiempo real al sistema del restaurante.
              </p>
            </div>

            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                <span className="text-stone-400">Código de Pedido:</span>
                <span className="font-mono font-bold text-amber-400">{completedOrder.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Cliente:</span>
                <span className="font-bold text-white">{completedOrder.payload.nombreCliente}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Tipo:</span>
                <span className="font-bold text-emerald-400">{completedOrder.payload.tipoEntrega}</span>
              </div>
              {completedOrder.payload.direccionEntrega && (
                <div className="flex items-start justify-between">
                  <span className="text-stone-400">Dirección:</span>
                  <span className="text-white text-right font-medium max-w-[65%]">
                    {completedOrder.payload.direccionEntrega}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
                <span className="text-stone-400 font-bold">Total a Pagar:</span>
                <span className="font-mono font-black text-sm text-amber-400">
                  {formatCurrency(completedOrder.payload.total)} ({completedOrder.payload.formaPago})
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2.5 pt-1">
              {restaurantPhone && (
                <a
                  href={buildWhatsAppPingLink(completedOrder.id, completedOrder.payload.nombreCliente)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/30"
                >
                  <Phone className="w-4 h-4" />
                  <span>Notificar o consultar estado por WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors"
              >
                Volver al Menú
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerApp;
