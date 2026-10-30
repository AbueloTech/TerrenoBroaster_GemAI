import React, { useState, useEffect } from 'react';
import { Comanda, EstadoComanda, DetalleVenta, FormaPago, Venta, TipoServicio, UbicacionMesa } from '../types';
import { sqliteService } from '../db/sqliteService';
import { formatPrice, safeParsePrice } from '../utils/currency';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt,
  DollarSign,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  Armchair,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Eye,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  X,
  MapPin,
  ChevronRight,
  Flame,
  LayoutGrid,
  Columns3,
} from 'lucide-react';

interface ComandasMonitorViewProps {
  onSaleComplete?: (venta: Venta, detalles: DetalleVenta[]) => void;
  onOpenPosWithLocation?: (tipo: TipoServicio, ubicacion: string) => void;
  onViewTicket?: (venta: Venta, detalles: DetalleVenta[]) => void;
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

export const ComandasMonitorView: React.FC<ComandasMonitorViewProps> = ({
  onSaleComplete,
  onOpenPosWithLocation,
  onViewTicket,
}) => {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState<'all' | 'activas' | EstadoComanda>('activas');
  const [viewMode, setViewMode] = useState<'kds' | 'mesas'>('kds');
  const [searchTerm, setSearchTerm] = useState('');

  // Payment modal state
  const [payingComanda, setPayingComanda] = useState<Comanda | null>(null);
  const [formaPago, setFormaPago] = useState<FormaPago>('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [pagoReferencia, setPagoReferencia] = useState<string>('');
  const [pagoBanco, setPagoBanco] = useState<string>('Banesco');

  // Anular modal state
  const [anulandoComanda, setAnulandoComanda] = useState<Comanda | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState<string>('');

  // Live ticker for cooking orders timer - ticks every second
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshComandas = () => {
    setComandas(sqliteService.getComandas());
  };

  useEffect(() => {
    refreshComandas();
    const unsubscribe = sqliteService.subscribe(() => {
      refreshComandas();
    });
    return unsubscribe;
  }, []);

  // Compute stats
  const countCocina = comandas.filter((c) => c.Estado === 'Cocina').length;
  const countEntregado = comandas.filter((c) => c.Estado === 'Entregado').length;
  const countCobrado = comandas.filter((c) => c.Estado === 'Cobrado').length;
  const countAnulado = comandas.filter((c) => c.Estado === 'Anulado').length;
  const countActivas = countCocina + countEntregado;

  // Filtered comandas list
  const filteredComandas = comandas.filter((c) => {
    if (selectedEstadoFilter === 'activas') {
      if (c.Estado !== 'Cocina' && c.Estado !== 'Entregado') return false;
    } else if (selectedEstadoFilter !== 'all') {
      if (c.Estado !== selectedEstadoFilter) return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTicket = c.NTicket.toLowerCase().includes(q);
      const matchCliente = c.Cliente.toLowerCase().includes(q);
      const matchUbicacion = c.Ubicacion.toLowerCase().includes(q);
      const matchTipo = c.TipoServicio.toLowerCase().includes(q);
      if (!matchTicket && !matchCliente && !matchUbicacion && !matchTipo) return false;
    }

    return true;
  });

  // Calculate elapsed time in seconds for active cooking timer
  const getElapsedSeconds = (horaCreacion: string, fechaStr?: string): number => {
    if (!horaCreacion && !fechaStr) return 0;
    try {
      // 1. If horaCreacion has full ISO format
      if (horaCreacion && horaCreacion.includes('T')) {
        const parsedIso = Date.parse(horaCreacion);
        if (!isNaN(parsedIso)) {
          return Math.max(0, Math.floor((currentTime.getTime() - parsedIso) / 1000));
        }
      }

      // 2. If fechaStr has full ISO or datetime 'YYYY-MM-DD HH:mm:ss'
      if (fechaStr && fechaStr.includes(':')) {
        const parsedDt = Date.parse(fechaStr.replace(' ', 'T'));
        if (!isNaN(parsedDt)) {
          return Math.max(0, Math.floor((currentTime.getTime() - parsedDt) / 1000));
        }
      }

      // 3. Parse time components (HH:mm or HH:mm:ss)
      const cleanTime = (horaCreacion || '').trim();
      const timeParts = cleanTime.split(':').map((p) => parseInt(p, 10));
      if (timeParts.length >= 2 && !isNaN(timeParts[0]) && !isNaN(timeParts[1])) {
        const h = timeParts[0];
        const m = timeParts[1];
        const s = timeParts[2] && !isNaN(timeParts[2]) ? timeParts[2] : 0;

        const orderDate = new Date(currentTime);
        if (fechaStr && fechaStr.includes('-')) {
          const dateOnly = fechaStr.split(' ')[0];
          const dp = dateOnly.split('-').map(Number);
          if (dp.length === 3 && dp[0] > 2000) {
            orderDate.setFullYear(dp[0], dp[1] - 1, dp[2]);
          }
        }

        orderDate.setHours(h, m, s, 0);
        let diffMs = currentTime.getTime() - orderDate.getTime();

        // If diffMs is negative due to UTC vs Local Time differences, compensate
        if (diffMs < 0) {
          const tzDiff = currentTime.getTimezoneOffset() * 60 * 1000;
          if (diffMs + tzDiff >= 0) {
            diffMs += tzDiff;
          } else if (diffMs - tzDiff >= 0) {
            diffMs -= tzDiff;
          } else {
            diffMs = 0;
          }
        }

        return Math.max(0, Math.floor(diffMs / 1000));
      }

      return 0;
    } catch {
      return 0;
    }
  };

  const formatTimer = (totalSecs: number): string => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} min`;
  };

  // Status transitions
  const handleMarcarEntregado = (nTicket: string) => {
    sqliteService.updateComandaEstado(nTicket, 'Entregado');
    refreshComandas();
  };

  const handleRegresarACocina = (nTicket: string) => {
    sqliteService.updateComandaEstado(nTicket, 'Cocina');
    refreshComandas();
  };

  // Open payment modal
  const handleOpenCobro = (comanda: Comanda) => {
    setPayingComanda(comanda);
    setFormaPago('Efectivo');
    setMontoRecibido('');
    setPagoReferencia('');
  };

  // Confirm payment
  const handleConfirmCobro = () => {
    if (!payingComanda) return;

    try {
      sqliteService.updateComandaEstado(payingComanda.NTicket, 'Cobrado', formaPago);
      refreshComandas();

      const venta = sqliteService.getVentaByTicket(payingComanda.NTicket);
      const detalles = sqliteService.getDetallesByTicket(payingComanda.NTicket);

      setPayingComanda(null);

      if (venta && onSaleComplete) {
        onSaleComplete(venta, detalles);
      }
    } catch (e: any) {
      alert('Error al registrar cobro: ' + e.message);
    }
  };

  // Open anular modal
  const handleOpenAnular = (comanda: Comanda) => {
    setAnulandoComanda(comanda);
    setMotivoAnulacion('Cancelado por el cliente');
  };

  // Confirm anular
  const handleConfirmAnulacion = () => {
    if (!anulandoComanda) return;
    sqliteService.anularComanda(anulandoComanda.NTicket, motivoAnulacion.trim() || 'Cancelado');
    refreshComandas();
    setAnulandoComanda(null);
  };

  // View ticket details
  const handleViewReceipt = (comanda: Comanda) => {
    const venta = sqliteService.getVentaByTicket(comanda.NTicket) || {
      VentasId: comanda.ComandaId,
      Fecha: comanda.Fecha,
      NTicket: comanda.NTicket,
      Cliente: comanda.Cliente,
      Monto: comanda.Monto,
      FormaPago: comanda.FormaPago || 'Efectivo',
    };
    const detalles = sqliteService.getDetallesByTicket(comanda.NTicket);
    if (onViewTicket) {
      onViewTicket(venta, detalles);
    }
  };

  // Get active comanda for a table
  const getComandaForMesa = (mesa: string): Comanda | undefined => {
    return comandas.find(
      (c) => c.Ubicacion === mesa && (c.Estado === 'Cocina' || c.Estado === 'Entregado')
    );
  };

  // Helper for status badge styling
  const getEstadoBadge = (estado: EstadoComanda) => {
    switch (estado) {
      case 'Cocina':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>COCINA</span>
          </span>
        );
      case 'Entregado':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <UtensilsCrossed className="w-3 h-3 text-sky-400" />
            <span>ENTREGADO</span>
          </span>
        );
      case 'Cobrado':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>COBRADO</span>
          </span>
        );
      case 'Anulado':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>ANULADO</span>
          </span>
        );
    }
  };

  // Helper for location badge
  const getLocationIcon = (tipo: TipoServicio) => {
    switch (tipo) {
      case 'Mesas':
        return <Armchair className="w-3.5 h-3.5 text-amber-400" />;
      case 'Para llevar':
        return <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Delivery':
        return <Bike className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-stone-950 text-stone-100 overflow-y-auto">
      
      {/* TOP HEADER & SUMMARY METRICS */}
      <div className="p-4 sm:p-6 bg-stone-900 border-b border-stone-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <ChefHat className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  MONITOR DE COMANDAS & COCINA
                </h1>
                <p className="text-xs text-stone-400">
                  Seguimiento del ciclo de vida de pedidos: <span className="text-amber-400 font-semibold">Cocina</span> → <span className="text-sky-400 font-semibold">Entregado</span> → <span className="text-emerald-400 font-semibold">Cobrado</span>
                </p>
              </div>
            </div>
          </div>

          {/* View mode toggle: KDS Columns / Floor Plan */}
          <div className="flex items-center space-x-2 bg-stone-950 p-1 rounded-xl border border-stone-800 self-start md:self-auto">
            <button
              onClick={() => setViewMode('kds')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kds'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Columns3 className="w-4 h-4" />
              <span>Tablero de Pedidos</span>
            </button>
            <button
              onClick={() => setViewMode('mesas')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'mesas'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Plano de Mesas & Áreas</span>
            </button>
          </div>

        </div>

        {/* METRICS COUNTER CARDS */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div
            onClick={() => { setSelectedEstadoFilter('Cocina'); setViewMode('kds'); }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedEstadoFilter === 'Cocina'
                ? 'bg-amber-500/20 border-amber-500 shadow-md'
                : 'bg-stone-950/70 border-stone-800 hover:border-amber-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400">🔥 En Cocina</span>
              <span className="text-xl font-black text-white">{countCocina}</span>
            </div>
            <p className="text-[10px] text-stone-400 mt-1">En preparación activa</p>
          </div>

          <div
            onClick={() => { setSelectedEstadoFilter('Entregado'); setViewMode('kds'); }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedEstadoFilter === 'Entregado'
                ? 'bg-sky-500/20 border-sky-500 shadow-md'
                : 'bg-stone-950/70 border-stone-800 hover:border-sky-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-400">🍽️ Entregados</span>
              <span className="text-xl font-black text-white">{countEntregado}</span>
            </div>
            <p className="text-[10px] text-stone-400 mt-1">Consumiendo en salón</p>
          </div>

          <div
            onClick={() => { setSelectedEstadoFilter('Cobrado'); setViewMode('kds'); }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedEstadoFilter === 'Cobrado'
                ? 'bg-emerald-500/20 border-emerald-500 shadow-md'
                : 'bg-stone-950/70 border-stone-800 hover:border-emerald-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400">✅ Cobrados</span>
              <span className="text-xl font-black text-white">{countCobrado}</span>
            </div>
            <p className="text-[10px] text-stone-400 mt-1">Ventas finalizadas</p>
          </div>

          <div
            onClick={() => { setSelectedEstadoFilter('Anulado'); setViewMode('kds'); }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedEstadoFilter === 'Anulado'
                ? 'bg-rose-500/20 border-rose-500 shadow-md'
                : 'bg-stone-950/70 border-stone-800 hover:border-rose-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-400">❌ Anulados</span>
              <span className="text-xl font-black text-white">{countAnulado}</span>
            </div>
            <p className="text-[10px] text-stone-400 mt-1">Cancelaciones</p>
          </div>
        </div>

      </div>

      {/* FILTER BAR FOR KDS VIEW */}
      {viewMode === 'kds' && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Status filter tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setSelectedEstadoFilter('activas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedEstadoFilter === 'activas'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              Activas ({countActivas})
            </button>
            <button
              onClick={() => setSelectedEstadoFilter('Cocina')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedEstadoFilter === 'Cocina'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              Cocina ({countCocina})
            </button>
            <button
              onClick={() => setSelectedEstadoFilter('Entregado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedEstadoFilter === 'Entregado'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              Entregados ({countEntregado})
            </button>
            <button
              onClick={() => setSelectedEstadoFilter('Cobrado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedEstadoFilter === 'Cobrado'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              Cobrados ({countCobrado})
            </button>
            <button
              onClick={() => setSelectedEstadoFilter('Anulado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedEstadoFilter === 'Anulado'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              Anulados ({countAnulado})
            </button>
            <button
              onClick={() => setSelectedEstadoFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedEstadoFilter === 'all'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              Todas ({comandas.length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ticket, cliente o mesa..."
              className="w-full pl-8 pr-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1">
        
        {/* ===================== VIEW 1: KDS / TABLERO DE PEDIDOS ===================== */}
        {viewMode === 'kds' && (
          <div>
            {filteredComandas.length === 0 ? (
              <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-12 text-center text-stone-400 flex flex-col items-center justify-center">
                <ChefHat className="w-12 h-12 text-stone-700 mb-3" />
                <h3 className="font-bold text-stone-300 text-base">No hay comandas en este estado</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-sm">
                  Las nuevas órdenes enviadas a cocina o cobradas en caja aparecerán automáticamente aquí en tiempo real.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredComandas.map((comanda) => {
                  const elapsedSeconds = getElapsedSeconds(comanda.HoraCreacion, comanda.Fecha);
                  const elapsedMins = Math.floor(elapsedSeconds / 60);
                  const isDelayedInKitchen = comanda.Estado === 'Cocina' && elapsedMins >= 15;
                  const detalles = sqliteService.getDetallesByTicket(comanda.NTicket);

                  return (
                    <div
                      key={comanda.ComandaId}
                      className={`bg-stone-900 rounded-2xl border transition-all flex flex-col overflow-hidden shadow-lg ${
                        isDelayedInKitchen
                          ? 'border-amber-500/80 shadow-amber-500/10'
                          : comanda.Estado === 'Cocina'
                          ? 'border-amber-500/30'
                          : comanda.Estado === 'Entregado'
                          ? 'border-sky-500/30'
                          : comanda.Estado === 'Cobrado'
                          ? 'border-stone-800'
                          : 'border-rose-900/40 opacity-75'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-3.5 bg-stone-950/80 border-b border-stone-800/80 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-extrabold text-amber-400 text-sm">
                            {comanda.NTicket}
                          </span>
                          <span className="text-[11px] text-stone-400 font-medium">
                            • {comanda.HoraCreacion}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {comanda.Estado === 'Cocina' && (
                            <span
                              className={`text-xs font-mono font-bold flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full shadow-sm transition-all ${
                                isDelayedInKitchen
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse font-extrabold'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                              }`}
                              title={`Tiempo transcurrido en cocina: ${formatTimer(elapsedSeconds)} (Iniciado: ${comanda.HoraCreacion})`}
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                              <span>{formatTimer(elapsedSeconds)}</span>
                            </span>
                          )}
                          {getEstadoBadge(comanda.Estado)}
                        </div>
                      </div>

                      {/* Location & Client Info */}
                      <div className="p-3.5 border-b border-stone-800/50 bg-stone-900/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getLocationIcon(comanda.TipoServicio)}
                            <span className="font-extrabold text-sm text-stone-100">
                              {comanda.Ubicacion}
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-400 bg-stone-800/80 px-2 py-0.5 rounded font-medium">
                            {comanda.TipoServicio}
                          </span>
                        </div>

                        <p className="text-xs text-stone-400 truncate">
                          Cliente: <span className="text-stone-200 font-medium">{comanda.Cliente}</span>
                        </p>

                        {/* Order Notes / Instructions */}
                        {comanda.Notas && (
                          <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start space-x-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span className="italic">{comanda.Notas}</span>
                          </div>
                        )}
                      </div>

                      {/* Dish Items List */}
                      <div className="p-3.5 flex-1 space-y-1.5 overflow-y-auto max-h-48 scrollbar-thin">
                        {detalles.length === 0 ? (
                          <p className="text-xs text-stone-500 italic">Cargando platos...</p>
                        ) : (
                          detalles.map((d, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                              <div className="flex items-center space-x-2 min-w-0 pr-2">
                                <span className="font-extrabold text-amber-400 shrink-0 text-sm">
                                  {d.Cantidad}x
                                </span>
                                <span className="text-stone-200 truncate font-medium">{d.Plato}</span>
                              </div>
                              <span className="text-stone-400 text-[11px] font-mono shrink-0">
                                {formatPrice(d.Importe)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Card Footer with Total & Actions */}
                      <div className="p-3.5 bg-stone-950/80 border-t border-stone-800 space-y-2.5">
                        
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-stone-400 font-semibold">Total a Cobrar:</span>
                          <span className="text-lg font-black text-amber-400 font-mono">
                            {formatPrice(comanda.Monto)}
                          </span>
                        </div>

                        {/* STAGE TRANSITION ACTIONS */}
                        <div className="flex items-center space-x-2 pt-1">
                          
                          {/* From COCINA: */}
                          {comanda.Estado === 'Cocina' && (
                            <>
                              <button
                                onClick={() => handleMarcarEntregado(comanda.NTicket)}
                                className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-stone-950 font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                              >
                                <UtensilsCrossed className="w-3.5 h-3.5" />
                                <span>Entregado</span>
                              </button>

                              <button
                                onClick={() => handleOpenCobro(comanda)}
                                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Cobrar</span>
                              </button>

                              <button
                                onClick={() => handleOpenAnular(comanda)}
                                title="Anular comanda"
                                className="p-2 bg-stone-800 hover:bg-rose-900/40 text-stone-400 hover:text-rose-400 rounded-xl transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* From ENTREGADO: */}
                          {comanda.Estado === 'Entregado' && (
                            <>
                              <button
                                onClick={() => handleOpenCobro(comanda)}
                                className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-md shadow-emerald-500/20"
                              >
                                <DollarSign className="w-4 h-4" />
                                <span>Cobrar Cuenta ({formatPrice(comanda.Monto)})</span>
                              </button>

                              <button
                                onClick={() => handleRegresarACocina(comanda.NTicket)}
                                title="Regresar comanda a Cocina"
                                className="p-2 bg-stone-800 hover:bg-amber-900/40 text-stone-400 hover:text-amber-400 rounded-xl transition-colors"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenAnular(comanda)}
                                title="Anular comanda"
                                className="p-2 bg-stone-800 hover:bg-rose-900/40 text-stone-400 hover:text-rose-400 rounded-xl transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* From COBRADO: */}
                          {comanda.Estado === 'Cobrado' && (
                            <div className="w-full flex items-center justify-between text-xs text-stone-400">
                              <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Pago: {comanda.FormaPago || 'Efectivo'}</span>
                              </span>
                              <button
                                onClick={() => handleViewReceipt(comanda)}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold transition-colors"
                              >
                                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                                <span>Ver Recibo</span>
                              </button>
                            </div>
                          )}

                          {/* From ANULADO: */}
                          {comanda.Estado === 'Anulado' && (
                            <div className="w-full text-xs text-rose-400 italic py-1 truncate">
                              Motivo: {comanda.Notas || 'Sin motivo especificado'}
                            </div>
                          )}

                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== VIEW 2: PLANO DE MESAS & ÁREAS ===================== */}
        {viewMode === 'mesas' && (
          <div className="space-y-6">
            
            {/* Legend & Instructions */}
            <div className="p-4 bg-stone-900/80 border border-stone-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-4">
                <span className="text-stone-400 font-semibold">Estado de Mesas:</span>
                <span className="flex items-center space-x-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 -ml-4"></span>
                  <span>Disponible / Libre</span>
                </span>
                <span className="flex items-center space-x-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>En Cocina</span>
                </span>
                <span className="flex items-center space-x-1.5 text-sky-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <span>Servido / En Mesa</span>
                </span>
              </div>
              <p className="text-stone-400">
                Toca cualquier mesa para abrir orden en POS o gestionar su comanda actual.
              </p>
            </div>

            {/* SALÓN PRINCIPAL: MESAS 1 A 10 */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Armchair className="w-4 h-4 text-amber-400" />
                <h2 className="font-extrabold text-sm text-stone-200 uppercase tracking-wider">
                  Salón Principal (10 Mesas)
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {ALL_MESAS.filter((m) => m.startsWith('Mesa')).map((mesaName) => {
                  const activeComanda = getComandaForMesa(mesaName);
                  const isOccupied = !!activeComanda;

                  return (
                    <div
                      key={mesaName}
                      className={`rounded-2xl p-4 border transition-all flex flex-col justify-between min-h-[170px] ${
                        !isOccupied
                          ? 'bg-stone-900/60 border-stone-800 hover:border-emerald-500/50'
                          : activeComanda.Estado === 'Cocina'
                          ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-500/5'
                          : 'bg-sky-950/20 border-sky-500/60 shadow-lg shadow-sky-500/5'
                      }`}
                    >
                      {/* Top Bar */}
                      <div className="flex items-center justify-between">
                        <span className="font-black text-stone-100 text-sm flex items-center space-x-1.5">
                          <Armchair className="w-4 h-4 text-amber-400" />
                          <span>{mesaName}</span>
                        </span>

                        <span
                          className={`w-3 h-3 rounded-full ${
                            !isOccupied
                              ? 'bg-emerald-500'
                              : activeComanda.Estado === 'Cocina'
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-sky-400'
                          }`}
                        />
                      </div>

                      {/* Body Content */}
                      <div className="my-2 space-y-1">
                        {!isOccupied ? (
                          <div className="text-center py-2">
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Disponible
                            </span>
                            <p className="text-[11px] text-stone-500 mt-2">Mesa limpia y lista</p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-amber-400">
                                {activeComanda.NTicket}
                              </span>
                              <div className="flex items-center space-x-1.5">
                                {activeComanda.Estado === 'Cocina' && (
                                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center space-x-1">
                                    <Clock className="w-2.5 h-2.5 text-amber-400" />
                                    <span>{formatTimer(getElapsedSeconds(activeComanda.HoraCreacion, activeComanda.Fecha))}</span>
                                  </span>
                                )}
                                <span className="text-[10px] text-stone-400">
                                  {activeComanda.HoraCreacion}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-stone-300 font-medium truncate mt-0.5">
                              {activeComanda.Cliente}
                            </p>

                            <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-stone-800/80">
                              <span className="text-[10px] text-stone-400">Total:</span>
                              <span className="text-sm font-black text-amber-400 font-mono">
                                {formatPrice(activeComanda.Monto)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-stone-800/80">
                        {!isOccupied ? (
                          <button
                            onClick={() => {
                              if (onOpenPosWithLocation) {
                                onOpenPosWithLocation('Mesas', mesaName);
                              }
                            }}
                            className="w-full py-1.5 px-2 bg-stone-800 hover:bg-amber-500 text-stone-300 hover:text-stone-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1"
                          >
                            <span>Abrir en POS</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            {activeComanda.Estado === 'Cocina' ? (
                              <button
                                onClick={() => handleMarcarEntregado(activeComanda.NTicket)}
                                className="flex-1 py-1 px-2 bg-sky-600 hover:bg-sky-500 text-stone-950 font-bold text-xs rounded-lg transition-colors truncate"
                              >
                                Servir
                              </button>
                            ) : null}

                            <button
                              onClick={() => handleOpenCobro(activeComanda)}
                              className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs rounded-lg transition-colors truncate"
                            >
                              Cobrar
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN ESPECIAL: BARRA & TERRAZA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Barra & Terraza */}
              {['Barra', 'Terraza'].map((specialArea) => {
                const activeComanda = getComandaForMesa(specialArea);
                const isOccupied = !!activeComanda;

                return (
                  <div
                    key={specialArea}
                    className={`rounded-2xl p-4 border transition-all ${
                      !isOccupied
                        ? 'bg-stone-900/60 border-stone-800'
                        : activeComanda.Estado === 'Cocina'
                        ? 'bg-amber-950/20 border-amber-500'
                        : 'bg-sky-950/20 border-sky-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="p-2 rounded-lg bg-stone-800 text-amber-400">
                          {specialArea === 'Barra' ? <Armchair className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        </span>
                        <div>
                          <h3 className="font-extrabold text-sm text-stone-100">{specialArea}</h3>
                          <p className="text-[11px] text-stone-400">Área de comensales</p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          !isOccupied
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : activeComanda.Estado === 'Cocina'
                            ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                            : 'bg-sky-500/20 text-sky-400'
                        }`}
                      >
                        {!isOccupied ? 'Disponible' : activeComanda.Estado}
                      </span>
                    </div>

                    {!isOccupied ? (
                      <div className="flex items-center justify-between pt-3 border-t border-stone-800">
                        <span className="text-xs text-stone-500">Sin comandas activas</span>
                        <button
                          onClick={() => {
                            if (onOpenPosWithLocation) {
                              onOpenPosWithLocation('Mesas', specialArea);
                            }
                          }}
                          className="py-1 px-3 bg-stone-800 hover:bg-amber-500 text-stone-300 hover:text-stone-950 text-xs font-bold rounded-lg transition-colors"
                        >
                          Tomar Orden en {specialArea}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2 border-t border-stone-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-amber-400">
                            {activeComanda.NTicket} • {activeComanda.Cliente}
                          </span>
                          <span className="font-black text-white">{formatPrice(activeComanda.Monto)}</span>
                        </div>
                        <div className="flex items-center space-x-2 pt-1">
                          {activeComanda.Estado === 'Cocina' && (
                            <button
                              onClick={() => handleMarcarEntregado(activeComanda.NTicket)}
                              className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-stone-950 font-bold text-xs rounded-lg transition-colors"
                            >
                              Marcar Entregado
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenCobro(activeComanda)}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs rounded-lg transition-colors"
                          >
                            Cobrar ({formatPrice(activeComanda.Monto)})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            </div>

            {/* SECCIÓN ESPECIAL: COLAS ACTIVAS DE 'PARA LLEVAR' Y 'DELIVERY' */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Para Llevar Queue */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-extrabold text-sm text-stone-200">
                    Cola Activa: Para Llevar ({comandas.filter((c) => c.TipoServicio === 'Para llevar' && (c.Estado === 'Cocina' || c.Estado === 'Entregado')).length})
                  </h3>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {comandas
                    .filter((c) => c.TipoServicio === 'Para llevar' && (c.Estado === 'Cocina' || c.Estado === 'Entregado'))
                    .map((c) => (
                      <div key={c.ComandaId} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-bold text-amber-400">{c.NTicket}</span>
                          <span className="text-stone-300 font-medium ml-2">{c.Cliente}</span>
                          <p className="text-[10px] text-stone-500">{c.HoraCreacion} • {c.Estado}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-stone-200">{formatPrice(c.Monto)}</span>
                          <button
                            onClick={() => handleOpenCobro(c)}
                            className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded-lg text-xs"
                          >
                            Cobrar
                          </button>
                        </div>
                      </div>
                    ))}
                  {comandas.filter((c) => c.TipoServicio === 'Para llevar' && (c.Estado === 'Cocina' || c.Estado === 'Entregado')).length === 0 && (
                    <p className="text-xs text-stone-500 py-3 text-center">No hay pedidos activos para llevar.</p>
                  )}
                </div>
              </div>

              {/* Delivery Queue */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Bike className="w-4 h-4 text-blue-400" />
                  <h3 className="font-extrabold text-sm text-stone-200">
                    Cola Activa: Delivery ({comandas.filter((c) => c.TipoServicio === 'Delivery' && (c.Estado === 'Cocina' || c.Estado === 'Entregado')).length})
                  </h3>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {comandas
                    .filter((c) => c.TipoServicio === 'Delivery' && (c.Estado === 'Cocina' || c.Estado === 'Entregado'))
                    .map((c) => (
                      <div key={c.ComandaId} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-mono font-bold text-amber-400">{c.NTicket}</span>
                          <span className="text-stone-300 font-medium ml-2 truncate">{c.Cliente}</span>
                          <p className="text-[10px] text-stone-500 truncate">{c.Ubicacion}</p>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-bold text-stone-200">{formatPrice(c.Monto)}</span>
                          <button
                            onClick={() => handleOpenCobro(c)}
                            className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded-lg text-xs"
                          >
                            Cobrar
                          </button>
                        </div>
                      </div>
                    ))}
                  {comandas.filter((c) => c.TipoServicio === 'Delivery' && (c.Estado === 'Cocina' || c.Estado === 'Entregado')).length === 0 && (
                    <p className="text-xs text-stone-500 py-3 text-center">No hay pedidos activos en delivery.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ===================== MODAL: QUICK COBRO (FORMA DE PAGO) ===================== */}
      {payingComanda && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Cobrar Comanda {payingComanda.NTicket}</h3>
                  <p className="text-[11px] text-stone-400">{payingComanda.Ubicacion} • {payingComanda.Cliente}</p>
                </div>
              </div>
              <button
                onClick={() => setPayingComanda(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Display */}
            <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-center">
              <span className="text-xs text-amber-300 uppercase tracking-wider font-semibold">Total a Cancelar:</span>
              <p className="text-3xl font-black text-amber-400 font-mono mt-0.5">
                {formatPrice(payingComanda.Monto)}
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-2">
                  Seleccione la Forma de Pago:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
                    { id: 'Pago Movil', label: 'Pago Móvil', icon: Smartphone },
                    { id: 'Punto de Venta', label: 'Punto de Venta', icon: CreditCard },
                    { id: 'Transferencia', label: 'Transferencia', icon: Building2 },
                  ].map((fp) => {
                    const Icon = fp.icon;
                    return (
                      <button
                        key={fp.id}
                        type="button"
                        onClick={() => setFormaPago(fp.id as FormaPago)}
                        className={`p-2.5 rounded-xl border flex items-center space-x-2 text-xs font-bold transition-all ${
                          formaPago === fp.id
                            ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                            : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{fp.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic fields based on payment method */}
              {formaPago === 'Efectivo' && (
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                  <label className="block text-xs font-medium text-stone-400">
                    Monto Recibido en Efectivo:
                  </label>
                  <input
                    type="number"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    placeholder={`Monto (ej. ${payingComanda.Monto})`}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                  {safeParsePrice(montoRecibido) > payingComanda.Monto && (
                    <div className="flex justify-between items-center text-xs pt-1 text-emerald-400 font-bold">
                      <span>Cambio / Vuelto:</span>
                      <span className="text-base font-mono">
                        {formatPrice(safeParsePrice(montoRecibido) - payingComanda.Monto)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {(formaPago === 'Pago Movil' || formaPago === 'Transferencia') && (
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">Banco Destino:</label>
                      <select
                        value={pagoBanco}
                        onChange={(e) => setPagoBanco(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-200 focus:outline-none"
                      >
                        <option value="Banesco">Banesco</option>
                        <option value="Mercantil">Mercantil</option>
                        <option value="Venezuela">Banco de Venezuela</option>
                        <option value="Bancaribe">Bancaribe</option>
                        <option value="BBVA">BBVA Provincial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-400 mb-1">N° Referencia (Últimos 4):</label>
                      <input
                        type="text"
                        value={pagoReferencia}
                        onChange={(e) => setPagoReferencia(e.target.value)}
                        placeholder="Ej: 7894"
                        className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-stone-950 border-t border-stone-800 flex space-x-2">
              <button
                type="button"
                onClick={() => setPayingComanda(null)}
                className="flex-1 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCobro}
                className="flex-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar y Cobrar ({formatPrice(payingComanda.Monto)})</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===================== MODAL: ANULAR COMANDA ===================== */}
      {anulandoComanda && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-rose-900/60 text-stone-100 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
            
            <div className="p-4 bg-rose-950/40 border-b border-rose-900/40 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-extrabold text-sm text-rose-200">
                  Anular Comanda {anulandoComanda.NTicket}
                </h3>
              </div>
              <button onClick={() => setAnulandoComanda(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-stone-300">
                ¿Está seguro de anular el pedido de <strong className="text-white">{anulandoComanda.Ubicacion}</strong> por un monto de{' '}
                <strong className="text-amber-400">{formatPrice(anulandoComanda.Monto)}</strong>?
              </p>

              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Motivo de anulación:
                </label>
                <select
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-stone-200 focus:outline-none mb-2"
                >
                  <option value="Cancelado por el cliente">Cancelado por el cliente</option>
                  <option value="Error al digitar orden">Error al digitar orden</option>
                  <option value="Cliente se retiró del local">Cliente se retiró del local</option>
                  <option value="Producto o ingrediente agotado">Producto o ingrediente agotado</option>
                  <option value="Duplicado de orden">Duplicado de orden</option>
                </select>

                <input
                  type="text"
                  placeholder="Detalle adicional (opcional)..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  className="w-full px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-300 placeholder-stone-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-stone-950 border-t border-stone-800 flex space-x-2">
              <button
                onClick={() => setAnulandoComanda(null)}
                className="flex-1 py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl text-xs"
              >
                Volver
              </button>
              <button
                onClick={handleConfirmAnulacion}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs shadow-md transition-all"
              >
                Confirmar Anulación
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
