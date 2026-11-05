import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  ChefHat,
  Truck,
  History,
  AlertTriangle,
  Plus,
  Search,
  Trash2,
  Edit3,
  Save,
  ArrowUpDown,
  CheckCircle2,
  Calculator,
  TrendingUp,
  Percent,
  DollarSign,
  Layers,
  FileText,
  Copy,
  ExternalLink,
  RefreshCw,
  Download,
  HardDrive,
  Check,
  X,
  Phone,
  Building,
  Calendar,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Printer,
} from 'lucide-react';
import {
  Insumo,
  InsumoCategoria,
  UnidadMedida,
  RecetaItem,
  PlatoEscandallo,
  Proveedor,
  MovimientoInventario,
  TipoMovimientoInventario,
  Plato,
} from '../types';
import { sqliteService } from '../db/sqliteService';
import { formatCurrency, safeParsePrice } from '../utils/currency';
import { calculatePromoPrice, parseDiasSemana, DIAS_SEMANA_MAP } from '../utils/promo';
import { PrintReportModal, PrintReportModalProps } from './PrintReportModal';

interface InventarioViewProps {
  onRefreshPlatos?: () => void;
}

type SubTab = 'insumos' | 'escandallos' | 'proveedores' | 'kardex' | 'alertas';

const CATEGORIAS_INSUMO: InsumoCategoria[] = [
  'Harinas & Panadería',
  'Carnes & Pollo',
  'Quesos & Lácteos',
  'Salsas & Condimentos',
  'Vegetales & Verduras',
  'Bebidas (Venta Directa)',
  'Aceites & Grasas',
  'Empaques & Desechables',
  'Otros Insumos',
];

const UNIDADES_MEDIDA: UnidadMedida[] = [
  'kg',
  'g',
  'litro',
  'ml',
  'unidad',
  'porcion',
  'botella',
  'lata',
  'paquete',
];

