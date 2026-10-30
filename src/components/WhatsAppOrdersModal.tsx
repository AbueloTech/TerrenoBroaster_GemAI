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
  Smartphone,
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  Flame,
  UtensilsCrossed,
  Volume2,
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

  // Details Modal State & Filters
  const [selectedDetailsPedido, setSelectedDetailsPedido] = useState<PedidoWhatsApp | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deliveryFilter, setDeliveryFilter] = useState<'Todos' | 'Delivery' | 'Para llevar'>('Todos');

  // Keep active details modal in sync with real-time updates
  const activeDetailsPedido = useMemo(() => {
    if (!selectedDetailsPedido) return null;
    return pedidos.find((p) => p.Id === selectedDetailsPedido.Id) || selectedDetailsPedido;
  }, [selectedDetailsPedido, pedidos]);

  // Filtered orders
  const filteredPedidos = useMemo(() => {
    return pedidos.filter((p) => {
      if (filterEstado !== 'Todos' && p.Estado !== filterEstado) return false;
      if (deliveryFilter !== 'Todos' && p.TipoEntrega !== deliveryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = p.NombreCliente.toLowerCase().includes(q);
        const matchPhone = p.TelefonoCliente.toLowerCase().includes(q);
        const matchTicket = p.NTicket ? p.NTicket.toLowerCase().includes(q) : false;
        const matchId = String(p.Id).includes(q);
        const matchItems = p.Items.some((it) => it.platoNombre.toLowerCase().includes(q));
        const matchDir = p.DireccionEntrega ? p.DireccionEntrega.toLowerCase().includes(q) : false;
        if (!matchName && !matchPhone && !matchTicket && !matchId && !matchItems && !matchDir) return false;
      }
      return true;
    });
  }, [pedidos, filterEstado, deliveryFilter, searchTerm]);

  const pendingCount = pedidos.filter((p) => p.Estado === 'Pendiente').length;
  const inKitchenCount = pedidos.filter((p) => p.Estado === 'En Cocina').length;
  const deliveredCount = pedidos.filter((p) => p.Estado === 'Entregado').length;
  const cobradoCount = pedidos.filter((p) => p.Estado === 'Cobrado').length;
  const anuladoCount = pedidos.filter((p) => p.Estado === 'Anulado' || p.Estado === 'Cancelado').length;

  const getWhatsAppReplyMode = (
    p: PedidoWhatsApp
  ): 'recibido' | 'en_cocina' | 'en_camino' | 'listo_retiro' | 'cobrado' => {
    if (p.Estado === 'Pendiente') return 'recibido';
    if (p.Estado === 'En Cocina') return 'en_cocina';
    if (p.Estado === 'Entregado') return p.TipoEntrega === 'Delivery' ? 'en_camino' : 'listo_retiro';
    if (p.Estado === 'Cobrado') return 'cobrado';
    return 'en_cocina';
  };

  const getWhatsAppReplyTooltip = (p: PedidoWhatsApp) => {
    if (p.Estado === 'Pendiente') return 'Notificar por WhatsApp: Pedido recibido con éxito';
    if (p.Estado === 'En Cocina') return 'Notificar por WhatsApp: Su pedido está siendo procesado en la Cocina';
    if (p.Estado === 'Entregado') {
      return p.TipoEntrega === 'Delivery'
        ? 'Notificar por WhatsApp: Tu pedido va en camino, por favor estar pendiente'
        : 'Notificar por WhatsApp: Listo para retirar en el restaurante';
    }
    if (p.Estado === 'Cobrado') return 'Notificar por WhatsApp: Pedido cobrado con éxito';
    return 'Notificar por WhatsApp';
  };

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
            {(
              [
                { label: 'Todos', count: pedidos.length },
                { label: 'Pendiente', count: pendingCount },
                { label: 'En Cocina', count: inKitchenCount },
                { label: 'Entregado', count: deliveredCount },
                { label: 'Cobrado', count: cobradoCount },
                { label: 'Anulado', count: anuladoCount },
              ] as const
            ).map((tab) => {
              const isSelected = filterEstado === tab.label;
              return (
                <button
                  key={tab.label}
                  onClick={() => setFilterEstado(tab.label as EstadoPedidoWhatsApp | 'Todos')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-stone-950 font-bold shadow-sm'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  <span>{tab.label === 'Todos' ? 'Todos' : tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-stone-950/80 text-emerald-300'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {tab.count}
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

        {/* Search & Secondary Filter Toolbar */}
        <div className="px-4 py-2.5 bg-stone-950/80 border-b border-stone-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                placeholder="Buscar por cliente, teléfono, ticket o plato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-500 text-xs focus:outline-none focus:border-emerald-500/50"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 text-stone-400">
            <div className="flex items-center space-x-1.5">
              <span>Tipo Entrega:</span>
              <select
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value as any)}
                className="bg-stone-900 border border-stone-800 text-stone-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="Todos">Todos</option>
                <option value="Delivery">Solo Delivery</option>
                <option value="Para llevar">Solo Para Llevar</option>
              </select>
            </div>

            <span className="text-stone-500 font-mono">
              Mostrando {filteredPedidos.length} de {pedidos.length}
            </span>
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

        {/* Orders Table Area (Styled like HistorialVentasView) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950 border-b border-stone-800 text-stone-400 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3.5 w-24">Ticket / ID</th>
                    <th className="py-3 px-3.5">Fecha y Hora</th>
                    <th className="py-3 px-3.5">Cliente / Teléfono</th>
                    <th className="py-3 px-3.5">Tipo Entrega</th>
                    <th className="py-3 px-3.5">Resumen de Pedido</th>
                    <th className="py-3 px-3.5">Forma de Pago</th>
                    <th className="py-3 px-3.5 text-right">Total</th>
                    <th className="py-3 px-3.5 text-center">Estado</th>
                    <th className="py-3 px-3.5 text-center w-48">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {filteredPedidos.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-14 text-center space-y-3">
                        <MessageSquare className="w-8 h-8 text-stone-600 mx-auto" />
                        <div className="text-stone-400 font-medium">
                          No se encontraron pedidos de WhatsApp con los filtros aplicados.
                        </div>
                        <div className="flex items-center justify-center space-x-3 pt-2">
                          <button
                            onClick={() => setIsPasteModalOpen(true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs font-bold rounded-lg shadow-sm"
                          >
                            Pegar Mensaje de WhatsApp
                          </button>
                          <button
                            onClick={() => handleSimulateIncomingOrder()}
                            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-lg border border-stone-700"
                          >
                            Simular Pedido de Prueba
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPedidos.map((pedido) => {
                      const isPending = pedido.Estado === 'Pendiente';
                      const isKitchen = pedido.Estado === 'En Cocina';
                      const isDelivered = pedido.Estado === 'Entregado';
                      const isCobrado = pedido.Estado === 'Cobrado';
                      const isAnulado = pedido.Estado === 'Anulado' || pedido.Estado === 'Cancelado';

                      // Dish preview text
                      const totalPlatosCount = pedido.Items.reduce((acc, it) => acc + it.cantidad, 0);
                      const itemsPreview = pedido.Items.map((it) => `${it.cantidad}x ${it.platoNombre}`).join(', ');

                      return (
                        <tr
                          key={pedido.Id}
                          className="hover:bg-stone-800/50 transition-colors group cursor-pointer"
                          onClick={() => setSelectedDetailsPedido(pedido)}
                        >
                          {/* Ticket / ID */}
                          <td className="py-3 px-3.5 font-mono">
                            {pedido.NTicket ? (
                              <span className="font-black text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-600/30">
                                {pedido.NTicket}
                              </span>
                            ) : (
                              <span className="text-stone-500 font-semibold">#{pedido.Id}</span>
                            )}
                          </td>

                          {/* Fecha y Hora */}
                          <td className="py-3 px-3.5 font-mono text-stone-300">
                            <div>{pedido.FechaCreacion || pedido.Fecha}</div>
                            {pedido.FechaCreacion && pedido.Fecha && (
                              <div className="text-[10px] text-stone-500">{pedido.Fecha}</div>
                            )}
                          </td>

                          {/* Cliente / Teléfono */}
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-stone-100 flex items-center space-x-1.5">
                              <span>{pedido.NombreCliente}</span>
                            </div>
                            <div className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1 mt-0.5">
                              <Phone className="w-3 h-3 text-stone-500" />
                              <span>{pedido.TelefonoCliente}</span>
                            </div>
                          </td>

                          {/* Tipo Entrega */}
                          <td className="py-3 px-3.5">
                            {pedido.TipoEntrega === 'Delivery' ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                                <Truck className="w-3 h-3" />
                                <span>Delivery</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                                <Package className="w-3 h-3" />
                                <span>Para llevar</span>
                              </span>
                            )}
                            {pedido.DireccionEntrega && (
                              <div className="text-[10px] text-stone-400 truncate max-w-[140px] mt-0.5" title={pedido.DireccionEntrega}>
                                {pedido.DireccionEntrega}
                              </div>
                            )}
                          </td>

                          {/* Resumen de Pedido */}
                          <td className="py-3 px-3.5 max-w-xs">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-stone-200">
                                {totalPlatosCount} {totalPlatosCount === 1 ? 'plato' : 'platos'}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-400 truncate mt-0.5" title={itemsPreview}>
                              {itemsPreview}
                            </div>
                          </td>

                          {/* Forma de Pago */}
                          <td className="py-3 px-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                pedido.FormaPago === 'Efectivo'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                  : pedido.FormaPago === 'Pago Movil'
                                  ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                                  : pedido.FormaPago === 'Punto de Venta'
                                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                              }`}
                            >
                              {pedido.FormaPago}
                            </span>
                          </td>

                          {/* Total */}
                          <td className="py-3 px-3.5 text-right font-black text-sm text-stone-100 font-mono">
                            {formatCurrency(pedido.Total)}
                          </td>

                          {/* Estado */}
                          <td className="py-3 px-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                isPending
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                                  : isKitchen
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : isDelivered
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : isCobrado
                                  ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/50'
                                  : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                              }`}
                            >
                              {pedido.Estado}
                            </span>
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* Prominent "Detalles" button like in Historial de Ventas */}
                              <button
                                onClick={() => setSelectedDetailsPedido(pedido)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-sm transition-all"
                                title="Ver detalles completos del pedido de WhatsApp"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detalles</span>
                              </button>

                              {/* Send to Kitchen quick action if pending */}
                              {isPending && (
                                <button
                                  onClick={() => handleConvertToComanda(pedido)}
                                  className="inline-flex items-center space-x-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs shadow-sm transition-all"
                                  title="Mandar comanda directo a cocina"
                                >
                                  <ChefHat className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Cocina</span>
                                </button>
                              )}

                              {/* Direct WhatsApp notify */}
                              <a
                                href={buildWhatsAppReplyUrl(
                                  pedido.TelefonoCliente,
                                  pedido,
                                  getWhatsAppReplyMode(pedido)
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 transition-colors"
                                title={getWhatsAppReplyTooltip(pedido)}
                              >
                                <Send className="w-3.5 h-3.5" />
                              </a>

                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(pedido.Id)}
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950 hover:text-rose-400 text-stone-500 transition-colors"
                                title="Eliminar pedido"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

      {/* DETAILS MODAL FOR SELECTED WHATSAPP ORDER */}
      {activeDetailsPedido && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black text-white">
                      Detalle del Pedido WhatsApp
                    </h3>
                    {activeDetailsPedido.NTicket ? (
                      <span className="font-mono font-black text-xs text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/40">
                        Ticket #{activeDetailsPedido.NTicket}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-stone-400 bg-stone-800 px-2 py-0.5 rounded">
                        Pedido #{activeDetailsPedido.Id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Registrado: {activeDetailsPedido.FechaCreacion || ''} {activeDetailsPedido.Fecha}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    activeDetailsPedido.Estado === 'Pendiente'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                      : activeDetailsPedido.Estado === 'En Cocina'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : activeDetailsPedido.Estado === 'Entregado'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : activeDetailsPedido.Estado === 'Cobrado'
                      ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500/50'
                      : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                  }`}
                >
                  {activeDetailsPedido.Estado}
                </span>

                <button
                  onClick={() => setSelectedDetailsPedido(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Info Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Cliente */}
              <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">
                  Cliente & Contacto
                </div>
                <div className="font-black text-sm text-stone-100">
                  {activeDetailsPedido.NombreCliente}
                </div>
                <div className="flex items-center space-x-1.5 text-emerald-400 font-mono">
                  <Phone className="w-3.5 h-3.5 text-stone-500" />
                  <span>{activeDetailsPedido.TelefonoCliente}</span>
                </div>
                <a
                  href={buildWhatsAppReplyUrl(
                    activeDetailsPedido.TelefonoCliente,
                    activeDetailsPedido,
                    getWhatsAppReplyMode(activeDetailsPedido)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center space-x-1 text-[11px] text-emerald-400 hover:underline"
                  title={getWhatsAppReplyTooltip(activeDetailsPedido)}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Notificar por WhatsApp ({activeDetailsPedido.Estado})</span>
                </a>
              </div>

              {/* Entrega */}
              <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">
                  Modalidad de Entrega
                </div>
                <div>
                  {activeDetailsPedido.TipoEntrega === 'Delivery' ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Servicio Delivery</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60">
                      <Package className="w-3.5 h-3.5" />
                      <span>Retiro Para Llevar</span>
                    </span>
                  )}
                </div>
                {activeDetailsPedido.DireccionEntrega ? (
                  <div className="flex items-start space-x-1.5 text-stone-300 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{activeDetailsPedido.DireccionEntrega}</span>
                  </div>
                ) : (
                  <div className="text-stone-500 italic">Sin dirección (retiro en local)</div>
                )}
              </div>

              {/* Pago & Estado Sync */}
              <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">
                  Pago & Estado Actual
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Método de Pago:</span>
                  <span className="font-bold text-stone-200">{activeDetailsPedido.FormaPago}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-stone-800">
                  <span className="text-stone-400">Cambiar Estado:</span>
                  <select
                    value={activeDetailsPedido.Estado}
                    onChange={(e) =>
                      handleChangeStatus(activeDetailsPedido.Id, e.target.value as EstadoPedidoWhatsApp)
                    }
                    className="bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded-lg px-2 py-1 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Cocina">En Cocina</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Cobrado">Cobrado</option>
                    <option value="Anulado">Anulado</option>
                  </select>
                </div>
                {activeDetailsPedido.Notas && (
                  <div className="text-[11px] text-amber-300/90 italic pt-0.5">
                    "{activeDetailsPedido.Notas}"
                  </div>
                )}
              </div>
            </div>

            {/* Dish Breakdown Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-stone-200 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                <span>Desglose de Platos del Pedido ({activeDetailsPedido.Items.length})</span>
              </h4>

              <div className="bg-stone-950 border border-stone-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-900 border-b border-stone-800 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Plato / Ítem</th>
                      <th className="py-2.5 px-3 text-center w-20">Cantidad</th>
                      <th className="py-2.5 px-3 text-right w-28">Precio Unit.</th>
                      <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80">
                    {activeDetailsPedido.Items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-900/40">
                        <td className="py-2.5 px-3 font-medium text-stone-200">
                          {item.platoNombre}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black font-mono text-amber-400">
                          {item.cantidad}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-stone-400">
                          {formatCurrency(item.precioUnitario)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-200">
                          {formatCurrency(item.precioUnitario * item.cantidad)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-900/80 border-t border-stone-700">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-right font-black uppercase text-stone-300">
                        Monto Total del Pedido:
                      </td>
                      <td className="py-3 px-3 text-right font-black text-sm font-mono text-emerald-400">
                        {formatCurrency(activeDetailsPedido.Total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Original WhatsApp Message Container */}
            {activeDetailsPedido.MensajeOriginal && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-stone-400 flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Texto Original de WhatsApp</span>
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeDetailsPedido.MensajeOriginal);
                      showToast('Texto copiado al portapapeles');
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar texto</span>
                  </button>
                </div>
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-xs font-mono text-stone-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {activeDetailsPedido.MensajeOriginal}
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                {/* Delete */}
                <button
                  onClick={() => {
                    handleDelete(activeDetailsPedido.Id);
                    setSelectedDetailsPedido(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-rose-950 hover:text-rose-400 text-stone-400 border border-stone-700 transition-colors flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Pedido</span>
                </button>

                {/* POS Cart */}
                {onLoadOrderToCart && (
                  <button
                    onClick={() => handleLoadToCart(activeDetailsPedido)}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-colors flex items-center space-x-1"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cargar en POS</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* Send to Kitchen if Pending */}
                {activeDetailsPedido.Estado === 'Pendiente' && (
                  <button
                    onClick={() => {
                      handleConvertToComanda(activeDetailsPedido);
                      setSelectedDetailsPedido(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition-all"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>Mandar a Cocina</span>
                  </button>
                )}

                {/* Deliver if In Kitchen */}
                {activeDetailsPedido.Estado === 'En Cocina' && (
                  <button
                    onClick={() => handleChangeStatus(activeDetailsPedido.Id, 'Entregado')}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marcar Entregado</span>
                  </button>
                )}

                {/* Cobrar if Kitchen or Entregado */}
                {(activeDetailsPedido.Estado === 'En Cocina' || activeDetailsPedido.Estado === 'Entregado') && (
                  <button
                    onClick={() => handleChangeStatus(activeDetailsPedido.Id, 'Cobrado')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Marcar Cobrado</span>
                  </button>
                )}

                {/* Notify via WhatsApp Web */}
                <a
                  href={buildWhatsAppReplyUrl(
                    activeDetailsPedido.TelefonoCliente,
                    activeDetailsPedido,
                    getWhatsAppReplyMode(activeDetailsPedido)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/50 font-bold flex items-center space-x-1.5 shadow-sm transition-all"
                  title={getWhatsAppReplyTooltip(activeDetailsPedido)}
                >
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Notificar WhatsApp</span>
                </a>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedDetailsPedido(null)}
                  className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
