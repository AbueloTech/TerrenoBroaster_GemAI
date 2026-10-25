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

export type EstadoPedidoWhatsApp = 'Pendiente' | 'En Cocina' | 'Entregado' | 'Cancelado';

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