export const InventarioView: React.FC<InventarioViewProps> = ({ onRefreshPlatos }) => {
  const [subTab, setSubTab] = useState<SubTab>('insumos');
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [escandallos, setEscandallos] = useState<PlatoEscandallo[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');
  const [kardexFilter, setKardexFilter] = useState<string>('Todos');

  // Modals state
  const [isInsumoModalOpen, setIsInsumoModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);

  // Controlled states for direct sale pricing & cost structure in modal
  const [modalEsVentaDirecta, setModalEsVentaDirecta] = useState(false);
  const [modalCostoUnitario, setModalCostoUnitario] = useState<number>(1.0);
  const [modalPrecioVenta, setModalPrecioVenta] = useState<number>(2.0);
  const [modalSyncPlato, setModalSyncPlato] = useState(true);

  // Controlled states for Insumo Promotion in modal
  const [modalPromoActiva, setModalPromoActiva] = useState(false);
  const [modalPromoTipo, setModalPromoTipo] = useState<'Porcentaje' | 'PrecioFijo' | '2x1' | '3x1' | 'NxM'>('Porcentaje');
  const [modalPromoValor, setModalPromoValor] = useState<number>(15);
  const [modalPromoNxMLleva, setModalPromoNxMLleva] = useState<number>(2);
  const [modalPromoNxMPaga, setModalPromoNxMPaga] = useState<number>(1);
  const [modalPromoVigencia, setModalPromoVigencia] = useState<'Siempre' | 'Intervalo' | 'DiasSemana'>('Siempre');
  const [modalPromoFechaInicio, setModalPromoFechaInicio] = useState<string>('');
  const [modalPromoFechaFin, setModalPromoFechaFin] = useState<string>('');
  const [modalPromoDiasSemana, setModalPromoDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [modalPromoEtiqueta, setModalPromoEtiqueta] = useState<string>('');

  const [isEntradaModalOpen, setIsEntradaModalOpen] = useState(false);
  const [selectedInsumoForEntrada, setSelectedInsumoForEntrada] = useState<Insumo | null>(null);
  const [entradaCantidad, setEntradaCantidad] = useState<number>(1);
  const [entradaReferencia, setEntradaReferencia] = useState<string>('');
  const [entradaCosto, setEntradaCosto] = useState<number>(0);

  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);
  const [selectedInsumoForAjuste, setSelectedInsumoForAjuste] = useState<Insumo | null>(null);
  const [ajusteNuevoStock, setAjusteNuevoStock] = useState<number>(0);
  const [ajusteMotivo, setAjusteMotivo] = useState<string>('');

  const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);

  // Escandallo state
  const [selectedPlatoId, setSelectedPlatoId] = useState<number | null>(null);
  const [recetaItems, setRecetaItems] = useState<RecetaItem[]>([]);
  const [newIngredienteInsumoId, setNewIngredienteInsumoId] = useState<number | ''>('');
  const [newIngredienteCantidad, setNewIngredienteCantidad] = useState<number>(1);
  const [newIngredienteNotas, setNewIngredienteNotas] = useState<string>('');

  // Controlled states for Selected Dish Promotion in Escandallos tab
  const [dishPromoActiva, setDishPromoActiva] = useState(false);
  const [dishPromoTipo, setDishPromoTipo] = useState<'Porcentaje' | 'PrecioFijo' | '2x1' | '3x1' | 'NxM'>('Porcentaje');
  const [dishPromoValor, setDishPromoValor] = useState<number>(15);
  const [dishPromoNxMLleva, setDishPromoNxMLleva] = useState<number>(2);
  const [dishPromoNxMPaga, setDishPromoNxMPaga] = useState<number>(1);
  const [dishPromoVigencia, setDishPromoVigencia] = useState<'Siempre' | 'Intervalo' | 'DiasSemana'>('Siempre');
  const [dishPromoFechaInicio, setDishPromoFechaInicio] = useState<string>('');
  const [dishPromoFechaFin, setDishPromoFechaFin] = useState<string>('');
  const [dishPromoDiasSemana, setDishPromoDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dishPromoEtiqueta, setDishPromoEtiqueta] = useState<string>('');
  const [dishEsRacion, setDishEsRacion] = useState<boolean>(false);
  const [dishTamanoRacion, setDishTamanoRacion] = useState<'Normal' | 'Mediana' | 'Grande'>('Normal');

  // Custom in-app confirmation modal for deletions (replaces window.confirm which fails in iframe sandbox)
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: 'insumo' | 'receta' | 'proveedor';
    id: number;
    nombre: string;
    extraInfo?: string;
  } | null>(null);

  // UI Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLocalLinked, setIsLocalLinked] = useState<boolean>(() => sqliteService.isLocalFileLinked());
  const [linkedFileName, setLinkedFileName] = useState<string | null>(() => sqliteService.getLinkedFileName());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConfirmDelete = () => {
    if (!deleteModalState) return;
    const { type, id, nombre } = deleteModalState;

    if (type === 'insumo') {
      sqliteService.deleteInsumo(id);
      showToast(`Insumo "${nombre}" eliminado del inventario.`);
      loadData();
    } else if (type === 'receta') {
      sqliteService.deleteReceta(id);
      setRecetaItems([]);
      showToast(`Ficha técnica y receta de "${nombre}" eliminada con éxito.`);
      loadData();
      if (onRefreshPlatos) onRefreshPlatos();
    } else if (type === 'proveedor') {
      sqliteService.deleteProveedor(id);
      showToast(`Proveedor "${nombre}" eliminado.`);
      loadData();
    }

    setDeleteModalState(null);
  };

  // Open Insumo modal for creating new item
  const openNewInsumoModal = (forceVentaDirecta = false) => {
    setEditingInsumo(null);
    setModalEsVentaDirecta(forceVentaDirecta);
    setModalCostoUnitario(1.0);
    setModalPrecioVenta(forceVentaDirecta ? 2.5 : 2.0);
    setModalSyncPlato(true);
    setModalPromoActiva(false);
    setModalPromoTipo('Porcentaje');
    setModalPromoValor(15);
    setModalPromoNxMLleva(2);
    setModalPromoNxMPaga(1);
    setModalPromoVigencia('Siempre');
    setModalPromoFechaInicio('');
    setModalPromoFechaFin('');
    setModalPromoDiasSemana([1, 2, 3, 4, 5]);
    setModalPromoEtiqueta('');
    setIsInsumoModalOpen(true);
  };

  // Open Insumo modal for editing existing item
  const openEditInsumoModal = (ins: Insumo) => {
    setEditingInsumo(ins);
    setModalEsVentaDirecta(Boolean(ins.EsVentaDirecta));
    setModalCostoUnitario(ins.CostoUnitario || 1.0);
    const linkedPlato = ins.PlatoId
      ? platos.find((p) => p.ID === ins.PlatoId)
      : platos.find((p) => p.Plato.trim().toLowerCase() === ins.Nombre.trim().toLowerCase());
    const initialPrice =
      ins.PrecioVenta && ins.PrecioVenta > 0
        ? ins.PrecioVenta
        : linkedPlato?.Precio || (ins.CostoUnitario > 0 ? Math.round(ins.CostoUnitario / 0.5) : 2.0);
    setModalPrecioVenta(initialPrice);
    setModalSyncPlato(true);
    setModalPromoActiva(Boolean(ins.PromoActiva));
    setModalPromoTipo(ins.PromoTipo || 'Porcentaje');
    setModalPromoValor(ins.PromoValor != null ? ins.PromoValor : 15);
    setModalPromoNxMLleva(ins.PromoNxMLleva || 2);
    setModalPromoNxMPaga(ins.PromoNxMPaga || 1);
    setModalPromoVigencia(ins.PromoVigencia || 'Siempre');
    setModalPromoFechaInicio(ins.PromoFechaInicio || '');
    setModalPromoFechaFin(ins.PromoFechaFin || '');
    setModalPromoDiasSemana(parseDiasSemana(ins.PromoDiasSemana).length > 0 ? parseDiasSemana(ins.PromoDiasSemana) : [1, 2, 3, 4, 5]);
    setModalPromoEtiqueta(ins.PromoEtiqueta || '');
    setIsInsumoModalOpen(true);
  };

  // Load all data
  const loadData = () => {
    const loadedInsumos = sqliteService.getInsumos();
    const loadedProveedores = sqliteService.getProveedores();
    const loadedPlatos = sqliteService.getPlatos();
    const loadedEscandallos = sqliteService.getPlatosEscandallos();
    const loadedMovimientos = sqliteService.getMovimientosInventario(200);

    setInsumos(loadedInsumos);
    setProveedores(loadedProveedores);
    setPlatos(loadedPlatos);
    setEscandallos(loadedEscandallos);
    setMovimientos(loadedMovimientos);

    if (loadedPlatos.length > 0 && selectedPlatoId === null) {
      setSelectedPlatoId(loadedPlatos[0].ID);
    }

    setIsLocalLinked(sqliteService.isLocalFileLinked());
    setLinkedFileName(sqliteService.getLinkedFileName());
  };

  useEffect(() => {
    loadData();
    const unsub = sqliteService.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  // Update recipe items when selected dish changes (handles both recipes and direct sale items)
  useEffect(() => {
    if (selectedPlatoId !== null) {
      const rec = sqliteService.getRecetaByPlato(selectedPlatoId);
      if (rec.length > 0) {
        setRecetaItems(rec);
      } else {
        const esc = escandallos.find((e) => e.PlatoId === selectedPlatoId);
        if (esc && esc.Ingredientes && esc.Ingredientes.length > 0) {
          setRecetaItems(esc.Ingredientes);
        } else {
          setRecetaItems([]);
        }
      }
    }
  }, [selectedPlatoId, escandallos]);

  // Handle direct file linking
  const handleLinkLocalFile = async () => {
    const res = await sqliteService.linkLocalDatabaseFile();
    if (res.success) {
      setIsLocalLinked(true);
      setLinkedFileName(res.filename || 'TerrenoBroaster.db');
      showToast(`¡Vinculado a ${res.filename}! Los cambios se guardarán automáticamente en tu disco.`);
    } else if (res.error) {
      showToast(res.error);
    }
  };

  const handleDownloadDb = () => {
    sqliteService.downloadDatabaseFile();
    showToast('Base de datos TerrenoBroaster.db descargada con éxito.');
  };

  // Metrics
  const totalInsumos = insumos.length;
  const insumosCriticos = useMemo(
    () => insumos.filter((i) => i.StockActual <= i.StockMinimo),
    [insumos]
  );
  const valorTotalInventario = useMemo(
    () => insumos.reduce((acc, i) => acc + (i.StockActual * i.CostoUnitario), 0),
    [insumos]
  );
  const platosConReceta = useMemo(
    () => escandallos.filter((e) => e.TieneReceta).length,
    [escandallos]
  );

  // Insumos Filtered
  const filteredInsumos = useMemo(() => {
    return insumos.filter((item) => {
      const matchesSearch =
        item.Nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.ProveedorNombre && item.ProveedorNombre.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat =
        selectedCategoria === 'Todas' || item.Categoria === selectedCategoria;
      return matchesSearch && matchesCat;
    });
  }, [insumos, searchQuery, selectedCategoria]);

  // Selected Plato Escandallo info
  const selectedEscandallo = useMemo(() => {
    if (selectedPlatoId === null) return null;
    return escandallos.find((e) => e.PlatoId === selectedPlatoId) || null;
  }, [escandallos, selectedPlatoId]);

  const selectedPlato = useMemo(() => {
    if (selectedPlatoId === null) return null;
    return platos.find((p) => p.ID === selectedPlatoId) || null;
  }, [platos, selectedPlatoId]);

  // Calculated food cost of current recipe items in view
  const currentCalculatedFoodCost = useMemo(() => {
    return recetaItems.reduce((acc, item) => {
      const ins = insumos.find((i) => i.InsumoId === item.InsumoId);
      const costoUnit = ins ? ins.CostoUnitario : (item.CostoUnitarioInsumo || 0);
      return acc + (item.Cantidad * costoUnit);
    }, 0);
  }, [recetaItems, insumos]);

  // Pricing analysis for selected dish
  const pricingAnalysis = useMemo(() => {
    const precioActual = selectedPlato ? selectedPlato.Precio : 0;
    const costo = currentCalculatedFoodCost;
    const margenBruto = precioActual - costo;
    const margenPorcentaje = precioActual > 0 ? (margenBruto / precioActual) * 100 : 0;
    const foodCostPorcentaje = precioActual > 0 ? (costo / precioActual) * 100 : 0;

    // Standard Gastronomy Margins
    const precioSugerido50 = costo > 0 ? costo / 0.50 : 0;
    const precioSugerido60 = costo > 0 ? costo / 0.40 : 0; // 40% Food Cost -> 60% Margin
    const precioSugerido70 = costo > 0 ? costo / 0.30 : 0;

    return {
      precioActual,
      costo,
      margenBruto,
      margenPorcentaje,
      foodCostPorcentaje,
      precioSugerido50,
      precioSugerido60,
      precioSugerido70,
    };
  }, [selectedPlato, currentCalculatedFoodCost]);

  // Sync selected dish promo configuration whenever dish changes
  useEffect(() => {
    if (selectedPlato) {
      setDishPromoActiva(Boolean(selectedPlato.PromoActiva));
      setDishPromoTipo(selectedPlato.PromoTipo || 'Porcentaje');
      setDishPromoValor(selectedPlato.PromoValor != null && selectedPlato.PromoValor > 0 ? selectedPlato.PromoValor : 15);
      setDishPromoNxMLleva(selectedPlato.PromoNxMLleva || 2);
      setDishPromoNxMPaga(selectedPlato.PromoNxMPaga || 1);
      setDishPromoVigencia(selectedPlato.PromoVigencia || 'Siempre');
      setDishPromoFechaInicio(selectedPlato.PromoFechaInicio || '');
      setDishPromoFechaFin(selectedPlato.PromoFechaFin || '');
      const parsedDays = parseDiasSemana(selectedPlato.PromoDiasSemana);
      setDishPromoDiasSemana(parsedDays.length > 0 ? parsedDays : [1, 2, 3, 4, 5]);
      setDishPromoEtiqueta(selectedPlato.PromoEtiqueta || '');
      setDishEsRacion(Boolean(selectedPlato.EsRacion || selectedPlato.Categoria.toLowerCase().includes('racion')));
      setDishTamanoRacion(selectedPlato.TamanoRacion || 'Normal');
    }
  }, [selectedPlatoId, selectedPlato]);

  // Save Dish Promotion directly from Escandallos tab
  const handleSaveDishPromo = () => {
    if (!selectedPlatoId || !selectedPlato) return;
    const ok = sqliteService.updatePlatoPromo(selectedPlatoId, {
      PromoActiva: dishPromoActiva,
      PromoTipo: dishPromoTipo,
      PromoValor: safeParsePrice(dishPromoValor),
      PromoNxMLleva: dishPromoTipo === '2x1' ? 2 : dishPromoTipo === '3x1' ? 3 : dishPromoTipo === 'NxM' ? dishPromoNxMLleva : undefined,
      PromoNxMPaga: dishPromoTipo === '2x1' ? 1 : dishPromoTipo === '3x1' ? 1 : dishPromoTipo === 'NxM' ? dishPromoNxMPaga : undefined,
      PromoVigencia: dishPromoVigencia,
      PromoFechaInicio: dishPromoFechaInicio || undefined,
      PromoFechaFin: dishPromoFechaFin || undefined,
      PromoDiasSemana: JSON.stringify(dishPromoDiasSemana),
      PromoEtiqueta: dishPromoEtiqueta.trim() || undefined,
      EsRacion: dishEsRacion,
      TamanoRacion: dishTamanoRacion,
    });

    if (ok) {
      showToast(
        dishPromoActiva
          ? `¡Promoción para "${selectedPlato.Plato}" activada y publicada en POS!`
          : `Promoción de "${selectedPlato.Plato}" desactivada.`
      );
      loadData();
      if (onRefreshPlatos) onRefreshPlatos();
    }
  };

  // Save Insumo Form
  const handleSaveInsumo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nombre = String(formData.get('nombre') || '').trim();
    const categoria = formData.get('categoria') as InsumoCategoria;
    const unidad = formData.get('unidad') as UnidadMedida;
    const stockActual = safeParsePrice(formData.get('stockActual'));
    const stockMinimo = safeParsePrice(formData.get('stockMinimo'));
    const costoUnitario = safeParsePrice(modalCostoUnitario);
    const proveedorIdRaw = formData.get('proveedorId');
    const proveedorId = proveedorIdRaw ? Number(proveedorIdRaw) : undefined;
    const esVentaDirecta = modalEsVentaDirecta;
    const precioVenta = esVentaDirecta ? safeParsePrice(modalPrecioVenta) : undefined;

    if (!nombre) {
      showToast('Por favor introduce el nombre del insumo');
      return;
    }

    const promoData = {
      PromoActiva: modalPromoActiva,
      PromoTipo: modalPromoTipo,
      PromoValor: safeParsePrice(modalPromoValor),
      PromoNxMLleva: modalPromoTipo === '2x1' ? 2 : modalPromoTipo === '3x1' ? 3 : modalPromoTipo === 'NxM' ? modalPromoNxMLleva : undefined,
      PromoNxMPaga: modalPromoTipo === '2x1' ? 1 : modalPromoTipo === '3x1' ? 1 : modalPromoTipo === 'NxM' ? modalPromoNxMPaga : undefined,
      PromoVigencia: modalPromoVigencia,
      PromoFechaInicio: modalPromoFechaInicio || undefined,
      PromoFechaFin: modalPromoFechaFin || undefined,
      PromoDiasSemana: JSON.stringify(modalPromoDiasSemana),
      PromoEtiqueta: modalPromoEtiqueta.trim() || undefined,
    };

    let savedInsumo: Insumo;
    if (editingInsumo) {
      savedInsumo = {
        ...editingInsumo,
        Nombre: nombre,
        Categoria: categoria,
        UnidadMedida: unidad,
        StockActual: stockActual,
        StockMinimo: stockMinimo,
        CostoUnitario: costoUnitario,
        PrecioVenta: precioVenta,
        ProveedorId: proveedorId,
        EsVentaDirecta: esVentaDirecta,
        ...promoData,
      };
      sqliteService.updateInsumo(savedInsumo);
      showToast(`Insumo "${nombre}" actualizado correctamente.`);
    } else {
      savedInsumo = sqliteService.addInsumo({
        Nombre: nombre,
        Categoria: categoria,
        UnidadMedida: unidad,
        StockActual: stockActual,
        StockMinimo: stockMinimo,
        CostoUnitario: costoUnitario,
        PrecioVenta: precioVenta,
        ProveedorId: proveedorId,
        EsVentaDirecta: esVentaDirecta,
        ...promoData,
      });
      showToast(`Insumo "${nombre}" creado correctamente.`);
    }

    // Automatically sync or publish to POS Menu if selected
    if (esVentaDirecta && modalSyncPlato && precioVenta && precioVenta > 0) {
      sqliteService.syncDirectSalePlato(savedInsumo.InsumoId, nombre, precioVenta, categoria);
      showToast(`Producto "${nombre}" publicado en la Carta del Menú POS.`);
      if (onRefreshPlatos) onRefreshPlatos();
    }

    setIsInsumoModalOpen(false);
    setEditingInsumo(null);
    loadData();
  };

  // Quick Stock Adjustment
  const handleConfirmAjuste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInsumoForAjuste) return;
    sqliteService.ajustarStockInsumo(
      selectedInsumoForAjuste.InsumoId,
      ajusteNuevoStock,
      'Ajuste_Manual',
      'Ajuste Manual Físico',
      'Admin',
      ajusteMotivo || 'Ajuste manual de inventario físico'
    );
    showToast(`Stock de ${selectedInsumoForAjuste.Nombre} actualizado a ${ajusteNuevoStock} ${selectedInsumoForAjuste.UnidadMedida}`);
    setIsAjusteModalOpen(false);
    setSelectedInsumoForAjuste(null);
    loadData();
  };

  // Quick Entrada / Purchase
  const handleConfirmEntrada = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInsumoForEntrada) return;
    if (entradaCantidad <= 0) {
      showToast('La cantidad debe ser mayor a 0');
      return;
    }

    const nuevoStock = selectedInsumoForEntrada.StockActual + entradaCantidad;
    sqliteService.registrarMovimiento({
      InsumoId: selectedInsumoForEntrada.InsumoId,
      Tipo: 'Entrada_Compra',
      Cantidad: entradaCantidad,
      StockAnterior: selectedInsumoForEntrada.StockActual,
      StockNuevo: nuevoStock,
      Referencia: entradaReferencia ? `Factura/Ref: ${entradaReferencia}` : 'Entrada de compra',
      Notas: entradaCosto > 0 ? `Costo unitario registrado: $${entradaCosto}` : undefined,
    });

    // Update stock and cost if updated
    sqliteService.updateInsumo({
      ...selectedInsumoForEntrada,
      StockActual: nuevoStock,
      CostoUnitario: entradaCosto > 0 ? entradaCosto : selectedInsumoForEntrada.CostoUnitario,
    });

    showToast(`Se registraron +${entradaCantidad} ${selectedInsumoForEntrada.UnidadMedida} en ${selectedInsumoForEntrada.Nombre}`);
    setIsEntradaModalOpen(false);
    setSelectedInsumoForEntrada(null);
    loadData();
  };

  // Recipe Builder
  const handleAddIngredienteToReceta = () => {
    if (!newIngredienteInsumoId || newIngredienteCantidad <= 0) {
      showToast('Selecciona un insumo y una cantidad válida');
      return;
    }

    const ins = insumos.find((i) => i.InsumoId === Number(newIngredienteInsumoId));
    if (!ins) return;

    // Check if ingredient already exists in recipe
    const existsIdx = recetaItems.findIndex((r) => r.InsumoId === ins.InsumoId);
    if (existsIdx >= 0) {
      const updated = [...recetaItems];
      updated[existsIdx].Cantidad += newIngredienteCantidad;
      setRecetaItems(updated);
    } else {
      const newItem: RecetaItem = {
        RecetaId: Date.now() + Math.floor(Math.random() * 1000),
        PlatoId: selectedPlatoId || 0,
        InsumoId: ins.InsumoId,
        Cantidad: newIngredienteCantidad,
        UnidadMedida: ins.UnidadMedida,
        InsumoNombre: ins.Nombre,
        InsumoCategoria: ins.Categoria,
        CostoUnitarioInsumo: ins.CostoUnitario,
        CostoPorPorcion: newIngredienteCantidad * ins.CostoUnitario,
        Notas: newIngredienteNotas || undefined,
      };
      setRecetaItems([...recetaItems, newItem]);
    }

    setNewIngredienteInsumoId('');
    setNewIngredienteCantidad(1);
    setNewIngredienteNotas('');
  };

  const handleRemoveIngrediente = (insumoId: number) => {
    const updated = recetaItems.filter((i) => i.InsumoId !== insumoId);
    setRecetaItems(updated);
    if (selectedPlatoId !== null) {
      sqliteService.setRecetaForPlato(selectedPlatoId, updated);
      loadData();
      showToast('Ingrediente retirado de la ficha técnica.');
    }
  };

  const handleSaveReceta = () => {
    if (selectedPlatoId === null) return;
    sqliteService.setRecetaForPlato(selectedPlatoId, recetaItems);
    showToast('¡Ficha Técnica y Escandallo guardados con éxito!');
    loadData();
  };

  // Apply suggested price directly to Plato in POS Menu
  const handleApplySuggestedPrice = (nuevoPrecio: number) => {
    if (!selectedPlato) return;
    const rounded = Math.round(nuevoPrecio * 100) / 100;
    sqliteService.updatePlato({
      ...selectedPlato,
      Precio: rounded,
    });

    if (selectedEscandallo?.InsumoId) {
      const ins = insumos.find((i) => i.InsumoId === selectedEscandallo.InsumoId);
      if (ins) {
        sqliteService.updateInsumo({
          ...ins,
          PrecioVenta: rounded,
        });
      }
    }

    showToast(`¡Precio de "${selectedPlato.Plato}" actualizado a $${rounded.toFixed(2)} en el POS!`);
    loadData();
    if (onRefreshPlatos) onRefreshPlatos();
  };

  // Save Proveedor
  const handleSaveProveedor = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nombre = String(formData.get('nombre') || '').trim();
    const rif = String(formData.get('rif') || '').trim();
    const telefono = String(formData.get('telefono') || '').trim();
    const contacto = String(formData.get('contacto') || '').trim();
    const direccion = String(formData.get('direccion') || '').trim();
    const categorias = String(formData.get('categorias') || '').trim();
    const diasEntrega = String(formData.get('diasEntrega') || '').trim();
    const notas = String(formData.get('notas') || '').trim();

    if (!nombre) {
      showToast('Introduce el nombre del proveedor');
      return;
    }

    if (editingProveedor) {
      sqliteService.updateProveedor({
        ...editingProveedor,
        Nombre: nombre,
        Rif: rif,
        Telefono: telefono,
        Contacto: contacto,
        Direccion: direccion,
        CategoriasSuministro: categorias,
        DiasEntrega: diasEntrega,
        Notas: notas,
      });
      showToast(`Proveedor "${nombre}" actualizado.`);
    } else {
      sqliteService.addProveedor({
        Nombre: nombre,
        Rif: rif,
        Telefono: telefono,
        Contacto: contacto,
        Direccion: direccion,
        CategoriasSuministro: categorias,
        DiasEntrega: diasEntrega,
        Notas: notas,
      });
      showToast(`Proveedor "${nombre}" registrado con éxito.`);
    }

    setIsProveedorModalOpen(false);
    setEditingProveedor(null);
    loadData();
  };

  // WhatsApp Order Generator
  const handleGenerateWhatsAppOrder = () => {
    if (insumosCriticos.length === 0) {
      showToast('No hay insumos críticos actualmente. ¡Inventario óptimo!');
      return;
    }

    let text = `*SOLICITUD DE REABASTECIMIENTO - TERRENO BROASTER*\n`;
    text += `Fecha: ${new Date().toLocaleDateString('es-VE')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `-------------------------------------------\n`;
    text += `*INSUMOS CON STOCK CRÍTICO:*\n\n`;

    let totalEst = 0;
    insumosCriticos.forEach((i, idx) => {
      const sugerido = Math.max(i.StockMinimo * 2 - i.StockActual, 1);
      const sub = sugerido * i.CostoUnitario;
      totalEst += sub;
      text += `${idx + 1}. *${i.Nombre}*\n`;
      text += `   - Stock Actual: ${i.StockActual} ${i.UnidadMedida} (Mín: ${i.StockMinimo})\n`;
      text += `   - Cantidad Sugerida a Pedir: *${sugerido} ${i.UnidadMedida}*\n`;
      if (i.ProveedorNombre) text += `   - Proveedor: ${i.ProveedorNombre}\n`;
      text += `\n`;
    });

    text += `-------------------------------------------\n`;
    text += `*Total Insumos a Reabastecer:* ${insumosCriticos.length}\n`;
    text += `*Monto Estimado de Compra:* $${totalEst.toFixed(2)}\n`;

    navigator.clipboard.writeText(text);
    showToast('¡Lista de compra copiada al portapapeles! Lista para pegar en WhatsApp.');
  };

  // Filtered Kardex Movements
  const filteredMovimientos = useMemo(() => {
    return movimientos.filter((m) => {
      if (kardexFilter === 'Todos') return true;
      if (kardexFilter === 'Entradas') return m.Tipo === 'Entrada_Compra';
      if (kardexFilter === 'Ventas') return m.Tipo === 'Salida_Venta';
      if (kardexFilter === 'Ajustes') return m.Tipo === 'Ajuste_Manual';
      if (kardexFilter === 'Mermas') return m.Tipo === 'Merma_Desperdicio';
      return true;
    });
  }, [movimientos, kardexFilter]);

  // Printable Reports State
  const [printReportData, setPrintReportData] = useState<Omit<PrintReportModalProps, 'isOpen' | 'onClose'> | null>(null);

  // 1. Print Insumos / Stock Valorizado
  const handlePrintInsumos = () => {
    setPrintReportData({
      title: 'Reporte de Inventario Físico & Stock Valorizado',
      subtitle: `Fecha de emisión: ${new Date().toLocaleDateString('es-VE')} | Total: ${insumos.length} insumos registrados`,
      categoryBadge: 'Inventario & Materia Prima',
      summaryCards: [
        { label: 'Insumos Registrados', value: insumos.length.toString(), subtext: 'En catálogo de materias primas' },
        { label: 'Valor Total en Stock', value: `$${valorTotalInventario.toFixed(2)}`, subtext: 'Capital inmovilizado en insumos', isHighlight: true },
        { label: 'Stock Bajo Mínimo', value: insumosCriticos.length.toString(), subtext: 'Insumos en riesgo de quiebre', isHighlight: insumosCriticos.length > 0 },
        { label: 'Categorías Activas', value: new Set(insumos.map((i) => i.Categoria)).size.toString(), subtext: 'Grupos de insumos' },
      ],
      columns: [
        { header: '#', align: 'center' },
        { header: 'Insumo / Materia Prima', align: 'left' },
        { header: 'Categoría', align: 'left' },
        { header: 'Stock Actual', align: 'center' },
        { header: 'Mínimo', align: 'center' },
        { header: 'Unidad', align: 'center' },
        { header: 'Costo Unit. ($)', align: 'right' },
        { header: 'Valor Total ($)', align: 'right' },
        { header: 'Proveedor', align: 'left' },
        { header: 'Estado', align: 'center' },
      ],
      rows: insumos.map((i, idx) => [
        idx + 1,
        i.Nombre,
        i.Categoria,
        i.StockActual,
        i.StockMinimo,
        i.UnidadMedida,
        `$${i.CostoUnitario.toFixed(2)}`,
        `$${(i.StockActual * i.CostoUnitario).toFixed(2)}`,
        i.ProveedorNombre || '—',
        i.StockActual <= i.StockMinimo ? 'BAJO MÍNIMO' : 'NORMAL',
      ]),
      footerRow: [
        '--',
        `TOTAL INVENTARIO VALORIZADO (${insumos.length} insumos)`,
        '--',
        '--',
        '--',
        '--',
        '--',
        `$${valorTotalInventario.toFixed(2)}`,
        '--',
        '--',
      ],
      notes: '* Los valores de inventario están calculados a costo unitario de reposición registrado en la base de datos local SQLite.',
      downloadFilename: `Inventario_Stock_Valorizado_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  // 2. Print General Escandallos (All Dishes)
  const handlePrintEscandallosGeneral = () => {
    let costoTotalSum = 0;
    let ventaTotalSum = 0;
    platos.forEach((p) => {
      const esc = escandallos.find((e) => e.PlatoId === p.ID);
      const costo = esc && esc.TieneReceta && esc.CostoTotalInsumos > 0 ? esc.CostoTotalInsumos : p.Precio * 0.35;
      costoTotalSum += costo;
      ventaTotalSum += p.Precio;
    });

    setPrintReportData({
      title: 'Reporte General de Escandallos y Food Cost',
      subtitle: `Catálogo de Platos del Menú | ${platos.length} platos (${platosConReceta} con escandallo detallado)`,
      categoryBadge: 'Costeo & Rentabilidad Gastronómica',
      summaryCards: [
        { label: 'Platos en Menú', value: platos.length.toString(), subtext: 'Total de ítems activos' },
        { label: 'Con Receta / Escandallo', value: `${platosConReceta} / ${platos.length}`, subtext: `${platos.length > 0 ? ((platosConReceta / platos.length) * 100).toFixed(0) : 0}% con costeo real`, isHighlight: true },
        { label: 'Margen Promedio Global', value: `${ventaTotalSum > 0 ? (((ventaTotalSum - costoTotalSum) / ventaTotalSum) * 100).toFixed(1) : 0}%`, subtext: 'Sobre catálogo del menú', isHighlight: true },
      ],
      columns: [
        { header: '#', align: 'center' },
        { header: 'Plato / Producto', align: 'left' },
        { header: 'Categoría', align: 'left' },
        { header: 'Precio Menú ($)', align: 'right' },
        { header: 'Costo Insumos ($)', align: 'right' },
        { header: 'Margen Bruto ($)', align: 'right' },
        { header: '% Margen', align: 'right' },
        { header: '% Food Cost', align: 'right' },
        { header: 'Escandallo', align: 'center' },
      ],
      rows: platos.map((p, idx) => {
        const esc = escandallos.find((e) => e.PlatoId === p.ID);
        const hasRec = Boolean(esc && esc.TieneReceta && esc.CostoTotalInsumos > 0);
        const costo = hasRec && esc ? esc.CostoTotalInsumos : p.Precio * 0.35;
        const margen = p.Precio - costo;
        const margenPct = p.Precio > 0 ? (margen / p.Precio) * 100 : 0;
        const foodCostPct = p.Precio > 0 ? (costo / p.Precio) * 100 : 0;

        return [
          idx + 1,
          p.Plato,
          p.Categoria,
          `$${p.Precio.toFixed(2)}`,
          `$${costo.toFixed(2)}`,
          `$${margen.toFixed(2)}`,
          `${margenPct.toFixed(1)}%`,
          `${foodCostPct.toFixed(1)}%`,
          hasRec ? 'DETALLADO' : 'EST. 35%',
        ];
      }),
      footerRow: [
        '--',
        `PROMEDIOS GENERALES (${platos.length} platos)`,
        '--',
        `$${(ventaTotalSum / (platos.length || 1)).toFixed(2)}`,
        `$${(costoTotalSum / (platos.length || 1)).toFixed(2)}`,
        `$${((ventaTotalSum - costoTotalSum) / (platos.length || 1)).toFixed(2)}`,
        `${ventaTotalSum > 0 ? (((ventaTotalSum - costoTotalSum) / ventaTotalSum) * 100).toFixed(1) : 0}%`,
        `${ventaTotalSum > 0 ? ((costoTotalSum / ventaTotalSum) * 100).toFixed(1) : 0}%`,
        '--',
      ],
      notes: '* Los platos marcados como "EST. 35%" no tienen ingredientes asignados y calculan su food cost con la norma estándar del 35%. Registre los insumos en el diseñador de escandallos para costeo exacto.',
      downloadFilename: `Escandallos_Menu_General_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  // 3. Print Ficha Técnica Individual (Selected Dish)
  const handlePrintFichaTecnica = () => {
    if (!selectedPlato) return;
    setPrintReportData({
      title: `Ficha Técnica & Escandallo: ${selectedPlato.Plato}`,
      subtitle: `Categoría: ${selectedPlato.Categoria} | Precio Actual POS: $${pricingAnalysis.precioActual.toFixed(2)}`,
      categoryBadge: 'Ficha Técnica de Cocina & Escandallo',
      summaryCards: [
        { label: 'Precio Menú POS', value: `$${pricingAnalysis.precioActual.toFixed(2)}`, subtext: 'Precio al consumidor' },
        { label: 'Costo Materia Prima', value: `$${pricingAnalysis.costo.toFixed(2)}`, subtext: `${pricingAnalysis.foodCostPorcentaje.toFixed(1)}% Food Cost`, isHighlight: false },
        { label: 'Margen Bruto Unit.', value: `$${pricingAnalysis.margenBruto.toFixed(2)}`, subtext: 'Contribución marginal por plato', isHighlight: true },
        { label: 'Margen Rentabilidad %', value: `${pricingAnalysis.margenPorcentaje.toFixed(1)}%`, subtext: 'Margen sobre venta', isHighlight: true },
      ],
      columns: [
        { header: '#', align: 'center' },
        { header: 'Ingrediente / Materia Prima', align: 'left' },
        { header: 'Categoría', align: 'left' },
        { header: 'Cantidad', align: 'center' },
        { header: 'Unidad', align: 'center' },
        { header: 'Costo Unit. ($)', align: 'right' },
        { header: 'Importe Receta ($)', align: 'right' },
        { header: '% en Plato', align: 'right' },
        { header: 'Notas de Preparación', align: 'left' },
      ],
      rows: recetaItems.map((item, idx) => {
        const ins = insumos.find((i) => i.InsumoId === item.InsumoId);
        const costoUnit = ins ? ins.CostoUnitario : (item.CostoUnitarioInsumo || 0);
        const subtotal = item.Cantidad * costoUnit;
        const pct = currentCalculatedFoodCost > 0 ? (subtotal / currentCalculatedFoodCost) * 100 : 0;
        return [
          idx + 1,
          item.InsumoNombre || ins?.Nombre || `Insumo #${item.InsumoId}`,
          ins?.Categoria || '—',
          item.Cantidad,
          item.UnidadMedida,
          `$${costoUnit.toFixed(2)}`,
          `$${subtotal.toFixed(2)}`,
          `${pct.toFixed(1)}%`,
          item.Notas || '—',
        ];
      }),
      footerRow: [
        '--',
        `TOTAL COSTO DE MATERIA PRIMA (FOOD COST)`,
        '--',
        '--',
        '--',
        '--',
        `$${currentCalculatedFoodCost.toFixed(2)}`,
        '100%',
        '--',
      ],
      notes: `* Precios de Venta Sugeridos según estándar gastronómico: Con 50% de margen = $${pricingAnalysis.precioSugerido50.toFixed(2)} | Con 60% de margen = $${pricingAnalysis.precioSugerido60.toFixed(2)} | Con 70% de margen = $${pricingAnalysis.precioSugerido70.toFixed(2)}.`,
      downloadFilename: `Ficha_Tecnica_${selectedPlato.Plato.replace(/\s+/g, '_')}.csv`,
    });
  };

  // 4. Print Proveedores Directory
  const handlePrintProveedores = () => {
    setPrintReportData({
      title: 'Directorio Oficial de Proveedores de Insumos',
      subtitle: `Terreno Broaster | Total de Proveedores: ${proveedores.length}`,
      categoryBadge: 'Compras & Cadena de Suministro',
      summaryCards: [
        { label: 'Proveedores Registrados', value: proveedores.length.toString(), subtext: 'Aliados comerciales activos' },
        { label: 'Insumos Vinculados', value: insumos.filter((i) => i.ProveedorId).length.toString(), subtext: 'Materias primas asignadas', isHighlight: true },
      ],
      columns: [
        { header: '#', align: 'center' },
        { header: 'Empresa / Proveedor', align: 'left' },
        { header: 'RIF / Identificación', align: 'left' },
        { header: 'Contacto', align: 'left' },
        { header: 'Teléfono / WhatsApp', align: 'left' },
        { header: 'Email', align: 'left' },
        { header: 'Días de Despacho', align: 'left' },
        { header: 'Insumos Suministrados', align: 'center' },
      ],
      rows: proveedores.map((prov, idx) => {
        const count = insumos.filter((i) => i.ProveedorId === prov.ProveedorId).length;
        return [
          idx + 1,
          prov.Nombre,
          prov.Rif || '—',
          prov.Contacto || '—',
          prov.Telefono || '—',
          prov.Email || '—',
          prov.DiasEntrega || '—',
          `${count} insumos`,
        ];
      }),
      notes: '* Directorio para emisión de solicitudes de compra y reposición directa vía WhatsApp.',
      downloadFilename: `Directorio_Proveedores_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  // 5. Print Kardex Movements
  const handlePrintKardex = () => {
    setPrintReportData({
      title: 'Reporte de Movimientos de Kardex (Trazabilidad)',
      subtitle: `Filtro aplicado: ${kardexFilter} | Total de movimientos emitidos: ${filteredMovimientos.length}`,
      categoryBadge: 'Kardex & Auditoría de Stock',
      summaryCards: [
        { label: 'Movimientos Listados', value: filteredMovimientos.length.toString(), subtext: 'Transacciones registradas' },
        { label: 'Entradas por Compra', value: movimientos.filter((m) => m.Tipo === 'Entrada_Compra').length.toString(), subtext: 'Ingresos al almacén' },
        { label: 'Salidas por Ventas', value: movimientos.filter((m) => m.Tipo === 'Salida_Venta').length.toString(), subtext: 'Descontadas por comandas POS' },
        { label: 'Ajustes y Mermas', value: movimientos.filter((m) => m.Tipo === 'Ajuste_Manual' || m.Tipo === 'Merma_Desperdicio').length.toString(), subtext: 'Ajustes de inventario', isHighlight: true },
      ],
      columns: [
        { header: '#', align: 'center' },
        { header: 'Fecha / Hora', align: 'left' },
        { header: 'Insumo', align: 'left' },
        { header: 'Tipo Movimiento', align: 'left' },
        { header: 'Cantidad', align: 'center' },
        { header: 'Stock Ant. → Nuevo', align: 'center' },
        { header: 'Referencia / Ticket', align: 'left' },
        { header: 'Notas / Auditoría', align: 'left' },
      ],
      rows: filteredMovimientos.map((m, idx) => [
        idx + 1,
        m.Fecha,
        m.InsumoNombre || `Insumo #${m.InsumoId}`,
        m.Tipo.replace('_', ' '),
        m.Tipo === 'Entrada_Compra' ? `+${m.Cantidad}` : `-${Math.abs(m.Cantidad)}`,
        `${m.StockAnterior} → ${m.StockNuevo}`,
        m.Referencia || '—',
        m.Notas || '—',
      ]),
      notes: '* Registro inmutable de trazabilidad generado por el motor SQLite local.',
      downloadFilename: `Kardex_Movimientos_${kardexFilter}_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  // 6. Print Alertas de Stock Crítico
  const handlePrintAlertas = () => {
    let totalEstCompra = 0;
    insumosCriticos.forEach((i) => {
      const sugerido = Math.max(i.StockMinimo * 2 - i.StockActual, 1);
      totalEstCompra += sugerido * i.CostoUnitario;
    });

    setPrintReportData({
      title: 'Orden de Compra & Reposición de Stock Crítico',
      subtitle: `Insumos que requieren reabastecimiento urgente | Fecha: ${new Date().toLocaleDateString('es-VE')}`,
      categoryBadge: 'Compras Urgentes & Reposición',
      summaryCards: [
        { label: 'Insumos Críticos', value: insumosCriticos.length.toString(), subtext: 'Por debajo o igual al stock mínimo', isHighlight: true },
        { label: 'Insumos Agotados (Stock 0)', value: insumosCriticos.filter((i) => i.StockActual <= 0).length.toString(), subtext: 'Quiebre total de stock', isHighlight: true },
        { label: 'Monto Estimado Reposición', value: `$${totalEstCompra.toFixed(2)}`, subtext: 'Para llevar a 2x stock de seguridad', isHighlight: true },
      ],
      columns: [
        { header: '#', align: 'center' },
        { header: 'Insumo', align: 'left' },
        { header: 'Categoría', align: 'left' },
        { header: 'Stock Actual', align: 'center' },
        { header: 'Stock Mínimo', align: 'center' },
        { header: 'Unidad', align: 'center' },
        { header: 'Cant. Sugerida', align: 'center' },
        { header: 'Costo Unit. ($)', align: 'right' },
        { header: 'Subtotal Est. ($)', align: 'right' },
        { header: 'Proveedor', align: 'left' },
      ],
      rows: insumosCriticos.map((i, idx) => {
        const sugerido = Math.max(i.StockMinimo * 2 - i.StockActual, 1);
        const sub = sugerido * i.CostoUnitario;
        return [
          idx + 1,
          i.Nombre,
          i.Categoria,
          i.StockActual,
          i.StockMinimo,
          i.UnidadMedida,
          sugerido,
          `$${i.CostoUnitario.toFixed(2)}`,
          `$${sub.toFixed(2)}`,
          i.ProveedorNombre || '—',
        ];
      }),
      footerRow: [
        '--',
        `TOTAL ESTIMADO DE COMPRA (${insumosCriticos.length} insumos)`,
        '--',
        '--',
        '--',
        '--',
        '--',
        '--',
        `$${totalEstCompra.toFixed(2)}`,
        '--',
      ],
      notes: '* Cantidad sugerida calculada para reponer el doble del stock de seguridad mínimo y evitar quiebres durante operaciones de alta demanda.',
      downloadFilename: `Orden_Compra_Stock_Critico_${new Date().toISOString().split('T')[0]}.csv`,
    });
  };

  return (
    <div className="flex-1 bg-stone-950 text-white min-h-screen flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-stone-950 font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Metrics Header */}
      <div className="bg-stone-900 border-b border-stone-800 p-4 sm:p-6 shadow-md">
        <div className="max-w-7xl mx-auto">
          {/* Title & Quick Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Package className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    Sistema de Inventario & Escandallos
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      Trazabilidad Total
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-400">
                    Control de materia prima, recetas de platos (Food Cost), stock directo y compras a proveedores.
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Local SQLite Linker Status */}
            <div className="flex flex-wrap items-center gap-2">
              {isLocalLinked ? (
                <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs shadow-inner">
                  <HardDrive className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <div>
                    <span className="font-bold block leading-none">Base de datos vinculada:</span>
                    <span className="text-[11px] text-emerald-200/80 font-mono truncate max-w-[180px] block">
                      {linkedFileName || 'TerrenoBroaster.db'}
                    </span>
                  </div>
                  <button
                    onClick={handleLinkLocalFile}
                    className="text-[10px] text-emerald-400 hover:text-white underline ml-1 cursor-pointer"
                    title="Cargar otro archivo .db de base de datos"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLinkLocalFile}
                  title="Cargar o vincular archivo TerrenoBroaster.db desde tu disco o almacenamiento local"
                  className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-amber-400/50 text-stone-200 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <span>Cargar / Vincular .db</span>
                </button>
              )}

              <button
                onClick={handleDownloadDb}
                title="Descargar copia de la base de datos SQLite física"
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar .db</span>
              </button>
            </div>
          </div>

          {/* 4 Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total Insumos */}
            <div className="bg-stone-950/70 border border-stone-800 p-3.5 sm:p-4 rounded-2xl flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block font-medium">Insumos Registrados</span>
                <span className="text-xl sm:text-2xl font-black text-white">{totalInsumos}</span>
              </div>
            </div>

            {/* 2. Valor Total del Inventario */}
            <div className="bg-stone-950/70 border border-stone-800 p-3.5 sm:p-4 rounded-2xl flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block font-medium">Valor Total Inventario</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                  ${valorTotalInventario.toFixed(2)}
                </span>
              </div>
            </div>

            {/* 3. Stock Crítico / Alertas */}
            <div
              onClick={() => setSubTab('alertas')}
              className={`p-3.5 sm:p-4 rounded-2xl flex items-center space-x-3.5 cursor-pointer transition-all border ${
                insumosCriticos.length > 0
                  ? 'bg-red-950/40 border-red-500/40 hover:bg-red-950/60 text-red-300'
                  : 'bg-stone-950/70 border-stone-800 text-stone-400'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${insumosCriticos.length > 0 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-stone-800 text-stone-500'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] block font-medium">Insumos Bajo Mínimo</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xl sm:text-2xl font-black ${insumosCriticos.length > 0 ? 'text-red-400' : 'text-stone-300'}`}>
                    {insumosCriticos.length}
                  </span>
                  {insumosCriticos.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 uppercase">
                      ¡Atención!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Platos con Receta */}
            <div
              onClick={() => setSubTab('escandallos')}
              className="bg-stone-950/70 border border-stone-800 p-3.5 sm:p-4 rounded-2xl flex items-center space-x-3.5 cursor-pointer hover:border-amber-500/40 transition-all"
            >
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block font-medium">Platos con Escandallo</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black text-white">{platosConReceta}</span>
                  <span className="text-xs text-stone-500">/ {platos.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Subnavigation Tabs */}
          <div className="flex items-center space-x-1 sm:space-x-2 mt-6 overflow-x-auto pb-1 border-b border-stone-800 scrollbar-none">
            <button
              onClick={() => setSubTab('insumos')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                subTab === 'insumos'
                  ? 'border-amber-400 text-amber-400 bg-stone-800/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Insumos & Stock ({insumos.length})</span>
            </button>

            <button
              onClick={() => setSubTab('escandallos')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                subTab === 'escandallos'
                  ? 'border-amber-400 text-amber-400 bg-stone-800/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Recetas & Escandallos (Food Cost)</span>
            </button>

            <button
              onClick={() => setSubTab('proveedores')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                subTab === 'proveedores'
                  ? 'border-amber-400 text-amber-400 bg-stone-800/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Proveedores ({proveedores.length})</span>
            </button>

            <button
              onClick={() => setSubTab('kardex')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                subTab === 'kardex'
                  ? 'border-amber-400 text-amber-400 bg-stone-800/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Kardex & Movimientos ({movimientos.length})</span>
            </button>

            <button
              onClick={() => setSubTab('alertas')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                subTab === 'alertas'
                  ? 'border-red-400 text-red-400 bg-stone-800/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Alertas & Reabastecimiento</span>
              {insumosCriticos.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-500 text-stone-950 text-[10px] font-black">
                  {insumosCriticos.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* ========================================================= */}
        {/* SUBTAB 1: INSUMOS & STOCK */}
        {/* ========================================================= */}
        {subTab === 'insumos' && (
          <div className="space-y-4">
            {/* Filters & Actions Bar */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar insumo por nombre o proveedor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 transition-all"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-stone-200 focus:outline-none focus:border-amber-400"
              >
                <option value="Todas">Todas las Categorías</option>
                {CATEGORIAS_INSUMO.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintInsumos}
                  className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Imprimir Stock</span>
                </button>

                <button
                  onClick={() => openNewInsumoModal(true)}
                  className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Registrar producto de venta directa con estructura de costos y margen"
                >
                  <Package className="w-4 h-4" />
                  <span>+ Venta Directa</span>
                </button>

                <button
                  onClick={() => openNewInsumoModal(false)}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Insumo</span>
                </button>
              </div>
            </div>

            {/* Insumos Table */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-stone-300">
                  <thead className="bg-stone-950 text-stone-400 font-bold uppercase text-[11px] tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="py-3 px-4">Insumo</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Tipo & Venta POS</th>
                      <th className="py-3 px-4 text-center">Stock Actual</th>
                      <th className="py-3 px-4 text-center">Mínimo</th>
                      <th className="py-3 px-4 text-right">Costo / Margen</th>
                      <th className="py-3 px-4 text-right">Valor Total</th>
                      <th className="py-3 px-4">Proveedor</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-medium">
                    {filteredInsumos.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-stone-500">
                          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                          No se encontraron insumos con los filtros actuales.
                        </td>
                      </tr>
                    ) : (
                      filteredInsumos.map((item) => {
                        const isBajoMinimo = item.StockActual <= item.StockMinimo;
                        const isAdvertencia = item.StockActual > item.StockMinimo && item.StockActual <= item.StockMinimo * 1.5;
                        const hasVenta = item.EsVentaDirecta && item.PrecioVenta && item.PrecioVenta > 0;
                        const margenBruto = hasVenta ? (item.PrecioVenta! - item.CostoUnitario) : 0;
                        const margenPct = hasVenta ? ((margenBruto / item.PrecioVenta!) * 100) : 0;

                        return (
                          <tr key={item.InsumoId} className="hover:bg-stone-800/40 transition-colors">
                            {/* Insumo Name */}
                            <td className="py-3.5 px-4 font-bold text-white">
                              <div className="flex items-center space-x-2">
                                <span className="truncate">{item.Nombre}</span>
                              </div>
                            </td>

                            {/* Categoria */}
                            <td className="py-3.5 px-4 text-stone-400">
                              <span className="px-2 py-0.5 rounded-lg bg-stone-800 text-[11px] text-stone-300">
                                {item.Categoria}
                              </span>
                            </td>

                            {/* Tipo & Venta POS */}
                            <td className="py-3.5 px-4">
                              {item.EsVentaDirecta ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold inline-block">
                                      🏷️ Venta Directa
                                    </span>
                                    {item.PromoActiva && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-black uppercase inline-block">
                                        🔥 {item.PromoEtiqueta || (item.PromoTipo === 'Porcentaje' ? `-${item.PromoValor}%` : 'OFERTA')}
                                      </span>
                                    )}
                                  </div>
                                  {hasVenta ? (
                                    <div className="text-[11px] leading-tight font-mono">
                                      <span className="text-emerald-400 font-bold">${item.PrecioVenta!.toFixed(2)}</span>
                                      <span className="text-stone-400 ml-1">
                                        ({margenPct.toFixed(0)}% mg)
                                      </span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openEditInsumoModal(item)}
                                      className="text-[10px] text-amber-400 hover:text-amber-300 block font-bold cursor-pointer underline"
                                    >
                                      + Fijar precio de venta
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                                  Materia Prima
                                </span>
                              )}
                            </td>

                            {/* Stock Actual with Color Indicator */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                    isBajoMinimo
                                      ? 'bg-red-500 animate-ping'
                                      : isAdvertencia
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-400'
                                  }`}
                                />
                                <span
                                  className={`${
                                    isBajoMinimo
                                      ? 'text-red-400 font-black'
                                      : isAdvertencia
                                      ? 'text-amber-300'
                                      : 'text-emerald-300'
                                  }`}
                                >
                                  {item.StockActual} {item.UnidadMedida}
                                </span>
                              </div>
                            </td>

                            {/* Stock Minimo */}
                            <td className="py-3.5 px-4 text-center text-stone-400 font-mono text-xs">
                              {item.StockMinimo} {item.UnidadMedida}
                            </td>

                            {/* Costo Unitario & Margen */}
                            <td className="py-3.5 px-4 text-right font-mono text-stone-300">
                              <div>${item.CostoUnitario.toFixed(2)}</div>
                              {hasVenta && (
                                <div className={`text-[10px] font-bold ${margenBruto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {margenBruto >= 0 ? `+$${margenBruto.toFixed(2)}` : `-$${Math.abs(margenBruto).toFixed(2)}`}
                                </div>
                              )}
                            </td>

                            {/* Valor Total */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                              ${(item.StockActual * item.CostoUnitario).toFixed(2)}
                            </td>

                            {/* Proveedor */}
                            <td className="py-3.5 px-4 text-stone-400 text-xs">
                              {item.ProveedorNombre || '—'}
                            </td>

                            {/* Acciones */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                {/* Estructura de Costos para Venta Directa */}
                                {item.EsVentaDirecta && (
                                  <button
                                    onClick={() => openEditInsumoModal(item)}
                                    title="Ver y configurar Estructura de Costos & Margen"
                                    className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
                                  >
                                    <Calculator className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Entrada / Compra rápida */}
                                <button
                                  onClick={() => {
                                    setSelectedInsumoForEntrada(item);
                                    setEntradaCantidad(item.StockMinimo || 5);
                                    setEntradaCosto(item.CostoUnitario);
                                    setEntradaReferencia('');
                                    setIsEntradaModalOpen(true);
                                  }}
                                  title="Registrar Compra / Entrada de Stock"
                                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-stone-950 transition-all cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                {/* Ajuste rápido */}
                                <button
                                  onClick={() => {
                                    setSelectedInsumoForAjuste(item);
                                    setAjusteNuevoStock(item.StockActual);
                                    setAjusteMotivo('');
                                    setIsAjusteModalOpen(true);
                                  }}
                                  title="Ajuste manual de stock físico / Merma"
                                  className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white transition-all cursor-pointer"
                                >
                                  <ArrowUpDown className="w-3.5 h-3.5" />
                                </button>

                                {/* Editar */}
                                <button
                                  onClick={() => openEditInsumoModal(item)}
                                  title="Editar Insumo"
                                  className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-amber-500 hover:text-stone-950 transition-all cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Eliminar */}
                                <button
                                  onClick={() => {
                                    setDeleteModalState({
                                      isOpen: true,
                                      type: 'insumo',
                                      id: item.InsumoId,
                                      nombre: item.Nombre,
                                      extraInfo: `Stock actual: ${item.StockActual} ${item.UnidadMedida}. Costo: $${item.CostoUnitario.toFixed(2)}.`,
                                    });
                                  }}
                                  title="Eliminar Insumo"
                                  className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
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
        )}

        {/* ========================================================= */}
        {/* SUBTAB 2: RECETAS & ESCANDALLOS (FOOD COST & PRECIOS) */}
        {/* ========================================================= */}
        {subTab === 'escandallos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 4 Cols: Platos List */}
            <div className="lg:col-span-4 bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col h-[700px]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-white text-base">Seleccionar Plato</h3>
                  <p className="text-xs text-stone-400">
                    {platos.length} platos ({platosConReceta} con escandallo)
                  </p>
                </div>
                <button
                  onClick={handlePrintEscandallosGeneral}
                  title="Imprimir reporte general de escandallos y márgenes del menú"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Imprimir Todos</span>
                </button>
              </div>

              {/* Platos Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {platos.map((plato) => {
                  const isSelected = selectedPlatoId === plato.ID;
                  const esc = escandallos.find((e) => e.PlatoId === plato.ID);
                  const hasRecipe = esc && esc.TieneReceta;

                  return (
                    <button
                      key={plato.ID}
                      onClick={() => setSelectedPlatoId(plato.ID)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                          : 'bg-stone-950/60 border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-800/40'
                      }`}
                    >
                      <div className="overflow-hidden pr-2">
                        <span className="font-bold text-sm block truncate">{plato.Plato}</span>
                        <div className="flex items-center space-x-2 text-[11px] text-stone-400">
                          <span>{plato.Categoria}</span>
                          <span>•</span>
                          <span className="text-amber-400 font-mono font-bold">${plato.Precio.toFixed(2)}</span>
                          {esc?.PromoActiva && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold text-[9px] border border-rose-500/30">
                              🔥 Promo
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasRecipe ? (
                          esc?.EsVentaDirecta ? (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              Venta Directa
                            </span>
                          ) : (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Escandallo
                            </span>
                          )
                        ) : (
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-stone-800 text-stone-500 text-[10px]">
                            Sin receta
                          </span>
                        )}

                        {hasRecipe && !esc?.EsVentaDirecta && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalState({
                                isOpen: true,
                                type: 'receta',
                                id: plato.ID,
                                nombre: plato.Plato,
                                extraInfo: 'Se eliminarán todos los ingredientes de la ficha técnica y este plato volverá a estado "Sin receta".',
                              });
                            }}
                            title="Eliminar Ficha Técnica / Receta"
                            className="p-1 rounded-md bg-stone-900 hover:bg-rose-600/30 text-stone-500 hover:text-rose-400 border border-stone-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 8 Cols: Food Cost Breakdown & Recipe Builder */}
            <div className="lg:col-span-8 space-y-6">
              {selectedPlato ? (
                <>
                  {/* Dish Header & Pricing Structure Cards */}
                  <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wider text-amber-400 font-bold block">
                            Ficha Técnica / Escandallo Gastronómico
                          </span>
                          {selectedEscandallo?.EsVentaDirecta && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                              🏷️ Venta Directa
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl font-black text-white">{selectedPlato.Plato}</h2>
                        <span className="text-xs text-stone-400">Categoría: {selectedPlato.Categoria}</span>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        {recetaItems.length > 0 && !selectedEscandallo?.EsVentaDirecta && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteModalState({
                                isOpen: true,
                                type: 'receta',
                                id: selectedPlato.ID,
                                nombre: selectedPlato.Plato,
                                extraInfo: `Se borrarán los ${recetaItems.length} ingredientes asignados a esta ficha técnica.`,
                              });
                            }}
                            className="flex items-center space-x-1 px-2.5 py-2 rounded-xl bg-stone-800 hover:bg-rose-500/20 text-stone-400 hover:text-rose-400 border border-stone-700 text-xs font-bold transition-all cursor-pointer"
                            title="Eliminar todos los ingredientes de la receta actual"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar Receta</span>
                          </button>
                        )}

                        <button
                          onClick={handlePrintFichaTecnica}
                          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimir Ficha Técnica</span>
                        </button>

                        <div className="text-right pl-1">
                          <span className="text-[11px] text-stone-400 block">Precio Actual Menú POS</span>
                          <span className="text-2xl font-black text-white font-mono">
                            ${pricingAnalysis.precioActual.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Banner for Direct Sale Products */}
                    {selectedEscandallo?.EsVentaDirecta && (
                      <div className="mt-4 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-blue-300 uppercase tracking-wider">
                              Producto de Venta Directa (Sin Preparación Culinaria)
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">
                              Listo para consumo
                            </span>
                          </div>
                          <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                            Este producto se vende directo en mostrador o delivery en su empaque original. Su costo unitario se toma automáticamente del valor de compra registrado en almacén ($<span className="font-mono font-bold text-white">{pricingAnalysis.costo.toFixed(2)}</span>), permitiendo costearlo y fijar su precio de venta al público en el POS con la misma estructura que las recetas de cocina.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Food Cost & Margins Analysis Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                      {/* Costo Materia Prima (Food Cost) */}
                      <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
                        <span className="text-[11px] text-stone-400 block">Costo Materia Prima</span>
                        <span className="text-lg sm:text-xl font-black text-red-400 font-mono">
                          ${pricingAnalysis.costo.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-stone-500 block">
                          {pricingAnalysis.foodCostPorcentaje.toFixed(1)}% del precio
                        </span>
                      </div>

                      {/* Margen Bruto ($) */}
                      <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
                        <span className="text-[11px] text-stone-400 block">Margen Bruto ($)</span>
                        <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                          ${pricingAnalysis.margenBruto.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-stone-500 block">ganancia por plato</span>
                      </div>

                      {/* Margen de Ganancia (%) */}
                      <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
                        <span className="text-[11px] text-stone-400 block">Margen de Ganancia (%)</span>
                        <span className="text-lg sm:text-xl font-black text-amber-400 font-mono">
                          {pricingAnalysis.margenPorcentaje.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-stone-500 block">sobre precio de venta</span>
                      </div>

                      {/* Semáforo Food Cost */}
                      <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 flex flex-col justify-between">
                        <span className="text-[11px] text-stone-400 block">Salud Financiera</span>
                        <div>
                          {pricingAnalysis.foodCostPorcentaje <= 35 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-block">
                              Excelente (&lt;35%)
                            </span>
                          ) : pricingAnalysis.foodCostPorcentaje <= 45 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold inline-block">
                              Aceptable (35-45%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold inline-block">
                              Costo Alto (&gt;45%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Precios Sugeridos Gastronomía Simulator */}
                    <div className="mt-5 p-4 rounded-xl bg-stone-950/80 border border-amber-500/30">
                      <div className="flex items-center space-x-2 text-amber-400 mb-3">
                        <Sparkles className="w-4 h-4" />
                        <h4 className="text-xs font-black uppercase tracking-wider">
                          Estructura de Precios Sugeridos por Margen Gastronómico
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Margen 50% */}
                        <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold text-stone-300 block">Margen 50%</span>
                            <span className="text-base font-black text-white font-mono">
                              ${pricingAnalysis.precioSugerido50.toFixed(2)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleApplySuggestedPrice(pricingAnalysis.precioSugerido50)}
                            className="mt-2 text-[11px] font-bold px-2.5 py-1 bg-stone-800 hover:bg-amber-500 hover:text-stone-950 rounded-lg transition-all text-stone-300 cursor-pointer"
                          >
                            Aplicar al Menú
                          </button>
                        </div>

                        {/* Margen 60% (Recomendado Gastronomía) */}
                        <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/50 flex flex-col justify-between relative overflow-hidden">
                          <span className="absolute top-1 right-2 text-[9px] font-black uppercase tracking-wider text-amber-400">
                            Recomendado
                          </span>
                          <div>
                            <span className="text-xs font-bold text-amber-300 block">Margen 60% (Estándar)</span>
                            <span className="text-lg font-black text-amber-400 font-mono">
                              ${pricingAnalysis.precioSugerido60.toFixed(2)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleApplySuggestedPrice(pricingAnalysis.precioSugerido60)}
                            className="mt-2 text-[11px] font-black px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg transition-all shadow cursor-pointer"
                          >
                            ⚡ Aplicar al Menú POS
                          </button>
                        </div>

                        {/* Margen 70% */}
                        <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold text-stone-300 block">Margen 70% (Alta Rent.)</span>
                            <span className="text-base font-black text-white font-mono">
                              ${pricingAnalysis.precioSugerido70.toFixed(2)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleApplySuggestedPrice(pricingAnalysis.precioSugerido70)}
                            className="mt-2 text-[11px] font-bold px-2.5 py-1 bg-stone-800 hover:bg-amber-500 hover:text-stone-950 rounded-lg transition-all text-stone-300 cursor-pointer"
                          >
                            Aplicar al Menú
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel de Configuración de Promoción para la Receta / Plato */}
                  <div className="bg-stone-900 border border-rose-500/30 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-white text-base">
                              Promoción & Oferta Especial ({selectedPlato.Plato})
                            </h3>
                            {dishPromoActiva ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                                Promo Activa
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 text-[10px] font-bold">
                                Sin Promoción
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400 mt-0.5">
                            Configura descuentos temporales, por días de semana o permanente. Se muestra con cinta diagonal y precio rebajado en POS y Menú.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 self-end sm:self-auto">
                        <label className="flex items-center gap-2 cursor-pointer bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 hover:border-rose-500/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={dishPromoActiva}
                            onChange={(e) => setDishPromoActiva(e.target.checked)}
                            className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                          />
                          <span className="text-xs font-bold text-stone-200">
                            {dishPromoActiva ? 'Activar en Carta' : 'Desactivada'}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={handleSaveDishPromo}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar Promo</span>
                        </button>
                      </div>
                    </div>

                    {dishPromoActiva && (
                      <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                        {/* Selector Tipo de Promoción (% vs Precio Fijo vs 2x1 vs 3x1 vs NxM) */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                            Modalidad de la Promoción:
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <button
                              type="button"
                              onClick={() => setDishPromoTipo('Porcentaje')}
                              className={`p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                                dishPromoTipo === 'Porcentaje'
                                  ? 'bg-rose-600 text-white shadow-md'
                                  : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-white'
                              }`}
                            >
                              <Percent className="w-4 h-4" />
                              <span>Porcentaje (%)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDishPromoTipo('PrecioFijo');
                                if (dishPromoValor < 100 && selectedPlato.Precio > 0) {
                                  setDishPromoValor(Math.round(selectedPlato.Precio * 0.8));
                                }
                              }}
                              className={`p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                                dishPromoTipo === 'PrecioFijo'
                                  ? 'bg-rose-600 text-white shadow-md'
                                  : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-white'
                              }`}
                            >
                              <DollarSign className="w-4 h-4" />
                              <span>Precio Fijo ($)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDishPromoTipo('2x1');
                                setDishPromoNxMLleva(2);
                                setDishPromoNxMPaga(1);
                              }}
                              className={`p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                                dishPromoTipo === '2x1'
                                  ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50'
                                  : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-white'
                              }`}
                            >
                              <span className="text-base font-black">2x1</span>
                              <span>Lleva 2, Paga 1</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDishPromoTipo('3x1');
                                setDishPromoNxMLleva(3);
                                setDishPromoNxMPaga(1);
                              }}
                              className={`p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                                dishPromoTipo === '3x1'
                                  ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50'
                                  : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-white'
                              }`}
                            >
                              <span className="text-base font-black">3x1</span>
                              <span>Lleva 3, Paga 1</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDishPromoTipo('NxM');
                                if (!dishPromoNxMLleva) setDishPromoNxMLleva(3);
                                if (!dishPromoNxMPaga) setDishPromoNxMPaga(2);
                              }}
                              className={`p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer col-span-2 sm:col-span-1 ${
                                dishPromoTipo === 'NxM'
                                  ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50'
                                  : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-white'
                              }`}
                            >
                              <span className="text-base font-black">NxM</span>
                              <span>Combo Variable</span>
                            </button>
                          </div>
                        </div>

                        {/* Valor del Descuento / Configuración NxM */}
                        {dishPromoTipo === 'Porcentaje' || dishPromoTipo === 'PrecioFijo' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div>
                              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                                {dishPromoTipo === 'Porcentaje' ? 'Porcentaje a descontar (%):' : 'Nuevo Precio Rebajado ($):'}
                              </label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">
                                  {dishPromoTipo === 'Porcentaje' ? '%' : '$'}
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  min="1"
                                  value={dishPromoValor || ''}
                                  onChange={(e) => setDishPromoValor(safeParsePrice(e.target.value))}
                                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold font-mono text-white focus:outline-none focus:border-rose-400"
                                />
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-stone-400 uppercase font-bold block mb-1">
                                Rebajas Rápidas con 1-Click:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {[10, 15, 20, 25, 30, 50].map((pct) => (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() => {
                                      if (dishPromoTipo === 'Porcentaje') {
                                        setDishPromoValor(pct);
                                      } else {
                                        const base = selectedPlato.Precio > 0 ? selectedPlato.Precio : 10000;
                                        setDishPromoValor(Math.round(base * (1 - pct / 100)));
                                      }
                                    }}
                                    className="px-2.5 py-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 rounded-lg text-xs font-bold text-stone-300 hover:text-white transition-all active:scale-95 cursor-pointer"
                                  >
                                    -{pct}%
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : dishPromoTipo === 'NxM' ? (
                          <div className="p-3.5 bg-stone-950 rounded-xl border border-rose-500/40 space-y-3">
                            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                              <Sparkles className="w-4 h-4" />
                              <span>Configurar Combo NxM Personalizado (Lleva N, Paga M)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-stone-300 mb-1">
                                  Lleva (Cantidad de Unidades entregadas):
                                </label>
                                <input
                                  type="number"
                                  min="2"
                                  value={dishPromoNxMLleva}
                                  onChange={(e) => setDishPromoNxMLleva(Math.max(2, parseInt(e.target.value) || 2))}
                                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-rose-400"
                                />
                                <span className="text-[10px] text-stone-500 mt-1 block">ej: 3 para un 3x2</span>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-stone-300 mb-1">
                                  Paga (Cantidad de Unidades que se cobran):
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max={dishPromoNxMLleva - 1}
                                  value={dishPromoNxMPaga}
                                  onChange={(e) => setDishPromoNxMPaga(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-rose-400"
                                />
                                <span className="text-[10px] text-stone-500 mt-1 block">ej: 2 para pagar 2</span>
                              </div>
                            </div>
                            <div className="p-2.5 bg-rose-500/10 rounded-lg border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
                              <span>🔥 En el POS y Menú: El cliente lleva {dishPromoNxMLleva} y solo paga {dishPromoNxMPaga}.</span>
                              <span className="font-mono font-black text-amber-300">¡{dishPromoNxMLleva - dishPromoNxMPaga} Gratis!</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-stone-950 rounded-xl border border-rose-500/40 text-xs text-rose-300 flex items-center justify-between">
                            <div>
                              <span className="font-black text-sm block">🔥 Promoción {dishPromoTipo} Activa</span>
                              <span className="text-stone-400">
                                {dishPromoTipo === '2x1'
                                  ? 'Por cada 2 platos ordenados, 1 es completamente gratis (50% de ahorro global).'
                                  : 'Por cada 3 platos ordenados, el cliente solo paga 1 y 2 son gratis.'}
                              </span>
                            </div>
                            <span className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-black text-xs">
                              {dishPromoTipo === '2x1' ? '¡1 Gratis x Par!' : '¡2 Gratis x Trío!'}
                            </span>
                          </div>
                        )}

                        {/* Vigencia / Días Programados */}
                        <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
                          <div>
                            <span className="text-xs font-bold text-stone-300 uppercase tracking-wider block mb-1.5">
                              Vigencia y Programación del Descuento:
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                              {(['Siempre', 'DiasSemana', 'Intervalo'] as const).map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setDishPromoVigencia(v)}
                                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    dishPromoVigencia === v
                                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                                      : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                                  }`}
                                >
                                  {v === 'Siempre' ? 'Permanente' : v === 'DiasSemana' ? 'Días Específicos' : 'Intervalo de Fechas'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Days of week */}
                          {dishPromoVigencia === 'DiasSemana' && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] text-stone-400 font-semibold block">
                                Días activos (en esos días se cruzará con la banda de promoción en el POS):
                              </span>
                              <div className="grid grid-cols-7 gap-1.5">
                                {DIAS_SEMANA_MAP.map((d) => {
                                  const isSelected = dishPromoDiasSemana.includes(d.id);
                                  return (
                                    <button
                                      key={d.id}
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          setDishPromoDiasSemana(dishPromoDiasSemana.filter((x) => x !== d.id));
                                        } else {
                                          setDishPromoDiasSemana([...dishPromoDiasSemana, d.id]);
                                        }
                                      }}
                                      className={`py-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-rose-600 text-white shadow-md'
                                          : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
                                      }`}
                                    >
                                      {d.corto}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Date Interval */}
                          {dishPromoVigencia === 'Intervalo' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="text-[10px] text-stone-400 uppercase font-bold block mb-1">
                                  Fecha Inicio:
                                </label>
                                <input
                                  type="date"
                                  value={dishPromoFechaInicio}
                                  onChange={(e) => setDishPromoFechaInicio(e.target.value)}
                                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-stone-400 uppercase font-bold block mb-1">
                                  Fecha Fin:
                                </label>
                                <input
                                  type="date"
                                  value={dishPromoFechaFin}
                                  onChange={(e) => setDishPromoFechaFin(e.target.value)}
                                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white"
                                />
                              </div>
                            </div>
                          )}

                          {/* Etiqueta opcional */}
                          <div className="pt-1">
                            <label className="text-[10px] text-stone-400 uppercase font-bold block mb-1">
                              Texto de la Banda Promocional en POS (Opcional):
                            </label>
                            <input
                              type="text"
                              value={dishPromoEtiqueta}
                              onChange={(e) => setDishPromoEtiqueta(e.target.value)}
                              placeholder="ej: -20%, 2X1, MARTES DE POLLO, OFERTA"
                              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-rose-400"
                            />
                          </div>
                        </div>

                        {/* Impacto Financiero en Escandallo con Promoción */}
                        {(() => {
                          const basePrice = pricingAnalysis.precioActual;
                          const foodCost = pricingAnalysis.costo;
                          const preview = calculatePromoPrice(basePrice, {
                            PromoActiva: dishPromoActiva,
                            PromoTipo: dishPromoTipo,
                            PromoValor: dishPromoValor,
                            PromoVigencia: dishPromoVigencia,
                            PromoFechaInicio: dishPromoFechaInicio,
                            PromoFechaFin: dishPromoFechaFin,
                            PromoDiasSemana: JSON.stringify(dishPromoDiasSemana),
                            PromoEtiqueta: dishPromoEtiqueta,
                          });
                          const promoFinalPrice = preview.finalPrice;
                          const promoMargenBruto = promoFinalPrice - foodCost;
                          const promoMargenPct = promoFinalPrice > 0 ? (promoMargenBruto / promoFinalPrice) * 100 : 0;
                          const promoFoodCostPct = promoFinalPrice > 0 ? (foodCost / promoFinalPrice) * 100 : 0;

                          return (
                            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
                              <span className="text-[11px] font-black uppercase tracking-wider text-rose-300 block">
                                Impacto Financiero del Descuento en la Receta:
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800">
                                  <span className="text-[10px] text-stone-400 uppercase block font-semibold">Precio Promocional</span>
                                  <span className="text-base font-black text-emerald-400 font-mono">
                                    ${promoFinalPrice.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-stone-500 line-through block font-mono">
                                    ${basePrice.toLocaleString()}
                                  </span>
                                </div>

                                <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800">
                                  <span className="text-[10px] text-stone-400 uppercase block font-semibold">Nuevo Margen Bruto</span>
                                  <span className={`text-base font-black font-mono ${promoMargenBruto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ${promoMargenBruto.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-stone-500 block">ganancia por plato</span>
                                </div>

                                <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800">
                                  <span className="text-[10px] text-stone-400 uppercase block font-semibold">Nuevo Margen %</span>
                                  <span className={`text-base font-black font-mono ${promoMargenPct >= 40 ? 'text-emerald-400' : promoMargenPct >= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {promoMargenPct.toFixed(1)}%
                                  </span>
                                  <span className="text-[10px] text-stone-500 block">sobre venta promo</span>
                                </div>

                                <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800">
                                  <span className="text-[10px] text-stone-400 uppercase block font-semibold">Food Cost en Promo</span>
                                  <span className="text-base font-black text-amber-400 font-mono">
                                    {promoFoodCostPct.toFixed(1)}%
                                  </span>
                                  <span className="text-[10px] text-stone-500 block">materia prima</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Card: Configuración de Ración & Escalador de Acompañamientos (Normal, Mediana, Grande) */}
                  <div className="bg-stone-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-white text-base">
                              Opciones de Ración: Normal, Mediana o Grande
                            </h3>
                            {dishEsRacion && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black uppercase tracking-wider">
                                Ración Activa
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-400 mt-0.5">
                            Permite ofrecer tamaños según la cantidad de pollo pedido (ej: 1-2 presas ➔ Normal, 3-4 presas ➔ Mediana, 8+ presas ➔ Grande).
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 self-end sm:self-auto">
                        <label className="flex items-center gap-2 cursor-pointer bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 hover:border-amber-500/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={dishEsRacion}
                            onChange={(e) => setDishEsRacion(e.target.checked)}
                            className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                          />
                          <span className="text-xs font-bold text-stone-200">
                            {dishEsRacion ? 'Habilitar Raciones' : 'Deshabilitado'}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={handleSaveDishPromo}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar Ración</span>
                        </button>
                      </div>
                    </div>

                    {dishEsRacion && (
                      <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                        {/* Selector de Tamaño Base por Defecto */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                            Tamaño Base por Defecto en Carta:
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['Normal', 'Mediana', 'Grande'] as const).map((tam) => (
                              <button
                                key={tam}
                                type="button"
                                onClick={() => setDishTamanoRacion(tam)}
                                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  dishTamanoRacion === tam
                                    ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                                    : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-white'
                                }`}
                              >
                                {tam === 'Normal' && '🍟 Normal (1-2 presas)'}
                                {tam === 'Mediana' && '🍟 Mediana (3-4 presas)'}
                                {tam === 'Grande' && '🍟 Grande (8+ presas / Familiar)'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Scale Table for Kitchen & Pricing */}
                        <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-950">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-stone-900/90 text-stone-300 font-bold border-b border-stone-800">
                              <tr>
                                <th className="py-2.5 px-3">Tamaño Ración</th>
                                <th className="py-2.5 px-3 text-center">Factor Escala</th>
                                <th className="py-2.5 px-3 text-center">Acompaña Pollo</th>
                                <th className="py-2.5 px-3 text-right">Food Cost Estimado</th>
                                <th className="py-2.5 px-3 text-right">Precio Sugerido Venta</th>
                                <th className="py-2.5 px-3 text-center">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800/60 font-mono">
                              {[
                                { tam: 'Normal' as const, factor: 1.0, pollo: '1 - 2 Presas (Individual)', badge: 'bg-stone-800 text-stone-300' },
                                { tam: 'Mediana' as const, factor: 1.5, pollo: '3 - 4 Presas (Pareja)', badge: 'bg-amber-500/20 text-amber-300' },
                                { tam: 'Grande' as const, factor: 2.2, pollo: '8+ Presas / Combo Familiar', badge: 'bg-emerald-500/20 text-emerald-300' },
                              ].map((row) => {
                                const scaledCost = pricingAnalysis.costo * row.factor;
                                const basePrice = pricingAnalysis.precioActual > 0 ? pricingAnalysis.precioActual : pricingAnalysis.precioSugerido60;
                                const scaledPrice = Math.round(basePrice * row.factor * 100) / 100;
                                const isCurrentBase = dishTamanoRacion === row.tam;

                                return (
                                  <tr key={row.tam} className={isCurrentBase ? 'bg-amber-500/10' : 'hover:bg-stone-900/40'}>
                                    <td className="py-2.5 px-3 font-bold font-sans text-stone-200 flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.badge}`}>
                                        {row.tam}
                                      </span>
                                      {isCurrentBase && <span className="text-[10px] text-amber-400 font-bold font-sans">★ Base actual</span>}
                                    </td>
                                    <td className="py-2.5 px-3 text-center text-stone-400">{row.factor.toFixed(1)}x</td>
                                    <td className="py-2.5 px-3 text-center font-sans text-stone-300 text-[11px]">{row.pollo}</td>
                                    <td className="py-2.5 px-3 text-right text-rose-400 font-bold">${scaledCost.toFixed(2)}</td>
                                    <td className="py-2.5 px-3 text-right text-emerald-400 font-black text-sm">${scaledPrice.toFixed(2)}</td>
                                    <td className="py-2.5 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleApplySuggestedPrice(scaledPrice);
                                          setDishTamanoRacion(row.tam);
                                        }}
                                        className="px-2 py-1 bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-300 rounded-lg text-[10px] font-bold font-sans transition-colors cursor-pointer"
                                        title={`Establecer precio de ${row.tam} ($${scaledPrice.toFixed(2)}) como precio principal del plato`}
                                      >
                                        Fijar Precio Base
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Panel: Direct Sale Product Info OR Recipe Builder */}
                  {selectedEscandallo?.EsVentaDirecta ? (
                    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-800">
                        <div className="flex items-center gap-2">
                          <Package className="w-5 h-5 text-blue-400" />
                          <h3 className="font-black text-white text-base">
                            Insumo Base de Venta Directa
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const ins = insumos.find((i) => i.InsumoId === selectedEscandallo.InsumoId);
                            if (ins) {
                              openEditInsumoModal(ins);
                            }
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all shadow cursor-pointer self-start sm:self-auto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar Insumo en Inventario</span>
                        </button>
                      </div>

                      <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-base">{selectedPlato.Plato}</span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                              1 Unidad de Venta Directa
                            </span>
                          </div>
                          <p className="text-stone-400 text-xs mt-1">
                            Categoría: {selectedPlato.Categoria} • Suministrado directamente al consumidor sin preparación en cocina.
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-stone-400 text-[10px] uppercase font-bold block">Costo de Compra</span>
                            <span className="font-mono font-black text-red-400 text-lg">
                              ${pricingAnalysis.costo.toFixed(2)}
                            </span>
                          </div>
                          <div className="border-l border-stone-800 pl-6 text-right">
                            <span className="text-stone-400 text-[10px] uppercase font-bold block">Margen Neto Unitario</span>
                            <span className="font-mono font-black text-emerald-400 text-lg">
                              +${pricingAnalysis.margenBruto.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800 text-xs text-stone-300 flex items-center justify-between">
                        <span>💡 El precio al consumidor puede ser actualizado directamente usando los botones de <strong>Precios Sugeridos por Margen</strong> arriba.</span>
                      </div>
                    </div>
                  ) : (
                    /* Recipe Items Table & Ingredients Composer */
                    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-white text-base flex items-center gap-2">
                          <ChefHat className="w-5 h-5 text-amber-400" />
                          <span>Ingredientes & Insumos Utilizados (Por 1 Porción)</span>
                        </h3>
                        <button
                          onClick={handleSaveReceta}
                          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Guardar Receta</span>
                        </button>
                      </div>

                      {/* Ingredients Table */}
                      <div className="overflow-x-auto rounded-xl border border-stone-800">
                        <table className="w-full text-left text-xs sm:text-sm text-stone-300">
                          <thead className="bg-stone-950 text-stone-400 font-bold uppercase text-[10px] tracking-wider border-b border-stone-800">
                            <tr>
                              <th className="py-2.5 px-3">Insumo</th>
                              <th className="py-2.5 px-3">Categoría</th>
                              <th className="py-2.5 px-3 text-center">Cantidad Consumida</th>
                              <th className="py-2.5 px-3 text-right">Costo Insumo</th>
                              <th className="py-2.5 px-3 text-right">Costo en Porción</th>
                              <th className="py-2.5 px-3 text-center">Quitar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-800/60 font-medium">
                            {recetaItems.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-stone-500">
                                  Este plato aún no tiene ingredientes agregados. Selecciona insumos abajo para armar la receta.
                                </td>
                              </tr>
                            ) : (
                              recetaItems.map((item) => {
                                const ins = insumos.find((i) => i.InsumoId === item.InsumoId);
                                const nombre = ins ? ins.Nombre : (item.InsumoNombre || 'Insumo');
                                const cat = ins ? ins.Categoria : (item.InsumoCategoria || 'Insumos');
                                const costoUnit = ins ? ins.CostoUnitario : (item.CostoUnitarioInsumo || 0);
                                const subtotal = item.Cantidad * costoUnit;

                                return (
                                  <tr key={item.InsumoId} className="hover:bg-stone-800/40">
                                    <td className="py-2.5 px-3 font-bold text-white">{nombre}</td>
                                    <td className="py-2.5 px-3 text-stone-400 text-xs">{cat}</td>
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300">
                                      {item.Cantidad} {ins?.UnidadMedida || item.UnidadMedida}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-stone-400">
                                      ${costoUnit.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-red-400">
                                      ${subtotal.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <button
                                        onClick={() => handleRemoveIngrediente(item.InsumoId)}
                                        className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          {recetaItems.length > 0 && (
                            <tfoot className="bg-stone-950 font-black border-t border-stone-800 text-stone-200">
                              <tr>
                                <td colSpan={4} className="py-3 px-3 text-right uppercase text-xs">
                                  Total Costo Materia Prima (Food Cost):
                                </td>
                                <td className="py-3 px-3 text-right text-red-400 font-mono text-base">
                                  ${currentCalculatedFoodCost.toFixed(2)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>

                      {/* Add Ingredient Form Bar */}
                      <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-col sm:flex-row items-center gap-3">
                        {/* Select Insumo */}
                        <select
                          value={newIngredienteInsumoId}
                          onChange={(e) => setNewIngredienteInsumoId(e.target.value ? Number(e.target.value) : '')}
                          className="w-full sm:flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="">-- Seleccionar Insumo del Inventario --</option>
                          {insumos.map((i) => (
                            <option key={i.InsumoId} value={i.InsumoId}>
                              {i.Nombre} ({i.Categoria}) - ${i.CostoUnitario.toFixed(2)} / {i.UnidadMedida}
                            </option>
                          ))}
                        </select>

                        {/* Quantity */}
                        <div className="w-full sm:w-36 flex items-center space-x-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="Cantidad"
                            value={newIngredienteCantidad}
                            onChange={(e) => setNewIngredienteCantidad(parseFloat(e.target.value) || 0)}
                            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono text-center focus:outline-none focus:border-amber-400"
                          />
                          <span className="text-xs text-stone-400 shrink-0">
                            {newIngredienteInsumoId ? insumos.find((i) => i.InsumoId === Number(newIngredienteInsumoId))?.UnidadMedida : ''}
                          </span>
                        </div>

                        {/* Add Button */}
                        <button
                          type="button"
                          onClick={handleAddIngredienteToReceta}
                          className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow cursor-pointer whitespace-nowrap"
                        >
                          + Añadir Insumo
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center text-stone-500">
                  <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>Selecciona un plato de la lista izquierda para editar su escandallo.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 3: PROVEEDORES */}
        {/* ========================================================= */}
        {subTab === 'proveedores' && (
          <div className="space-y-4">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-base">Directorio de Proveedores</h3>
                <p className="text-xs text-stone-400">
                  Gestiona los datos de contacto, RIF y días de despacho para compras rápidas por WhatsApp.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintProveedores}
                  className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Imprimir Directorio</span>
                </button>

                <button
                  onClick={() => {
                    setEditingProveedor(null);
                    setIsProveedorModalOpen(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-black transition-all shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Proveedor</span>
                </button>
              </div>
            </div>

            {/* Proveedores Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {proveedores.map((prov) => {
                const insumosCount = insumos.filter((i) => i.ProveedorId === prov.ProveedorId).length;
                const cleanPhone = prov.Telefono ? prov.Telefono.replace(/[^0-9]/g, '') : '';

                return (
                  <div
                    key={prov.ProveedorId}
                    className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-2xl p-5 flex flex-col justify-between shadow-lg transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-white text-base leading-tight">{prov.Nombre}</h4>
                            {prov.Rif && (
                              <span className="text-xs text-stone-400 font-mono">RIF: {prov.Rif}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingProveedor(prov);
                              setIsProveedorModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteModalState({
                                isOpen: true,
                                type: 'proveedor',
                                id: prov.ProveedorId,
                                nombre: prov.Nombre,
                                extraInfo: prov.Contacto ? `Contacto: ${prov.Contacto}` : undefined,
                              });
                            }}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors cursor-pointer"
                            title="Eliminar Proveedor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Info fields */}
                      <div className="space-y-1.5 text-xs text-stone-300 mt-3 pt-3 border-t border-stone-800">
                        {prov.Contacto && (
                          <div className="flex items-center space-x-2">
                            <span className="text-stone-500">Contacto:</span>
                            <span className="font-semibold text-white">{prov.Contacto}</span>
                          </div>
                        )}
                        {prov.Telefono && (
                          <div className="flex items-center space-x-2">
                            <span className="text-stone-500">Teléfono:</span>
                            <span className="font-mono text-emerald-400 font-bold">{prov.Telefono}</span>
                          </div>
                        )}
                        {prov.CategoriasSuministro && (
                          <div className="flex items-start space-x-2">
                            <span className="text-stone-500 shrink-0">Suministra:</span>
                            <span className="text-stone-300">{prov.CategoriasSuministro}</span>
                          </div>
                        )}
                        {prov.DiasEntrega && (
                          <div className="flex items-center space-x-2">
                            <span className="text-stone-500">Días entrega:</span>
                            <span className="text-amber-300">{prov.DiasEntrega}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer & WhatsApp Button */}
                    <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                      <span className="text-[11px] text-stone-400">
                        {insumosCount} {insumosCount === 1 ? 'insumo vinculado' : 'insumos vinculados'}
                      </span>

                      {cleanPhone ? (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                            `Hola ${prov.Contacto || prov.Nombre}, le escribo de Terreno Broaster para cotizar/solicitar pedido de insumos.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Pedir WhatsApp</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-stone-500">Sin teléfono</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 4: KARDEX & TRAZABILIDAD */}
        {/* ========================================================= */}
        {subTab === 'kardex' && (
          <div className="space-y-4">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-white text-base">Kardex de Movimientos de Inventario</h3>
                <p className="text-xs text-stone-400">
                  Registro cronológico de entradas por compra, salidas automáticas por venta POS y ajustes.
                </p>
              </div>

              {/* Filter & Print */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintKardex}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Imprimir Kardex</span>
                </button>

                <span className="text-xs text-stone-400">Tipo:</span>
                <select
                  value={kardexFilter}
                  onChange={(e) => setKardexFilter(e.target.value)}
                  className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="Todos">Todos los Movimientos</option>
                  <option value="Entradas">Entradas por Compra</option>
                  <option value="Ventas">Salidas por Venta POS</option>
                  <option value="Ajustes">Ajustes Manuales</option>
                  <option value="Mermas">Mermas y Desperdicio</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-stone-300">
                  <thead className="bg-stone-950 text-stone-400 font-bold uppercase text-[10px] tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4">Insumo</th>
                      <th className="py-3 px-4">Tipo Movimiento</th>
                      <th className="py-3 px-4 text-center">Cantidad</th>
                      <th className="py-3 px-4 text-center">Stock Anterior → Nuevo</th>
                      <th className="py-3 px-4">Referencia / Ticket</th>
                      <th className="py-3 px-4">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-medium">
                    {filteredMovimientos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-500">
                          <History className="w-10 h-10 mx-auto mb-2 opacity-40" />
                          No hay movimientos registrados para este filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredMovimientos.map((m) => {
                        const isEntrada = m.Tipo === 'Entrada_Compra';
                        const isVenta = m.Tipo === 'Salida_Venta';
                        const isMerma = m.Tipo === 'Merma_Desperdicio';

                        return (
                          <tr key={m.MovimientoId} className="hover:bg-stone-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono text-stone-400 text-xs">
                              {m.Fecha}
                            </td>
                            <td className="py-3 px-4 font-bold text-white">
                              {m.InsumoNombre || `Insumo #${m.InsumoId}`}
                            </td>
                            <td className="py-3 px-4">
                              {isEntrada ? (
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                  Entrada Compra
                                </span>
                              ) : isVenta ? (
                                <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                                  Salida Venta POS
                                </span>
                              ) : isMerma ? (
                                <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                                  Merma / Desperdicio
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                  Ajuste Manual
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold">
                              <span className={isEntrada ? 'text-emerald-400' : 'text-red-400'}>
                                {isEntrada ? `+${m.Cantidad}` : `-${Math.abs(m.Cantidad)}`}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-xs text-stone-400">
                              {m.StockAnterior} → <strong className="text-white">{m.StockNuevo}</strong>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-amber-300">
                              {m.Referencia || '—'}
                            </td>
                            <td className="py-3 px-4 text-stone-400 text-xs max-w-xs truncate">
                              {m.Notas || '—'}
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

        {/* ========================================================= */}
        {/* SUBTAB 5: ALERTAS & REABASTECIMIENTO */}
        {/* ========================================================= */}
        {subTab === 'alertas' && (
          <div className="space-y-4">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-white text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span>Insumos con Stock Crítico para Reabastecer</span>
                </h3>
                <p className="text-xs text-stone-400">
                  Insumos cuyo inventario actual está igual o por debajo del stock de seguridad mínimo establecido.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePrintAlertas}
                  className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Imprimir Reabastecimiento</span>
                </button>

                {insumosCriticos.length > 0 && (
                  <button
                    onClick={handleGenerateWhatsAppOrder}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar Orden para WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            {insumosCriticos.length === 0 ? (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center text-stone-400">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h4 className="font-black text-white text-lg">¡Todos los Insumos en Nivel Óptimo!</h4>
                <p className="text-xs text-stone-400 mt-1">
                  Ningún insumo se encuentra por debajo de su umbral de stock mínimo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insumosCriticos.map((item) => {
                  const faltanteSugerido = Math.max(item.StockMinimo * 2 - item.StockActual, 1);
                  const costoEstimado = faltanteSugerido * item.CostoUnitario;

                  return (
                    <div
                      key={item.InsumoId}
                      className="bg-red-950/20 border border-red-500/40 rounded-2xl p-5 flex flex-col justify-between shadow-lg"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-[10px] font-bold uppercase">
                              Stock Crítico
                            </span>
                            <h4 className="font-black text-white text-base mt-1">{item.Nombre}</h4>
                            <span className="text-xs text-stone-400">{item.Categoria}</span>
                          </div>

                          <div className="text-right">
                            <span className="text-2xl font-black text-red-400 font-mono">
                              {item.StockActual}
                            </span>
                            <span className="text-xs text-stone-400 block">{item.UnidadMedida}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-stone-300 pt-3 border-t border-red-950">
                          <div className="flex justify-between">
                            <span className="text-stone-400">Stock Mínimo Requerido:</span>
                            <span className="font-mono font-bold text-white">
                              {item.StockMinimo} {item.UnidadMedida}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-400">Sugerencia de Pedido:</span>
                            <span className="font-mono font-bold text-amber-400">
                              +{faltanteSugerido} {item.UnidadMedida}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-400">Costo Estimado Reposición:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              ${costoEstimado.toFixed(2)}
                            </span>
                          </div>
                          {item.ProveedorNombre && (
                            <div className="flex justify-between">
                              <span className="text-stone-400">Proveedor:</span>
                              <span className="font-semibold text-white">{item.ProveedorNombre}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-red-950/60 flex items-center justify-end">
                        <button
                          onClick={() => {
                            setSelectedInsumoForEntrada(item);
                            setEntradaCantidad(faltanteSugerido);
                            setEntradaCosto(item.CostoUnitario);
                            setEntradaReferencia('');
                            setIsEntradaModalOpen(true);
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-all shadow cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Registrar Compra</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: CREAR / EDITAR INSUMO */}
      {/* ========================================================= */}
      {isInsumoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] my-auto overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 shrink-0 bg-stone-900 z-10">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <span>{editingInsumo ? 'Editar Insumo' : 'Nuevo Insumo de Inventario'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsInsumoModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInsumo} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                  Nombre del Insumo / Producto *
                </label>
                <input
                  type="text"
                  name="nombre"
                  defaultValue={editingInsumo?.Nombre || ''}
                  required
                  placeholder="ej: Harina de Trigo Todo Uso, Aceite de Freír, Pepsi 1.5L"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Categoría & Unidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <select
                    name="categoria"
                    defaultValue={editingInsumo?.Categoria || 'Harinas & Panadería'}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {CATEGORIAS_INSUMO.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Unidad de Medida
                  </label>
                  <select
                    name="unidad"
                    defaultValue={editingInsumo?.UnidadMedida || 'kg'}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {UNIDADES_MEDIDA.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stock Actual, Mínimo & Costo */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="stockActual"
                    defaultValue={editingInsumo?.StockActual || 10}
                    required
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="stockMinimo"
                    defaultValue={editingInsumo?.StockMinimo || 5}
                    required
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Costo Unitario ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="costoUnitario"
                    value={modalCostoUnitario}
                    onChange={(e) => setModalCostoUnitario(safeParsePrice(e.target.value))}
                    required
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Proveedor */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                  Proveedor Asignado
                </label>
                <select
                  name="proveedorId"
                  defaultValue={editingInsumo?.ProveedorId || ''}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Sin Proveedor Asignado --</option>
                  {proveedores.map((p) => (
                    <option key={p.ProveedorId} value={p.ProveedorId}>
                      {p.Nombre} {p.Rif ? `(${p.Rif})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Es Venta Directa (Bebidas, snacks, etc.) */}
              <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-400" />
                    <span>Es Producto de Venta Directa</span>
                  </span>
                  <span className="text-[11px] text-stone-400 block mt-0.5">
                    Activar para refrescos, maltas y productos terminados vendidos sin preparación culinaria.
                  </span>
                </div>
                <input
                  type="checkbox"
                  name="esVentaDirecta"
                  checked={modalEsVentaDirecta}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setModalEsVentaDirecta(checked);
                    if (checked && modalPrecioVenta <= 0) {
                      setModalPrecioVenta(modalCostoUnitario > 0 ? Math.round(modalCostoUnitario / 0.5) : 2.0);
                    }
                  }}
                  className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
                />
              </div>

              {/* SECCIÓN INTERACTIVA: ESTRUCTURA DE COSTOS & MARGEN DE VENTA DIRECTA */}
              {modalEsVentaDirecta && (
                <div className="p-4 rounded-2xl bg-stone-950/90 border border-amber-500/40 space-y-4 shadow-inner animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">
                          Estructura de Costos & Análisis de Margen
                        </h4>
                        <p className="text-[11px] text-stone-400">
                          Establece el precio y margen del producto sin necesidad de crear una receta en cocina.
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold">
                      Venta Directa
                    </span>
                  </div>

                  {/* Input de Precio de Venta */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                        <span>Precio de Venta al Público *</span>
                      </label>
                      <span className="text-[11px] text-stone-400 font-mono">
                        {modalCostoUnitario > 0 ? `Costo base: $${modalCostoUnitario.toFixed(2)}` : 'Sin costo base'}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold">$</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={modalPrecioVenta || ''}
                        onChange={(e) => setModalPrecioVenta(safeParsePrice(e.target.value))}
                        placeholder="0.00"
                        className="w-full bg-stone-900 border border-amber-500/50 rounded-xl pl-8 pr-4 py-2.5 text-base font-bold font-mono text-amber-400 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* KPI Matrix: Costo vs Venta vs Margen */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 bg-stone-900 rounded-xl border border-stone-800 text-center">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Costo Compra</span>
                      <span className="text-sm font-black font-mono text-stone-200">
                        ${modalCostoUnitario.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-stone-500 block font-mono">
                        {modalPrecioVenta > 0 ? `${((modalCostoUnitario / modalPrecioVenta) * 100).toFixed(1)}%` : '0%'} costo
                      </span>
                    </div>

                    <div className="p-2.5 bg-stone-900 rounded-xl border border-stone-800 text-center">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Margen Bruto</span>
                      <span className={`text-sm font-black font-mono ${modalPrecioVenta - modalCostoUnitario >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${(modalPrecioVenta - modalCostoUnitario).toFixed(2)}
                      </span>
                      <span className="text-[9px] text-stone-500 block">
                        {modalPrecioVenta - modalCostoUnitario >= 0 ? 'ganancia neta' : 'pérdida unit.'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-stone-900 rounded-xl border border-stone-800 text-center">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Margen %</span>
                      <span className={`text-sm font-black font-mono ${
                        modalPrecioVenta > 0 && ((modalPrecioVenta - modalCostoUnitario) / modalPrecioVenta) >= 0.4
                          ? 'text-emerald-400'
                          : modalPrecioVenta > 0 && ((modalPrecioVenta - modalCostoUnitario) / modalPrecioVenta) >= 0.2
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                        {modalPrecioVenta > 0 ? `${(((modalPrecioVenta - modalCostoUnitario) / modalPrecioVenta) * 100).toFixed(1)}%` : '0%'}
                      </span>
                      <span className="text-[9px] text-stone-500 block">sobre venta</span>
                    </div>

                    <div className="p-2.5 bg-stone-900 rounded-xl border border-stone-800 text-center">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Markup %</span>
                      <span className="text-sm font-black font-mono text-amber-400">
                        {modalCostoUnitario > 0 && modalPrecioVenta > modalCostoUnitario
                          ? `${(((modalPrecioVenta - modalCostoUnitario) / modalCostoUnitario) * 100).toFixed(0)}%`
                          : '0%'}
                      </span>
                      <span className="text-[9px] text-stone-500 block">sobre costo</span>
                    </div>
                  </div>

                  {/* Semáforo de Rentabilidad */}
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between text-xs">
                    <span className="text-stone-400 font-medium">Diagnóstico Financiero:</span>
                    {modalPrecioVenta <= 0 || modalPrecioVenta <= modalCostoUnitario ? (
                      <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-300 font-bold text-[11px] border border-red-500/30">
                        ⚠️ Sin margen o a pérdida
                      </span>
                    ) : ((modalPrecioVenta - modalCostoUnitario) / modalPrecioVenta) >= 0.6 ? (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">
                        ✅ Margen Excelente (≥ 60%)
                      </span>
                    ) : ((modalPrecioVenta - modalCostoUnitario) / modalPrecioVenta) >= 0.4 ? (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-bold text-[11px] border border-blue-500/30">
                        👍 Margen Aceptable (40% - 59%)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
                        ⚡ Margen Ajustado (&lt; 40%)
                      </span>
                    )}
                  </div>

                  {/* Precios Sugeridos con 1-Click */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Precios Sugeridos por Margen Estándar Gastronómico:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setModalPrecioVenta(modalCostoUnitario > 0 ? Math.round(modalCostoUnitario / 0.60) : 0)}
                        className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-left transition-all active:scale-95 cursor-pointer"
                      >
                        <span className="text-[10px] text-stone-400 block font-medium">40% Margen</span>
                        <span className="text-xs font-bold text-stone-200 font-mono block">
                          ${modalCostoUnitario > 0 ? Math.round(modalCostoUnitario / 0.60) : 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalPrecioVenta(modalCostoUnitario > 0 ? Math.round(modalCostoUnitario / 0.50) : 0)}
                        className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-left transition-all active:scale-95 cursor-pointer"
                      >
                        <span className="text-[10px] text-stone-400 block font-medium">50% Margen</span>
                        <span className="text-xs font-bold text-stone-200 font-mono block">
                          ${modalCostoUnitario > 0 ? Math.round(modalCostoUnitario / 0.50) : 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalPrecioVenta(modalCostoUnitario > 0 ? Math.round(modalCostoUnitario / 0.40) : 0)}
                        className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/50 text-left transition-all active:scale-95 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-amber-300 font-bold block">60% Margen</span>
                          <span className="text-[8px] px-1 rounded bg-amber-500 text-stone-950 font-black">TOP</span>
                        </div>
                        <span className="text-xs font-black text-amber-400 font-mono block">
                          ${modalCostoUnitario > 0 ? Math.round(modalCostoUnitario / 0.40) : 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalPrecioVenta(modalCostoUnitario > 0 ? Math.round(modalCostoUnitario / 0.30) : 0)}
                        className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-left transition-all active:scale-95 cursor-pointer"
                      >
                        <span className="text-[10px] text-stone-400 block font-medium">70% Margen</span>
                        <span className="text-xs font-bold text-stone-200 font-mono block">
                          ${modalCostoUnitario > 0 ? Math.round(modalCostoUnitario / 0.30) : 0}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Checkbox Sincronizar con POS y Carta */}
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-900/80 border border-stone-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalSyncPlato}
                      onChange={(e) => setModalSyncPlato(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <span className="text-xs text-stone-300 font-medium select-none">
                      Publicar / sincronizar automáticamente en la Carta de Platos del POS y Menú Digital
                    </span>
                  </label>
                </div>
              )}

              {/* SECCIÓN DE PROMOCIÓN & OFERTA PARA EL INSUMO */}
              <div className="p-4 rounded-2xl bg-stone-950/90 border border-rose-500/30 space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <span>Promoción & Oferta Especial</span>
                        {modalPromoActiva && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-500 text-white">ACTIVA</span>
                        )}
                      </h4>
                      <p className="text-[11px] text-stone-400">
                        Aplica descuento con cinta cruzada en la imagen en el POS y Menú digital.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-stone-900 px-2.5 py-1 rounded-xl border border-stone-800">
                    <input
                      type="checkbox"
                      checked={modalPromoActiva}
                      onChange={(e) => setModalPromoActiva(e.target.checked)}
                      className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-stone-200">
                      {modalPromoActiva ? 'Activar Promo' : 'Sin Promo'}
                    </span>
                  </label>
                </div>

                {modalPromoActiva && (
                  <div className="space-y-3.5 animate-in fade-in duration-150">
                    {/* Tipo de Descuento: Porcentaje vs Precio Fijo vs 2x1 vs 3x1 vs NxM */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                        Modalidad de Promoción:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setModalPromoTipo('Porcentaje')}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                            modalPromoTipo === 'Porcentaje'
                              ? 'bg-rose-600 text-white shadow-md'
                              : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                          }`}
                        >
                          <Percent className="w-3.5 h-3.5" />
                          <span>Porcentaje</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setModalPromoTipo('PrecioFijo');
                            if (modalPromoValor < 100 && modalPrecioVenta > 0) {
                              setModalPromoValor(Math.round(modalPrecioVenta * 0.8));
                            }
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                            modalPromoTipo === 'PrecioFijo'
                              ? 'bg-rose-600 text-white shadow-md'
                              : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                          }`}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Precio Fijo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setModalPromoTipo('2x1');
                            setModalPromoNxMLleva(2);
                            setModalPromoNxMPaga(1);
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                            modalPromoTipo === '2x1'
                              ? 'bg-rose-600 text-white shadow-md ring-1 ring-rose-400'
                              : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                          }`}
                        >
                          <span className="font-black text-sm">2x1</span>
                          <span className="text-[10px]">1 Gratis</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setModalPromoTipo('3x1');
                            setModalPromoNxMLleva(3);
                            setModalPromoNxMPaga(1);
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                            modalPromoTipo === '3x1'
                              ? 'bg-rose-600 text-white shadow-md ring-1 ring-rose-400'
                              : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                          }`}
                        >
                          <span className="font-black text-sm">3x1</span>
                          <span className="text-[10px]">2 Gratis</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setModalPromoTipo('NxM');
                            if (!modalPromoNxMLleva) setModalPromoNxMLleva(3);
                            if (!modalPromoNxMPaga) setModalPromoNxMPaga(2);
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer col-span-2 sm:col-span-1 ${
                            modalPromoTipo === 'NxM'
                              ? 'bg-rose-600 text-white shadow-md ring-1 ring-rose-400'
                              : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                          }`}
                        >
                          <span className="font-black text-sm">NxM</span>
                          <span className="text-[10px]">Combo</span>
                        </button>
                      </div>
                    </div>

                    {/* Valor del Descuento / Configuración NxM */}
                    {modalPromoTipo === 'Porcentaje' || modalPromoTipo === 'PrecioFijo' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                            {modalPromoTipo === 'Porcentaje' ? 'Porcentaje de Rebaja (%):' : 'Nuevo Precio Rebajado ($):'}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold">
                              {modalPromoTipo === 'Porcentaje' ? '%' : '$'}
                            </span>
                            <input
                              type="number"
                              step="any"
                              min="1"
                              value={modalPromoValor || ''}
                              onChange={(e) => setModalPromoValor(safeParsePrice(e.target.value))}
                              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-rose-400"
                            />
                          </div>
                        </div>

                        {/* Presets */}
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase font-bold block mb-1">Descuentos Rápidos:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[10, 15, 20, 25, 30, 50].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => {
                                  if (modalPromoTipo === 'Porcentaje') {
                                    setModalPromoValor(pct);
                                  } else {
                                    const base = modalPrecioVenta > 0 ? modalPrecioVenta : 10000;
                                    setModalPromoValor(Math.round(base * (1 - pct / 100)));
                                  }
                                }}
                                className="px-2 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-lg text-xs font-bold text-stone-300 hover:text-white cursor-pointer active:scale-95"
                              >
                                -{pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : modalPromoTipo === 'NxM' ? (
                      <div className="p-3 bg-stone-900 rounded-xl border border-rose-500/40 space-y-2.5">
                        <span className="text-xs font-bold text-rose-300 block">Combo Variable NxM (Lleva N, Paga M):</span>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-stone-400 font-bold block mb-1">Lleva (Recibe):</label>
                            <input
                              type="number"
                              min="2"
                              value={modalPromoNxMLleva}
                              onChange={(e) => setModalPromoNxMLleva(Math.max(2, parseInt(e.target.value) || 2))}
                              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 font-bold block mb-1">Paga (Cobra):</label>
                            <input
                              type="number"
                              min="1"
                              max={modalPromoNxMLleva - 1}
                              value={modalPromoNxMPaga}
                              onChange={(e) => setModalPromoNxMPaga(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono font-bold"
                            />
                          </div>
                        </div>
                        <div className="text-[11px] text-amber-300 font-bold">
                          🔥 Promo: Lleva {modalPromoNxMLleva} y paga solo {modalPromoNxMPaga} (¡{modalPromoNxMLleva - modalPromoNxMPaga} gratis!).
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-stone-900 rounded-xl border border-rose-500/40 text-xs text-rose-300 flex items-center justify-between">
                        <span>🔥 Promo {modalPromoTipo}: {modalPromoTipo === '2x1' ? 'Lleva 2 y paga 1 (1 gratis)' : 'Lleva 3 y paga 1 (2 gratis)'}</span>
                        <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-black text-[10px]">Activo</span>
                      </div>
                    )}

                    {/* Programación / Vigencia */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                        Programación / Días de Vigencia:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Siempre', 'DiasSemana', 'Intervalo'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setModalPromoVigencia(v)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              modalPromoVigencia === v
                                ? 'bg-amber-500 text-stone-950 shadow-sm'
                                : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                            }`}
                          >
                            {v === 'Siempre' ? 'Permanente' : v === 'DiasSemana' ? 'Días Específicos' : 'Intervalo Fechas'}
                          </button>
                        ))}
                      </div>

                      {/* Days of week selector */}
                      {modalPromoVigencia === 'DiasSemana' && (
                        <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5">
                          <span className="text-[11px] text-stone-300 font-semibold block">
                            Días activos (banda visible en POS esos días):
                          </span>
                          <div className="grid grid-cols-7 gap-1">
                            {DIAS_SEMANA_MAP.map((d) => {
                              const isSelected = modalPromoDiasSemana.includes(d.id);
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setModalPromoDiasSemana(modalPromoDiasSemana.filter((x) => x !== d.id));
                                    } else {
                                      setModalPromoDiasSemana([...modalPromoDiasSemana, d.id]);
                                    }
                                  }}
                                  className={`py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                                  }`}
                                >
                                  {d.corto}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Date range picker */}
                      {modalPromoVigencia === 'Intervalo' && (
                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                          <div>
                            <label className="text-[10px] text-stone-400 uppercase font-bold block mb-1">Fecha Inicio:</label>
                            <input
                              type="date"
                              value={modalPromoFechaInicio}
                              onChange={(e) => setModalPromoFechaInicio(e.target.value)}
                              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 uppercase font-bold block mb-1">Fecha Fin:</label>
                            <input
                              type="date"
                              value={modalPromoFechaFin}
                              onChange={(e) => setModalPromoFechaFin(e.target.value)}
                              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Etiqueta personalizada */}
                    <div>
                      <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                        Texto de la Banda Promocional en POS (Opcional):
                      </label>
                      <input
                        type="text"
                        value={modalPromoEtiqueta}
                        onChange={(e) => setModalPromoEtiqueta(e.target.value)}
                        placeholder="ej: -20%, OFERTA, PROMO LUNES, 2X1"
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-rose-400"
                      />
                    </div>

                    {/* Resumen Financiero con Promoción */}
                    {(() => {
                      const base = modalPrecioVenta > 0 ? modalPrecioVenta : modalCostoUnitario * 2;
                      const previewCalc = calculatePromoPrice(base, {
                        PromoActiva: modalPromoActiva,
                        PromoTipo: modalPromoTipo,
                        PromoValor: modalPromoValor,
                        PromoVigencia: modalPromoVigencia,
                        PromoFechaInicio: modalPromoFechaInicio,
                        PromoFechaFin: modalPromoFechaFin,
                        PromoDiasSemana: JSON.stringify(modalPromoDiasSemana),
                        PromoEtiqueta: modalPromoEtiqueta,
                      });
                      const promoMargen = previewCalc.finalPrice - modalCostoUnitario;
                      const promoMargenPct = previewCalc.finalPrice > 0 ? (promoMargen / previewCalc.finalPrice) * 100 : 0;

                      return (
                        <div className="p-3 bg-stone-900 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-stone-400 block text-[10px] uppercase font-bold">Precio con Descuento</span>
                            <span className="text-base font-black text-emerald-400 font-mono">
                              ${previewCalc.finalPrice.toLocaleString()}
                            </span>
                            {modalPrecioVenta > 0 && (
                              <span className="text-[10px] text-stone-400 ml-1 line-through font-mono">
                                ${modalPrecioVenta.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-stone-400 block text-[10px] uppercase font-bold">Margen en Promo</span>
                            <span className={`font-mono font-black ${promoMargen >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              ${promoMargen.toLocaleString()} ({promoMargenPct.toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              </div>

              {/* Sticky Footer Actions */}
              <div className="px-6 py-4 border-t border-stone-800 bg-stone-950/95 backdrop-blur-xs shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
                <div className="text-xs text-stone-400">
                  {modalEsVentaDirecta && modalPrecioVenta > 0 ? (
                    <span className="font-mono text-emerald-400 font-bold text-xs">
                      Venta: ${modalPrecioVenta.toLocaleString()} · Margen: {(((modalPrecioVenta - modalCostoUnitario) / modalPrecioVenta) * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-500">
                      {editingInsumo ? 'Modificando insumo existente' : 'Registrando nuevo insumo'}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsInsumoModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingInsumo ? 'Actualizar Insumo' : 'Guardar Insumo'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ENTRADA / COMPRA DE STOCK */}
      {/* ========================================================= */}
      {isEntradaModalOpen && selectedInsumoForEntrada && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] my-auto overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 shrink-0 bg-stone-900">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Ingreso de Mercancía
                </span>
                <h3 className="text-lg font-black text-white">
                  Entrada: {selectedInsumoForEntrada.Nombre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEntradaModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmEntrada} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex justify-between items-center text-xs">
                  <span className="text-stone-400">Stock Actual en Sistema:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {selectedInsumoForEntrada.StockActual} {selectedInsumoForEntrada.UnidadMedida}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Cantidad a Ingresar ({selectedInsumoForEntrada.UnidadMedida}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={entradaCantidad}
                    onChange={(e) => setEntradaCantidad(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-base text-white font-mono text-center focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Nuevo Costo Unitario ($) (Opcional si varió)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={entradaCosto}
                    onChange={(e) => setEntradaCosto(parseFloat(e.target.value) || 0)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono text-center focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    N° Factura / Referencia de Compra
                  </label>
                  <input
                    type="text"
                    value={entradaReferencia}
                    onChange={(e) => setEntradaReferencia(e.target.value)}
                    placeholder="ej: Factura #9821, Proveedor Polar"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-stone-800 bg-stone-950/95 backdrop-blur-xs shrink-0 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEntradaModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition-all shadow cursor-pointer active:scale-95"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AJUSTE MANUAL DE STOCK / MERMA */}
      {/* ========================================================= */}
      {isAjusteModalOpen && selectedInsumoForAjuste && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] my-auto overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 shrink-0 bg-stone-900">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Inventario Físico
                </span>
                <h3 className="text-lg font-black text-white">
                  Ajustar: {selectedInsumoForAjuste.Nombre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAjusteModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAjuste} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex justify-between items-center text-xs">
                  <span className="text-stone-400">Stock Actual:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {selectedInsumoForAjuste.StockActual} {selectedInsumoForAjuste.UnidadMedida}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Nuevo Stock Real ({selectedInsumoForAjuste.UnidadMedida}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={ajusteNuevoStock}
                    onChange={(e) => setAjusteNuevoStock(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-base text-white font-mono text-center focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Motivo del Ajuste (Merma, conteo físico, caducidad, etc.)
                  </label>
                  <textarea
                    value={ajusteMotivo}
                    onChange={(e) => setAjusteMotivo(e.target.value)}
                    placeholder="ej: Conteo físico mensual, merma por quema o caducidad"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 h-20 resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-stone-800 bg-stone-950/95 backdrop-blur-xs shrink-0 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAjusteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm transition-all shadow cursor-pointer active:scale-95"
                >
                  Guardar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: PROVEEDOR */}
      {/* ========================================================= */}
      {isProveedorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] my-auto overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 shrink-0 bg-stone-900">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <span>{editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsProveedorModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProveedor} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Nombre de la Empresa o Distribuidor *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    defaultValue={editingProveedor?.Nombre || ''}
                    required
                    placeholder="ej: Distribuidora Avícola Los Llanos"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                      RIF o C.I.
                    </label>
                    <input
                      type="text"
                      name="rif"
                      defaultValue={editingProveedor?.Rif || ''}
                      placeholder="J-12345678-9"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      name="telefono"
                      defaultValue={editingProveedor?.Telefono || ''}
                      placeholder="+584121234567"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                      Persona de Contacto
                    </label>
                    <input
                      type="text"
                      name="contacto"
                      defaultValue={editingProveedor?.Contacto || ''}
                      placeholder="ej: Carlos Pérez"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                      Días de Entrega / Despacho
                    </label>
                    <input
                      type="text"
                      name="diasEntrega"
                      defaultValue={editingProveedor?.DiasEntrega || ''}
                      placeholder="ej: Martes y Jueves"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Categorías de Insumos Suministrados
                  </label>
                  <input
                    type="text"
                    name="categorias"
                    defaultValue={editingProveedor?.CategoriasSuministro || ''}
                    placeholder="ej: Pollo fresco, carnes, alas, pechugas"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-stone-800 bg-stone-950/95 backdrop-blur-xs shrink-0 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsProveedorModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm transition-all shadow cursor-pointer active:scale-95"
                >
                  {editingProveedor ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL REUSABLE PRINT REPORT MODAL FOR ALL INVENTORY SECTIONS */}
      {printReportData && (
        <PrintReportModal
          isOpen={true}
          onClose={() => setPrintReportData(null)}
          title={printReportData.title}
          subtitle={printReportData.subtitle}
          categoryBadge={printReportData.categoryBadge}
          summaryCards={printReportData.summaryCards}
          columns={printReportData.columns}
          rows={printReportData.rows}
          footerRow={printReportData.footerRow}
          notes={printReportData.notes}
          downloadFilename={printReportData.downloadFilename}
        />
      )}
      {/* CUSTOM IN-APP CONFIRMATION MODAL FOR DELETION (REPLACES WINDOW.CONFIRM) */}
      {deleteModalState && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">¿Confirmar Eliminación?</h3>
                <p className="text-xs text-stone-400">
                  {deleteModalState.type === 'insumo' && 'Eliminarás este insumo de la base de datos de inventario.'}
                  {deleteModalState.type === 'receta' && 'Eliminarás la receta y ficha técnica de este plato.'}
                  {deleteModalState.type === 'proveedor' && 'Eliminarás este proveedor del directorio.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 font-bold block">
                Elemento seleccionado:
              </span>
              <p className="text-sm font-black text-white">{deleteModalState.nombre}</p>
              {deleteModalState.extraInfo && (
                <p className="text-xs text-stone-400 font-mono mt-1 pt-1 border-t border-stone-800">
                  {deleteModalState.extraInfo}
                </p>
              )}
            </div>

            <p className="text-xs text-rose-400/90 font-medium leading-relaxed">
              ⚠️ Esta acción no se puede deshacer. Los registros afectados se actualizarán inmediatamente.
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalState(null)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm transition-all shadow-lg shadow-rose-900/30 flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
