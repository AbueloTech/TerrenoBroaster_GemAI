import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Phone,
  Send,
  Copy,
  Check,
  Plus,
  ChefHat,
  ShoppingBag,
  Bell,
  BellRing,
  BellOff,
  ExternalLink,
  QrCode,
  Sparkles,
  Trash2,
  Edit2,
  Truck,
  Package,
  X,
  FileText,
  Clock,
  MapPin,
  CreditCard,
  DollarSign,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Printer,
  ChevronDown,
  Layers,
  Volume2,
  Smartphone,
} from 'lucide-react';
import { PedidoWhatsApp, EstadoPedidoWhatsApp, Plato, CartItem, FormaPago, PedidoWhatsAppItem } from '../types';
import { sqliteService } from '../db/sqliteService';
import { playNotificationSound } from '../utils/soundAlert';
import {
  parseWhatsAppMessage,
  buildWhatsAppReplyUrl,
  buildCustomerOrderLink,
  SAMPLE_WHATSAPP_MESSAGES,
} from '../utils/whatsappParser';
import { formatCurrency } from '../utils/currency';
import { WhatsAppQrModal } from './WhatsAppQrModal';
import { AlertSettingsModal } from './AlertSettingsModal';

interface WhatsAppOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenComandas: () => void;
  onLoadOrderToCart?: (items: CartItem[]) => void;
  onOpenCustomerMenu?: () => void;
}

