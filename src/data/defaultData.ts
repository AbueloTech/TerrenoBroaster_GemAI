import { Plato, Venta, DetalleVenta, Comanda } from '../types';

export const DEFAULT_PLATOS: Omit<Plato, 'ID'>[] = [
  {
    Plato: 'Combo Broaster 2 Piezas + Papas + Ensalada',
    Precio: 8000,
    Categoria: 'Pollo Broaster',
    Imagen: 'combo_broaster_2pz.jpg',
  },
  {
    Plato: 'Combo Broaster 4 Piezas + Papas + Refresco',
    Precio: 14000,
    Categoria: 'Pollo Broaster',
    Imagen: 'combo_broaster_4pz.jpg',
  },
  {
    Plato: 'Balde Broaster Familiar (8 Piezas + 2 Papas)',
    Precio: 25000,
    Categoria: 'Pollo Broaster',
    Imagen: 'balde_broaster_8pz.jpg',
  },
  {
    Plato: 'Alitas Broaster Crispy (6 Piezas)',
    Precio: 8500,
    Categoria: 'Pollo Broaster',
    Imagen: 'alitas_broaster_6und.jpg',
  },
  {
    Plato: 'Tenders de Pollo Crujiente (5 Unidades)',
    Precio: 8000,
    Categoria: 'Pollo Broaster',
    Imagen: 'tenders_pollo.jpg',
  },
  {
    Plato: 'Hamburguesa Crispy Broaster con Queso',
    Precio: 9000,
    Categoria: 'Hamburguesas',
    Imagen: 'hamburguesa_crispy.jpg',
  },
  {
    Plato: 'Hamburguesa Terreno Doble Carne y Tocineta',
    Precio: 12000,
    Categoria: 'Hamburguesas',
    Imagen: 'hamburguesa_terreno_doble.jpg',
  },
  {
    Plato: 'Ración de Papas Fritas Rusticas',
    Precio: 3500,
    Categoria: 'Raciones',
    Imagen: 'papas_fritas_rusticas.jpg',
  },
  {
    Plato: 'Tequeños Tradicionales de Queso (5 Und)',
    Precio: 4500,
    Categoria: 'Raciones',
    Imagen: 'tequenos_queso.jpg',
  },
  {
    Plato: 'Ensalada Cole Slaw Tradicional',
    Precio: 2500,
    Categoria: 'Raciones',
    Imagen: 'ensalada_coleslaw.jpg',
  },
  {
    Plato: 'Ración de Arepitas Fritas con Nata (6 Und)',
    Precio: 3000,
    Categoria: 'Raciones',
    Imagen: 'arepitas_fritas.jpg',
  },
  {
    Plato: 'Refresco Familiar 1.5 Litros',
    Precio: 4000,
    Categoria: 'Bebidas',
    Imagen: 'refresco_1_5l.jpg',
  },
  {
    Plato: 'Refresco en Lata 355ml',
    Precio: 2000,
    Categoria: 'Bebidas',
    Imagen: 'refresco_lata.jpg',
  },
  {
    Plato: 'Jugo Natural Papelón con Limón',
    Precio: 2500,
    Categoria: 'Bebidas',
    Imagen: 'papelon_limon.jpg',
  },
  {
    Plato: 'Agua Mineral 500ml',
    Precio: 1500,
    Categoria: 'Bebidas',
    Imagen: 'agua_mineral.jpg',
  },
];

// Fallback high quality food imagery mapped to categories/filenames
export const SAMPLE_FALLBACK_IMAGES: Record<string, string> = {
  'combo_broaster_2pz.jpg': 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
  'combo_broaster_4pz.jpg': 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
  'balde_broaster_8pz.jpg': 'https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=600&q=80',
  'alitas_broaster_6und.jpg': 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80',
  'tenders_pollo.jpg': 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80',
  'hamburguesa_crispy.jpg': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
  'hamburguesa_terreno_doble.jpg': 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
  'papas_fritas_rusticas.jpg': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
  'tequenos_queso.jpg': 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80',
  'ensalada_coleslaw.jpg': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
  'arepitas_fritas.jpg': 'https://images.unsplash.com/photo-1628294895950-9805252327bc?auto=format&fit=crop&w=600&q=80',
  'refresco_1_5l.jpg': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
  'refresco_lata.jpg': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80',
  'papelon_limon.jpg': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  'agua_mineral.jpg': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
};

