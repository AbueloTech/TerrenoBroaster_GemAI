import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  X,
  Phone,
  Sparkles,
  AlertTriangle,
  Smartphone,
  MessageSquare,
} from 'lucide-react';
import { Plato } from '../types';
import { buildCustomerOrderLink, buildDigitalMenuUrl } from '../utils/whatsappParser';
import { sqliteService } from '../db/sqliteService';
import { menuSyncService } from '../services/menuSyncService';

interface WhatsAppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantPhone: string;
  platos?: Plato[];
  onUpdatePhone: (newPhone: string) => void;
  onOpenCustomerMenu?: () => void;
}

export const WhatsAppQrModal: React.FC<WhatsAppQrModalProps> = ({
  isOpen,
  onClose,
  restaurantPhone,
  platos,
  onUpdatePhone,
  onOpenCustomerMenu,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>(restaurantPhone || '');
  const [qrMode, setQrMode] = useState<'menu' | 'chat'>('menu');

  useEffect(() => {
    setPhoneInput(restaurantPhone || '');
  }, [restaurantPhone]);

  const cleanPhone = (restaurantPhone || '').replace(/[^\d]/g, '');

  const activePlatos = platos && platos.length > 0 ? platos : sqliteService.getPlatos();

  // Target URL based on mode - lightweight and fast to scan
  const targetUrl =
    qrMode === 'menu'
      ? buildDigitalMenuUrl(restaurantPhone, activePlatos)
      : cleanPhone
      ? buildCustomerOrderLink(restaurantPhone)
      : buildDigitalMenuUrl(restaurantPhone, activePlatos);

  useEffect(() => {
    if (!isOpen) return;

    // Immediately push active dishes so scanning mobile customers see the live SQLite catalog
    const currentPlatos = platos && platos.length > 0 ? platos : sqliteService.getPlatos();
    menuSyncService.pushMenuToServer(currentPlatos, restaurantPhone, true);

    if (targetUrl) {
      // Generate QR Code with high resolution & contrast
      QRCode.toDataURL(targetUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: '#1c1917', // stone-900
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((url) => {
          setDataUrl(url);
        })
        .catch((err) => {
          console.error('QR Code Generation Error:', err);
        });

      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, targetUrl, {
          width: 230,
          margin: 2,
          color: {
            dark: '#1c1917',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        }).catch((err) => {
          console.error('QR Canvas Error:', err);
        });
      }
    } else {
      setDataUrl('');
    }
  }, [isOpen, targetUrl, qrMode]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleDownloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR-${qrMode === 'menu' ? 'MenuDigital' : 'WhatsApp'}-TerrenoBroaster.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintFlyer = () => {
    window.print();
  };

  const handleSavePhoneInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    onUpdatePhone(phoneInput.trim());
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-stone-900 to-stone-900 px-6 py-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center shadow-md shadow-emerald-600/30">
              <QrCode className="w-6 h-6 text-stone-950 font-black" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide">
                Código QR para <span className="text-emerald-400">Clientes</span>
              </h3>
              <p className="text-xs text-stone-400">
                Imprime o comparte este código para que tus clientes pidan desde el Menú Digital
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">

          {/* Mode Selector Tabs: Menú Digital vs Chat Directo */}
          <div className="bg-stone-950 p-1 rounded-xl border border-stone-800 grid grid-cols-2 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setQrMode('menu')}
              className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all ${
                qrMode === 'menu'
                  ? 'bg-emerald-600 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Menú Digital con Carrito (Recomendado)</span>
            </button>

            <button
              type="button"
              onClick={() => setQrMode('chat')}
              className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition-all ${
                qrMode === 'chat'
                  ? 'bg-emerald-600 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat Directo WhatsApp</span>
            </button>
          </div>

          {/* Restaurant Phone Verification / Editor */}
          <div className="bg-stone-950 border border-stone-800 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                  Número que recibirá los pedidos
                </span>
                {isEditing ? (
                  <form onSubmit={handleSavePhoneInline} className="flex items-center space-x-2 mt-1">
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Ej: +57 300 1234567"
                      className="px-2.5 py-1 bg-stone-900 border border-emerald-500 text-white rounded text-xs font-mono focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded text-xs"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneInput(restaurantPhone || '');
                        setIsEditing(false);
                      }}
                      className="px-2 py-1 bg-stone-800 text-stone-400 rounded text-xs"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center space-x-2 mt-0.5">
                    {restaurantPhone ? (
                      <span className="text-white font-mono font-bold text-xs">
                        {restaurantPhone}
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold text-xs flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Sin número configurado</span>
                      </span>
                    )}
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium ml-1"
                    >
                      {restaurantPhone ? 'Cambiar' : 'Configurar'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Test Links */}
            <div className="flex items-center space-x-2">
              {onOpenCustomerMenu && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCustomerMenu();
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Abrir Menú Móvil</span>
                </button>
              )}
            </div>
          </div>

          {/* PRINTABLE FLYER PREVIEW CARD */}
          <div
            id="qr-printable-area"
            className="bg-white text-stone-900 rounded-2xl p-6 shadow-xl border-4 border-emerald-600 flex flex-col items-center text-center space-y-4 max-w-sm mx-auto"
          >
            {/* Flyer Header */}
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {qrMode === 'menu' ? '¡Menú Digital con Carrito!' : '¡Pide por WhatsApp!'}
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-stone-950">
                TERRENO BROASTER
              </h2>
              <p className="text-xs font-semibold text-emerald-700">
                Pollo Crujiente • Combos • Delivery & Pick-Up
              </p>
            </div>

            {/* QR Canvas / Image Render */}
            <div className="p-3 bg-white border-2 border-stone-200 rounded-xl shadow-inner flex items-center justify-center min-w-[200px] min-h-[200px]">
              {dataUrl ? (
                <img
                  src={dataUrl}
                  alt="Código QR de Menú Digital"
                  className="w-[190px] h-[190px] block"
                />
              ) : (
                <canvas ref={canvasRef} className="w-[190px] h-[190px] block" />
              )}
            </div>

            {/* Instructions for customers */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-stone-900">
                {qrMode === 'menu'
                  ? '1. Escanea el código con tu celular para abrir el Menú'
                  : '1. Abre tu cámara y escanea el código QR'}
              </p>
              <p className="text-[11px] text-stone-600">
                {qrMode === 'menu'
                  ? '2. Elige tus platos, llena tus datos y envía con 1 toque'
                  : '2. Envíanos tu mensaje de pedido por WhatsApp'}
              </p>
              <p className="text-xs font-black text-emerald-800 font-mono pt-1">
                WhatsApp: {restaurantPhone || 'Configura tu teléfono'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!dataUrl}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-stone-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrintFlyer}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold rounded-xl text-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir Cartel</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold rounded-xl text-xs transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? '¡Link Copiado!' : 'Copiar Enlace'}</span>
            </button>
          </div>

          <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800 text-[11px] text-stone-400 space-y-1">
            <span className="font-bold text-amber-300 block">💡 ¿Por qué usar el Menú Digital con Carrito?</span>
            <p>
              Cuando el cliente abre el Menú Digital escaneando el código QR, solo puede seleccionar los platos reales registrados en tu base de datos (con sus precios exactos). Al enviar la orden, el mensaje llega a WhatsApp con el formato estandarizado y el cajero solo tiene que copiar y pegar para crear la comanda en 1 segundo con 0 errores.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-stone-950 px-6 py-3 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
