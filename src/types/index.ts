export type FormaPago = 'Efectivo' | 'Pago Movil' | 'Punto de Venta' | 'Transferencia';

export type TipoServicio = 'Mesas' | 'Para llevar' | 'Delivery';

export type UbicacionMesa =
  | 'Mesa 1'
  | 'Mesa 2'
  | 'Mesa 3'
  | 'Mesa 4'
  | 'Mesa 5'
  | 'Mesa 6'
  | 'Mesa 7'
  | 'Mesa 8'
  | 'Mesa 9'
  | 'Mesa 10'
  | 'Barra'
  | 'Terraza';

export type EstadoComanda = 'Cocina' | 'Entregado' | 'Cobrado' | 'Anulado';

export type TipoPromocion = 'Porcentaje' | 'PrecioFijo' | '2x1' | '3x1' | 'NxM';
export type TamanoRacion = 'Normal' | 'Mediana' | 'Grande';

export interface Plato {
  ID: number;
  Plato: string;
  Precio: number;
  PrecioOriginal?: number;
  Categoria: string;
  Imagen: string; // e.g. "broaster_combo2.jpg"
  Descripcion?: string;
  // Promociones
  PromoActiva?: boolean;
  PromoTipo?: TipoPromocion;
  PromoValor?: number;
  PromoNxMLleva?: number; // e.g. 2 for 2x1, 3 for 3x1 or 3x2
  PromoNxMPaga?: number;  // e.g. 1 for 2x1, 1 for 3x1, 2 for 3x2
  PromoVigencia?: 'Siempre' | 'Intervalo' | 'DiasSemana';
  PromoFechaInicio?: string;
  PromoFechaFin?: string;
  PromoDiasSemana?: string; // JSON array string e.g. "[1,3,5]"
  PromoEtiqueta?: string;
  // Opciones de Ración
  TamanoRacion?: TamanoRacion;
  EsRacion?: boolean;
}

export interface Venta {
  VentasId: number;
  Fecha: string; // 'YYYY-MM-DD HH:mm:ss' or 'YYYY-MM-DD'
  NTicket: string;
  Cliente: string;
  Monto: number;
  FormaPago: FormaPago;
}

export interface DetalleVenta {
  DetallesId: number;
  Fecha: string;
  NTicket: string;
  Plato: string;
  Precio: number;
  Cantidad: number;
  Categoria: string;
  Importe: number; // Precio * Cantidad
}

export interface Comanda {
  ComandaId: number;
  Fecha: string;
  NTicket: string;
  Cliente: string;
  TipoServicio: TipoServicio;
  Ubicacion: string; // 'Mesa 1'..'Mesa 10' | 'Barra' | 'Terraza' | 'Para Llevar #XX' | 'Delivery: [Dirección]'
  Estado: EstadoComanda;
  Monto: number;
  FormaPago?: FormaPago;
  Notas?: string;
  HoraCreacion: string;
  HoraActualizacion?: string;
}

export interface CartItem {
  plato: Plato;
  cantidad: number;
  nota?: string;
  tamanoRacion?: TamanoRacion;
}

export interface AcumuladoProducto {
  Plato: string;
  Categoria: string;
  CantidadTotal: number;
  PrecioPromedio: number;
  MontoTotal: number;
}

export interface AcumuladoFormaPago {
  FormaPago: FormaPago;
  Transacciones: number;
  MontoTotal: number;
  Porcentaje: number;
}

export interface DailySaleStat {
  fecha: string;
  diaSemana: string;
  monto: number;
  tickets: number;
  platoTop?: string;
}

export type UserRole = 'Administrador' | 'Cajero' | 'Cocinero' | 'Mesero' | 'Supervisor';

export interface Usuario {
  Id?: number;
  Username: string;
  Password?: string;
  Role: UserRole;
  FechaRegistro?: string;
  UltimoAcceso?: string;
}

export type EstadoPedidoWhatsApp = 'Pendiente' | 'En Cocina' | 'Entregado' | 'Cobrado' | 'Anulado' | 'Cancelado';

export interface PedidoWhatsAppItem {
  platoNombre: string;
  cantidad: number;
  precioUnitario: number;
  platoId?: number;
  categoria?: string;
  notas?: string;
}

export interface PedidoWhatsApp {
  Id: number;
  Fecha: string; // 'YYYY-MM-DD HH:mm:ss'
  TelefonoCliente: string;
  NombreCliente: string;
  TipoEntrega: 'Delivery' | 'Para llevar';
  DireccionEntrega?: string;
  MensajeOriginal: string;
  Items: PedidoWhatsAppItem[];
  Total: number;
  FormaPago: FormaPago;
  Estado: EstadoPedidoWhatsApp;
  NTicket?: string;
  ComandaId?: number;
  FechaCreacion: string;
  Notas?: string;
}

// ==========================================
// --- SISTEMA DE INVENTARIO & RECETAS ---
// ==========================================

export type InsumoCategoria =
  | 'Harinas & Panadería'
  | 'Carnes & Pollo'
  | 'Quesos & Lácteos'
  | 'Salsas & Condimentos'
  | 'Vegetales & Verduras'
  | 'Raciones & Acompañamientos'
  | 'Bebidas (Venta Directa)'
  | 'Aceites & Grasas'
  | 'Empaques & Desechables'
  | 'Otros Insumos';