// Generates dynamic sample sales for past 30 days
export function generateSeedSales(): { ventas: Venta[]; detalles: DetalleVenta[] } {
  const ventas: Venta[] = [];
  const detalles: DetalleVenta[] = [];

  const clientes = [
    'Consumidor Final',
    'Carlos Mendoza',
    'María Elena Pérez',
    'Juan Bautista',
    'Pedro Alfonzo',
    'Yelitza Rodríguez',
    'Andrés Gómez',
    'Luis Rivas',
    'Valentina Morales',
    'Consumidor Final',
  ];

  const formasPago: Array<'Efectivo' | 'Pago Movil' | 'Punto de Venta' | 'Transferencia'> = [
    'Pago Movil',
    'Punto de Venta',
    'Efectivo',
    'Pago Movil',
    'Transferencia',
    'Punto de Venta',
    'Efectivo',
    'Pago Movil',
  ];

  let ticketCounter = 1001;
  let detalleIdCounter = 1;
  const now = new Date();

  // Create sales spanning the past 28 days
  for (let i = 27; i >= 0; i--) {
    const saleDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = saleDate.toISOString().split('T')[0];

    // 2 to 5 sales per day
    const salesToday = 2 + Math.floor(Math.random() * 4);

    for (let s = 0; s < salesToday; s++) {
      const ticketNum = `TB-${ticketCounter++}`;
      const hour = 11 + Math.floor(Math.random() * 10);
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      const fullDateTime = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
      const cliente = clientes[Math.floor(Math.random() * clientes.length)];
      const formaPago = formasPago[Math.floor(Math.random() * formasPago.length)];

      // Pick 1 to 3 items
      const numItems = 1 + Math.floor(Math.random() * 3);
      let totalMonto = 0;

      for (let k = 0; k < numItems; k++) {
        const dishIndex = (ticketCounter + k) % DEFAULT_PLATOS.length;
        const dish = DEFAULT_PLATOS[dishIndex];
        const cantidad = 1 + Math.floor(Math.random() * 2);
        const importe = Number((dish.Precio * cantidad).toFixed(2));
        totalMonto += importe;

        detalles.push({
          DetallesId: detalleIdCounter++,
          Fecha: fullDateTime,
          NTicket: ticketNum,
          Plato: dish.Plato,
          Precio: dish.Precio,
          Cantidad: cantidad,
          Categoria: dish.Categoria,
          Importe: importe,
        });
      }

      ventas.push({
        VentasId: ventas.length + 1,
        Fecha: fullDateTime,
        NTicket: ticketNum,
        Cliente: cliente,
        Monto: Number(totalMonto.toFixed(2)),
        FormaPago: formaPago,
      });
    }
  }

  return { ventas, detalles };
}

