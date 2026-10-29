import React, { useState, useEffect } from 'react';
import { Plato, CartItem, FormaPago, Venta, DetalleVenta, TipoServicio, UbicacionMesa, Comanda } from '../types';
import { imageService } from '../services/imageService';
import { sqliteService } from '../db/sqliteService';
import { formatPrice, safeParsePrice } from '../utils/currency';
import confetti from 'canvas-confetti';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  CheckCircle,
  Receipt,
  User,
  X,
  Sparkles,
  Armchair,
  Bike,
  Flame,
  ChefHat,
  AlertTriangle,
  Send,
  MapPin,
  Phone,
  FileText,
  Clock,
  ArrowRight,
  QrCode,
} from 'lucide-react';

interface POSViewProps {
  platos: Plato[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onSaleComplete: (venta: Venta, detalles: DetalleVenta[]) => void;
  onOpenComandas?: () => void;
  onOpenQrModal?: () => void;
  preselectedTipoServicio?: TipoServicio;
  preselectedUbicacion?: string;
}

const ALL_MESAS: UbicacionMesa[] = [
  'Mesa 1',
  'Mesa 2',
  'Mesa 3',
  'Mesa 4',
  'Mesa 5',
  'Mesa 6',
  'Mesa 7',
  'Mesa 8',
  'Mesa 9',
  'Mesa 10',
  'Barra',
  'Terraza',
];

export const POSView: React.FC<POSViewProps> = ({
  platos,
  cart,
  setCart,
  onSaleComplete,
  onOpenComandas,
  onOpenQrModal,
  preselectedTipoServicio,
  preselectedUbicacion,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [cliente, setCliente] = useState<string>('Consumidor Final');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [formaPago, setFormaPago] = useState<FormaPago>('Efectivo');

  // Service destination state
  const [tipoServicio, setTipoServicio] = useState<TipoServicio>(preselectedTipoServicio || 'Mesas');
  const [ubicacionMesa, setUbicacionMesa] = useState<UbicacionMesa>(
    (preselectedUbicacion as UbicacionMesa) || 'Mesa 1'
  );
  const [deliveryDireccion, setDeliveryDireccion] = useState<string>('');
  const [deliveryTelefono, setDeliveryTelefono] = useState<string>('');
  const [comandaNotas, setComandaNotas] = useState<string>('');
  const [showNotesInput, setShowNotesInput] = useState<boolean>(false);

  // Success notification toast
  const [sentToast, setSentToast] = useState<{ message: string; ticket: string } | null>(null);

  // Active comanda on current location
  const [activeComandaOnLocation, setActiveComandaOnLocation] = useState<Comanda | null>(null);

  // Payment specific fields
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [pagoReferencia, setPagoReferencia] = useState<string>('');
  const [pagoBanco, setPagoBanco] = useState<string>('Banesco');

  // Sync preselected values from parent
  useEffect(() => {
    if (preselectedTipoServicio) {
      setTipoServicio(preselectedTipoServicio);
    }
    if (preselectedUbicacion && ALL_MESAS.includes(preselectedUbicacion as UbicacionMesa)) {
      setUbicacionMesa(preselectedUbicacion as UbicacionMesa);
    }
  }, [preselectedTipoServicio, preselectedUbicacion]);

  // Check if selected table has an active comanda
  const checkActiveComanda = () => {
    if (tipoServicio === 'Mesas') {
      const active = sqliteService.getActiveComandaForLocation(ubicacionMesa);
      setActiveComandaOnLocation(active);
    } else {
      setActiveComandaOnLocation(null);
    }
  };

  useEffect(() => {
    checkActiveComanda();
    const unsubscribe = sqliteService.subscribe(() => {
      checkActiveComanda();
    });
    return unsubscribe;
  }, [tipoServicio, ubicacionMesa]);

  // Categories extraction
  const categories = ['Todos', ...Array.from(new Set((platos || []).map((p) => p?.Categoria || 'General')))];

  // Filtering
  const filteredPlatos = (platos || []).filter((plato) => {
    if (!plato || !plato.Plato) return false;
    const cat = plato.Categoria || 'General';
    const matchesCategory = selectedCategory === 'Todos' || cat === selectedCategory;
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (plato.Plato || '').toLowerCase().includes(searchLower) ||
      cat.toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  // Sound feedback helper
  const playBeep = (freq = 600, duration = 0.08) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio not permitted or supported
    }
  };

  // Cart operations
  const addToCart = (plato: Plato) => {
    playBeep(700, 0.06);
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

  const updateQuantity = (platoId: number, delta: number) => {
    playBeep(delta > 0 ? 750 : 500, 0.05);
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.plato.ID === platoId) {
            const newQty = item.cantidad + delta;
            return newQty > 0 ? { ...item, cantidad: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (platoId: number) => {
    playBeep(400, 0.08);
    setCart((prev) => prev.filter((item) => item.plato.ID !== platoId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + safeParsePrice(item.plato.Precio) * item.cantidad,
    0
  );

  const numMontoRecibido = safeParsePrice(montoRecibido);
  const vuelto = numMontoRecibido > totalAmount ? numMontoRecibido - totalAmount : 0;

  // Build final location string
  const getFinalUbicacion = () => {
    if (tipoServicio === 'Mesas') return ubicacionMesa;
    if (tipoServicio === 'Para llevar') return 'Para llevar';
    return deliveryDireccion.trim() ? `Delivery: ${deliveryDireccion.trim()}` : 'Delivery';
  };

  // 1. ACTION: Enviar a Cocina (Creates or Appends Comanda)
  const handleEnviarACocina = () => {
    if (cart.length === 0) return;

    try {
      const finalUbicacion = getFinalUbicacion();

      // If this table already has an active order in cocina, append cleanly to that ticket!
      if (tipoServicio === 'Mesas' && activeComandaOnLocation) {
        sqliteService.addDetallesToComanda(activeComandaOnLocation.NTicket, cart);
        playBeep(880, 0.12);
        setTimeout(() => playBeep(1174, 0.14), 110);

        setCart([]);
        setComandaNotas('');
        setSentToast({
          message: `¡Platos agregados exitosamente a la Comanda ${activeComandaOnLocation.NTicket} de ${ubicacionMesa}!`,
          ticket: activeComandaOnLocation.NTicket,
        });
        setTimeout(() => setSentToast(null), 6000);
        checkActiveComanda();
        return;
      }

      // Otherwise create a brand new comanda with a strictly unique ticket number
      const nextTicket = sqliteService.getNextTicketNumber();
      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);

      const notesParts: string[] = [];
      if (comandaNotas.trim()) notesParts.push(comandaNotas.trim());
      if (tipoServicio === 'Delivery' && deliveryTelefono.trim()) {
        notesParts.push(`Tel: ${deliveryTelefono.trim()}`);
      }
      const fullNotas = notesParts.join(' | ');

      sqliteService.createComanda(
        {
          Fecha: dateStr,
          NTicket: nextTicket,
          Cliente: cliente.trim() || 'Consumidor Final',
          TipoServicio: tipoServicio,
          Ubicacion: finalUbicacion,
          Estado: 'Cocina',
          Monto: safeParsePrice(totalAmount),
          Notas: fullNotas,
          HoraCreacion: now.toTimeString().substring(0, 5),
        },
        cart
      );

      // Play chime
      playBeep(880, 0.12);
      setTimeout(() => playBeep(1174, 0.14), 110);

      // Reset cart and notify
      setCart([]);
      setComandaNotas('');
      setSentToast({
        message: `¡Comanda ${nextTicket} enviada a Cocina para ${finalUbicacion}!`,
        ticket: nextTicket,
      });
      setTimeout(() => setSentToast(null), 6000);
      checkActiveComanda();
    } catch (e: any) {
      alert('Error al enviar la comanda a cocina: ' + e.message);
    }
  };

  // 2. ACTION: Process checkout & direct payment (Marks as 'Cobrado' & saves Venta)
  const handleProcessSale = () => {
    if (cart.length === 0) return;

    try {
      const nextTicket = sqliteService.getNextTicketNumber();
      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
      const finalUbicacion = getFinalUbicacion();

      const notesParts: string[] = [];
      if (comandaNotas.trim()) notesParts.push(comandaNotas.trim());
      if (tipoServicio === 'Delivery' && deliveryTelefono.trim()) {
        notesParts.push(`Tel: ${deliveryTelefono.trim()}`);
      }
      if (pagoReferencia) {
        notesParts.push(`Ref: ${pagoReferencia} (${pagoBanco})`);
      }
      const fullNotas = notesParts.join(' | ');

      // Create new comanda marked as Cobrado with unique ticket
      const result = sqliteService.createComanda(
        {
          Fecha: dateStr,
          NTicket: nextTicket,
          Cliente: cliente.trim() || 'Consumidor Final',
          TipoServicio: tipoServicio,
          Ubicacion: finalUbicacion,
          Estado: 'Cobrado',
          Monto: safeParsePrice(totalAmount),
          FormaPago: formaPago,
          Notas: fullNotas,
          HoraCreacion: now.toTimeString().substring(0, 5),
        },
        cart
      );

      // If table had a previously active comanda in cocina/entregado, close it now so table is freed
      if (tipoServicio === 'Mesas' && activeComandaOnLocation) {
        try {
          sqliteService.updateComandaEstado(activeComandaOnLocation.NTicket, 'Cobrado', formaPago);
        } catch {
          // ignore
        }
        setActiveComandaOnLocation(null);
      }

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#d97706', '#10b981', '#ffffff'],
      });

      // Play success chime
      playBeep(880, 0.12);
      setTimeout(() => playBeep(1100, 0.15), 120);

      const venta: Venta = {
        VentasId: result.comanda.ComandaId,
        Fecha: dateStr,
        NTicket: nextTicket,
        Cliente: cliente.trim() || 'Consumidor Final',
        Monto: safeParsePrice(totalAmount),
        FormaPago: formaPago,
      };

      // Completely clear cart and state in memory
      setCart([]);
      setIsCheckoutOpen(false);
      setMontoRecibido('');
      setPagoReferencia('');
      setComandaNotas('');
      checkActiveComanda();
      onSaleComplete(venta, result.detalles);
    } catch (e: any) {
      alert('Error al registrar la venta en SQLite: ' + e.message);
    }
  };

  // Direct checkout of the active comanda on this table
  const handleCobrarComandaMesa = (comandaToCobrar: Comanda) => {
    try {
      sqliteService.updateComandaEstado(comandaToCobrar.NTicket, 'Cobrado', formaPago);
      const venta = sqliteService.getVentaByTicket(comandaToCobrar.NTicket) || {
        VentasId: comandaToCobrar.ComandaId,
        Fecha: comandaToCobrar.Fecha,
        NTicket: comandaToCobrar.NTicket,
        Cliente: comandaToCobrar.Cliente,
        Monto: comandaToCobrar.Monto,
        FormaPago: formaPago,
      };
      const detalles = sqliteService.getDetallesByTicket(comandaToCobrar.NTicket);

      setActiveComandaOnLocation(null);
      setIsCheckoutOpen(false);
      setCart([]);
      checkActiveComanda();
      onSaleComplete(venta, detalles);
    } catch (e: any) {
      alert('Error al cobrar comanda de mesa: ' + e.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-stone-950">
      
      {/* LEFT COLUMN: Dishes catalog & categories */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-stone-800">
        
        {/* Search & Categories Bar */}
        <div className="p-4 bg-stone-900 border-b border-stone-800 space-y-3">
          
          {/* Toast alert if an order was sent to kitchen */}
          {sentToast && (
            <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs text-amber-200 animate-fadeIn">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <span className="font-semibold">{sentToast.message}</span>
              </div>
              {onOpenComandas && (
                <button
                  onClick={onOpenComandas}
                  className="px-2.5 py-1 bg-amber-500 text-stone-950 font-bold rounded-lg hover:bg-amber-400 transition-colors shrink-0 flex items-center space-x-1"
                >
                  <span>Ver en Cocina</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar plato broaster, hamburguesa, ración o bebida..."
                className="w-full pl-9 pr-4 py-2 bg-stone-800 text-stone-100 placeholder-stone-500 rounded-xl border border-stone-700 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {onOpenComandas && (
              <button
                onClick={onOpenComandas}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl text-xs font-bold text-amber-400 transition-colors shrink-0"
              >
                <ChefHat className="w-4 h-4" />
                <span>Monitor Cocina</span>
              </button>
            )}

            {onOpenQrModal && (
              <button
                onClick={onOpenQrModal}
                title="Abrir Código QR del Menú Digital para Clientes"
                className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-stone-950 font-black rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 shrink-0 active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Código QR</span>
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-stone-950 shadow-sm shadow-amber-500/20'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white border border-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Dishes Grid */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {platos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-center max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-stone-200 text-base">Base de datos lista para importar</p>
                <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
                  Para ver el catálogo auténtico de <strong className="text-amber-400">Terreno Broaster</strong>, pulse el botón <strong className="text-stone-200">"Base de Datos"</strong> en la barra superior e importe su archivo <span className="font-mono text-amber-300">TerrenoBroaster.db</span>.
                </p>
              </div>
            </div>
          ) : filteredPlatos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
              <ShoppingBag className="w-12 h-12 text-stone-600 mb-2" />
              <p className="font-semibold text-sm">No se encontraron platos</p>
              <p className="text-xs text-stone-500 mt-1">Prueba con otra palabra o categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredPlatos.map((plato) => {
                const inCart = cart.find((i) => i.plato.ID === plato.ID);
                return (
                  <div
                    key={plato.ID}
                    onClick={() => addToCart(plato)}
                    className={`group bg-stone-900 border rounded-2xl overflow-hidden cursor-pointer transition-all flex flex-col hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/5 select-none ${
                      inCart ? 'border-amber-500/70 ring-1 ring-amber-500/30' : 'border-stone-800'
                    }`}
                  >
                    {/* Image thumbnail */}
                    <div className="relative aspect-[4/3] bg-stone-800 overflow-hidden">
                      <img
                        src={imageService.getImageUrl(plato.Imagen, plato.Categoria, plato.Plato, plato.ID)}
                        alt={plato.Plato}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = imageService.getSmartFoodImage(plato.Plato, plato.Categoria);
                        }}
                      />
                      <span className="absolute top-2 left-2 bg-stone-950/80 backdrop-blur-xs text-[10px] font-semibold text-stone-300 px-2 py-0.5 rounded-md border border-stone-700">
                        {plato.Categoria}
                      </span>

                      {/* Badge if item is in cart */}
                      {inCart && (
                        <span className="absolute top-2 right-2 bg-amber-500 text-stone-950 text-xs font-black px-2 py-0.5 rounded-full shadow-lg">
                          {inCart.cantidad} en orden
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h4 className="text-stone-100 font-semibold text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
                        {plato.Plato}
                      </h4>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-800/80">
                        <span className="text-amber-400 font-black text-sm sm:text-base font-mono">
                          {formatPrice(plato.Precio)}
                        </span>
                        <button
                          type="button"
                          className="w-7 h-7 rounded-lg bg-stone-800 group-hover:bg-amber-500 text-stone-300 group-hover:text-stone-950 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Order Cart, Destination & Checkout */}
      <div className="w-full lg:w-96 xl:w-[430px] bg-stone-900 flex flex-col h-full border-t lg:border-t-0 border-stone-800">
        
        {/* Cart Header */}
        <div className="p-3.5 border-b border-stone-800 bg-stone-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-sm text-stone-100">Comanda & Orden</h3>
              <p className="text-[11px] text-stone-400">
                Ticket Prox: <span className="text-amber-400 font-mono font-bold">{sqliteService.getNextTicketNumber()}</span>
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-stone-400 hover:text-red-400 text-xs flex items-center space-x-1 py-1 px-2 rounded hover:bg-stone-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar</span>
            </button>
          )}
        </div>

        {/* ===================== DESTINATION SELECTOR: MESAS, PARA LLEVAR, DELIVERY ===================== */}
        <div className="p-3 bg-stone-950 border-b border-stone-800 space-y-2.5">
          
          {/* Main 3 Destination Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-900 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => setTipoServicio('Mesas')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                tipoServicio === 'Mesas'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Armchair className="w-3.5 h-3.5" />
              <span>Mesas</span>
            </button>

            <button
              type="button"
              onClick={() => setTipoServicio('Para llevar')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                tipoServicio === 'Para llevar'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Para llevar</span>
            </button>

            <button
              type="button"
              onClick={() => setTipoServicio('Delivery')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                tipoServicio === 'Delivery'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
          </div>

          {/* Sub-selector if MESAS: 10 tables + Barra + Terraza */}
          {tipoServicio === 'Mesas' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-stone-400 font-medium">
                <span>Seleccionar Mesa / Área:</span>
                <span className="text-amber-400 font-bold">{ubicacionMesa}</span>
              </div>
              
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                {ALL_MESAS.map((mesa) => {
                  const isOccupied = sqliteService.getActiveComandaForLocation(mesa);
                  const isSelected = ubicacionMesa === mesa;
                  return (
                    <button
                      key={mesa}
                      type="button"
                      onClick={() => setUbicacionMesa(mesa)}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all relative border flex items-center justify-center ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                          : isOccupied
                          ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                          : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                      }`}
                    >
                      <span className="truncate">{mesa.replace('Mesa ', 'M-')}</span>
                      {isOccupied && (
                        <span
                          className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-stone-950' : 'bg-amber-400 animate-pulse'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Notice if selected table has active order */}
              {activeComandaOnLocation && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 min-w-0 pr-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">
                        Mesa con comanda activa: <strong className="font-mono">{activeComandaOnLocation.NTicket}</strong> ({activeComandaOnLocation.Estado} • {formatPrice(activeComandaOnLocation.Monto)})
                      </span>
                    </div>
                    {onOpenComandas && (
                      <button
                        onClick={onOpenComandas}
                        className="text-[10px] text-amber-400 hover:underline shrink-0 font-bold ml-1"
                      >
                        Ver Cocina
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-1 border-t border-amber-500/20">
                    <button
                      type="button"
                      onClick={() => handleCobrarComandaMesa(activeComandaOnLocation)}
                      className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black rounded-lg text-[10px] flex items-center justify-center space-x-1 transition-colors shadow-sm"
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>Cobrar Mesa ({formatPrice(activeComandaOnLocation.Monto)})</span>
                    </button>
                    <span className="text-[10px] text-stone-400">
                      O añade platos y pulsa Enviar
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-inputs if DELIVERY */}
          {tipoServicio === 'Delivery' && (
            <div className="space-y-1.5 text-xs">
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={deliveryDireccion}
                  onChange={(e) => setDeliveryDireccion(e.target.value)}
                  placeholder="Dirección exacta de entrega / punto de referencia..."
                  className="w-full pl-8 pr-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={deliveryTelefono}
                  onChange={(e) => setDeliveryTelefono(e.target.value)}
                  placeholder="Teléfono / WhatsApp de contacto..."
                  className="w-full pl-8 pr-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Client Input */}
          <div className="flex items-center space-x-2 pt-1 border-t border-stone-800/80">
            <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nombre del cliente o Cédula..."
              className="flex-1 bg-transparent text-xs text-stone-200 placeholder-stone-500 focus:outline-none"
            />
            {cliente !== 'Consumidor Final' && (
              <button
                onClick={() => setCliente('Consumidor Final')}
                className="text-[10px] text-amber-400 hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Optional Comanda Notes toggle */}
          <div>
            {!showNotesInput ? (
              <button
                type="button"
                onClick={() => setShowNotesInput(true)}
                className="text-[11px] text-stone-400 hover:text-amber-400 flex items-center space-x-1"
              >
                <FileText className="w-3 h-3" />
                <span>+ Agregar nota para Cocina (opcional)</span>
              </button>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-stone-400">
                  <span>Nota para Cocina:</span>
                  <button onClick={() => setShowNotesInput(false)} className="text-stone-500 hover:text-white">
                    Ocultar
                  </button>
                </div>
                <input
                  type="text"
                  value={comandaNotas}
                  onChange={(e) => setComandaNotas(e.target.value)}
                  placeholder="Ej: Sin cebolla, papas bien tostadas, salsa aparte..."
                  className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 text-center px-4">
              <ShoppingBag className="w-12 h-12 text-stone-700 mb-3" />
              <p className="font-semibold text-stone-400 text-sm">El carrito está vacío</p>
              <p className="text-xs text-stone-500 mt-1">
                Toca cualquier plato del menú a la izquierda para agregarlo a esta venta.
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const itemPrice = safeParsePrice(item.plato.Precio);
              const itemTotal = itemPrice * item.cantidad;
              return (
                <div
                  key={item.plato.ID}
                  className="bg-stone-950/70 border border-stone-800 rounded-xl p-3 flex items-center space-x-3"
                >
                  <img
                    src={imageService.getImageUrl(item.plato.Imagen, item.plato.Categoria, item.plato.Plato, item.plato.ID)}
                    alt={item.plato.Plato}
                    className="w-12 h-12 rounded-lg object-cover bg-stone-800 shrink-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = imageService.getSmartFoodImage(item.plato.Plato, item.plato.Categoria);
                    }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-semibold text-stone-200 truncate">{item.plato.Plato}</h5>
                    <p className="text-[11px] text-stone-400 font-mono">{formatPrice(itemPrice)} c/u</p>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.plato.ID, -1)}
                      className="w-6 h-6 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-stone-100">{item.cantidad}</span>
                    <button
                      onClick={() => updateQuantity(item.plato.ID, 1)}
                      className="w-6 h-6 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right shrink-0 min-w-[50px]">
                    <p className="text-xs font-black text-amber-400 font-mono">{formatPrice(itemTotal)}</p>
                    <button
                      onClick={() => removeFromCart(item.plato.ID)}
                      className="text-[10px] text-stone-500 hover:text-red-400"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Total & Dual Action Buttons (Enviar a Cocina / Cobrar Orden) */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-400">
              <span>Destino:</span>
              <span className="font-semibold text-stone-200">
                {tipoServicio === 'Mesas' ? ubicacionMesa : tipoServicio}
              </span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Artículos en orden:</span>
              <span className="font-semibold text-stone-300">
                {cart.reduce((s, i) => s + i.cantidad, 0)} unidades
              </span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Subtotal:</span>
              <span className="font-semibold text-stone-300 font-mono">{formatPrice(totalAmount)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-stone-800">
              <span className="font-bold text-sm text-stone-200">TOTAL:</span>
              <span className="text-2xl font-black text-amber-400 tracking-tight font-mono">
                {formatPrice(totalAmount)}
              </span>
            </div>
          </div>

          {/* DUAL ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            
            {/* ACTION 1: ENVIAR A COCINA (Comanda -> Estado 'Cocina') */}
            <button
              disabled={cart.length === 0}
              onClick={handleEnviarACocina}
              className="py-3 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 hover:text-amber-200 font-extrabold text-xs rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex flex-col items-center justify-center space-y-1 shadow-sm"
            >
              <div className="flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>ENVIAR A COCINA</span>
              </div>
              <span className="text-[10px] text-amber-400/80 font-normal">Ciclo Comanda</span>
            </button>

            {/* ACTION 2: COBRAR EN CAJA (Direct Payment -> Estado 'Cobrado') */}
            <button
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-extrabold text-xs rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex flex-col items-center justify-center space-y-1 shadow-lg shadow-emerald-500/20"
            >
              <div className="flex items-center space-x-1.5">
                <CreditCard className="w-4 h-4" />
                <span>COBRAR ORDEN</span>
              </div>
              <span className="text-[10px] text-stone-900 font-bold font-mono">
                {formatPrice(totalAmount)}
              </span>
            </button>

          </div>
        </div>

      </div>

      {/* CHECKOUT MODAL (Cobro, Formas de Pago, Cambio, NTicket) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-stone-100 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Procesar Pago & Facturación</span>
                </h3>
                <p className="text-xs text-stone-400">
                  Ticket #{sqliteService.getNextTicketNumber()} • {getFinalUbicacion()} • {cliente}
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total display banner */}
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-orange-500/10 border-b border-amber-500/20 text-center">
              <span className="text-xs uppercase font-bold text-amber-300 tracking-wider">Monto Total a Cobrar</span>
              <div className="text-3xl font-black text-amber-400 mt-0.5 font-mono">
                {formatPrice(totalAmount)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Seleccione la Forma de Pago:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormaPago('Efectivo')}
                    className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                      formaPago === 'Efectivo'
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:border-stone-600 hover:text-stone-200'
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold">Efectivo</p>
                      <p className="text-[10px] text-stone-400">Cash / Divisas o Bs.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPago('Pago Movil')}
                    className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                      formaPago === 'Pago Movil'
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:border-stone-600 hover:text-stone-200'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-sky-400" />
                    <div>
                      <p className="text-xs font-bold">Pago Móvil</p>
                      <p className="text-[10px] text-stone-400">Interbancario</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPago('Punto de Venta')}
                    className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                      formaPago === 'Punto de Venta'
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:border-stone-600 hover:text-stone-200'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-xs font-bold">Punto de Venta</p>
                      <p className="text-[10px] text-stone-400">Débito / Crédito</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPago('Transferencia')}
                    className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                      formaPago === 'Transferencia'
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:border-stone-600 hover:text-stone-200'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-xs font-bold">Transferencia</p>
                      <p className="text-[10px] text-stone-400">Transferencia bancaria</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditional Cash Calculation (Vuelto / Cambio) */}
              {formaPago === 'Efectivo' && (
                <div className="p-4 bg-stone-950/80 rounded-xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-300">
                      Monto Recibido del Cliente:
                    </label>
                    <div className="flex space-x-1.5">
                      {[totalAmount, Math.ceil(totalAmount / 1000) * 1000].map((amt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setMontoRecibido(String(amt))}
                          className="px-2 py-0.5 rounded text-[10px] bg-stone-800 hover:bg-stone-700 text-stone-300"
                        >
                          {formatPrice(amt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      placeholder={`Ej: ${totalAmount}`}
                      className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 font-mono text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {numMontoRecibido > 0 && (
                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
                      <span className="text-stone-400 font-medium">Cambio a Entregar (Vuelto):</span>
                      <span
                        className={`text-base font-black font-mono ${
                          vuelto > 0 ? 'text-emerald-400' : 'text-stone-400'
                        }`}
                      >
                        {formatPrice(vuelto)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Conditional Bank & Reference Fields */}
              {(formaPago === 'Pago Movil' || formaPago === 'Transferencia') && (
                <div className="p-4 bg-stone-950/80 rounded-xl border border-stone-800 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">
                        Banco Receptor:
                      </label>
                      <select
                        value={pagoBanco}
                        onChange={(e) => setPagoBanco(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Banesco">Banesco</option>
                        <option value="Mercantil">Banco Mercantil</option>
                        <option value="Venezuela">Banco de Venezuela</option>
                        <option value="Bancaribe">Bancaribe</option>
                        <option value="BBVA">BBVA Provincial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">
                        N° Referencia (Últimos 4):
                      </label>
                      <input
                        type="text"
                        value={pagoReferencia}
                        onChange={(e) => setPagoReferencia(e.target.value)}
                        placeholder="Ej: 9021"
                        maxLength={8}
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleProcessSale}
                className="flex-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>CONFIRMAR PAGO & FACTURAR</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