export type UnidadMedida =
  | 'kg'
  | 'g'
  | 'litro'
  | 'ml'
  | 'unidad'
  | 'porcion'
  | 'racion'
  | 'botella'
  | 'lata'
  | 'paquete';

export interface Insumo {
  InsumoId: number;
  Nombre: string;
  Categoria: InsumoCategoria;
  UnidadMedida: UnidadMedida;
  StockActual: number;
  StockMinimo: number;
  CostoUnitario: number; // Costo por UnidadMedida (en $ o COP)
  PrecioVenta?: number; // Precio de venta al público para productos de venta directa
  ProveedorId?: number;
  ProveedorNombre?: string;
  EsVentaDirecta?: boolean; // True si es un producto terminado que se vende directo (ej: refrescos, agua)
  PlatoId?: number; // Vínculo opcional a un Plato de venta directa
  UltimaActualizacion?: string;
  // Promociones para productos de venta directa
  PromoActiva?: boolean;
  PromoTipo?: TipoPromocion;
  PromoValor?: number;
  PromoNxMLleva?: number;
  PromoNxMPaga?: number;
  PromoVigencia?: 'Siempre' | 'Intervalo' | 'DiasSemana';
  PromoFechaInicio?: string;
  PromoFechaFin?: string;
  PromoDiasSemana?: string; // JSON array string
  PromoEtiqueta?: string;
  // Opciones de Ración
  EsRacion?: boolean;
  TamanoRacionDefecto?: TamanoRacion;
}

export interface RecetaItem {
  RecetaId: number;
  PlatoId: number;
  InsumoId: number;
  Cantidad: number; // Cantidad consumida del insumo por 1 unidad de plato
  UnidadMedida: UnidadMedida;
  Notas?: string;
  // Campos calculados para visualización:
  InsumoNombre?: string;
  InsumoCategoria?: InsumoCategoria;
  CostoUnitarioInsumo?: number;
  CostoPorPorcion?: number; // Cantidad * CostoUnitarioInsumo
}

export interface PlatoEscandallo {
  PlatoId: number;
  PlatoNombre: string;
  Categoria: string;
  PrecioVentaActual: number;
  Ingredientes: RecetaItem[];
  CostoTotalInsumos: number; // Food Cost (Materia prima total)
  MargenBruto: number; // PrecioVentaActual - CostoTotalInsumos
  MargenPorcentaje: number; // ((PrecioVentaActual - CostoTotalInsumos) / PrecioVentaActual) * 100
  MargenSobreCosto: number; // ((PrecioVentaActual - CostoTotalInsumos) / CostoTotalInsumos) * 100
  PrecioSugeridoMargen60: number; // CostoTotalInsumos / 0.40 (Regla estándar de 40% Food Cost / 60% Margen)
  PrecioSugeridoMargen50: number; // CostoTotalInsumos / 0.50
  PrecioSugeridoMargen70: number; // CostoTotalInsumos / 0.30
  TieneReceta: boolean;
  EsVentaDirecta?: boolean;
  InsumoId?: number;
  // Promociones vinculadas
  PromoActiva?: boolean;
  PromoTipo?: TipoPromocion;
  PromoValor?: number;
  PromoNxMLleva?: number;
  PromoNxMPaga?: number;
  PromoVigencia?: 'Siempre' | 'Intervalo' | 'DiasSemana';
  PromoFechaInicio?: string;
  PromoFechaFin?: string;
  PromoDiasSemana?: string;
  PromoEtiqueta?: string;
  PrecioPromoActual?: number;
  MargenPromoBruto?: number;
  MargenPromoPorcentaje?: number;
}

export interface Proveedor {
  ProveedorId: number;
  Nombre: string;
  Rif?: string;
  Telefono?: string;
  Email?: string;
  Contacto?: string;
  Direccion?: string;
  CategoriasSuministro?: string;
  DiasEntrega?: string;
  Notas?: string;
}

export type TipoMovimientoInventario =
  | 'Entrada_Compra'
  | 'Salida_Venta'
  | 'Ajuste_Manual'
  | 'Merma_Desperdicio';

export interface MovimientoInventario {
  MovimientoId: number;
  Fecha: string; // 'YYYY-MM-DD HH:mm:ss'
  InsumoId: number;
  InsumoNombre?: string;
  Tipo: TipoMovimientoInventario;
  Cantidad: number; // Positivo si suma, negativo o cantidad deducida
  StockAnterior: number;
  StockNuevo: number;
  Referencia?: string; // ej: Ticket #TB-2005, Compra Factura #1234
  Usuario?: string;
  Notas?: string;
}

export interface CierreCaja {
  CierreId: number;
  Fecha: string; // 'YYYY-MM-DD'
  Hora: string; // 'HH:mm:ss'
  TotalVentas: number;
  TotalPedidos: number;
  TicketPromedio: number;
  TotalEfectivo: number;
  TotalPagoMovil: number;
  TotalPuntoVenta: number;
  TotalTransferencia: number;
  FondoInicial: number;
  EfectivoEsperado: number;
  EfectivoContado: number;
  Diferencia: number;
  Cajero: string;
  Notas?: string;
  ArchivoGuardado: boolean;
}