// Generates live active and recent Comandas for real restaurant simulation
export function generateSeedComandas(): { comandas: Comanda[]; detallesComandas: DetalleVenta[] } {
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
  const timeOnly = dateStr.substring(11, 16);

  const comandas: Comanda[] = [
    // Cocina
    {
      ComandaId: 1,
      Fecha: dateStr,
      NTicket: 'TB-2001',
      Cliente: 'Carlos Mendoza',
      TipoServicio: 'Mesas',
      Ubicacion: 'Mesa 3',
      Estado: 'Cocina',
      Monto: 17500,
      Notas: 'Pollo bien tostadito, salsa de ajo extra',
      HoraCreacion: timeOnly,
    },
    {
      ComandaId: 2,
      Fecha: dateStr,
      NTicket: 'TB-2002',
      Cliente: 'Ana Pérez',
      TipoServicio: 'Para llevar',
      Ubicacion: 'Para llevar (Cliente Retira)',
      Estado: 'Cocina',
      Monto: 9000,
      Notas: 'Empacar en bolsa térmica con servilletas',
      HoraCreacion: timeOnly,
    },
    {
      ComandaId: 3,
      Fecha: dateStr,
      NTicket: 'TB-2003',
      Cliente: 'Alejandro Gil',
      TipoServicio: 'Mesas',
      Ubicacion: 'Barra',
      Estado: 'Cocina',
      Monto: 4500,
      Notas: 'Servir rápido, cliente en barra',
      HoraCreacion: timeOnly,
    },
    // Entregado
    {
      ComandaId: 4,
      Fecha: dateStr,
      NTicket: 'TB-1998',
      Cliente: 'Luis Rivas',
      TipoServicio: 'Mesas',
      Ubicacion: 'Mesa 7',
      Estado: 'Entregado',
      Monto: 25000,
      Notas: 'Consumiendo en mesa, solicitar cuenta luego',
      HoraCreacion: '12:15',
      HoraActualizacion: '12:35',
    },
    {
      ComandaId: 5,
      Fecha: dateStr,
      NTicket: 'TB-1999',
      Cliente: 'Familia Morales',
      TipoServicio: 'Mesas',
      Ubicacion: 'Terraza',
      Estado: 'Entregado',
      Monto: 16000,
      Notas: 'Mesa exterior con sombra',
      HoraCreacion: '12:20',
      HoraActualizacion: '12:40',
    },
    {
      ComandaId: 6,
      Fecha: dateStr,
      NTicket: 'TB-2000',
      Cliente: 'Marcos Díaz',
      TipoServicio: 'Delivery',
      Ubicacion: 'Urb. Los Pinos, Casa 12-B',
      Estado: 'Entregado',
      Monto: 17500,
      Notas: 'Repartidor Pedro en ruta, Teléf: 0414-1234567',
      HoraCreacion: '12:05',
      HoraActualizacion: '12:30',
    },
    // Cobrado
    {
      ComandaId: 7,
      Fecha: dateStr,
      NTicket: 'TB-1995',
      Cliente: 'Elena Castro',
      TipoServicio: 'Mesas',
      Ubicacion: 'Mesa 1',
      Estado: 'Cobrado',
      Monto: 14000,
      FormaPago: 'Pago Movil',
      Notas: 'Cuenta cerrada',
      HoraCreacion: '11:30',
      HoraActualizacion: '12:10',
    },
    // Anulado
    {
      ComandaId: 8,
      Fecha: dateStr,
      NTicket: 'TB-1996',
      Cliente: 'Consumidor Final',
      TipoServicio: 'Mesas',
      Ubicacion: 'Mesa 5',
      Estado: 'Anulado',
      Monto: 8500,
      Notas: 'Anulado: Cliente tuvo que retirarse por urgencia',
      HoraCreacion: '11:45',
      HoraActualizacion: '11:50',
    },
  ];

  const detallesComandas: DetalleVenta[] = [
    // TB-2001
    {
      DetallesId: 9001,
      Fecha: dateStr,
      NTicket: 'TB-2001',
      Plato: 'Combo Broaster 4 Piezas + Papas + Refresco',
      Precio: 14000,
      Cantidad: 1,
      Categoria: 'Pollo Broaster',
      Importe: 14000,
    },
    {
      DetallesId: 9002,
      Fecha: dateStr,
      NTicket: 'TB-2001',
      Plato: 'Ración de Papas Fritas Rusticas',
      Precio: 3500,
      Cantidad: 1,
      Categoria: 'Raciones',
      Importe: 3500,
    },
    // TB-2002
    {
      DetallesId: 9003,
      Fecha: dateStr,
      NTicket: 'TB-2002',
      Plato: 'Hamburguesa Crispy Broaster con Queso',
      Precio: 9000,
      Cantidad: 1,
      Categoria: 'Hamburguesas',
      Importe: 9000,
    },
    // TB-2003
    {
      DetallesId: 9004,
      Fecha: dateStr,
      NTicket: 'TB-2003',
      Plato: 'Tequeños Tradicionales de Queso (5 Und)',
      Precio: 4500,
      Cantidad: 1,
      Categoria: 'Raciones',
      Importe: 4500,
    },
    // TB-1998
    {
      DetallesId: 9005,
      Fecha: dateStr,
      NTicket: 'TB-1998',
      Plato: 'Balde Broaster Familiar (8 Piezas + 2 Papas)',
      Precio: 25000,
      Cantidad: 1,
      Categoria: 'Pollo Broaster',
      Importe: 25000,
    },
    // TB-1999
    {
      DetallesId: 9006,
      Fecha: dateStr,
      NTicket: 'TB-1999',
      Plato: 'Combo Broaster 2 Piezas + Papas + Ensalada',
      Precio: 8000,
      Cantidad: 2,
      Categoria: 'Pollo Broaster',
      Importe: 16000,
    },
    // TB-2000
    {
      DetallesId: 9007,
      Fecha: dateStr,
      NTicket: 'TB-2000',
      Plato: 'Alitas Broaster Crispy (6 Piezas)',
      Precio: 8500,
      Cantidad: 1,
      Categoria: 'Pollo Broaster',
      Importe: 8500,
    },
    {
      DetallesId: 9008,
      Fecha: dateStr,
      NTicket: 'TB-2000',
      Plato: 'Hamburguesa Crispy Broaster con Queso',
      Precio: 9000,
      Cantidad: 1,
      Categoria: 'Hamburguesas',
      Importe: 9000,
    },
  ];

  return { comandas, detallesComandas };
}