// Country code presets for convenience
const COUNTRY_PRESETS = [
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+34', flag: '🇪🇸', name: 'España' },
  { code: '+1', flag: '🇺🇸', name: 'USA/Canadá' },
  { code: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '+507', flag: '🇵🇦', name: 'Panamá' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
];

export const WhatsAppOrdersModal: React.FC<WhatsAppOrdersModalProps> = ({
  isOpen,
  onClose,
  onOpenComandas,
  onLoadOrderToCart,
  onOpenCustomerMenu,
}) => {
  const [pedidos, setPedidos] = useState<PedidoWhatsApp[]>([]);
  const [filterEstado, setFilterEstado] = useState<EstadoPedidoWhatsApp | 'Todos'>('Todos');
  const [restaurantPhone, setRestaurantPhone] = useState<string>('');
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // QR Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  // Sound Settings Modal State
  const [isAlertSettingsOpen, setIsAlertSettingsOpen] = useState<boolean>(false);

  // Smart Paste Modal State & Live Editable Draft
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Draft editable fields in Paste Modal
  const [draftCliente, setDraftCliente] = useState<string>('Cliente WhatsApp');
  const [draftTelefono, setDraftTelefono] = useState<string>('');
  const [draftTipo, setDraftTipo] = useState<'Delivery' | 'Para llevar'>('Delivery');
  const [draftDireccion, setDraftDireccion] = useState<string>('');
  const [draftPago, setDraftPago] = useState<FormaPago>('Efectivo');
  const [draftNotas, setDraftNotas] = useState<string>('');
  const [draftItems, setDraftItems] = useState<PedidoWhatsAppItem[]>([]);
  const [selectedPlatoToAdd, setSelectedPlatoToAdd] = useState<string>('');

  // Webhook integration guide modal
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Success message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected message to view full raw text
  const [viewingOriginalId, setViewingOriginalId] = useState<number | null>(null);

  // Available dishes in menu
  const [availablePlatos, setAvailablePlatos] = useState<Plato[]>([]);

  const loadData = () => {
    setPedidos(sqliteService.getPedidosWhatsApp());
    setAvailablePlatos(sqliteService.getPlatos());
    const phone = sqliteService.getWhatsAppPhone();
    setRestaurantPhone(phone);
    setPhoneInput(phone);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = sqliteService.subscribe(() => {
      loadData();
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Re-parse pasted text dynamically whenever pasteText changes in modal
  useEffect(() => {
    if (!pasteText.trim()) return;
    try {
      const parsed = parseWhatsAppMessage(pasteText, availablePlatos);
      setDraftCliente(parsed.nombreCliente || 'Cliente WhatsApp');
      setDraftTelefono(parsed.telefonoCliente || '');
      setDraftTipo(parsed.tipoEntrega);
      setDraftDireccion(parsed.direccionEntrega || '');
      setDraftPago(parsed.formaPago);
      setDraftNotas(parsed.notas || '');
      setDraftItems(parsed.items);
      setParseError(null);
    } catch (err: any) {
      console.error('Parse error:', err);
    }
  }, [pasteText, availablePlatos]);

  // Calculate Draft Order Total in Smart Paste Modal
  const draftTotal = useMemo(() => {
    return draftItems.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  }, [draftItems]);

  // Filtered orders
  const filteredPedidos = pedidos.filter((p) => {
    if (filterEstado === 'Todos') return true;
    return p.Estado === filterEstado;
  });

  const pendingCount = pedidos.filter((p) => p.Estado === 'Pendiente').length;
  const inKitchenCount = pedidos.filter((p) => p.Estado === 'En Cocina').length;

  const handleSavePhone = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = phoneInput.trim();
    if (!clean) return;
    sqliteService.setWhatsAppPhone(clean);
    setRestaurantPhone(clean);
    setIsEditingPhone(false);
    showToast(`Número de WhatsApp actualizado: ${clean}`);
  };

  const handleUpdatePhoneFromModal = (newPhone: string) => {
    sqliteService.setWhatsAppPhone(newPhone);
    setRestaurantPhone(newPhone);
    setPhoneInput(newPhone);
    showToast(`Número de WhatsApp actualizado: ${newPhone}`);
  };

  const handleCopyCustomerLink = () => {
    if (!restaurantPhone) {
      setIsEditingPhone(true);
      showToast('Por favor introduce primero el número de WhatsApp de tu restaurante.');
      return;
    }
    const link = buildCustomerOrderLink(restaurantPhone);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      showToast('Enlace de pedido copiado al portapapeles.');
    });
  };

  // Convert to Kitchen Comanda
  const handleConvertToComanda = (pedido: PedidoWhatsApp) => {
    const res = sqliteService.convertWhatsAppPedidoToComanda(pedido.Id);
    if (res) {
      if (soundEnabled) {
        playNotificationSound();
      }
      showToast(`¡Comanda #${res.nTicket} creada y enviada al monitor de Cocina!`);
    }
  };

  // Load into POS Cart
  const handleLoadToCart = (pedido: PedidoWhatsApp) => {
    if (!onLoadOrderToCart) return;
    const allPlatos = sqliteService.getPlatos();
    const cartItems: CartItem[] = pedido.Items.map((waItem) => {
      const match = allPlatos.find((p) => p.Plato.toLowerCase() === waItem.platoNombre.toLowerCase());
      return {
        plato: match || {
          ID: waItem.platoId || 9999,
          Plato: waItem.platoNombre,
          Precio: waItem.precioUnitario,
          Categoria: waItem.categoria || 'WhatsApp',
          Imagen: '',
        },
        cantidad: waItem.cantidad,
        nota: waItem.notas,
      };
    });
    onLoadOrderToCart(cartItems);
    onClose();
    showToast(`Items de ${pedido.NombreCliente} cargados en el Punto de Venta.`);
  };

  // Status Change
  const handleChangeStatus = (id: number, nuevoEstado: EstadoPedidoWhatsApp) => {
    sqliteService.updatePedidoWhatsAppEstado(id, nuevoEstado);
    showToast(`Estado actualizado a: ${nuevoEstado}`);
  };

  // Delete
  const handleDelete = (id: number) => {
    if (confirm('¿Eliminar este pedido de WhatsApp del historial?')) {
      sqliteService.deletePedidoWhatsApp(id);
      showToast('Pedido eliminado.');
    }
  };

  // Simulate Incoming WhatsApp Order
  const handleSimulateIncomingOrder = (sampleIdx?: number) => {
    const allPlatos = sqliteService.getPlatos();
    const sample = sampleIdx !== undefined
      ? SAMPLE_WHATSAPP_MESSAGES[sampleIdx]
      : SAMPLE_WHATSAPP_MESSAGES[Math.floor(Math.random() * SAMPLE_WHATSAPP_MESSAGES.length)];

    const parsed = parseWhatsAppMessage(sample.text, allPlatos);
    const now = new Date();
    const timeOnly = now.toTimeString().substring(0, 5);
    const dateOnly = now.toISOString().substring(0, 10);

    const created = sqliteService.addPedidoWhatsApp({
      Fecha: dateOnly,
      TelefonoCliente: sample.phone,
      NombreCliente: sample.sender,
      TipoEntrega: parsed.tipoEntrega,
      DireccionEntrega: parsed.direccionEntrega,
      MensajeOriginal: sample.text,
      Items: parsed.items,
      Total: parsed.total,
      FormaPago: parsed.formaPago,
      Estado: 'Pendiente',
      FechaCreacion: timeOnly,
      Notas: parsed.notas,
    });

    if (soundEnabled) {
      playNotificationSound();
    }
    showToast(`¡Nuevo pedido de WhatsApp recibido de ${created.NombreCliente}! (${created.Items.length} platos)`);
  };

  // Adjust item quantity in draft
  const handleUpdateItemQty = (idx: number, delta: number) => {
    setDraftItems((prev) => {
      const copy = [...prev];
      const newQty = copy[idx].cantidad + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== idx);
      }
      copy[idx] = { ...copy[idx], cantidad: newQty };
      return copy;
    });
  };

  const handleRemoveDraftItem = (idx: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddPlatoToDraft = () => {
    if (!selectedPlatoToAdd) return;
    const plato = availablePlatos.find((p) => p.ID === Number(selectedPlatoToAdd));
    if (!plato) return;

    setDraftItems((prev) => {
      const existing = prev.find((item) => item.platoId === plato.ID);
      if (existing) {
        return prev.map((item) =>
          item.platoId === plato.ID ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [
        ...prev,
        {
          platoId: plato.ID,
          platoNombre: plato.Plato,
          cantidad: 1,
          precioUnitario: plato.Precio,
          categoria: plato.Categoria,
        },
      ];
    });
    setSelectedPlatoToAdd('');
  };

  // Process smart paste confirmed order
  const handleSaveConfirmedDraftOrder = () => {
    if (draftItems.length === 0) {
      setParseError('Agrega al menos un plato al pedido antes de guardarlo.');
      return;
    }

    try {
      const now = new Date();
      const timeOnly = now.toTimeString().substring(0, 5);
      const dateOnly = now.toISOString().substring(0, 10);

      const created = sqliteService.addPedidoWhatsApp({
        Fecha: dateOnly,
        TelefonoCliente: draftTelefono.trim() || 'No especificado',
        NombreCliente: draftCliente.trim() || 'Cliente WhatsApp',
        TipoEntrega: draftTipo,
        DireccionEntrega: draftDireccion.trim() || (draftTipo === 'Delivery' ? 'Dirección por confirmar' : 'Retiro en restaurante'),
        MensajeOriginal: pasteText || `Pedido ingresado manualmente (${draftItems.length} platos)`,
        Items: draftItems,
        Total: draftTotal,
        FormaPago: draftPago,
        Estado: 'Pendiente',
        FechaCreacion: timeOnly,
        Notas: draftNotas.trim(),
      });

      if (soundEnabled) {
        playNotificationSound();
      }

      setPasteText('');
      setDraftItems([]);
      setParseError(null);
      setIsPasteModalOpen(false);
      showToast(`¡Pedido de ${created.NombreCliente} registrado exitosamente (${created.Items.length} platos)!`);
    } catch (err: any) {
      setParseError('No se pudo guardar el pedido: ' + (err.message || 'Error'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-stone-900 to-stone-900 px-6 py-4 border-b border-stone-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <MessageSquare className="w-6 h-6 text-stone-950 font-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white tracking-wide">
                  Pedidos <span className="text-emerald-400">WhatsApp</span>
                </h2>
                {pendingCount > 0 && (
                  <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-stone-950 animate-pulse shadow-md">
                    <Bell className="w-3 h-3" />
                    <span>{pendingCount} Pendiente{pendingCount > 1 ? 's' : ''}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                Recepción, alerta sonora y despacho a cocina con número oficial del restaurante
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View QR Code Button */}
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-black shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition-all active:scale-95"
              title="Ver, descargar e imprimir el código QR de pedidos WhatsApp"
            >
              <QrCode className="w-4 h-4" />
              <span>Código QR de Pedidos</span>
            </button>

            {/* Sound Mute/Unmute */}
            <button
              onClick={() => {
                const nextState = !soundEnabled;
                setSoundEnabled(nextState);
                if (nextState) playNotificationSound();
              }}
              title={soundEnabled ? 'Sonido activado (clic para silenciar)' : 'Sonido silenciado (clic para activar)'}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
            >
              {soundEnabled ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>

            {/* Alert & Sound Settings */}
            <button
              onClick={() => setIsAlertSettingsOpen(true)}
              title="Configurar Volumen y Sonidos de Alerta"
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 border border-stone-700 transition-colors flex items-center space-x-1"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Sonidos</span>
            </button>

            {/* Test Audio Chime */}
            <button
              onClick={() => playNotificationSound()}
              title="Probar sonido de notificación"
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 border border-stone-700 transition-colors flex items-center space-x-1"
            >
              <span>🔔 Probar</span>
            </button>

            {/* Guide Button */}
            <button
              onClick={() => setIsGuideOpen(true)}
              title="Guía de integración WhatsApp Web / API"
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 border border-stone-700 transition-colors flex items-center space-x-1"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Guía Bot / API</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Restaurant WhatsApp Number Configuration Banner */}
        <div className="bg-stone-950/90 border-b border-stone-800 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            <span className="text-stone-400 text-xs font-semibold">WhatsApp del Restaurante:</span>
            {isEditingPhone ? (
              <form onSubmit={handleSavePhone} className="flex flex-wrap items-center gap-1.5">
                {/* Country prefix quick pickers */}
                <select
                  onChange={(e) => {
                    const prefix = e.target.value;
                    if (prefix) {
                      setPhoneInput(prefix + ' ');
                    }
                  }}
                  className="px-2 py-1 text-xs rounded bg-stone-800 border border-stone-700 text-white"
                >
                  <option value="">País...</option>
                  {COUNTRY_PRESETS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.name})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Ej: +57 300 1234567"
                  className="px-3 py-1 text-xs rounded bg-stone-800 border border-emerald-500/70 text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400 min-w-[200px]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold rounded text-xs shadow"
                >
                  Guardar Número
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(false)}
                  className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="flex items-center space-x-2 bg-stone-900 border border-stone-800 px-3 py-1 rounded-lg">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                {restaurantPhone ? (
                  <span className="font-mono font-bold text-emerald-300 text-xs">
                    {restaurantPhone}
                  </span>
                ) : (
                  <span className="text-amber-400 text-xs font-bold animate-pulse">
                    ⚠️ Sin configurar — Haz clic en Configurar
                  </span>
                )}
                <button
                  onClick={() => setIsEditingPhone(true)}
                  title="Editar número de teléfono del restaurante"
                  className="text-stone-400 hover:text-emerald-300 p-0.5 rounded transition-colors text-xs flex items-center space-x-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span className="text-[11px] underline">
                    {restaurantPhone ? 'Cambiar' : 'Configurar'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Action triggers: Customer link & quick actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsQrModalOpen(true)}
              title="Abrir ventana del Código QR para descargar o imprimir"
              className="flex items-center space-x-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Ver QR</span>
            </button>

            <button
              onClick={handleCopyCustomerLink}
              title="Copiar enlace directo para que los clientes hagan pedidos por WhatsApp"
              className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Link de Pedidos'}</span>
            </button>

            {restaurantPhone && (
              <a
                href={buildCustomerOrderLink(restaurantPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-lg text-xs transition-colors"
                title="Abrir WhatsApp Web con plantilla de pedido de cliente"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Probar Chat</span>
              </a>
            )}
          </div>
        </div>

        {/* Subheader Toolbar & Simulation */}
        <div className="p-4 bg-stone-900/50 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs overflow-x-auto">
            {(['Todos', 'Pendiente', 'En Cocina', 'Entregado', 'Cancelado'] as const).map((est) => {
              const isSelected = filterEstado === est;
              const count = est === 'Todos' ? pedidos.length : pedidos.filter((p) => p.Estado === est).length;
              return (
                <button
                  key={est}
                  onClick={() => setFilterEstado(est)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-stone-950 font-bold shadow-sm'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  <span>{est === 'Todos' ? 'Todos los Pedidos' : est}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-stone-950/80 text-emerald-300'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {/* Paste from WhatsApp */}
            <button
              onClick={() => {
                setPasteText('');
                setDraftItems([]);
                setParseError(null);
                setIsPasteModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pegar Mensaje de WhatsApp</span>
            </button>

            {/* Simulator Dropdown / Instant button */}
            <button
              onClick={() => handleSimulateIncomingOrder()}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-stone-950 rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all active:scale-95"
              title="Simula un pedido con varios platos para probar la comanda y cocina"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simular Pedido Multi-Plato</span>
            </button>
          </div>
        </div>

        {/* Toast Alert Feedback */}
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

        {/* Orders List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredPedidos.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-stone-800/80 border border-stone-700 flex items-center justify-center mx-auto text-stone-500">
                <MessageSquare className="w-8 h-8 text-stone-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-200">
                  No hay pedidos de WhatsApp con estado "{filterEstado}"
                </h3>
                <p className="text-xs text-stone-400 max-w-md mx-auto">
                  Copia los mensajes de tus clientes desde WhatsApp Web usando el botón <strong>"Pegar Mensaje de WhatsApp"</strong> o simula un pedido de prueba.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  onClick={() => setIsPasteModalOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs font-bold rounded-xl shadow-md"
                >
                  Pegar Mensaje de WhatsApp
                </button>
                <button
                  onClick={() => handleSimulateIncomingOrder()}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700"
                >
                  Simular Pedido de Prueba
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPedidos.map((pedido) => {
                const isPending = pedido.Estado === 'Pendiente';
                const isKitchen = pedido.Estado === 'En Cocina';
                const isDelivered = pedido.Estado === 'Entregado';
                const isCancelled = pedido.Estado === 'Cancelado';

                return (
                  <div
                    key={pedido.Id}
                    className={`rounded-2xl border transition-all p-4.5 flex flex-col justify-between space-y-3 shadow-lg ${
                      isPending
                        ? 'bg-stone-900 border-emerald-500/50 shadow-emerald-950/20 ring-1 ring-emerald-500/20'
                        : isKitchen
                        ? 'bg-stone-900/90 border-amber-500/40 shadow-amber-950/20'
                        : isDelivered
                        ? 'bg-stone-900/60 border-stone-800 opacity-90'
                        : 'bg-stone-900/40 border-stone-800 opacity-70'
                    }`}
                  >
                    {/* Top Row: Client & Status Badge */}
                    <div className="flex items-start justify-between gap-2 border-b border-stone-800/80 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-white text-sm tracking-wide">
                            {pedido.NombreCliente}
                          </h4>
                          {pedido.TipoEntrega === 'Delivery' ? (
                            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/30">
                              <Truck className="w-3 h-3" />
                              <span>Delivery</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-500/30">
                              <Package className="w-3 h-3" />
                              <span>Para llevar</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 mt-1 text-xs text-stone-400 font-mono">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{pedido.TelefonoCliente}</span>
                          <span className="text-stone-600">•</span>
                          <Clock className="w-3 h-3 text-stone-500" />
                          <span>{pedido.FechaCreacion || pedido.Fecha}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isPending
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                              : isKitchen
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : isDelivered
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'bg-stone-800 text-stone-400 border-stone-700'
                          }`}
                        >
                          {pedido.Estado}
                        </span>
                        {pedido.NTicket && (
                          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-600/30">
                            Ticket #{pedido.NTicket}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Dish Items List */}
                    <div className="space-y-1.5 bg-stone-950/60 p-3 rounded-xl border border-stone-800/80">
                      <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Platos Solicitados ({pedido.Items.length}):</span>
                        <span className="text-stone-300 font-bold font-mono">
                          Total: {formatCurrency(pedido.Total)}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        {pedido.Items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-stone-200">
                            <span className="font-medium">
                              <span className="font-bold text-amber-400 font-mono mr-1.5">
                                {item.cantidad}x
                              </span>
                              {item.platoNombre}
                            </span>
                            <span className="font-mono text-stone-400 text-[11px]">
                              {formatCurrency(item.precioUnitario * item.cantidad)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {pedido.DireccionEntrega && (
                        <div className="pt-2 mt-2 border-t border-stone-800/80 flex items-start space-x-1.5 text-xs text-stone-300">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{pedido.DireccionEntrega}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[11px] text-stone-400">
                        <span className="flex items-center space-x-1">
                          <CreditCard className="w-3 h-3 text-stone-500" />
                          <span>Pago: <strong className="text-stone-300">{pedido.FormaPago}</strong></span>
                        </span>
                        {pedido.Notas && (
                          <span className="truncate max-w-[200px] text-stone-400 italic" title={pedido.Notas}>
                            "{pedido.Notas}"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Raw Message Viewer Toggle */}
                    {viewingOriginalId === pedido.Id && (
                      <div className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 text-[11px] font-mono text-stone-300 space-y-1">
                        <div className="font-bold text-emerald-400 text-[10px] uppercase">
                          Texto Original de WhatsApp:
                        </div>
                        <p className="whitespace-pre-wrap">{pedido.MensajeOriginal}</p>
                      </div>
                    )}

                    {/* Action Bar Bottom */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() =>
                            setViewingOriginalId(viewingOriginalId === pedido.Id ? null : pedido.Id)
                          }
                          className="text-[11px] text-stone-400 hover:text-stone-200 underline"
                        >
                          {viewingOriginalId === pedido.Id ? 'Ocultar texto' : 'Ver mensaje'}
                        </button>

                        {/* Direct WhatsApp reply button */}
                        <a
                          href={buildWhatsAppReplyUrl(
                            pedido.TelefonoCliente,
                            pedido,
                            isPending ? 'recibido' : isKitchen ? 'en_camino' : 'listo_retiro'
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
                          title="Responder cliente por WhatsApp Web con plantilla"
                        >
                          <Send className="w-3 h-3" />
                          <span>Notificar</span>
                        </a>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {/* Send to Kitchen button */}
                        {isPending && (
                          <button
                            onClick={() => handleConvertToComanda(pedido)}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95"
                            title="Generar comanda y enviar directo al monitor de cocina"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Mandar a Cocina</span>
                          </button>
                        )}

                        {/* Load into POS Cart */}
                        {onLoadOrderToCart && (
                          <button
                            onClick={() => handleLoadToCart(pedido)}
                            title="Cargar platos en el Punto de Venta (POS)"
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                        )}

                        {/* Quick state transitions */}
                        {isKitchen && (
                          <button
                            onClick={() => handleChangeStatus(pedido.Id, 'Entregado')}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 text-xs font-semibold"
                          >
                            Marcar Entregado
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(pedido.Id)}
                          title="Eliminar este pedido"
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950 hover:text-rose-400 text-stone-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="bg-stone-950 px-6 py-3 border-t border-stone-800 flex flex-wrap items-center justify-between text-xs text-stone-400 gap-2">
          <div className="flex items-center space-x-4">
            <span>
              Total pedidos registrados: <strong className="text-white">{pedidos.length}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
              <span>Receptor WhatsApp Activo</span>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                onClose();
                onOpenComandas();
              }}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
            >
              <span>Ir al Monitor de Cocina ({inKitchenCount} en preparación)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* SUB-MODAL 1: QR CODE DISPLAY & FLYER PRINTING */}
      <WhatsAppQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        restaurantPhone={restaurantPhone}
        platos={availablePlatos}
        onUpdatePhone={handleUpdatePhoneFromModal}
        onOpenCustomerMenu={onOpenCustomerMenu}
      />

      {/* SUB-MODAL 2: INTERACTIVE MULTI-ITEM SMART PASTE MODAL */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">
                  Pegar y Procesar Mensaje de WhatsApp
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setParseError(null);
                }}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300">
              Pega aquí el mensaje del cliente (admite <strong>múltiples platos en la misma línea o en lista</strong>, separados por comas, "+", "y", o renglones). El sistema detecta todos los platos y te permite editarlos antes de guardar.
            </p>

            {/* Quick Sample Fill Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-stone-500 font-medium">Ejemplos con varios platos:</span>
              {SAMPLE_WHATSAPP_MESSAGES.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPasteText(s.text)}
                  className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{s.title}</span>
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setParseError(null);
              }}
              placeholder={`Ejemplo de mensaje con varios platos en una sola línea o lista:\nHola! Quiero 1 Balde Broaster Familiar, 2 Papas Rusticas, 3 Tequeños Tradicionales\nNombre: María Gómez\nTeléfono: +57 300 123 4567\nDirección: Carrera 15 # 45-20\nPago: Efectivo`}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs font-mono text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {/* LIVE EXTRACTED ITEMS & DRAFT EDITOR */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Platos Detectados en el Mensaje ({draftItems.length})
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  Total Pedido: {formatCurrency(draftTotal)}
                </span>
              </div>

              {draftItems.length === 0 ? (
                <div className="py-4 text-center text-xs text-stone-400">
                  Pega un texto arriba o agrega productos manualmente con el selector de abajo.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {draftItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-stone-900 border border-stone-800 p-2.5 rounded-lg text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        {/* Qty controls */}
                        <div className="flex items-center space-x-1 bg-stone-950 border border-stone-700 rounded-md px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, -1)}
                            className="w-5 h-5 text-stone-400 hover:text-white flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold font-mono text-amber-400">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(idx, 1)}
                            className="w-5 h-5 text-stone-400 hover:text-white flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>

                        <div>
                          <span className="font-bold text-white">{item.platoNombre}</span>
                          <span className="text-stone-400 text-[11px] block">
                            Unitario: {formatCurrency(item.precioUnitario)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-bold text-stone-200">
                          {formatCurrency(item.precioUnitario * item.cantidad)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(idx)}
                          className="text-stone-500 hover:text-rose-400 p-1 rounded"
                          title="Quitar plato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add dish dropdown */}
              <div className="flex items-center space-x-2 pt-2 border-t border-stone-800/80">
                <select
                  value={selectedPlatoToAdd}
                  onChange={(e) => setSelectedPlatoToAdd(e.target.value)}
                  className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="">+ Agregar otro plato del menú...</option>
                  {availablePlatos.map((p) => (
                    <option key={p.ID} value={p.ID}>
                      {p.Plato} - {formatCurrency(p.Precio)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddPlatoToDraft}
                  disabled={!selectedPlatoToAdd}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 rounded-lg text-xs font-bold"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* EDITABLE CUSTOMER & DELIVERY DATA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-950/50 p-3 rounded-xl border border-stone-800">
              <div>
                <label className="text-[11px] text-stone-400 font-medium block mb-1">
                  Nombre del Cliente:
                </label>
                <input
                  type="text"
                  value={draftCliente}
                  onChange={(e) => setDraftCliente(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-stone-400 font-medium block mb-1">
                  Teléfono / WhatsApp:
                </label>
                <input
                  type="text"
                  value={draftTelefono}
                  onChange={(e) => setDraftTelefono(e.target.value)}
                  placeholder="Ej: +57 300 123 4567"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-stone-400 font-medium block mb-1">
                  Tipo de Entrega:
                </label>
                <select
                  value={draftTipo}
                  onChange={(e) => setDraftTipo(e.target.value as any)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-white"
                >
                  <option value="Delivery">Delivery (Domicilio)</option>
                  <option value="Para llevar">Para llevar (Pick-Up)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-stone-400 font-medium block mb-1">
                  Forma de Pago:
                </label>
                <select
                  value={draftPago}
                  onChange={(e) => setDraftPago(e.target.value as any)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-white"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Punto de Venta">Punto de Venta / Tarjeta</option>
                  <option value="Pago Movil">Pago Móvil / Transferencia Local</option>
                  <option value="Transferencia">Transferencia Bancaria / Zelle</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-stone-400 font-medium block mb-1">
                  Dirección de Entrega:
                </label>
                <input
                  type="text"
                  value={draftDireccion}
                  onChange={(e) => setDraftDireccion(e.target.value)}
                  placeholder="Calle, avenida, número de casa, punto de referencia..."
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-white"
                />
              </div>
            </div>

            {parseError && (
              <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-stone-800">
              <div className="text-xs text-stone-400">
                Total: <strong className="text-white font-mono text-sm">{formatCurrency(draftTotal)}</strong>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasteModalOpen(false);
                    setParseError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfirmedDraftOrder}
                  disabled={draftItems.length === 0}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-stone-950 text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Registrar Pedido ({draftItems.length} platos)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: WEBHOOK & BOT GUIDE */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Guía de Conexión y Pedidos WhatsApp</h3>
              </div>
              <button onClick={() => setIsGuideOpen(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-300 space-y-3">
              <p>
                La aplicación <strong className="text-amber-400">Terreno Broaster POS</strong> admite tres formas de gestionar pedidos con el número de teléfono del restaurante:
              </p>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5">
                <h4 className="font-bold text-emerald-400">1. Código QR y Botón de Pedidos para Clientes</h4>
                <p className="text-stone-400">
                  Usa el botón <strong>"Código QR de Pedidos"</strong> para descargar e imprimir el cartel de mesas. Tus clientes escanean el código desde su celular y abren WhatsApp enviando un pedido directo a tu número oficial <span className="font-mono text-white font-bold">{restaurantPhone || 'configurado'}</span>.
                </p>
              </div>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5">
                <h4 className="font-bold text-emerald-400">2. Copiar y Pegar Inteligente Multi-Plato</h4>
                <p className="text-stone-400">
                  Teniendo WhatsApp Web abierto en el ordenador del cajero, copia el mensaje del cliente y pulsa <strong>"Pegar Mensaje de WhatsApp"</strong>. El analizador inteligente detecta múltiples platos juntos (ej: <em>1 Balde, 2 Papas, 3 Refrescos</em>), calcula totales y permite ajustar cualquier plato antes de mandar a cocina.
                </p>
              </div>

              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5">
                <h4 className="font-bold text-emerald-400">3. Conexión de Bot o Webhook (Evolution API / Baileys / Twilio)</h4>
                <p className="text-stone-400">
                  Si deseas que los mensajes se guarden automáticamente en segundo plano mediante un bot, puedes usar la tabla SQLite <code className="text-amber-300 font-mono">PedidosWhatsApp</code> existente con la siguiente estructura JSON de carga:
                </p>
                <pre className="bg-stone-900 p-2.5 rounded-lg text-[10px] font-mono text-emerald-300 overflow-x-auto">
{`{
  "TelefonoCliente": "+573001234567",
  "NombreCliente": "Carlos Mendoza",
  "TipoEntrega": "Delivery",
  "DireccionEntrega": "Carrera 15 # 45-20",
  "Items": [
    { "platoNombre": "Balde Broaster Familiar (8 Piezas + 2 Papas)", "cantidad": 1, "precioUnitario": 25.0 },
    { "platoNombre": "Ración de Papas Fritas Rusticas", "cantidad": 2, "precioUnitario": 3.5 }
  ],
  "Total": 32.0,
  "FormaPago": "Efectivo"
}`}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs font-bold"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 4: ALERT & SOUND CONFIGURATION */}
      <AlertSettingsModal
        isOpen={isAlertSettingsOpen}
        onClose={() => setIsAlertSettingsOpen(false)}
      />

    </div>
  );
};
