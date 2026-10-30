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

export interface Plato {
  ID: number;
  Plato: string;
  Precio: number;
  Categoria: string;
  Imagen: string; // e.g. "broaster_combo2.jpg"
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

export interface Usuario {
  Id?: number;
  Username: string;
  Password?: string;
  Role: 'Administrador' | 'Cajero' | 'Supervisor';
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
  CostoUnitario: number; // Costo por UnidadMedida (en $ o Bs)
  ProveedorId?: number;
  ProveedorNombre?: string;
  EsVentaDirecta?: boolean; // True si es un producto terminado que se vende directo (ej: refrescos, agua)
  PlatoId?: number; // Vínculo opcional a un Plato de venta directa
  UltimaActualizacion?: string;
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

