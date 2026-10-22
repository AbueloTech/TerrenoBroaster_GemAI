import React, { useState, useMemo } from 'react';
import { Venta, DetalleVenta, AcumuladoProducto, AcumuladoFormaPago } from '../types';
import { sqliteService } from '../db/sqliteService';
import { formatPrice, safeParsePrice } from '../utils/currency';
import { TicketModal } from './TicketModal';
import {
  Calendar,
  Filter,
  Eye,
  ShoppingBag,
  CreditCard,
  Download,
  Search,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  X,
  PieChart,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HistorialVentasViewProps {
  onReopenTicket?: (venta: Venta, detalles: DetalleVenta[]) => void;
}

export const HistorialVentasView: React.FC<HistorialVentasViewProps> = () => {
  // Date range defaults: Last 30 days
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [fechaInicial, setFechaInicial] = useState<string>(thirtyDaysAgo);
  const [fechaFinal, setFechaFinal] = useState<string>(todayStr);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFormaPago, setSelectedFormaPago] = useState<string>('Todas');

  // Active view inside Historial
  const [activeSubTab, setActiveSubTab] = useState<'ventas' | 'acumulado_productos' | 'acumulado_pagos'>('ventas');

  // Details Modal State
  const [selectedTicketVenta, setSelectedTicketVenta] = useState<Venta | null>(null);
  const [selectedTicketDetalles, setSelectedTicketDetalles] = useState<DetalleVenta[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Ticket Preview/Print Modal
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Quick Date Helpers
  const setQuickRange = (range: 'hoy' | 'ayer' | 'semana' | 'mes' | 'todo') => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (range === 'hoy') {
      setFechaInicial(today);
      setFechaFinal(today);
    } else if (range === 'ayer') {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFechaInicial(yesterday);
      setFechaFinal(yesterday);
    } else if (range === 'semana') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay() || 7; // Monday as 1
      startOfWeek.setDate(startOfWeek.getDate() - day + 1);
      setFechaInicial(startOfWeek.toISOString().split('T')[0]);
      setFechaFinal(today);
    } else if (range === 'mes') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setFechaInicial(startOfMonth);
      setFechaFinal(today);
    } else if (range === 'todo') {
      setFechaInicial('2020-01-01');
      setFechaFinal(today);
    }
  };

  // Queries from SQLite Service
  const ventas = useMemo(() => {
    return sqliteService.getVentas(fechaInicial, fechaFinal);
  }, [fechaInicial, fechaFinal]);

  const acumuladoProductos: AcumuladoProducto[] = useMemo(() => {
    return sqliteService.getAcumuladoProductos(fechaInicial, fechaFinal);
  }, [fechaInicial, fechaFinal]);

  const acumuladoPagos: AcumuladoFormaPago[] = useMemo(() => {
    return sqliteService.getAcumuladoFormasPago(fechaInicial, fechaFinal);
  }, [fechaInicial, fechaFinal]);

  // Filtered Ventas by search & payment
  const filteredVentas = useMemo(() => {
    return ventas.filter((v) => {
      const matchesSearch =
        v.NTicket.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.Cliente.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPago = selectedFormaPago === 'Todas' || v.FormaPago === selectedFormaPago;
      return matchesSearch && matchesPago;
    });
  }, [ventas, searchTerm, selectedFormaPago]);

  // Total summary in range
  const totalMontoVentas = filteredVentas.reduce((sum, v) => sum + v.Monto, 0);

  // Handle click on "Detalles" button on a sale row
  const handleOpenDetalles = (venta: Venta) => {
    const detalles = sqliteService.getDetallesByTicket(venta.NTicket);
    setSelectedTicketVenta(venta);
    setSelectedTicketDetalles(detalles);
    setIsDetailsModalOpen(true);
  };

  // Export to CSV helper
  const handleExportCSV = () => {
    if (activeSubTab === 'ventas') {
      let csv = 'VentasId,Fecha,NTicket,Cliente,Monto,FormaPago\n';
      filteredVentas.forEach((v) => {
        csv += `${v.VentasId},"${v.Fecha}","${v.NTicket}","${v.Cliente}",${v.Monto},"${v.FormaPago}"\n`;
      });
      downloadBlob(csv, `Ventas_${fechaInicial}_al_${fechaFinal}.csv`);
    } else if (activeSubTab === 'acumulado_productos') {
      let csv = 'Plato,Categoria,CantidadTotal,PrecioPromedio,MontoTotal\n';
      acumuladoProductos.forEach((p) => {
        csv += `"${p.Plato}","${p.Categoria}",${p.CantidadTotal},${p.PrecioPromedio},${p.MontoTotal}\n`;
      });
      downloadBlob(csv, `Acumulado_Productos_${fechaInicial}_al_${fechaFinal}.csv`);
    } else {
      let csv = 'FormaPago,Transacciones,MontoTotal,Porcentaje\n';
      acumuladoPagos.forEach((p) => {
        csv += `"${p.FormaPago}",${p.Transacciones},${p.MontoTotal},${p.Porcentaje}%\n`;
      });
      downloadBlob(csv, `Acumulado_FormasPago_${fechaInicial}_al_${fechaFinal}.csv`);
    }
  };

  const downloadBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-950 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h1 className="text-2xl font-black text-stone-100 flex items-center space-x-2">
            <span>Historial de Ventas & Reportes</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-800 text-amber-400 border border-stone-700">
              Tablas: Ventas & Detalles
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Filtre por rango de fechas (Fecha Inicial y Fecha Final), consulte detalles por ticket, productos acumulados sin repetidos y formas de pago.
          </p>
        </div>

        {/* Export CSV button */}
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition-colors shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Exportar CSV / Excel</span>
        </button>
      </div>

      {/* DATE RANGE FILTER CONTAINER */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
        
        {/* Date Inputs & Quick Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Inputs for Fecha Inicial y Fecha Final */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <label className="text-xs font-bold text-stone-300 whitespace-nowrap">Fecha Inicial:</label>
              <input
                type="date"
                value={fechaInicial}
                onChange={(e) => setFechaInicial(e.target.value)}
                className="py-1.5 px-3 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-stone-300 whitespace-nowrap">Fecha Final:</label>
              <input
                type="date"
                value={fechaFinal}
                onChange={(e) => setFechaFinal(e.target.value)}
                className="py-1.5 px-3 bg-stone-950 border border-stone-700 rounded-xl text-stone-100 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] font-semibold text-stone-400 mr-1 hidden sm:inline">Rápido:</span>
            <button
              onClick={() => setQuickRange('hoy')}
              className="px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => setQuickRange('ayer')}
              className="px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors"
            >
              Ayer
            </button>
            <button
              onClick={() => setQuickRange('semana')}
              className="px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors"
            >
              Esta Semana
            </button>
            <button
              onClick={() => setQuickRange('mes')}
              className="px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors"
            >
              Este Mes
            </button>
            <button
              onClick={() => setQuickRange('todo')}
              className="px-2.5 py-1 text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors"
            >
              Todo
            </button>
          </div>

        </div>

        {/* Summary Metric Ribbon */}
        <div className="pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-stone-400 text-[11px]">Tickets Emitidos:</span>
              <p className="text-base font-black text-stone-100">{filteredVentas.length} ventas</p>
            </div>
            <div>
              <span className="text-stone-400 text-[11px]">Monto Total Facturado:</span>
              <p className="text-base font-black text-amber-400">{formatPrice(totalMontoVentas)}</p>
            </div>
            <div>
              <span className="text-stone-400 text-[11px]">Ticket Promedio:</span>
              <p className="text-base font-bold text-stone-300">
                {formatPrice(filteredVentas.length > 0 ? totalMontoVentas / filteredVentas.length : 0)}
              </p>
            </div>
          </div>

          {/* Subtabs selector (Ventas, Acumulado Productos, Acumulado Formas Pago) */}
          <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setActiveSubTab('ventas')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'ventas'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Ventas ({filteredVentas.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('acumulado_productos')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'acumulado_productos'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Productos Acumulados</span>
            </button>

            <button
              onClick={() => setActiveSubTab('acumulado_pagos')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'acumulado_pagos'
                  ? 'bg-amber-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Formas de Pago</span>
            </button>
          </div>

        </div>

      </div>

      {/* SUBTAB 1: TABLA VENTAS CON BOTON "DETALLES" */}
      {activeSubTab === 'ventas' && (
        <div className="space-y-4">
          
          {/* Secondary filter by ticket search or payment */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por N° Ticket o Cliente..."
                className="w-full pl-8 pr-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs text-stone-400">Filtrar Pago:</span>
              <select
                value={selectedFormaPago}
                onChange={(e) => setSelectedFormaPago(e.target.value)}
                className="py-1.5 px-3 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none"
              >
                <option value="Todas">Todas las formas</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Pago Movil">Pago Móvil</option>
                <option value="Punto de Venta">Punto de Venta</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
          </div>

          {/* Ventas Table */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950 border-b border-stone-800 text-stone-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 w-20">VentasId</th>
                    <th className="py-3.5 px-4">Fecha y Hora</th>
                    <th className="py-3.5 px-4">N° Ticket</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Forma de Pago</th>
                    <th className="py-3.5 px-4 text-right">Monto Total</th>
                    <th className="py-3.5 px-4 text-center w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {filteredVentas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-500 text-xs">
                        No se registraron ventas en el intervalo de fecha seleccionado ({fechaInicial} a {fechaFinal}).
                      </td>
                    </tr>
                  ) : (
                    filteredVentas.map((venta) => (
                      <tr key={venta.VentasId} className="hover:bg-stone-800/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-400">#{venta.VentasId}</td>
                        <td className="py-3.5 px-4 font-mono text-stone-300">{venta.Fecha}</td>
                        <td className="py-3.5 px-4 font-mono font-black text-amber-400">
                          {venta.NTicket}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-stone-200">{venta.Cliente}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              venta.FormaPago === 'Efectivo'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                : venta.FormaPago === 'Pago Movil'
                                ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                                : venta.FormaPago === 'Punto de Venta'
                                ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                                : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                            }`}
                          >
                            {venta.FormaPago}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-sm text-stone-100">
                          {formatPrice(venta.Monto)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {/* REQUIRED "Detalles" BUTTON */}
                          <button
                            onClick={() => handleOpenDetalles(venta)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-sm transition-all"
                            title="Ver registros de la tabla Detalles para este ticket"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detalles</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PRODUCTOS ACUMULADOS (SIN REPETIDOS) */}
      {activeSubTab === 'acumulado_productos' && (
        <div className="space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-100 text-sm flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Productos Acumulados en Ventas (Sin Repetidos)</span>
              </h3>
              <p className="text-xs text-stone-400">
                Agrupación consolidada de la tabla <code className="text-amber-300">Detalles</code> por plato entre {fechaInicial} y {fechaFinal}.
              </p>
            </div>
            <div className="text-xs text-stone-300 font-bold bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
              {acumuladoProductos.length} Platos Distintos Vendidos
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950 border-b border-stone-800 text-stone-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 w-12">#</th>
                    <th className="py-3.5 px-4">Plato / Producto</th>
                    <th className="py-3.5 px-4">Categoría</th>
                    <th className="py-3.5 px-4 text-center">Cantidad Acumulada</th>
                    <th className="py-3.5 px-4 text-right">Precio Prom.</th>
                    <th className="py-3.5 px-4 text-right">Monto Acumulado ($)</th>
                    <th className="py-3.5 px-4 w-40">Proporción de Venta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {acumuladoProductos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-500 text-xs">
                        No hay productos registrados en este rango de tiempo.
                      </td>
                    </tr>
                  ) : (
                    acumuladoProductos.map((p, idx) => {
                      const totalMontoG = acumuladoProductos.reduce((s, it) => s + it.MontoTotal, 0);
                      const pct = totalMontoG > 0 ? (p.MontoTotal / totalMontoG) * 100 : 0;

                      return (
                        <tr key={idx} className="hover:bg-stone-800/50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-stone-500">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-stone-100">{p.Plato}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-800 text-amber-400">
                              {p.Categoria}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-sm text-stone-200">
                            {p.CantidadTotal} unds
                          </td>
                          <td className="py-3.5 px-4 text-right text-stone-400 font-mono">
                            {formatPrice(p.PrecioPromedio)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-sm text-amber-400">
                            {formatPrice(p.MontoTotal)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-stone-950 h-2 rounded-full overflow-hidden border border-stone-800">
                                <div
                                  className="bg-amber-500 h-full rounded-full"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-stone-400 w-9 text-right">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ACUMULADO FORMAS DE PAGO */}
      {activeSubTab === 'acumulado_pagos' && (
        <div className="space-y-6">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
            <h3 className="font-bold text-stone-100 text-sm flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Acumulado por Formas de Pago ({fechaInicial} al {fechaFinal})</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Resumen financiero por modalidad de cobro: transacciones, volumen monetario y porcentaje.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {acumuladoPagos.map((pago) => {
              const colorClasses =
                pago.FormaPago === 'Efectivo'
                  ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
                  : pago.FormaPago === 'Pago Movil'
                  ? 'border-sky-500/40 bg-sky-950/20 text-sky-400'
                  : pago.FormaPago === 'Punto de Venta'
                  ? 'border-purple-500/40 bg-purple-950/20 text-purple-400'
                  : 'border-amber-500/40 bg-amber-950/20 text-amber-400';

              return (
                <div
                  key={pago.FormaPago}
                  className={`p-5 rounded-2xl border ${colorClasses} flex flex-col justify-between space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-stone-100">{pago.FormaPago}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-stone-950 rounded-full">
                      {pago.Porcentaje}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      Monto Total Acumulado
                    </span>
                    <p className="text-2xl font-black text-stone-100 mt-0.5">
                      {formatPrice(pago.MontoTotal)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-800/60 flex justify-between items-center text-xs text-stone-400">
                    <span>N° Transacciones:</span>
                    <span className="font-bold text-stone-200">{pago.Transacciones} ventas</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Table */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950 border-b border-stone-800 text-stone-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Forma de Pago</th>
                    <th className="py-3.5 px-4 text-center">Cantidad de Transacciones</th>
                    <th className="py-3.5 px-4 text-right">Monto Total Acumulado ($)</th>
                    <th className="py-3.5 px-4 text-right">Ticket Promedio</th>
                    <th className="py-3.5 px-4 text-right">Porcentaje de Venta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {acumuladoPagos.map((pago) => {
                    const avg = pago.Transacciones > 0 ? pago.MontoTotal / pago.Transacciones : 0;
                    return (
                      <tr key={pago.FormaPago} className="hover:bg-stone-800/50">
                        <td className="py-3.5 px-4 font-bold text-stone-100">{pago.FormaPago}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-stone-200">{pago.Transacciones}</td>
                        <td className="py-3.5 px-4 text-right font-black text-sm text-amber-400">
                          {formatPrice(pago.MontoTotal)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-stone-300">
                          {formatPrice(avg)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-stone-100">
                          {pago.Porcentaje}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTROS DE LA TABLA 'DETALLES' DEL TICKET SELECCIONADO */}
      {isDetailsModalOpen && selectedTicketVenta && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-stone-100 flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>Detalles de Venta: {selectedTicketVenta.NTicket}</span>
                </h3>
                <p className="text-xs text-stone-400">
                  Tabla SQLite: <code className="text-amber-300">Detalles</code> vinculada por campo <code className="text-amber-300">NTicket</code>
                </p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Venta Header info card */}
            <div className="p-4 bg-stone-950/60 border-b border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-stone-500">N° Ticket:</span>
                <p className="font-mono font-bold text-amber-400">{selectedTicketVenta.NTicket}</p>
              </div>
              <div>
                <span className="text-stone-500">Fecha y Hora:</span>
                <p className="font-mono text-stone-200">{selectedTicketVenta.Fecha}</p>
              </div>
              <div>
                <span className="text-stone-500">Cliente:</span>
                <p className="font-semibold text-stone-200">{selectedTicketVenta.Cliente}</p>
              </div>
              <div>
                <span className="text-stone-500">Forma de Pago:</span>
                <p className="font-bold text-emerald-400">{selectedTicketVenta.FormaPago}</p>
              </div>
            </div>

            {/* Detalles Records Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-stone-950 border border-stone-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-900 border-b border-stone-800 text-stone-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">DetallesId</th>
                      <th className="py-2.5 px-3">Plato</th>
                      <th className="py-2.5 px-3">Categoría</th>
                      <th className="py-2.5 px-3 text-right">Precio Unit.</th>
                      <th className="py-2.5 px-3 text-center">Cantidad</th>
                      <th className="py-2.5 px-3 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80">
                    {selectedTicketDetalles.map((d) => (
                      <tr key={d.DetallesId} className="hover:bg-stone-900/60">
                        <td className="py-2.5 px-3 font-mono text-stone-400">#{d.DetallesId}</td>
                        <td className="py-2.5 px-3 font-bold text-stone-100">{d.Plato}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-stone-800 text-amber-400 font-semibold">
                            {d.Categoria}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-stone-300">{formatPrice(d.Precio)}</td>
                        <td className="py-2.5 px-3 text-center font-black text-amber-400">{d.Cantidad}</td>
                        <td className="py-2.5 px-3 text-right font-black text-stone-100">{formatPrice(d.Importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-900 font-bold border-t border-stone-800">
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-right uppercase text-stone-300">
                        Monto Total (Tabla Ventas):
                      </td>
                      <td className="py-3 px-3 text-right text-base font-black text-amber-400">
                        {formatPrice(selectedTicketVenta.Monto)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-stone-950 border-t border-stone-800 flex justify-between items-center">
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setIsTicketModalOpen(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs shadow-md transition-all"
              >
                <Receipt className="w-4 h-4" />
                <span>Ver / Imprimir Ticket Térmico</span>
              </button>

              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PRINTABLE TICKET MODAL */}
      <TicketModal
        venta={selectedTicketVenta}
        detalles={selectedTicketDetalles}
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
      />

    </div>
  );
};
