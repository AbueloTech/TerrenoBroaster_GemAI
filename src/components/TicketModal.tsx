import React from 'react';
import { Venta, DetalleVenta } from '../types';
import { formatPrice } from '../utils/currency';
import { sqliteService } from '../db/sqliteService';
import { Printer, CheckCircle2, X, Download } from 'lucide-react';

interface TicketModalProps {
  venta: Venta | null;
  detalles: DetalleVenta[];
  isOpen: boolean;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ venta, detalles, isOpen, onClose }) => {
  if (!isOpen || !venta) return null;

  const comanda = sqliteService.getComandaByTicket(venta.NTicket);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    let content = `========================================\n`;
    content += `         TERRENO BROASTER POS           \n`;
    content += `    El Mejor Pollo Broaster Crujiente   \n`;
    content += `========================================\n`;
    content += `TICKET:  ${venta.NTicket}\n`;
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
      const qty = String(d.Cantidad).padStart(2, ' ');
      const imp = `${formatPrice(d.Importe)}`.padStart(10, ' ');
      content += `${qty}  ${name} ${imp}\n`;
    });
    content += `----------------------------------------\n`;
    content += `TOTAL A PAGAR:            ${formatPrice(venta.Monto)}\n`;
    content += `========================================\n`;
    content += `        ¡GRACIAS POR SU COMPRA!         \n`;
    content += `          VUELVA PRONTO                 \n`;
    content += `========================================\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Ticket_${venta.NTicket}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-stone-900 rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header toolbar */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Ticket de Venta Generado</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Ticket Receipt (Thermal 80mm format) */}
        <div id="thermal-receipt" className="p-6 font-mono text-xs overflow-y-auto leading-relaxed bg-white">
          <div className="text-center pb-3 border-b border-dashed border-stone-300">
            <h2 className="text-base font-black tracking-wider uppercase text-stone-900">TERRENO BROASTER</h2>
            <p className="text-[11px] text-stone-500">Especialistas en Pollo Broaster</p>
            <p className="text-[10px] text-stone-400 mt-0.5">RIF: J-50123894-1 • Sucursal Principal</p>
          </div>

          <div className="py-2.5 border-b border-dashed border-stone-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-stone-500">N° TICKET:</span>
              <span className="font-bold text-stone-900">{venta.NTicket}</span>
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
                <span className="text-stone-500">DESTINO / MESA:</span>
                <span className="font-bold text-stone-900">{comanda.Ubicacion}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-500">FORMA DE PAGO:</span>
              <span className="font-bold text-amber-600 bg-amber-50 px-1 rounded">{venta.FormaPago}</span>
            </div>
          </div>

          {/* Items breakdown */}
          <div className="py-3 border-b border-dashed border-stone-300">
            <div className="grid grid-cols-12 font-bold text-stone-500 text-[11px] pb-1 border-b border-stone-200">
              <span className="col-span-2">CANT</span>
              <span className="col-span-7">PRODUCTO</span>
              <span className="col-span-3 text-right">TOTAL</span>
            </div>
            <div className="divide-y divide-stone-100">
              {detalles.map((d, i) => (
                <div key={i} className="grid grid-cols-12 py-1.5 text-stone-800 items-start">
                  <span className="col-span-2 font-bold">{d.Cantidad}x</span>
                  <div className="col-span-7 pr-1">
                    <p className="font-medium truncate">{d.Plato}</p>
                    <p className="text-[10px] text-stone-400">{formatPrice(d.Precio)} c/u</p>
                  </div>
                  <span className="col-span-3 text-right font-bold">{formatPrice(d.Importe)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-stone-300 space-y-1">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal:</span>
              <span>{formatPrice(venta.Monto)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>IVA (Exento):</span>
              <span>$0</span>
            </div>
            <div className="flex justify-between items-center text-sm font-black pt-1 border-t border-stone-200 text-stone-900">
              <span>TOTAL PAGADO:</span>
              <span className="text-base text-amber-600">{formatPrice(venta.Monto)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-3 text-stone-500 text-[10px] space-y-1">
            <p className="font-semibold text-stone-700">¡GRACIAS POR SU PREFERENCIA!</p>
            <p>Conserve este ticket como constancia de su pedido</p>
            <p className="text-[9px] text-stone-400 pt-1">Sistema POS Terreno Broaster • DB: TerrenoBroaster.db</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 bg-stone-100 border-t border-stone-200 flex space-x-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl shadow-md transition-colors text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket</span>
          </button>
          <button
            onClick={handleDownloadText}
            title="Descargar en TXT"
            className="flex items-center justify-center px-3 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl transition-colors text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-semibold transition-colors text-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
