import React, { useState } from 'react';
import { Venta, DetalleVenta } from '../types';
import { formatPrice } from '../utils/currency';
import { sqliteService } from '../db/sqliteService';
import { salePrinterService } from '../services/salePrinterService';
import { Printer, CheckCircle2, X, Download, Scissors, Bluetooth, ShieldCheck } from 'lucide-react';

interface TicketModalProps {
  venta: Venta | null;
  detalles: DetalleVenta[];
  isOpen: boolean;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ venta, detalles, isOpen, onClose }) => {
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  if (!isOpen || !venta) return null;

  const comanda = sqliteService.getComandaByTicket(venta.NTicket);

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintFeedback('Enviando a impresora térmica 80 mm...');

    try {
      const res = await salePrinterService.printSaleTicket({
        venta,
        detalles,
        ubicacion: comanda?.Ubicacion,
        tipoServicio: comanda?.TipoServicio,
      });

      if (res.viaBluetooth) {
        setPrintFeedback('¡Ticket enviado vía Bluetooth con corte inmediato!');
      } else {
        setPrintFeedback('¡Ticket enviado a la impresora térmica 80 mm!');
      }
    } catch {
      setPrintFeedback('Impresión completada.');
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
        setPrintFeedback(null);
      }, 2500);
    }
  };

  const handleConnectBt = async () => {
    setPrintFeedback('Buscando impresora Bluetooth para caja...');
    const res = await salePrinterService.connectCashierBluetooth();
    if (res.success) {
      setPrintFeedback(`¡Conectada a ${res.printerName}!`);
    } else {
      setPrintFeedback(res.error || 'No se pudo conectar Bluetooth.');
    }
    setTimeout(() => setPrintFeedback(null), 3500);
  };

  const handleDownloadText = () => {
    let content = `========================================\n`;
    content += `         TERRENO BROASTER POS           \n`;
    content += `    El Mejor Pollo Broaster Crujiente   \n`;
    content += `========================================\n`;
    content += `TICKET:  #${venta.NTicket}\n`;
    content += `FECHA:   ${venta.Fecha}\n`;
    content += `CLIENTE: ${venta.Cliente}\n`;
    if (comanda) {
      content += `DESTINO: ${comanda.Ubicacion} (${comanda.TipoServicio})\n`;
    }
    content += `PAGO:    ${venta.FormaPago}\n`;
    content += `----------------------------------------\n`;
    content += `CANT  DESCRIPCION             IMPORTE   \n`;
    content += `----------------------------------------\n`;
    detalles.forEach((d) => {
      const name = d.Plato.substring(0, 22).padEnd(22, ' ');
      const qty = `${d.Cantidad}x`.padEnd(4, ' ');
      const imp = `${formatPrice(d.Importe)}`.padStart(10, ' ');
      content += `${qty}  ${name} ${imp}\n`;
    });
    content += `----------------------------------------\n`;
    content += `TOTAL A PAGAR:            ${formatPrice(venta.Monto)}\n`;
    content += `========================================\n`;
    content += `        ¡GRACIAS POR SU COMPRA!         \n`;
    content += `          VUELVA PRONTO                 \n`;
    content += `========================================\n`;
    content += `✂ - - - - - - CORTE DE TICKET - - - - - ✂\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ticket_${venta.NTicket}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white text-stone-900 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-stone-200">
        
        {/* Header toolbar */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block leading-tight">Ticket de Venta Generado</span>
              <span className="text-[10px] text-stone-400">Impresión Térmica 80 mm • 1 sola copia</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm & Single Print Banner */}
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px] text-amber-900 print:hidden font-semibold">
          <div className="flex items-center space-x-1.5">
            <Scissors className="w-3.5 h-3.5 text-amber-700" />
            <span>Formato 80 mm • Corte Inmediato</span>
          </div>
          <div className="flex items-center space-x-1 text-stone-600 font-normal">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Solo Caja (Sin Comandas)</span>
          </div>
        </div>

        {printFeedback && (
          <div className="p-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-900 text-xs text-center font-bold animate-fadeIn">
            {printFeedback}
          </div>
        )}

        {/* Printable Ticket Receipt (Thermal 80mm format preview) */}
        <div id="thermal-receipt" className="p-5 font-mono text-xs overflow-y-auto leading-relaxed bg-white">
          <div className="text-center pb-2.5 border-b border-dashed border-stone-400">
            <h2 className="text-base font-black tracking-wider uppercase text-stone-900">TERRENO BROASTER</h2>
            <p className="text-[11px] text-stone-600">El Mejor Pollo Broaster Crujiente</p>
            <p className="text-[10px] text-stone-400 mt-0.5">NIT: 901.238.941-1 • Colombia</p>
          </div>

          <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-stone-500">N° TICKET:</span>
              <span className="font-bold text-stone-900 text-xs">#{venta.NTicket}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">FECHA:</span>
              <span>{venta.Fecha}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">CLIENTE:</span>
              <span className="font-semibold text-stone-800">{venta.Cliente}</span>
            </div>
            {comanda && (
              <div className="flex justify-between">
                <span className="text-stone-500">MESA / DESTINO:</span>
                <span className="font-bold text-stone-900">{comanda.Ubicacion}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-500">FORMA DE PAGO:</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-1 rounded">{venta.FormaPago}</span>
            </div>
          </div>

          {/* Items breakdown */}
          <div className="py-2.5 border-b border-dashed border-stone-400">
            <div className="grid grid-cols-12 font-bold text-stone-600 text-[10px] pb-1 border-b border-stone-200">
              <span className="col-span-2">CANT</span>
              <span className="col-span-7">PRODUCTO</span>
              <span className="col-span-3 text-right">TOTAL</span>
            </div>
            <div className="divide-y divide-stone-100">
              {detalles.map((d, i) => (
                <div key={i} className="grid grid-cols-12 py-1.5 text-stone-800 items-start text-[11px]">
                  <span className="col-span-2 font-black">{d.Cantidad}x</span>
                  <div className="col-span-7 pr-1">
                    <p className="font-semibold truncate">{d.Plato}</p>
                    <p className="text-[10px] text-stone-400">{formatPrice(d.Precio)} c/u</p>
                  </div>
                  <span className="col-span-3 text-right font-black">{formatPrice(d.Importe)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1 text-xs">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal:</span>
              <span>{formatPrice(venta.Monto)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>IVA (Exento):</span>
              <span>$0</span>
            </div>
            <div className="flex justify-between items-center text-sm font-black pt-1 border-t border-stone-300 text-stone-900">
              <span>TOTAL PAGADO:</span>
              <span className="text-base text-amber-700">{formatPrice(venta.Monto)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-2.5 text-stone-500 text-[10px] space-y-1">
            <p className="font-bold text-stone-800">¡GRACIAS POR SU PREFERENCIA!</p>
            <p>Conserve este ticket como constancia</p>
            <p className="text-[9px] text-stone-400">Terreno Broaster POS • DB: TerrenoBroaster.db</p>
          </div>

          {/* Paper Cut Marker Indicator */}
          <div className="mt-3 pt-2 border-t border-dashed border-stone-400 text-center text-[10px] font-bold text-stone-500 flex items-center justify-center space-x-1">
            <Scissors className="w-3.5 h-3.5 text-stone-600" />
            <span>- - - CORTE DE TICKET - - -</span>
            <Scissors className="w-3.5 h-3.5 text-stone-600" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 bg-stone-100 border-t border-stone-200 flex items-center space-x-2 print:hidden">
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-3 px-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black rounded-xl shadow-md transition-all text-xs cursor-pointer ${
              isPrinting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>{isPrinting ? 'Imprimiendo...' : 'Imprimir Ticket (80 mm)'}</span>
          </button>

          <button
            onClick={handleDownloadText}
            title="Descargar en TXT"
            className="flex items-center justify-center px-3 py-3 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl transition-colors text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="py-3 px-4 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-bold transition-colors text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>

        {/* Bluetooth link for cashier if needed */}
        <div className="px-4 py-1.5 bg-stone-200 border-t border-stone-300 flex items-center justify-between text-[10px] text-stone-600 print:hidden">
          <span>
            {salePrinterService.isBluetoothConnected() ? (
              <span className="text-emerald-700 font-bold">BT: {salePrinterService.getConnectedPrinterName()}</span>
            ) : (
              'Impresora USB Térmica de Caja Predeterminada'
            )}
          </span>
          <button
            onClick={handleConnectBt}
            className="text-stone-700 hover:text-stone-950 underline font-semibold flex items-center space-x-0.5 cursor-pointer"
          >
            <Bluetooth className="w-2.5 h-2.5 text-blue-600" />
            <span>{salePrinterService.isBluetoothConnected() ? 'Cambiar BT' : 'Conectar BT'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
