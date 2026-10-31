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

  // UI Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLocalLinked, setIsLocalLinked] = useState<boolean>(() => sqliteService.isLocalFileLinked());
  const [linkedFileName, setLinkedFileName] = useState<string | null>(() => sqliteService.getLinkedFileName());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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

  // Update recipe items when selected dish changes
  useEffect(() => {
    if (selectedPlatoId !== null) {
      const rec = sqliteService.getRecetaByPlato(selectedPlatoId);
      setRecetaItems(rec);
    }
  }, [selectedPlatoId]);

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

  // Save Insumo Form
  const handleSaveInsumo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nombre = String(formData.get('nombre') || '').trim();
    const categoria = formData.get('categoria') as InsumoCategoria;
    const unidad = formData.get('unidad') as UnidadMedida;
    const stockActual = safeParsePrice(formData.get('stockActual'));
    const stockMinimo = safeParsePrice(formData.get('stockMinimo'));
    const costoUnitario = safeParsePrice(formData.get('costoUnitario'));
    const proveedorIdRaw = formData.get('proveedorId');
    const proveedorId = proveedorIdRaw ? Number(proveedorIdRaw) : undefined;
    const esVentaDirecta = formData.get('esVentaDirecta') === 'true';

    if (!nombre) {
      showToast('Por favor introduce el nombre del insumo');
      return;
    }

    if (editingInsumo) {
      sqliteService.updateInsumo({
        ...editingInsumo,
        Nombre: nombre,
        Categoria: categoria,
        UnidadMedida: unidad,
        StockActual: stockActual,
        StockMinimo: stockMinimo,
        CostoUnitario: costoUnitario,
        ProveedorId: proveedorId,
        EsVentaDirecta: esVentaDirecta,
      });
      showToast(`Insumo "${nombre}" actualizado correctamente.`);
    } else {
      sqliteService.addInsumo({
        Nombre: nombre,
        Categoria: categoria,
        UnidadMedida: unidad,
        StockActual: stockActual,
        StockMinimo: stockMinimo,
        CostoUnitario: costoUnitario,
        ProveedorId: proveedorId,
        EsVentaDirecta: esVentaDirecta,
      });
      showToast(`Insumo "${nombre}" creado correctamente.`);
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
    setRecetaItems(recetaItems.filter((i) => i.InsumoId !== insumoId));
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
                  <span>Imprimir Stock</span>
                </button>

                <button
                  onClick={() => {
                    setEditingInsumo(null);
                    setIsInsumoModalOpen(true);
                  }}
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
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4 text-center">Stock Actual</th>
                      <th className="py-3 px-4 text-center">Mínimo</th>
                      <th className="py-3 px-4 text-right">Costo Unitario</th>
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

                            {/* Tipo */}
                            <td className="py-3.5 px-4">
                              {item.EsVentaDirecta ? (
                                <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold">
                                  Venta Directa POS
                                </span>
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

                            {/* Costo Unitario */}
                            <td className="py-3.5 px-4 text-right font-mono text-stone-300">
                              ${item.CostoUnitario.toFixed(2)}
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
                                  onClick={() => {
                                    setEditingInsumo(item);
                                    setIsInsumoModalOpen(true);
                                  }}
                                  title="Editar Insumo"
                                  className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-amber-500 hover:text-stone-950 transition-all cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Eliminar */}
                                <button
                                  onClick={() => {
                                    if (confirm(`¿Eliminar insumo "${item.Nombre}" del inventario?`)) {
                                      sqliteService.deleteInsumo(item.InsumoId);
                                      showToast(`Insumo "${item.Nombre}" eliminado.`);
                                      loadData();
                                    }
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
                        </div>
                      </div>

                      {hasRecipe ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Escandallo
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-stone-800 text-stone-500 text-[10px]">
                          Sin receta
                        </span>
                      )}
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
                        <span className="text-xs uppercase tracking-wider text-amber-400 font-bold block">
                          Ficha Técnica / Escandallo Gastronómico
                        </span>
                        <h2 className="text-2xl font-black text-white">{selectedPlato.Plato}</h2>
                        <span className="text-xs text-stone-400">Categoría: {selectedPlato.Categoria}</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={handlePrintFichaTecnica}
                          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimir Ficha Técnica</span>
                        </button>

                        <div className="text-right">
                          <span className="text-[11px] text-stone-400 block">Precio Actual Menú POS</span>
                          <span className="text-2xl font-black text-white font-mono">
                            ${pricingAnalysis.precioActual.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

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

                  {/* Recipe Items Table & Ingredients Composer */}
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
                              if (confirm(`¿Eliminar proveedor "${prov.Nombre}"?`)) {
                                sqliteService.deleteProveedor(prov.ProveedorId);
                                showToast(`Proveedor eliminado.`);
                                loadData();
                              }
                            }}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <span>{editingInsumo ? 'Editar Insumo' : 'Nuevo Insumo de Inventario'}</span>
              </h3>
              <button
                onClick={() => setIsInsumoModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInsumo} className="space-y-4 mt-4">
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
                    defaultValue={editingInsumo?.CostoUnitario || 1.0}
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

              {/* Es Venta Directa (Bebidas, etc.) */}
              <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Es Producto de Venta Directa</span>
                  <span className="text-[11px] text-stone-400 block">
                    Activar para refrescos, maltas y bebidas terminadas vendidas directo sin preparación.
                  </span>
                </div>
                <input
                  type="checkbox"
                  name="esVentaDirecta"
                  value="true"
                  defaultChecked={editingInsumo?.EsVentaDirecta || false}
                  className="w-5 h-5 accent-amber-400 rounded cursor-pointer"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsInsumoModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm transition-all shadow cursor-pointer"
                >
                  {editingInsumo ? 'Actualizar Insumo' : 'Crear Insumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ENTRADA / COMPRA DE STOCK */}
      {/* ========================================================= */}
      {isEntradaModalOpen && selectedInsumoForEntrada && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Ingreso de Mercancía
                </span>
                <h3 className="text-lg font-black text-white">
                  Entrada: {selectedInsumoForEntrada.Nombre}
                </h3>
              </div>
              <button
                onClick={() => setIsEntradaModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmEntrada} className="space-y-4 mt-4">
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

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsEntradaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition-all shadow cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Inventario Físico
                </span>
                <h3 className="text-lg font-black text-white">
                  Ajustar: {selectedInsumoForAjuste.Nombre}
                </h3>
              </div>
              <button
                onClick={() => setIsAjusteModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAjuste} className="space-y-4 mt-4">
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

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAjusteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm transition-all shadow cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <span>{editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</span>
              </h3>
              <button
                onClick={() => setIsProveedorModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProveedor} className="space-y-4 mt-4">
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

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsProveedorModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm transition-all shadow cursor-pointer"
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
    </div>
  );
};
