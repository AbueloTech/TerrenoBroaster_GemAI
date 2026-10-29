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
  ArrowLeft,
  Sparkles,
  UtensilsCrossed,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Plato, FormaPago } from '../types';
import { DEFAULT_PLATOS } from '../data/defaultData';
import { imageService } from '../services/imageService';
import { menuSyncService } from '../services/menuSyncService';
import { formatCurrency } from '../utils/currency';
import { buildDigitalMenuWhatsAppUrl } from '../utils/whatsappParser';
import { BrandLogo } from './BrandLogo';

interface CustomerCartItem {
  plato: Plato;
  cantidad: number;
  nota?: string;
}

interface CustomerMenuViewProps {
  platos: Plato[];
  restaurantPhone: string;
  onExitMenu?: () => void;
}

export const CustomerMenuView: React.FC<CustomerMenuViewProps> = ({
  platos,
  restaurantPhone,
  onExitMenu,
}) => {
  // Real-time synced dishes and phone from restaurant POS
  const [activePlatos, setActivePlatos] = useState<Plato[]>(platos);
  const [activePhone, setActivePhone] = useState<string>(restaurantPhone);
  const [isSyncedWithServer, setIsSyncedWithServer] = useState<boolean>(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CustomerCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Customer checkout form state
  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [tipoEntrega, setTipoEntrega] = useState<'Delivery' | 'Para llevar'>('Delivery');
  const [direccion, setDireccion] = useState<string>('');
  const [formaPago, setFormaPago] = useState<FormaPago>('Efectivo');
  const [notas, setNotas] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [orderSent, setOrderSent] = useState<boolean>(false);

  // Sync with server API or decode from URL hash if props are empty or default
  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      // 1. Immediately decode from URL hash (#c=...) if present in QR code for instant display
      if (typeof window !== 'undefined' && window.location.hash) {
        const decoded = menuSyncService.decodeCatalogHash(window.location.hash);
        if (isMounted && decoded && decoded.length > 0) {
          setActivePlatos(decoded);
          setIsSyncedWithServer(true);
        }
      } else if (platos && platos.length > 0) {
        setActivePlatos(platos);
      }

      // 2. Fetch live menu from server API to confirm latest dishes and phone
      try {
        const serverMenu = await menuSyncService.fetchMenuFromServer();
        if (isMounted && serverMenu && Array.isArray(serverMenu.platos) && serverMenu.platos.length > 0) {
          setActivePlatos(serverMenu.platos);
          if (serverMenu.restaurantPhone) {
            setActivePhone(serverMenu.restaurantPhone);
          }
          setIsSyncedWithServer(true);
          return;
        }
      } catch (err) {
        console.warn('Could not query /api/menu:', err);
      }

      // 3. Fallback: if active dishes still empty, use passed props
      if (isMounted) {
        if (platos && platos.length > 0) {
          setActivePlatos(platos);
        }
      }
    }

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [platos, restaurantPhone]);

  // Extract categories from active dishes
  const categories = useMemo(() => {
    const set = new Set<string>();
    activePlatos.forEach((p) => {
      if (p.Categoria) set.add(p.Categoria.trim());
    });
    return ['Todos', ...Array.from(set)];
  }, [activePlatos]);

  // Filtered dishes
  const filteredPlatos = useMemo(() => {
    return activePlatos.filter((p) => {
      const matchCat = selectedCategory === 'Todos' || p.Categoria.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        p.Plato.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.Categoria.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activePlatos, selectedCategory, searchQuery]);

  // Cart totals
  const cartTotalItems = useMemo(() => {
    return cart.reduce((acc, i) => acc + i.cantidad, 0);
  }, [cart]);

  const cartTotalPrice = useMemo(() => {
    return cart.reduce((acc, i) => acc + i.cantidad * i.plato.Precio, 0);
  }, [cart]);

  const handleAddToCart = (plato: Plato) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.plato.ID === plato.ID);
      if (existing) {
        return prev.map((item) =>
          item.plato.ID === plato.ID ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { plato, cantidad: 1 }];
    });
  };

  const handleUpdateQty = (platoId: number, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.plato.ID === platoId);
      if (!item) return prev;
      const nextQty = item.cantidad + delta;
      if (nextQty <= 0) {
        return prev.filter((i) => i.plato.ID !== platoId);
      }
      return prev.map((i) => (i.plato.ID === platoId ? { ...i, cantidad: nextQty } : i));
    });
  };

  const getItemQtyInCart = (platoId: number): number => {
    const item = cart.find((i) => i.plato.ID === platoId);
    return item ? item.cantidad : 0;
  };

  const handleSendOrderToWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (cart.length === 0) {
      setFormError('Tu carrito está vacío. Agrega al menos un plato.');
      return;
    }

    if (!nombre.trim()) {
      setFormError('Por favor ingresa tu nombre completo.');
      return;
    }

    if (tipoEntrega === 'Delivery' && !direccion.trim()) {
      setFormError('Por favor ingresa la dirección exacta para el Delivery.');
      return;
    }

    const payload = {
      nombreCliente: nombre.trim(),
      telefonoCliente: telefono.trim(),
      tipoEntrega,
      direccionEntrega: direccion.trim(),
      formaPago,
      notas: notas.trim(),
      items: cart,
      total: cartTotalPrice,
    };

    setIsSubmittingOrder(true);

    try {
      // 1. Post to POS Server so the restaurant PC receives it instantly
      menuSyncService.submitCustomerOrder(payload).catch((err) => {
        console.warn('Silent fallback for customer order:', err);
      });

      // 2. Build WhatsApp direct link
      const waUrl = buildDigitalMenuWhatsAppUrl(activePhone || restaurantPhone || '', payload);

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      setOrderSent(true);
      setIsSubmittingOrder(false);

      // 3. Open WhatsApp in new tab / mobile app
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setIsSubmittingOrder(false);
      setFormError('Error al generar el pedido: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      
      {/* Top Header */}
      <header className="bg-stone-900 border-b border-stone-800 sticky top-0 z-30 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BrandLogo className="w-10 h-10" />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  TERRENO <span className="text-amber-400">BROASTER</span>
                </h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  Menú Digital
                </span>
                {isSyncedWithServer && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Sincronizado</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400">
                Catálogo en vivo • Pide fácil y directo a nuestro WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onExitMenu && (
              <button
                onClick={onExitMenu}
                title="Volver al panel del POS"
                className="flex items-center space-x-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-lg border border-stone-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Volver al POS</span>
              </button>
            )}

            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-stone-950 text-xs font-black rounded-xl shadow-md shadow-emerald-600/30 transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Carrito</span>
              {cartTotalItems > 0 && (
                <span className="bg-stone-950 text-emerald-300 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {cartTotalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Promo Sub-banner */}
        <div className="bg-gradient-to-r from-emerald-950/90 via-stone-900 to-amber-950/70 border-t border-stone-800/80 px-4 py-2 text-center text-xs text-stone-300 flex items-center justify-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            ¡Elige tus platos favoritos, revisa tu carrito y envíanos tu orden con 1 toque a WhatsApp!
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 py-5 flex-1 space-y-5 pb-24">
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de plato (Pollo, Combo, Papas, Hamburguesa...)"
            className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
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

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                    : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Dishes Grid */}
        {filteredPlatos.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <UtensilsCrossed className="w-12 h-12 text-stone-600 mx-auto" />
            <h3 className="text-base font-bold text-stone-300">
              No se encontraron platos
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Intenta con otra palabra de búsqueda o selecciona otra categoría.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredPlatos.map((plato) => {
              const qtyInCart = getItemQtyInCart(plato.ID);
              const imageUrl = plato.Imagen ? imageService.getImageUrl(plato.Imagen) : '';

              return (
                <div
                  key={plato.ID}
                  className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-stone-700 transition-all group"
                >
                  {/* Dish Visual Header */}
                  <div className="relative h-36 bg-gradient-to-t from-stone-900 to-stone-800 flex items-center justify-center overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={plato.Plato}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-amber-500/70 space-y-1">
                        <Flame className="w-10 h-10" />
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                          Terreno Broaster
                        </span>
                      </div>
                    )}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-950/80 backdrop-blur-sm text-amber-300 border border-stone-700">
                      {plato.Categoria}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors leading-snug">
                        {plato.Plato}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-stone-500 font-semibold uppercase">
                          Precio
                        </span>
                        <span className="text-base font-black text-amber-400 font-mono">
                          {formatCurrency(plato.Precio)}
                        </span>
                      </div>

                      {/* Interactive Add or Qty Counter */}
                      {qtyInCart === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(plato)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1.5 bg-stone-950 border border-amber-500/50 rounded-xl px-1.5 py-1 shadow-inner">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(plato.ID, -1)}
                            className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center font-bold text-sm transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-mono font-black text-amber-400 text-xs">
                            {qtyInCart}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(plato.ID, 1)}
                            className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center font-bold text-sm transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* STICKY BOTTOM FLOATING CART BAR */}
      {cartTotalItems > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-3 duration-300">
          <div
            onClick={() => setIsCartOpen(true)}
            className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 text-stone-950 rounded-2xl p-3.5 shadow-2xl shadow-emerald-950/80 cursor-pointer flex items-center justify-between hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-stone-950 text-emerald-400 flex items-center justify-center shadow">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-sm block leading-tight">
                  {cartTotalItems} plato{cartTotalItems > 1 ? 's' : ''} en tu pedido
                </span>
                <span className="text-xs font-black text-stone-950/80">
                  Total: {formatCurrency(cartTotalPrice)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="px-4 py-2 bg-stone-950 text-white font-black rounded-xl text-xs flex items-center space-x-1.5 shadow"
            >
              <span>Ver Carrito</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CHECKOUT CART MODAL / SLIDE-OVER */}
      {/* ==================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950/80 via-stone-900 to-stone-900 px-6 py-4 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-stone-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/30">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Tu Carrito de Pedido</h3>
                  <p className="text-xs text-stone-400">
                    {cartTotalItems} plato{cartTotalItems > 1 ? 's' : ''} seleccionado{cartTotalItems > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              
              {/* Items List */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block">
                  Platos en tu Orden
                </span>

                {cart.length === 0 ? (
                  <div className="py-6 text-center text-xs text-stone-500">
                    Tu carrito está vacío. Agrega platos desde el menú.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.plato.ID}
                        className="bg-stone-950/80 border border-stone-800 p-3 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-white truncate">{item.plato.Plato}</h5>
                          <span className="text-stone-400 text-[11px] font-mono">
                            {formatCurrency(item.plato.Precio)} c/u
                          </span>
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center space-x-1.5 bg-stone-900 border border-stone-700 rounded-lg px-1.5 py-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.plato.ID, -1)}
                            className="w-5 h-5 rounded text-stone-400 hover:text-white flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-mono font-bold text-amber-400">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.plato.ID, 1)}
                            className="w-5 h-5 rounded text-stone-400 hover:text-white flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right shrink-0 min-w-[70px]">
                          <span className="font-mono font-black text-stone-100 block">
                            {formatCurrency(item.plato.Precio * item.cantidad)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.plato.ID, -item.cantidad)}
                            className="text-stone-500 hover:text-rose-400 text-[10px] underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotal & Total display */}
                {cart.length > 0 && (
                  <div className="bg-stone-950 border border-stone-800 p-3 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-stone-400 font-semibold">Total a Pagar:</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {formatCurrency(cartTotalPrice)}
                    </span>
                  </div>
                )}
              </div>

              {/* Customer Details Form */}
              <form id="checkout-form" onSubmit={handleSendOrderToWhatsApp} className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block border-t border-stone-800 pt-4">
                  Tus Datos para el Pedido
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-stone-300 font-semibold block mb-1">
                      Tu Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: María Gómez"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-300 font-semibold block mb-1">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej: +57 300 1234567"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Tipo de Entrega Selector Buttons */}
                <div>
                  <label className="text-[11px] text-stone-300 font-semibold block mb-1.5">
                    Modalidad de Entrega:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoEntrega('Delivery')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                        tipoEntrega === 'Delivery'
                          ? 'bg-purple-950/60 border-purple-500 text-purple-300 shadow-md shadow-purple-950/40 ring-1 ring-purple-500/40'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      <span>Delivery (Domicilio)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTipoEntrega('Para llevar')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                        tipoEntrega === 'Para llevar'
                          ? 'bg-blue-950/60 border-blue-500 text-blue-300 shadow-md shadow-blue-950/40 ring-1 ring-blue-500/40'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>Para Llevar / Local</span>
                    </button>
                  </div>
                </div>

                {/* Delivery Address input if Delivery */}
                <div>
                  <label className="text-[11px] text-stone-300 font-semibold block mb-1">
                    {tipoEntrega === 'Delivery'
                      ? 'Dirección Exacta de Entrega *'
                      : 'Indicaciones (Mesa / Hora de retiro)'}
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-rose-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required={tipoEntrega === 'Delivery'}
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder={
                        tipoEntrega === 'Delivery'
                          ? 'Calle, número de casa, edificio, apartamento, punto de referencia...'
                          : 'Ej: Retiro en 20 minutos / Para consumir en mesa'
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Forma de Pago Selector Buttons */}
                <div>
                  <label className="text-[11px] text-stone-300 font-semibold block mb-1.5">
                    ¿Cómo deseas pagar?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'Efectivo', label: 'Efectivo', icon: '💵' },
                        { id: 'Pago Movil', label: 'Pago Móvil / Transf.', icon: '📱' },
                        { id: 'Punto de Venta', label: 'Tarjeta / POS', icon: '💳' },
                      ] as const
                    ).map((m) => {
                      const isSelected = formaPago === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setFormaPago(m.id as any)}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center space-y-1 transition-all ${
                            isSelected
                              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500/40'
                              : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          <span className="text-base">{m.icon}</span>
                          <span className="text-[10px] font-bold leading-tight">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Special Instructions */}
                <div>
                  <label className="text-[11px] text-stone-400 font-medium block mb-1">
                    Notas o instrucciones especiales (Opcional):
                  </label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej: Salsa de ajo extra, cambiar refresco por agua, sin cebolla..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              </form>

              {orderSent && (
                <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-white">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>¡Pedido generado y transferido a WhatsApp!</span>
                  </div>
                  <p className="text-[11px] text-stone-300">
                    Se abrió tu aplicación de WhatsApp con el pedido redactado. Solo presiona <strong>"Enviar"</strong> en WhatsApp para que el restaurante comience a prepararlo.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="bg-stone-950 px-6 py-4 border-t border-stone-800 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-stone-400 uppercase font-bold">Total:</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  {formatCurrency(cartTotalPrice)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
                >
                  Seguir Pidiendo
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={cart.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 disabled:opacity-40 text-stone-950 font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Pedido a WhatsApp</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
