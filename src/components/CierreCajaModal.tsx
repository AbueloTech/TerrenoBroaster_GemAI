import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  DollarSign,
  Calculator,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  Printer,
  Calendar,
  Clock,
  User,
  FileSpreadsheet,
  Receipt,
  FileCheck,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  Sparkles,
  Layers,
  History,
  RotateCcw,
  Check,
} from 'lucide-react';
import { sqliteService } from '../db/sqliteService';
import { formatCurrency, formatPrice } from '../utils/currency';
import { CierreCaja, Usuario } from '../types';
import { kitchenPrinterService } from '../services/kitchenPrinterService';
import { safeStorage } from '../utils/safeStorage';
import confetti from 'canvas-confetti';

interface CierreCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: Usuario | null;
}

export const CierreCajaModal: React.FC<CierreCajaModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'cierre' | 'historial'>('cierre');
  const [selectedFecha, setSelectedFecha] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  // Arqueo de Caja inputs (in Colombian Pesos COP)
  const [fondoInicial, setFondoInicial] = useState<number>(() => {
    const saved = safeStorage.getItem('tb_fondo_caja_default');
    const parsed = saved ? Number(saved) : 0;
    // Standard starting float in Colombia is $50.000 or $100.000 COP (not $20 USD)
    return parsed >= 1000 ? parsed : 50000;
  });
  const [efectivoContado, setEfectivoContado] = useState<string>('');
  const [notasCajero, setNotasCajero] = useState<string>('');

  // Colombian Denomination Counter Helper (Billetes de Colombia: 100k, 50k, 20k, 10k, 5k, 2k)
  const [showDenomHelper, setShowDenomHelper] = useState<boolean>(false);
  const [billetesCount, setBilletesCount] = useState<{ [denom: number]: number }>({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
  });
  const [monedasValor, setMonedasValor] = useState<string>('');

  // Save to PC status
  const [isDbSavedToPc, setIsDbSavedToPc] = useState<boolean>(false);
  const [savedDbDetails, setSavedDbDetails] = useState<{
    filename: string;
    sizeKb: number;
    time: string;
    method: string;
  } | null>(null);
  const [isSavingDb, setIsSavingDb] = useState<boolean>(false);

  // Past closures history
  const [historialCierres, setHistorialCierres] = useState<CierreCaja[]>([]);

  // Confirmed closed closure for this date (if already closed)
  const [cierreExistente, setCierreExistente] = useState<CierreCaja | null>(null);

  // Success message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load stats from SQLite for the selected date
  const stats = useMemo(() => {
    return sqliteService.getCierreCajaStats(selectedFecha);
  }, [selectedFecha, isOpen]);

  const loadData = () => {
    const cierres = sqliteService.getCierresCaja();
    setHistorialCierres(cierres);

    const exist = sqliteService.getCierreCajaDelDia(selectedFecha);
    setCierreExistente(exist);

    if (exist) {
      setFondoInicial(Math.round(exist.FondoInicial));
      setEfectivoContado(String(Math.round(exist.EfectivoContado)));
      setNotasCajero(exist.Notas || '');
      setIsDbSavedToPc(exist.ArchivoGuardado);
    } else {
      // Default initial cash in Colombian Pesos (COP)
      const saved = safeStorage.getItem('tb_fondo_caja_default');
      const parsed = saved ? Number(saved) : 0;
      const defFondo = parsed >= 1000 ? parsed : 50000;
      setFondoInicial(defFondo);
      // Pre-fill counted cash equal to expected cash to save cashier time
      const expectedCash = Math.round(defFondo + stats.totalEfectivo);
      setEfectivoContado(String(expectedCash));
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedFecha]);

  // Calculations for Arqueo de Caja (in Colombian Pesos COP - no centavos)
  const totalEfectivoSistema = Math.round(stats.totalEfectivo);
  const efectivoEsperado = Math.round(fondoInicial + totalEfectivoSistema);
  const efectivoContadoNum = Math.round(Number(efectivoContado) || 0);
  const diferencia = efectivoContadoNum - efectivoEsperado;

  const isCuadrada = diferencia === 0;
  const isSobrante = diferencia > 0;
  const isFaltante = diferencia < 0;

  // Calculate total from bill breakdown
  const totalBilletesSum = useMemo(() => {
    const sumBilletes = Object.entries(billetesCount).reduce(
      (acc, [denom, qty]) => acc + Number(denom) * (Number(qty) || 0),
      0
    );
    const sumMonedas = Number(monedasValor) || 0;
    return sumBilletes + sumMonedas;
  }, [billetesCount, monedasValor]);

  const applyBilletesTotal = () => {
    setEfectivoContado(String(totalBilletesSum));
    showToast(`Conteo de billetes aplicado: ${formatPrice(totalBilletesSum, true)}`);
  };

  // Handle saving SQLite database to PC
  const handleSaveDatabaseToPc = async (withPicker = true) => {
    setIsSavingDb(true);
    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      let res;
      if (withPicker) {
        res = await sqliteService.saveDatabaseToLocalPc({
          customFilename: `TerrenoBroaster_${selectedFecha}.db`,
          suggestDatedBackup: true,
        });
      } else {
        sqliteService.downloadDatabaseFile(`TerrenoBroaster_Cierre_${selectedFecha}.db`);
        // Also download TerrenoBroaster.db for quick replacement
        setTimeout(() => {
          sqliteService.downloadDatabaseFile('TerrenoBroaster.db');
        }, 500);
        res = {
          success: true,
          filename: `TerrenoBroaster_Cierre_${selectedFecha}.db & TerrenoBroaster.db`,
          sizeKb: Number((sqliteService.exportDatabase().byteLength / 1024).toFixed(1)),
          method: 'download',
        };
      }

      setIsDbSavedToPc(true);
      setSavedDbDetails({
        filename: res.filename,
        sizeKb: res.sizeKb,
        time: timeStr,
        method: res.method === 'native-file' ? 'Guardado directo en PC' : 'Descarga directa',
      });

      showToast(`¡Base de datos guardada y respaldada en tu PC (${res.sizeKb} KB)!`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Fallback to auto-download
        sqliteService.downloadDatabaseFile(`TerrenoBroaster_${selectedFecha}.db`);
        setIsDbSavedToPc(true);
        showToast('Base de datos descargada como archivo en tu PC.');
      }
    } finally {
      setIsSavingDb(false);
    }
  };

  // Print official Cierre Z ticket
  const handlePrintCierreZ = async () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const cajeroNombre = currentUser?.Username || 'Administrador';

    const ticketLines = [
      '==========================================',
      '        TERRENO BROASTER & PIZZA          ',
      '     CIERRE DE CAJA / REPORTE Z           ',
      '   Moneda: Pesos Colombianos (COP)        ',
      '==========================================',
      `Fecha: ${selectedFecha}  Hora: ${timeStr}`,
      `Cajero / Responsable: ${cajeroNombre}`,
      '------------------------------------------',
      'RESUMEN GENERAL DE VENTAS:',
      `Total Facturado:      ${formatCurrency(stats.totalVentas)} COP`,
      `Tickets Emitidos:     ${stats.totalPedidos} ventas`,
      `Ticket Promedio:      ${formatCurrency(stats.ticketPromedio)} COP`,
      '------------------------------------------',
      'DESGLOSE POR FORMA DE PAGO:',
      `Efectivo (${stats.countEfectivo}x):        ${formatCurrency(stats.totalEfectivo)} COP`,
      `Pago Móvil / Nequi (${stats.countPagoMovil}x): ${formatCurrency(stats.totalPagoMovil)} COP`,
      `Punto / Datáfono (${stats.countPuntoVenta}x):  ${formatCurrency(stats.totalPuntoVenta)} COP`,
      `Transferencia (${stats.countTransferencia}x):   ${formatCurrency(stats.totalTransferencia)} COP`,
      '------------------------------------------',
      'ARQUEO DE EFECTIVO EN GAVETA (COP):',
      `Fondo Inicial de Caja: ${formatCurrency(fondoInicial)} COP`,
      `Ventas en Efectivo:    ${formatCurrency(totalEfectivoSistema)} COP`,
      `Efectivo Esperado:     ${formatCurrency(efectivoEsperado)} COP`,
      `Efectivo Contado:      ${formatCurrency(efectivoContadoNum)} COP`,
      `Diferencia de Caja:    ${isCuadrada ? 'CUADRADA ($ 0 COP)' : isSobrante ? `SOBRANTE (+${formatCurrency(diferencia)} COP)` : `FALTANTE (-${formatCurrency(Math.abs(diferencia))} COP)`}`,
      '------------------------------------------',
      `Pedidos WhatsApp:     ${stats.waStats.total} (${stats.waStats.delivery} delivery, ${stats.waStats.paraLlevar} llevar)`,
      `Comandas Totales:     ${stats.comandasStats.total}`,
      '------------------------------------------',
      `Base de Datos PC:      ${isDbSavedToPc ? 'RESPALDADA Y GUARDADA' : 'PENDIENTE DE GUARDAR'}`,
      notasCajero ? `Notas: ${notasCajero}` : '',
      '==========================================',
      '       FIN DEL REPORTE DE CIERRE Z        ',
      '==========================================',
    ].filter(Boolean);

    // Print to Bluetooth printer if connected
    if (kitchenPrinterService.isBluetoothConnected()) {
      try {
        const textPayload = ticketLines.join('\n') + '\n\n\n';
        const encoder = new TextEncoder();
        await (kitchenPrinterService as any).characteristic?.writeValue(encoder.encode(textPayload));
        showToast('¡Ticket de Cierre Z impreso por Bluetooth!');
        return;
      } catch (err) {
        console.warn('Bluetooth print failed, falling back to window print:', err);
      }
    }

    // Standard Print Preview
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cierre de Caja - ${selectedFecha}</title>
          <style>
            body { font-family: 'Courier New', monospace; font-size: 13px; margin: 10px; color: #000; }
            pre { margin: 0; white-space: pre-wrap; line-height: 1.35; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <pre>${ticketLines.join('\n')}</pre>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
    showToast('Reporte Z enviado a impresión.');
  };

  // Finalize and save Cierre to SQLite database
  const handleFinalizarCierre = () => {
    // If not saved to PC yet, remind and auto-save
    if (!isDbSavedToPc) {
      handleSaveDatabaseToPc(false);
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const cajeroNombre = currentUser?.Username || 'Administrador';

    // Save default fondo for tomorrow
    safeStorage.setItem('tb_fondo_caja_default', String(fondoInicial));

    const nuevoCierre = sqliteService.createCierreCaja({
      Fecha: selectedFecha,
      Hora: timeStr,
      TotalVentas: stats.totalVentas,
      TotalPedidos: stats.totalPedidos,
      TicketPromedio: stats.ticketPromedio,
      TotalEfectivo: stats.totalEfectivo,
      TotalPagoMovil: stats.totalPagoMovil,
      TotalPuntoVenta: stats.totalPuntoVenta,
      TotalTransferencia: stats.totalTransferencia,
      FondoInicial: fondoInicial,
      EfectivoEsperado: efectivoEsperado,
      EfectivoContado: efectivoContadoNum,
      Diferencia: diferencia,
      Cajero: cajeroNombre,
      Notas: notasCajero.trim() || undefined,
      ArchivoGuardado: isDbSavedToPc,
    });

    setCierreExistente(nuevoCierre);
    setHistorialCierres(sqliteService.getCierresCaja());

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#f59e0b', '#3b82f6', '#ffffff'],
    });

    showToast(`¡Cierre de caja del día ${selectedFecha} registrado exitosamente!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-amber-950/80 via-stone-900 to-stone-900 px-6 py-4 border-b border-stone-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Calculator className="w-6 h-6 text-stone-950 font-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white tracking-wide">
                  Cierre de Caja <span className="text-amber-400">&</span> Resumen del Día
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                  <span>🇨🇴</span>
                  <span>Pesos Colombianos (COP)</span>
                </span>
                {cierreExistente && (
                  <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Cerrado a las {cierreExistente.Hora}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                Arqueo en Pesos Colombianos (COP), reporte Z de ventas y guardado obligatorio de la base de datos en tu PC
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab switch */}
            <div className="bg-stone-950 p-1 rounded-xl border border-stone-800 flex items-center space-x-1 text-xs">
              <button
                onClick={() => setActiveTab('cierre')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'cierre'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Cierre Actual</span>
              </button>
              <button
                onClick={() => setActiveTab('historial')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'historial'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Historial ({historialCierres.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Selector & Status Header */}
        <div className="bg-stone-950 px-6 py-2.5 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-stone-400 font-semibold flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Fecha del Cierre:</span>
            </span>
            <input
              type="date"
              value={selectedFecha}
              onChange={(e) => setSelectedFecha(e.target.value)}
              className="bg-stone-900 border border-stone-700 text-stone-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
            />
            {selectedFecha !== new Date().toISOString().substring(0, 10) && (
              <button
                onClick={() => {
                  const now = new Date();
                  setSelectedFecha(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
                }}
                className="text-[11px] text-amber-400 hover:underline font-semibold"
              >
                Volver a Hoy
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3 text-stone-400">
            <span className="flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-stone-500" />
              <span>Responsable: <strong className="text-stone-200">{currentUser?.Username || 'Administrador'}</strong></span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              <span className="font-mono">{new Date().toLocaleTimeString()}</span>
            </span>
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="bg-emerald-600 text-stone-950 font-bold px-4 py-2 text-xs flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-stone-950/70 hover:text-stone-950">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {activeTab === 'cierre' ? (
            <>
              {/* SECTION 1: METRICS ROW */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-950/90 border border-amber-500/40 rounded-xl p-3.5 shadow-md">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    Total Facturado
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-1">
                    {formatCurrency(stats.totalVentas)}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-0.5 block">
                    {stats.totalPedidos} venta{stats.totalPedidos !== 1 ? 's' : ''} realizada{stats.totalPedidos !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-3.5">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                    Efectivo Total
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                    {formatCurrency(stats.totalEfectivo)}
                  </div>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    {stats.countEfectivo} cobro{stats.countEfectivo !== 1 ? 's' : ''} en efectivo
                  </span>
                </div>

                <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-3.5">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                    Dinero Electrónico
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono mt-1">
                    {formatCurrency(stats.totalPagoMovil + stats.totalPuntoVenta + stats.totalTransferencia)}
                  </div>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    P. Móvil + Punto + Transf.
                  </span>
                </div>

                <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-3.5">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                    Ticket Promedio
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-stone-200 font-mono mt-1">
                    {formatCurrency(stats.ticketPromedio)}
                  </div>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    WhatsApp: {stats.waStats.total} pedidos
                  </span>
                </div>
              </div>

              {/* Warning if there are active kitchen comandas */}
              {stats.comandasStats.cocina > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Aviso: Hay <strong>{stats.comandasStats.cocina} comanda(s) activas en Cocina</strong> que no han sido cobradas aún.
                    </span>
                  </div>
                </div>
              )}

              {/* SECTION 2: DESGLOSE POR FORMA DE PAGO */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-300 flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Desglose por Formas de Pago</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800">
                    <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs">
                      <Banknote className="w-4 h-4" />
                      <span>Efectivo</span>
                    </div>
                    <div className="text-base font-black text-stone-100 font-mono mt-1.5">
                      {formatCurrency(stats.totalEfectivo)}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      {stats.countEfectivo} pagos ({stats.totalVentas > 0 ? ((stats.totalEfectivo / stats.totalVentas) * 100).toFixed(0) : 0}%)
                    </div>
                  </div>

                  <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800">
                    <div className="flex items-center space-x-1.5 text-sky-400 font-bold text-xs">
                      <Smartphone className="w-4 h-4" />
                      <span>Pago Móvil</span>
                    </div>
                    <div className="text-base font-black text-stone-100 font-mono mt-1.5">
                      {formatCurrency(stats.totalPagoMovil)}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      {stats.countPagoMovil} pagos ({stats.totalVentas > 0 ? ((stats.totalPagoMovil / stats.totalVentas) * 100).toFixed(0) : 0}%)
                    </div>
                  </div>

                  <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800">
                    <div className="flex items-center space-x-1.5 text-purple-400 font-bold text-xs">
                      <CreditCard className="w-4 h-4" />
                      <span>Punto de Venta</span>
                    </div>
                    <div className="text-base font-black text-stone-100 font-mono mt-1.5">
                      {formatCurrency(stats.totalPuntoVenta)}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      {stats.countPuntoVenta} pagos ({stats.totalVentas > 0 ? ((stats.totalPuntoVenta / stats.totalVentas) * 100).toFixed(0) : 0}%)
                    </div>
                  </div>

                  <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800">
                    <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs">
                      <Building2 className="w-4 h-4" />
                      <span>Transferencia</span>
                    </div>
                    <div className="text-base font-black text-stone-100 font-mono mt-1.5">
                      {formatCurrency(stats.totalTransferencia)}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      {stats.countTransferencia} pagos ({stats.totalVentas > 0 ? ((stats.totalTransferencia / stats.totalVentas) * 100).toFixed(0) : 0}%)
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ARQUEO DE EFECTIVO & CONCILIACIÓN EN PESOS COLOMBIANOS (COP) */}
              <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-200">
                      Arqueo de Gaveta & Conciliación (Pesos Colombianos - COP)
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowDenomHelper(!showDenomHelper)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1.5 cursor-pointer ${
                        showDenomHelper
                          ? 'bg-amber-500 text-stone-950 border-amber-400'
                          : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>{showDenomHelper ? 'Ocultar Desglose Billetes' : 'Contador de Billetes COP'}</span>
                    </button>
                  </div>
                </div>

                {/* Optional Colombian Bill Breakdown Counter */}
                {showDenomHelper && (
                  <div className="bg-stone-900/90 border border-amber-500/30 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                        <Banknote className="w-4 h-4 text-amber-400" />
                        <span>Desglose por Billetes de Colombia (COP)</span>
                      </span>
                      <span className="text-[11px] text-stone-400">
                        Ingresa la cantidad de billetes de cada denominación
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                      {[100000, 50000, 20000, 10000, 5000, 2000].map((denom) => (
                        <div key={denom} className="bg-stone-950 p-2 rounded-lg border border-stone-800 text-center">
                          <span className="text-[11px] font-bold text-amber-400 font-mono block">
                            ${(denom / 1000).toFixed(0)}k COP
                          </span>
                          <span className="text-[9px] text-stone-500 block mb-1">
                            ${denom.toLocaleString('es-CO')}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={billetesCount[denom] || ''}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setBilletesCount((prev) => ({ ...prev, [denom]: val }));
                            }}
                            placeholder="0"
                            className="w-full text-center py-1 bg-stone-900 border border-stone-700 rounded text-stone-100 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                          />
                          <span className="text-[9px] text-stone-400 font-mono block mt-1">
                            = ${((billetesCount[denom] || 0) * denom).toLocaleString('es-CO')}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-800 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-stone-400 text-[11px]">Total Monedas (COP):</span>
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-500 text-xs font-bold">$</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={monedasValor}
                            onChange={(e) => setMonedasValor(e.target.value)}
                            placeholder="0"
                            className="w-full pl-6 pr-2 py-1 bg-stone-950 border border-stone-700 rounded text-stone-200 text-xs font-mono font-bold focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-stone-300 font-semibold text-xs">
                          Suma Conteo: <strong className="text-emerald-400 font-mono text-sm">${totalBilletesSum.toLocaleString('es-CO')} COP</strong>
                        </span>
                        <button
                          type="button"
                          onClick={applyBilletesTotal}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-black rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Aplicar Conteo al Arqueo
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Fondo Inicial */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-stone-400 flex items-center justify-between">
                      <span>Fondo Inicial de Caja (COP):</span>
                      <span className="text-[10px] text-stone-500">Base / Cambio</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/80 font-bold text-xs font-mono">$ COP</span>
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        value={fondoInicial}
                        onChange={(e) => setFondoInicial(Math.round(Number(e.target.value) || 0))}
                        placeholder="50000"
                        className="w-full pl-16 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    {/* Quick float presets in COP */}
                    <div className="flex items-center space-x-1.5 pt-0.5">
                      <span className="text-[10px] text-stone-500">Común:</span>
                      {[50000, 100000, 200000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFondoInicial(preset)}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                            fondoInicial === preset
                              ? 'bg-amber-500 text-stone-950 font-bold'
                              : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
                          }`}
                        >
                          ${(preset / 1000).toFixed(0)}k
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Efectivo Esperado (Calculado) */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-stone-400">
                      Efectivo Total Esperado:
                    </label>
                    <div className="py-2 px-3 bg-stone-900/90 border border-stone-800 rounded-xl font-mono text-base font-black text-amber-400 flex items-center justify-between">
                      <span>{formatCurrency(efectivoEsperado)}</span>
                      <span className="text-[10px] font-bold text-stone-500">COP</span>
                    </div>
                    <span className="text-[10px] text-stone-500 block">
                      Fondo ({formatCurrency(fondoInicial)}) + Ventas Efectivo ({formatCurrency(totalEfectivoSistema)})
                    </span>
                  </div>

                  {/* Efectivo Contado (Físico) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-stone-300">
                        Efectivo Contado en Gaveta:
                      </label>
                      <button
                        type="button"
                        onClick={() => setEfectivoContado(String(efectivoEsperado))}
                        className="text-[10px] text-amber-400 hover:underline font-semibold"
                        title="Rellena con el monto esperado si no hubo diferencias"
                      >
                        Copiar Esperado
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/80 font-bold text-xs font-mono">$ COP</span>
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        value={efectivoContado}
                        onChange={(e) => setEfectivoContado(e.target.value)}
                        placeholder="Ej: 350000"
                        className="w-full pl-16 pr-3 py-2 bg-stone-900 border border-emerald-500/60 rounded-xl text-emerald-300 font-mono text-base font-black focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                    <span className="text-[10px] text-stone-400 block">
                      Digita el efectivo físico contado en Pesos Colombianos
                    </span>
                  </div>
                </div>

                {/* Live Reconciliation Feedback Banner in Colombian Pesos */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-bold transition-all ${
                    isCuadrada
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : isSobrante
                      ? 'bg-sky-950/60 border-sky-500/50 text-sky-300'
                      : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {isCuadrada ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 shrink-0" />
                    )}
                    <div>
                      <div>
                        {isCuadrada && 'Caja Cuadrada Perfecta ($ 0 COP) — El conteo coincide exactamente'}
                        {isSobrante && `Sobrante de Caja: +${formatCurrency(diferencia)} COP`}
                        {isFaltante && `Faltante de Caja: -${formatCurrency(Math.abs(diferencia))} COP`}
                      </div>
                      <div className="text-[11px] font-normal opacity-85 mt-0.5">
                        Esperado: {formatCurrency(efectivoEsperado)} COP | Contado Físico: {formatCurrency(efectivoContadoNum)} COP
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-base font-black">
                    {diferencia > 0 ? `+${formatCurrency(diferencia)} COP` : `${formatCurrency(diferencia)} COP`}
                  </span>
                </div>

                {/* Notes input */}
                <div>
                  <label className="text-[11px] font-semibold text-stone-400 mb-1 block">
                    Observaciones o Notas del Cierre (opcional):
                  </label>
                  <input
                    type="text"
                    value={notasCajero}
                    onChange={(e) => setNotasCajero(e.target.value)}
                    placeholder="Ej: Se retiraron $50.000 para compra de insumos, caja entregada a Carlos..."
                    className="w-full px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* SECTION 4: MANDATORY PC SQLITE DATABASE SAVE & BACKUP */}
              <div className="bg-gradient-to-r from-amber-950/40 via-stone-950 to-stone-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                        Paso Esencial: Actualizar y Guardar Base de Datos en tu PC
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Guarda el archivo <code className="text-amber-300 font-mono font-bold">TerrenoBroaster.db</code> directamente en tu computadora para garantizar que nunca se pierda tu trabajo.
                      </p>
                    </div>
                  </div>

                  {isDbSavedToPc ? (
                    <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-stone-950 shadow-md">
                      <Check className="w-4 h-4" />
                      <span>Base de Datos Guardada en PC</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Guardado Pendiente</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {/* Action 1: Native Save / Overwrite on PC */}
                  <button
                    onClick={() => handleSaveDatabaseToPc(true)}
                    disabled={isSavingDb}
                    className="flex-1 min-w-[240px] px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-stone-950" />
                    <span>Guardar / Sobrescribir en mi PC (1 Clic)</span>
                  </button>

                  {/* Action 2: Direct Dated Backup Download */}
                  <button
                    onClick={() => handleSaveDatabaseToPc(false)}
                    disabled={isSavingDb}
                    className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    title="Descarga el archivo con la fecha del día para guardar una copia de respaldo"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Descargar Copia de Respaldo (.db)</span>
                  </button>
                </div>

                {savedDbDetails && (
                  <div className="bg-stone-900/80 border border-stone-800 rounded-xl px-3.5 py-2 text-xs flex flex-wrap items-center justify-between text-stone-300 gap-2">
                    <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{savedDbDetails.method}: <strong>{savedDbDetails.filename}</strong></span>
                    </span>
                    <span className="text-stone-400 font-mono">
                      {savedDbDetails.sizeKb} KB • Guardado a las {savedDbDetails.time}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* TAB 2: HISTORIAL DE CIERRES ANTERIORES */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-200 flex items-center space-x-2">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>Historial de Cierres de Caja Registrados</span>
                </h3>
                <span className="text-xs text-stone-400 font-mono">
                  {historialCierres.length} cierre{historialCierres.length !== 1 ? 's' : ''} en base de datos
                </span>
              </div>

              {historialCierres.length === 0 ? (
                <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-10 text-center text-stone-400 space-y-2">
                  <Calculator className="w-8 h-8 text-stone-600 mx-auto" />
                  <p className="font-semibold text-sm">No se han registrado cierres de caja aún</p>
                  <p className="text-xs text-stone-500">
                    Al confirmar el cierre de hoy, quedará registrado permanentemente aquí para auditoría y consulta.
                  </p>
                </div>
              ) : (
                <div className="bg-stone-950 border border-stone-800 rounded-xl overflow-hidden shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-900 border-b border-stone-800 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Fecha y Hora</th>
                        <th className="py-2.5 px-3">Cajero</th>
                        <th className="py-2.5 px-3 text-right">Total Ventas</th>
                        <th className="py-2.5 px-3 text-center">Tickets</th>
                        <th className="py-2.5 px-3 text-right">Efectivo Esp.</th>
                        <th className="py-2.5 px-3 text-right">Efectivo Cont.</th>
                        <th className="py-2.5 px-3 text-center">Diferencia</th>
                        <th className="py-2.5 px-3 text-center">Respaldo PC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/80">
                      {historialCierres.map((c) => {
                        const isDiffZero = Math.abs(c.Diferencia) < 1;
                        return (
                          <tr key={c.CierreId} className="hover:bg-stone-900/50">
                            <td className="py-2.5 px-3 font-mono text-stone-300">
                              <span className="font-bold text-white">{c.Fecha}</span>
                              <span className="text-[10px] text-stone-500 ml-1.5">{c.Hora}</span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-stone-200">
                              {c.Cajero}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                              {formatCurrency(c.TotalVentas)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-stone-300">
                              {c.TotalPedidos}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-stone-400">
                              {formatCurrency(c.EfectivoEsperado)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-200">
                              {formatCurrency(c.EfectivoContado)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] ${
                                  isDiffZero
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : c.Diferencia > 0
                                    ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {isDiffZero ? 'Exacto ($ 0)' : c.Diferencia > 0 ? `+${formatCurrency(c.Diferencia)}` : formatCurrency(c.Diferencia)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {c.ArchivoGuardado ? (
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center justify-center space-x-1">
                                  <Check className="w-3 h-3" />
                                  <span>Guardado</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-500">No</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Actions Footer */}
        <div className="bg-stone-950 px-6 py-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            {/* Print Cierre Z Button */}
            <button
              onClick={handlePrintCierreZ}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Imprimir el ticket de Cierre Z en impresora térmica o Bluetooth"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir Ticket Z (Cierre de Caja)</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold transition-colors"
            >
              Cerrar Ventana
            </button>

            {/* Confirm Cierre button */}
            {activeTab === 'cierre' && (
              <button
                onClick={handleFinalizarCierre}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-stone-950 font-black shadow-lg shadow-emerald-600/20 flex items-center space-x-2 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {cierreExistente ? 'Actualizar Cierre del Día' : 'Finalizar & Registrar Cierre del Día'}
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
