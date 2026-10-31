import React, { useState, useEffect } from 'react';
import {
  Printer,
  Bluetooth,
  X,
  CheckCircle2,
  AlertTriangle,
  ChefHat,
  Copy,
  Clock,
  MapPin,
  Flame,
  Radio,
} from 'lucide-react';
import { kitchenPrinterService, KitchenTicketData } from '../services/kitchenPrinterService';

interface KitchenTicketModalProps {
  ticket?: KitchenTicketData | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export const KitchenTicketModal: React.FC<KitchenTicketModalProps> = ({
  ticket: propTicket,
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const [activeTicket, setActiveTicket] = useState<KitchenTicketData | null>(propTicket || null);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState<boolean>(kitchenPrinterService.isBluetoothConnected());
  const [printerName, setPrinterName] = useState<string>(kitchenPrinterService.getConnectedPrinterName());
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Subscribe to service state
  useEffect(() => {
    if (propTicket !== undefined) {
      setActiveTicket(propTicket);
    }
  }, [propTicket]);

  useEffect(() => {
    const unsubTicket = kitchenPrinterService.subscribeTicketChange((t) => {
      if (propTicket === undefined) {
        setActiveTicket(t);
      }
    });

    const unsubConn = kitchenPrinterService.subscribeConnectionChange((connected, name) => {
      setIsBluetoothConnected(connected);
      setPrinterName(name);
    });

    return () => {
      unsubTicket();
      unsubConn();
    };
  }, [propTicket]);

  const isOpen = propIsOpen !== undefined ? propIsOpen : activeTicket !== null;

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      kitchenPrinterService.closeActiveTicket();
    }
  };

  if (!isOpen || !activeTicket) return null;

  const handleConnectBluetooth = async () => {
    setIsConnecting(true);
    setStatusMessage('Buscando impresora Bluetooth...');
    const res = await kitchenPrinterService.connectBluetoothPrinter();
    setIsConnecting(false);
    if (res.success) {
      setStatusMessage(`¡Conectado con éxito a ${res.printerName}!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage(res.error || 'No se pudo conectar a la impresora.');
    }
  };

  const handlePrintBluetooth = async () => {
    if (!isBluetoothConnected) {
      handleConnectBluetooth();
      return;
    }
    setStatusMessage('Enviando comanda a la impresora Bluetooth...');
    const res = await kitchenPrinterService.printToBluetooth(activeTicket);
    if (res.success) {
      setStatusMessage('¡Ticket impreso en la Cocina con éxito!');
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage(res.error || 'Error al imprimir por Bluetooth.');
    }
  };

  const handlePrintBrowser = () => {
    window.print();
  };

  const totalItems = activeTicket.items.reduce((acc, i) => acc + i.cantidad, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center space-x-1.5">
                <span>Comanda de Cocina</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Enviada a Cocina
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Ticket térmico de encargo para los cocineros
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bluetooth Status bar */}
        <div className="px-4 py-2 bg-stone-950/60 border-b border-stone-800/80 flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isBluetoothConnected ? 'bg-emerald-400 animate-pulse' : 'bg-stone-600'
              }`}
            />
            <span className="text-stone-300 font-medium">
              {isBluetoothConnected ? (
                <>Impresora BT: <strong className="text-emerald-400">{printerName}</strong></>
              ) : (
                'Sin impresora Bluetooth vinculada'
              )}
            </span>
          </div>

          <button
            onClick={handleConnectBluetooth}
            disabled={isConnecting}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-bold border border-stone-700 transition-all cursor-pointer"
          >
            <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
            <span>{isBluetoothConnected ? 'Cambiar' : 'Vincular BT'}</span>
          </button>
        </div>

        {statusMessage && (
          <div className="p-2.5 bg-amber-500/20 border-b border-amber-500/30 text-amber-200 text-xs text-center font-medium print:hidden">
            {statusMessage}
          </div>
        )}

        {/* Thermal Ticket Preview container (80mm / 58mm POS format) */}
        <div className="flex-1 overflow-y-auto p-4 bg-stone-950/40">
          <div
            id="kitchen-receipt"
            className="bg-white text-stone-950 p-5 rounded-xl shadow-inner font-mono text-xs leading-tight mx-auto max-w-[340px] border border-stone-300"
          >
            {/* Ticket Header */}
            <div className="text-center pb-2 border-b-2 border-dashed border-stone-800">
              <h2 className="text-base font-black tracking-wider uppercase">*** COCINA ***</h2>
              <p className="text-xs font-bold text-stone-800">TERRENO BROASTER</p>
              <div className="mt-2 py-1 px-2 bg-stone-100 border border-stone-800 rounded font-black text-sm uppercase">
                [ {activeTicket.ubicacion} ]
              </div>
            </div>

            {/* Ticket Info */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="font-bold">N° TICKET:</span>
                <span className="font-black text-sm">#{activeTicket.nTicket}</span>
              </div>
              <div className="flex justify-between">
                <span>FECHA:</span>
                <span>{activeTicket.fecha}</span>
              </div>
              <div className="flex justify-between">
                <span>CLIENTE:</span>
                <span className="font-bold">{activeTicket.cliente}</span>
              </div>
              <div className="flex justify-between">
                <span>SERVICIO:</span>
                <span className="font-bold uppercase">{activeTicket.tipoServicio}</span>
              </div>
              {activeTicket.telefono && (
                <div className="flex justify-between">
                  <span>TEL:</span>
                  <span>{activeTicket.telefono}</span>
                </div>
              )}
              {activeTicket.direccion && (
                <div className="pt-1">
                  <span className="font-bold">DIRECCIÓN:</span>
                  <p className="text-[10px] text-stone-700">{activeTicket.direccion}</p>
                </div>
              )}
              {activeTicket.notas && (
                <div className="pt-1 bg-amber-50 p-1.5 border border-amber-200 rounded">
                  <span className="font-bold text-amber-900">NOTA PEDIDO:</span>
                  <p className="text-[11px] font-bold text-amber-950">{activeTicket.notas}</p>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b-2 border-dashed border-stone-800">
              <div className="flex justify-between text-[11px] font-bold pb-1 mb-1 border-b border-stone-300">
                <span>CANT.</span>
                <span>DESCRIPCIÓN / PLATO</span>
              </div>

              <div className="space-y-2">
                {activeTicket.items.map((item, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="flex items-start justify-between">
                      <span className="font-black text-sm mr-2 w-8 shrink-0">
                        {item.cantidad}x
                      </span>
                      <span className="font-black text-sm flex-1 leading-snug">
                        {item.nombre}
                      </span>
                    </div>
                    {item.notas && item.notas.trim() && (
                      <div className="ml-8 text-[11px] font-bold text-red-700 bg-red-50 p-1 rounded mt-0.5 border border-red-200">
                        ⚠️ NOTA: {item.notas}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total items footer */}
            <div className="py-2.5 text-center">
              <p className="font-black text-sm">TOTAL PRODUCTOS: {totalItems}</p>
              <p className="text-[10px] text-stone-600 mt-1 uppercase font-bold tracking-wider">
                ¡PREPARAR CON PRIORIDAD!
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 print:hidden">
          <button
            onClick={handlePrintBluetooth}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Bluetooth className="w-4 h-4" />
            <span>
              {isBluetoothConnected ? 'Imprimir Vía Bluetooth' : 'Conectar Impresora Bluetooth'}
            </span>
          </button>

          <button
            onClick={handlePrintBrowser}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Térmica (Sistema)</span>
          </button>

          <button
            onClick={handleClose}
            className="px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl text-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
