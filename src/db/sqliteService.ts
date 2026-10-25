import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import {
  Plato,
  Venta,
  DetalleVenta,
  CartItem,
  Comanda,
  EstadoComanda,
  TipoServicio,
  FormaPago,
  AcumuladoProducto,
  AcumuladoFormaPago,
  DailySaleStat,
  Usuario,
  PedidoWhatsApp,
  EstadoPedidoWhatsApp,
  PedidoWhatsAppItem,
} from '../types';
import { DEFAULT_PLATOS, generateSeedSales, generateSeedComandas } from '../data/defaultData';
import { safeParsePrice } from '../utils/currency';
import { menuSyncService } from '../services/menuSyncService';

class SQLiteService {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private isReady: boolean = false;
  private engineType: 'wasm' | 'memory-reactive' = 'memory-reactive';
  private initPromise: Promise<void> | null = null;
  private listeners: Array<() => void> = [];

  // Fallback in-memory state
  private fallbackPlatos: Plato[] = [];
  private fallbackVentas: Venta[] = [];
  private fallbackDetalles: DetalleVenta[] = [];
  private fallbackComandas: Comanda[] = [];
  private fallbackUsuarios: Usuario[] = [];
  private fallbackPedidosWhatsApp: PedidoWhatsApp[] = [];

  constructor() {
    this.setupFallback();
    this.initPromise = this.init();
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((cb) => cb());
    if (typeof window !== 'undefined') {
      try {
        const livePlatos = this.getPlatos();
        const livePhone = this.getWhatsAppPhone();
        if (livePlatos && livePlatos.length > 0) {
          menuSyncService.pushMenuToServer(livePlatos, livePhone);
        }
      } catch {
        // ignore background push error
      }
    }
  }

  private async init() {
    try {
      try {
        this.SQL = await initSqlJs({
          locateFile: () => sqlWasmUrl,
        });
      } catch (localWasmErr) {
        console.warn('Could not load local wasm, attempting CDN fallback:', localWasmErr);
        this.SQL = await initSqlJs({
          locateFile: (file) => `https://sql.js.org/dist/${file}`,
        });
      }

      const savedDb = localStorage.getItem('TerrenoBroaster_db_binary');
      if (savedDb) {
        try {
          const binary = Uint8Array.from(atob(savedDb), (c) => c.charCodeAt(0));
          this.db = new this.SQL.Database(binary);
        } catch (e) {
          console.warn('Failed restoring saved SQLite binary, starting fresh:', e);
          this.db = new this.SQL.Database();
        }
      } else {
        this.db = new this.SQL.Database();
      }

      this.createTablesIfNotExist();

      // Check if Platos has data
      const countRes = this.db.exec('SELECT COUNT(*) as count FROM Platos');
      const count = countRes.length > 0 && countRes[0].values[0] ? Number(countRes[0].values[0][0]) : 0;
      if (count === 0) {
        this.seedInitialData();
      }

      // Check if PedidosWhatsApp has data
      const waCountRes = this.db.exec('SELECT COUNT(*) as count FROM PedidosWhatsApp');
      const waCount = waCountRes.length > 0 && waCountRes[0].values[0] ? Number(waCountRes[0].values[0][0]) : 0;
      if (waCount === 0) {
        this.seedWhatsAppOrders();
      }

      this.syncFallbackFromDb();

      this.engineType = 'wasm';
      this.isReady = true;
      this.notify();
    } catch (err) {
      console.warn('SQLite WebAssembly could not initialize; using local relational reactive engine:', err);
      this.engineType = 'memory-reactive';
      this.isReady = true;
      this.notify();
    }
  }

  public async ensureReady(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private createTablesIfNotExist() {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS Platos (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Plato TEXT NOT NULL,
        Precio REAL NOT NULL,
        Categoria TEXT NOT NULL,
        Imagen TEXT
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS Ventas (
        VentasId INTEGER PRIMARY KEY AUTOINCREMENT,
        Fecha TEXT NOT NULL,
        NTicket TEXT NOT NULL,
        Cliente TEXT NOT NULL,
        Monto REAL NOT NULL,
        FormaPago TEXT NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS Detalles (
        DetallesId INTEGER PRIMARY KEY AUTOINCREMENT,
        Fecha TEXT NOT NULL,
        NTicket TEXT NOT NULL,
        Plato TEXT NOT NULL,
        Precio REAL NOT NULL,
        Cantidad INTEGER NOT NULL,
        Categoria TEXT NOT NULL,
        Importe REAL NOT NULL
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS Comandas (
        ComandaId INTEGER PRIMARY KEY AUTOINCREMENT,
        Fecha TEXT NOT NULL,
        NTicket TEXT NOT NULL,
        Cliente TEXT NOT NULL,
        TipoServicio TEXT NOT NULL,
        Ubicacion TEXT NOT NULL,
        Estado TEXT NOT NULL,
        Monto REAL NOT NULL,
        FormaPago TEXT,
        Notas TEXT,
        HoraCreacion TEXT NOT NULL,
        HoraActualizacion TEXT
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS Usuarios (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Username TEXT UNIQUE NOT NULL,
        Password TEXT NOT NULL,
        Role TEXT NOT NULL,
        FechaRegistro TEXT NOT NULL,
        UltimoAcceso TEXT
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS PedidosWhatsApp (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Fecha TEXT NOT NULL,
        TelefonoCliente TEXT NOT NULL,
        NombreCliente TEXT NOT NULL,
        TipoEntrega TEXT NOT NULL,
        DireccionEntrega TEXT,
        MensajeOriginal TEXT,
        ItemsJson TEXT NOT NULL,
        Total REAL NOT NULL,
        FormaPago TEXT NOT NULL,
        Estado TEXT NOT NULL,
        NTicket TEXT,
        ComandaId INTEGER,
        FechaCreacion TEXT NOT NULL,
        Notas TEXT
      );
    `);

    // Schema self-healing: Ensure DetallesId column exists in Detalles table if imported/older DB
    try {
      const pragma = this.db.exec("PRAGMA table_info(Detalles);");
      if (pragma.length > 0 && pragma[0].values) {
        const colNames = pragma[0].values.map((v: any) => String(v[1]).toLowerCase());
        if (!colNames.includes('detallesid')) {
          try {
            this.db.run("ALTER TABLE Detalles ADD COLUMN DetallesId INTEGER;");
            this.db.run("UPDATE Detalles SET DetallesId = rowid WHERE DetallesId IS NULL;");
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }
  }

  private seedInitialData() {
    if (!this.db) return;

    const stmtPlatos = this.db.prepare('INSERT INTO Platos (Plato, Precio, Categoria, Imagen) VALUES (?, ?, ?, ?)');
    DEFAULT_PLATOS.forEach((p) => {
      stmtPlatos.run([p.Plato, safeParsePrice(p.Precio), p.Categoria, p.Imagen]);
    });
    stmtPlatos.free();

    const { ventas, detalles } = generateSeedSales();
    const stmtVentas = this.db.prepare('INSERT INTO Ventas (Fecha, NTicket, Cliente, Monto, FormaPago) VALUES (?, ?, ?, ?, ?)');
    ventas.forEach((v) => {
      stmtVentas.run([v.Fecha, v.NTicket, v.Cliente, safeParsePrice(v.Monto), v.FormaPago]);
    });
    stmtVentas.free();

    const stmtDetalles = this.db.prepare(
      'INSERT INTO Detalles (Fecha, NTicket, Plato, Precio, Cantidad, Categoria, Importe) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    detalles.forEach((d) => {
      stmtDetalles.run([d.Fecha, d.NTicket, d.Plato, safeParsePrice(d.Precio), d.Cantidad, d.Categoria, safeParsePrice(d.Importe)]);
    });

    const { comandas, detallesComandas } = generateSeedComandas();
    detallesComandas.forEach((d) => {
      stmtDetalles.run([d.Fecha, d.NTicket, d.Plato, safeParsePrice(d.Precio), d.Cantidad, d.Categoria, safeParsePrice(d.Importe)]);
    });
    stmtDetalles.free();

    const stmtComandas = this.db.prepare(
      'INSERT INTO Comandas (Fecha, NTicket, Cliente, TipoServicio, Ubicacion, Estado, Monto, FormaPago, Notas, HoraCreacion, HoraActualizacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    comandas.forEach((c) => {
      stmtComandas.run([
        c.Fecha,
        c.NTicket,
        c.Cliente,
        c.TipoServicio,
        c.Ubicacion,
        c.Estado,
        safeParsePrice(c.Monto),
        c.FormaPago || null,
        c.Notas || '',
        c.HoraCreacion,
        c.HoraActualizacion || null,
      ]);
    });
    stmtComandas.free();

    this.seedWhatsAppOrders();
  }

  private seedWhatsAppOrders() {
    const today = new Date().toISOString().substring(0, 10);
    const seed: Omit<PedidoWhatsApp, 'Id'>[] = [
      {
        Fecha: today,
        TelefonoCliente: '+1 (555) 876-1122',
        NombreCliente: 'Carlos Mendoza',
        TipoEntrega: 'Delivery',
        DireccionEntrega: 'Av. Principal Los Samanes, Res. Doral, Torre B, Apto 5-2',
        MensajeOriginal: 'Hola buenas noches! Quisiera hacer un pedido para delivery: 1 Balde Broaster Familiar, 1 Ración de Papas Rusticas, 1 Tequeños de Queso. Efectivo.',
        Items: [
          { platoNombre: 'Balde Broaster Familiar (8 Piezas + 2 Papas)', cantidad: 1, precioUnitario: 25.0, categoria: 'Pollo Broaster' },
          { platoNombre: 'Ración de Papas Fritas Rusticas', cantidad: 1, precioUnitario: 3.5, categoria: 'Raciones' },
          { platoNombre: 'Tequeños Tradicionales de Queso (5 Und)', cantidad: 1, precioUnitario: 4.5, categoria: 'Raciones' },
        ],
        Total: 33.0,
        FormaPago: 'Efectivo',
        Estado: 'Pendiente',
        FechaCreacion: '19:42',
        Notas: 'Enviar salsa tártara y ajo extra',
      },
      {
        Fecha: today,
        TelefonoCliente: '+1 (555) 345-9876',
        NombreCliente: 'Mariana Valero',
        TipoEntrega: 'Para llevar',
        DireccionEntrega: 'Retiro en restaurante',
        MensajeOriginal: 'Buenas tardes! Para retirar en 20 min: 2 Combos Broaster 2 Piezas, 1 Hamburguesa Crispy. Pago con tarjeta al llegar.',
        Items: [
          { platoNombre: 'Combo Broaster 2 Piezas + Papas + Ensalada', cantidad: 2, precioUnitario: 8.0, categoria: 'Pollo Broaster' },
          { platoNombre: 'Hamburguesa Crispy Broaster con Queso', cantidad: 1, precioUnitario: 9.0, categoria: 'Hamburguesas' },
        ],
        Total: 25.0,
        FormaPago: 'Punto de Venta',
        Estado: 'Pendiente',
        FechaCreacion: '20:10',
        Notas: 'Pasa buscando en 20 minutos',
      },
    ];

    if (this.db) {
      try {
        const stmt = this.db.prepare(
          'INSERT INTO PedidosWhatsApp (Fecha, TelefonoCliente, NombreCliente, TipoEntrega, DireccionEntrega, MensajeOriginal, ItemsJson, Total, FormaPago, Estado, NTicket, ComandaId, FechaCreacion, Notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        seed.forEach((p) => {
          stmt.run([
            p.Fecha,
            p.TelefonoCliente,
            p.NombreCliente,
            p.TipoEntrega,
            p.DireccionEntrega || '',
            p.MensajeOriginal,
            JSON.stringify(p.Items),
            safeParsePrice(p.Total),
            p.FormaPago,
            p.Estado,
            p.NTicket || null,
            p.ComandaId || null,
            p.FechaCreacion,
            p.Notas || '',
          ]);
        });
        stmt.free();
      } catch (e) {
        console.warn('seedWhatsAppOrders db insert error:', e);
      }
    }

    this.fallbackPedidosWhatsApp = seed.map((p, idx) => ({
      ...p,
      Id: idx + 1,
    }));
  }

  private setupFallback() {
    const storedPlatos = localStorage.getItem('tb_fallback_platos');
    const storedVentas = localStorage.getItem('tb_fallback_ventas');
    const storedDetalles = localStorage.getItem('tb_fallback_detalles');
    const storedComandas = localStorage.getItem('tb_fallback_comandas');
    const storedUsuarios = localStorage.getItem('tb_fallback_usuarios');
    const storedPedidosWA = localStorage.getItem('tb_fallback_pedidos_whatsapp');

    if (storedPlatos && storedVentas && storedDetalles) {
      try {
        this.fallbackPlatos = JSON.parse(storedPlatos).map((p: any) => ({
          ...p,
          Precio: safeParsePrice(p.Precio),
        }));
        this.fallbackVentas = JSON.parse(storedVentas).map((v: any) => ({
          ...v,
          Monto: safeParsePrice(v.Monto),
        }));
        this.fallbackDetalles = JSON.parse(storedDetalles).map((d: any) => ({
          ...d,
          Precio: safeParsePrice(d.Precio),
          Importe: safeParsePrice(d.Importe),
        }));
        if (storedComandas) {
          this.fallbackComandas = JSON.parse(storedComandas).map((c: any) => ({
            ...c,
            Monto: safeParsePrice(c.Monto),
          }));
        } else {
          this.fallbackComandas = generateSeedComandas().comandas;
        }
        if (storedUsuarios) {
          this.fallbackUsuarios = JSON.parse(storedUsuarios);
        }
        if (storedPedidosWA) {
          this.fallbackPedidosWhatsApp = JSON.parse(storedPedidosWA);
        } else {
          this.seedWhatsAppOrders();
        }
      } catch {
        this.initDefaultFallback();
      }
    } else {
      this.initDefaultFallback();
    }
  }

  private initDefaultFallback() {
    this.fallbackPlatos = DEFAULT_PLATOS.map((p, idx) => ({
      ...p,
      ID: idx + 1,
      Precio: safeParsePrice(p.Precio),
    }));
    const seed = generateSeedSales();
    this.fallbackVentas = seed.ventas;
    this.fallbackDetalles = seed.detalles;

    const seedComandas = generateSeedComandas();
    this.fallbackComandas = seedComandas.comandas;
    this.fallbackDetalles.push(...seedComandas.detallesComandas);

    this.seedWhatsAppOrders();
  }

  private syncFallbackFromDb() {
    if (!this.db) return;
    try {
      this.fallbackPlatos = this.getPlatos();
      this.fallbackVentas = this.getVentas();
      this.fallbackComandas = this.getComandas();
      this.fallbackUsuarios = this.getUsuarios();
      this.fallbackPedidosWhatsApp = this.getPedidosWhatsApp();
    } catch {
      // ignore
    }
  }

  private saveToStorage() {
    if (this.db) {
      try {
        const binary = this.db.export();
        let binaryStr = '';
        const len = binary.byteLength;
        const chunkSize = 8192;
        for (let i = 0; i < len; i += chunkSize) {
          const chunk = binary.subarray(i, Math.min(i + chunkSize, len));
          binaryStr += String.fromCharCode.apply(null, Array.from(chunk));
        }
        localStorage.setItem('TerrenoBroaster_db_binary', btoa(binaryStr));
      } catch (e) {
        console.warn('LocalStorage save limit for SQLite binary:', e);
      }
    }

    localStorage.setItem('tb_fallback_platos', JSON.stringify(this.fallbackPlatos));
    localStorage.setItem('tb_fallback_ventas', JSON.stringify(this.fallbackVentas));
    localStorage.setItem('tb_fallback_detalles', JSON.stringify(this.fallbackDetalles));
    localStorage.setItem('tb_fallback_comandas', JSON.stringify(this.fallbackComandas));
    localStorage.setItem('tb_fallback_usuarios', JSON.stringify(this.fallbackUsuarios));
    localStorage.setItem('tb_fallback_pedidos_whatsapp', JSON.stringify(this.fallbackPedidosWhatsApp));
  }


  // --- STATUS INFO ---
  public getConnectionStatus() {
    return {
      ready: true,
      engine: this.db ? 'SQLite 3 (WebAssembly sql.js)' : 'Motor Relacional Local',
      isWasm: !!this.db,
      platosCount: this.getPlatos().length,
      ventasCount: this.getVentas().length,
      comandasCount: this.getComandas().length,
      pedidosWhatsAppCount: this.getPedidosWhatsApp().length,
    };
  }

  // --- PLATOS CRUD ---
  public getPlatos(): Plato[] {
    if (!this.db) {
      return [...this.fallbackPlatos];
    }
    try {
      const res = this.db.exec('SELECT ID, Plato, Precio, Categoria, Imagen FROM Platos ORDER BY ID ASC');
      if (res.length === 0) return [...this.fallbackPlatos];
      const columns = res[0].columns;
      return res[0].values.map((row) => {
        const item: any = {};
        columns.forEach((col, idx) => {
          item[col] = row[idx];
        });
        return {
          ID: Number(item.ID),
          Plato: String(item.Plato),
          Precio: safeParsePrice(item.Precio),
          Categoria: String(item.Categoria),
          Imagen: String(item.Imagen || ''),
        };
      });
    } catch (e) {
      console.error('getPlatos error:', e);
      return [...this.fallbackPlatos];
    }
  }

  public addPlato(plato: Omit<Plato, 'ID'>): Plato {
    const cleanPrice = safeParsePrice(plato.Precio);

    if (this.db) {
      const stmt = this.db.prepare('INSERT INTO Platos (Plato, Precio, Categoria, Imagen) VALUES (?, ?, ?, ?)');
      stmt.run([plato.Plato, cleanPrice, plato.Categoria, plato.Imagen || '']);
      stmt.free();

      const lastIdRes = this.db.exec('SELECT last_insert_rowid()');
      const newId = Number(lastIdRes[0].values[0][0]);
      
      const created = { ID: newId, Plato: plato.Plato, Precio: cleanPrice, Categoria: plato.Categoria, Imagen: plato.Imagen };
      this.fallbackPlatos.push(created);
      this.notify();
      return created;
    } else {
      const newId = this.fallbackPlatos.length > 0 ? Math.max(...this.fallbackPlatos.map((p) => p.ID)) + 1 : 1;
      const created: Plato = { ID: newId, Plato: plato.Plato, Precio: cleanPrice, Categoria: plato.Categoria, Imagen: plato.Imagen };
      this.fallbackPlatos.push(created);
      this.notify();
      return created;
    }
  }

  public updatePlato(plato: Plato): boolean {
    const cleanPrice = safeParsePrice(plato.Precio);

    if (this.db) {
      const stmt = this.db.prepare('UPDATE Platos SET Plato = ?, Precio = ?, Categoria = ?, Imagen = ? WHERE ID = ?');
      stmt.run([plato.Plato, cleanPrice, plato.Categoria, plato.Imagen || '', plato.ID]);
      stmt.free();
    }
    
    const idx = this.fallbackPlatos.findIndex((p) => p.ID === plato.ID);
    if (idx !== -1) {
      this.fallbackPlatos[idx] = { ...plato, Precio: cleanPrice };
    }
    this.notify();
    return true;
  }

  public deletePlato(id: number): boolean {
    if (this.db) {
      const stmt = this.db.prepare('DELETE FROM Platos WHERE ID = ?');
      stmt.run([id]);
      stmt.free();
    }
    this.fallbackPlatos = this.fallbackPlatos.filter((p) => p.ID !== id);
    this.notify();
    return true;
  }

  // --- NEXT TICKET NUMBER ---
  public getNextTicketNumber(): string {
    let maxNum = 2004;

    const extractNumber = (ticket: any): number => {
      if (!ticket) return 0;
      const str = String(ticket).trim();
      const matches = str.match(/\d+/g);
      if (!matches || matches.length === 0) return 0;
      // Get the last contiguous group of digits (e.g. 'TB-2005' -> 2005)
      const val = parseInt(matches[matches.length - 1], 10);
      return isNaN(val) ? 0 : val;
    };

    if (this.db) {
      try {
        const res = this.db.exec(
          "SELECT NTicket FROM Ventas UNION SELECT NTicket FROM Comandas UNION SELECT NTicket FROM Detalles"
        );
        if (res.length > 0 && res[0].values) {
          for (const row of res[0].values) {
            const val = extractNumber(row[0]);
            if (val > maxNum) {
              maxNum = val;
            }
          }
        }
      } catch (err) {
        console.warn('Error extracting tickets from SQLite:', err);
      }
    }

    // Also scan fallback in-memory lists
    const inMemoryTickets = [
      ...this.fallbackVentas.map((v) => v.NTicket),
      ...this.fallbackComandas.map((c) => c.NTicket),
      ...this.fallbackDetalles.map((d) => d.NTicket),
      ...this.fallbackPedidosWhatsApp.map((p) => p.NTicket),
    ];

    for (const t of inMemoryTickets) {
      const val = extractNumber(t);
      if (val > maxNum) {
        maxNum = val;
      }
    }

    return `TB-${maxNum + 1}`;
  }

  // --- COMANDAS (MESAS, PARA LLEVAR, DELIVERY) ---
  public getComandas(estado?: EstadoComanda): Comanda[] {
    if (!this.db) {
      let list = [...this.fallbackComandas];
      if (estado) {
        list = list.filter((c) => c.Estado === estado);
      }
      return list.sort((a, b) => b.ComandaId - a.ComandaId);
    }

    try {
      let sql = 'SELECT ComandaId, Fecha, NTicket, Cliente, TipoServicio, Ubicacion, Estado, Monto, FormaPago, Notas, HoraCreacion, HoraActualizacion FROM Comandas';
      const params: any[] = [];
      if (estado) {
        sql += ' WHERE Estado = ?';
        params.push(estado);
      }
      sql += ' ORDER BY ComandaId DESC';

      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      const list: Comanda[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        list.push({
          ComandaId: Number(row.ComandaId),
          Fecha: String(row.Fecha),
          NTicket: String(row.NTicket),
          Cliente: String(row.Cliente),
          TipoServicio: row.TipoServicio as TipoServicio,
          Ubicacion: String(row.Ubicacion),
          Estado: row.Estado as EstadoComanda,
          Monto: safeParsePrice(row.Monto),
          FormaPago: row.FormaPago ? (row.FormaPago as FormaPago) : undefined,
          Notas: row.Notas ? String(row.Notas) : undefined,
          HoraCreacion: String(row.HoraCreacion || ''),
          HoraActualizacion: row.HoraActualizacion ? String(row.HoraActualizacion) : undefined,
        });
      }
      stmt.free();
      return list;
    } catch (e) {
      console.error('getComandas error:', e);
      let list = [...this.fallbackComandas];
      if (estado) {
        list = list.filter((c) => c.Estado === estado);
      }
      return list.sort((a, b) => b.ComandaId - a.ComandaId);
    }
  }

  public getActiveComandaForLocation(ubicacion: string): Comanda | null {
    const active = this.getComandas().find(
      (c) => c.Ubicacion === ubicacion && (c.Estado === 'Cocina' || c.Estado === 'Entregado')
    );
    return active || null;
  }

  public getComandaByTicket(nTicket: string): Comanda | null {
    const list = this.getComandas();
    return list.find((c) => c.NTicket === nTicket) || null;
  }

  public createComanda(
    comandaData: Omit<Comanda, 'ComandaId'>,
    cartItems: CartItem[]
  ): { comanda: Comanda; detalles: DetalleVenta[] } {
    const createdDetalles: DetalleVenta[] = [];
    const cleanTotal = safeParsePrice(comandaData.Monto);
    const timeOnly = comandaData.HoraCreacion || new Date().toISOString().substring(11, 16);

    const activeDb = this.db;
    if (activeDb) {
      activeDb.run('BEGIN TRANSACTION;');
      try {
        const stmtComanda = activeDb.prepare(
          'INSERT INTO Comandas (Fecha, NTicket, Cliente, TipoServicio, Ubicacion, Estado, Monto, FormaPago, Notas, HoraCreacion, HoraActualizacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        stmtComanda.run([
          comandaData.Fecha,
          comandaData.NTicket,
          comandaData.Cliente,
          comandaData.TipoServicio,
          comandaData.Ubicacion,
          comandaData.Estado,
          cleanTotal,
          comandaData.FormaPago || null,
          comandaData.Notas || '',
          timeOnly,
          null,
        ]);
        stmtComanda.free();

        const lastCIdRes = activeDb.exec('SELECT last_insert_rowid()');
        const cId = Number(lastCIdRes[0].values[0][0]);

        const stmtDetalle = activeDb.prepare(
          'INSERT INTO Detalles (Fecha, NTicket, Plato, Precio, Cantidad, Categoria, Importe) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        cartItems.forEach((item) => {
          const itemPrice = safeParsePrice(item.plato.Precio);
          const importe = Number((itemPrice * item.cantidad).toFixed(2));
          stmtDetalle.run([
            comandaData.Fecha,
            comandaData.NTicket,
            item.plato.Plato,
            itemPrice,
            item.cantidad,
            item.plato.Categoria,
            importe,
          ]);

          const lastDIdRes = activeDb.exec('SELECT last_insert_rowid()');
          const dId = Number(lastDIdRes[0].values[0][0]);

          const d: DetalleVenta = {
            DetallesId: dId,
            Fecha: comandaData.Fecha,
            NTicket: comandaData.NTicket,
            Plato: item.plato.Plato,
            Precio: itemPrice,
            Cantidad: item.cantidad,
            Categoria: item.plato.Categoria,
            Importe: importe,
          };
          createdDetalles.push(d);
          this.fallbackDetalles.push(d);
        });
        stmtDetalle.free();

        // If created already as 'Cobrado', also record into Ventas immediately
        if (comandaData.Estado === 'Cobrado' && comandaData.FormaPago) {
          const stmtVenta = activeDb.prepare(
            'INSERT INTO Ventas (Fecha, NTicket, Cliente, Monto, FormaPago) VALUES (?, ?, ?, ?, ?)'
          );
          stmtVenta.run([comandaData.Fecha, comandaData.NTicket, comandaData.Cliente, cleanTotal, comandaData.FormaPago]);
          stmtVenta.free();
        }

        activeDb.run('COMMIT;');

        const newComanda: Comanda = {
          ComandaId: cId,
          Fecha: comandaData.Fecha,
          NTicket: comandaData.NTicket,
          Cliente: comandaData.Cliente,
          TipoServicio: comandaData.TipoServicio,
          Ubicacion: comandaData.Ubicacion,
          Estado: comandaData.Estado,
          Monto: cleanTotal,
          FormaPago: comandaData.FormaPago,
          Notas: comandaData.Notas,
          HoraCreacion: timeOnly,
        };

        this.fallbackComandas.unshift(newComanda);
        this.notify();
        return { comanda: newComanda, detalles: createdDetalles };
      } catch (err) {
        try {
          activeDb.run('ROLLBACK;');
        } catch {
          // ignore
        }
        throw err;
      }
    } else {
      const cId = this.fallbackComandas.length + 1;
      const newComanda: Comanda = {
        ComandaId: cId,
        Fecha: comandaData.Fecha,
        NTicket: comandaData.NTicket,
        Cliente: comandaData.Cliente,
        TipoServicio: comandaData.TipoServicio,
        Ubicacion: comandaData.Ubicacion,
        Estado: comandaData.Estado,
        Monto: cleanTotal,
        FormaPago: comandaData.FormaPago,
        Notas: comandaData.Notas,
        HoraCreacion: timeOnly,
      };
      this.fallbackComandas.unshift(newComanda);

      let dCounter = this.fallbackDetalles.length + 1;
      cartItems.forEach((item) => {
        const itemPrice = safeParsePrice(item.plato.Precio);
        const importe = Number((itemPrice * item.cantidad).toFixed(2));
        const d: DetalleVenta = {
          DetallesId: dCounter++,
          Fecha: comandaData.Fecha,
          NTicket: comandaData.NTicket,
          Plato: item.plato.Plato,
          Precio: itemPrice,
          Cantidad: item.cantidad,
          Categoria: item.plato.Categoria,
          Importe: importe,
        };
        this.fallbackDetalles.push(d);
        createdDetalles.push(d);
      });

      if (comandaData.Estado === 'Cobrado' && comandaData.FormaPago) {
        this.fallbackVentas.push({
          VentasId: this.fallbackVentas.length + 1,
          Fecha: comandaData.Fecha,
          NTicket: comandaData.NTicket,
          Cliente: comandaData.Cliente,
          Monto: cleanTotal,
          FormaPago: comandaData.FormaPago,
        });
      }

      this.notify();
      return { comanda: newComanda, detalles: createdDetalles };
    }
  }

  /**
   * Appends extra items to an existing active kitchen/table comanda without duplicating tickets or recreating comandas
   */
  public addDetallesToComanda(nTicket: string, cartItems: CartItem[]): boolean {
    if (!cartItems || cartItems.length === 0) return false;
    const comanda = this.getComandaByTicket(nTicket);
    if (!comanda) return false;

    const addedAmount = cartItems.reduce(
      (sum, item) => sum + safeParsePrice(item.plato.Precio) * item.cantidad,
      0
    );
    const newTotal = Number((comanda.Monto + addedAmount).toFixed(2));
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const timeOnly = now.toTimeString().substring(0, 5);

    if (this.db) {
      try {
        const stmtDetalle = this.db.prepare(
          'INSERT INTO Detalles (Fecha, NTicket, Plato, Precio, Cantidad, Categoria, Importe) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        cartItems.forEach((item) => {
          const itemPrice = safeParsePrice(item.plato.Precio);
          const importe = Number((itemPrice * item.cantidad).toFixed(2));
          stmtDetalle.run([
            dateStr,
            nTicket,
            item.plato.Plato,
            itemPrice,
            item.cantidad,
            item.plato.Categoria,
            importe,
          ]);

          const lastIdRes = this.db!.exec('SELECT last_insert_rowid()');
          const dId = Number(lastIdRes[0].values[0][0]);
          this.fallbackDetalles.push({
            DetallesId: dId,
            Fecha: dateStr,
            NTicket: nTicket,
            Plato: item.plato.Plato,
            Precio: itemPrice,
            Cantidad: item.cantidad,
            Categoria: item.plato.Categoria,
            Importe: importe,
          });
        });
        stmtDetalle.free();

        const stmtUpd = this.db.prepare(
          'UPDATE Comandas SET Monto = ?, HoraActualizacion = ? WHERE NTicket = ?'
        );
        stmtUpd.run([newTotal, timeOnly, nTicket]);
        stmtUpd.free();
      } catch (err) {
        console.error('Error adding items to comanda in DB:', err);
      }
    } else {
      let dCounter = this.fallbackDetalles.length + 1;
      cartItems.forEach((item) => {
        const itemPrice = safeParsePrice(item.plato.Precio);
        const importe = Number((itemPrice * item.cantidad).toFixed(2));
        this.fallbackDetalles.push({
          DetallesId: dCounter++,
          Fecha: dateStr,
          NTicket: nTicket,
          Plato: item.plato.Plato,
          Precio: itemPrice,
          Cantidad: item.cantidad,
          Categoria: item.plato.Categoria,
          Importe: importe,
        });
      });
    }

    const cIdx = this.fallbackComandas.findIndex((c) => c.NTicket === nTicket);
    if (cIdx !== -1) {
      this.fallbackComandas[cIdx].Monto = newTotal;
      this.fallbackComandas[cIdx].HoraActualizacion = timeOnly;
    }

    this.notify();
    return true;
  }

  public updateComandaEstado(nTicket: string, nuevoEstado: EstadoComanda, formaPago?: FormaPago): boolean {
    const nowTime = new Date().toISOString().substring(11, 16);
    const comanda = this.getComandaByTicket(nTicket);

    if (this.db) {
      if (formaPago) {
        const stmt = this.db.prepare('UPDATE Comandas SET Estado = ?, FormaPago = ?, HoraActualizacion = ? WHERE NTicket = ?');
        stmt.run([nuevoEstado, formaPago, nowTime, nTicket]);
        stmt.free();
      } else {
        const stmt = this.db.prepare('UPDATE Comandas SET Estado = ?, HoraActualizacion = ? WHERE NTicket = ?');
        stmt.run([nuevoEstado, nowTime, nTicket]);
        stmt.free();
      }

      // If transitioning to 'Cobrado', ensure record in Ventas table
      if (nuevoEstado === 'Cobrado' && comanda) {
        const fp = formaPago || comanda.FormaPago || 'Efectivo';
        const existsVenta = this.db.exec(`SELECT COUNT(*) FROM Ventas WHERE NTicket = '${nTicket}'`);
        const count = existsVenta.length > 0 && existsVenta[0].values[0] ? Number(existsVenta[0].values[0][0]) : 0;
        if (count === 0) {
          const stmtVenta = this.db.prepare(
            'INSERT INTO Ventas (Fecha, NTicket, Cliente, Monto, FormaPago) VALUES (?, ?, ?, ?, ?)'
          );
          stmtVenta.run([comanda.Fecha, comanda.NTicket, comanda.Cliente, comanda.Monto, fp]);
          stmtVenta.free();
        }
      }
    }

    // Update in-memory fallback
    const idx = this.fallbackComandas.findIndex((c) => c.NTicket === nTicket);
    if (idx !== -1) {
      this.fallbackComandas[idx].Estado = nuevoEstado;
      this.fallbackComandas[idx].HoraActualizacion = nowTime;
      if (formaPago) {
        this.fallbackComandas[idx].FormaPago = formaPago;
      }

      if (nuevoEstado === 'Cobrado') {
        const target = this.fallbackComandas[idx];
        const fp = formaPago || target.FormaPago || 'Efectivo';
        const exists = this.fallbackVentas.some((v) => v.NTicket === nTicket);
        if (!exists) {
          this.fallbackVentas.push({
            VentasId: this.fallbackVentas.length + 1,
            Fecha: target.Fecha,
            NTicket: target.NTicket,
            Cliente: target.Cliente,
            Monto: target.Monto,
            FormaPago: fp,
          });
        }
      }
    }

    this.notify();
    return true;
  }

  public anularComanda(nTicket: string, motivo?: string): boolean {
    const nowTime = new Date().toISOString().substring(11, 16);
    const motivoText = motivo ? `Anulado: ${motivo}` : 'Anulado';

    if (this.db) {
      const stmt = this.db.prepare(
        'UPDATE Comandas SET Estado = ?, Notas = CASE WHEN Notas IS NULL OR Notas = "" THEN ? ELSE Notas || " | " || ? END, HoraActualizacion = ? WHERE NTicket = ?'
      );
      stmt.run(['Anulado', motivoText, motivoText, nowTime, nTicket]);
      stmt.free();
    }

    const idx = this.fallbackComandas.findIndex((c) => c.NTicket === nTicket);
    if (idx !== -1) {
      this.fallbackComandas[idx].Estado = 'Anulado';
      this.fallbackComandas[idx].HoraActualizacion = nowTime;
      this.fallbackComandas[idx].Notas = this.fallbackComandas[idx].Notas
        ? `${this.fallbackComandas[idx].Notas} | ${motivoText}`
        : motivoText;
    }

    this.notify();
    return true;
  }

  // --- CREATE VENTA (Direct POS checkout) ---
  public createVenta(
    ventaData: Omit<Venta, 'VentasId'>,
    cartItems: CartItem[]
  ): { venta: Venta; detalles: DetalleVenta[] } {
    const createdDetalles: DetalleVenta[] = [];
    const cleanTotal = safeParsePrice(ventaData.Monto);

    const activeDb = this.db;
    if (activeDb) {
      activeDb.run('BEGIN TRANSACTION;');
      try {
        const stmtVenta = activeDb.prepare('INSERT INTO Ventas (Fecha, NTicket, Cliente, Monto, FormaPago) VALUES (?, ?, ?, ?, ?)');
        stmtVenta.run([ventaData.Fecha, ventaData.NTicket, ventaData.Cliente, cleanTotal, ventaData.FormaPago]);
        stmtVenta.free();

        const lastVentaIdRes = activeDb.exec('SELECT last_insert_rowid()');
        const ventasId = Number(lastVentaIdRes[0].values[0][0]);

        const stmtDetalle = activeDb.prepare(
          'INSERT INTO Detalles (Fecha, NTicket, Plato, Precio, Cantidad, Categoria, Importe) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        cartItems.forEach((item) => {
          const itemPrice = safeParsePrice(item.plato.Precio);
          const importe = Number((itemPrice * item.cantidad).toFixed(2));
          stmtDetalle.run([
            ventaData.Fecha,
            ventaData.NTicket,
            item.plato.Plato,
            itemPrice,
            item.cantidad,
            item.plato.Categoria,
            importe,
          ]);

          const lastDetalleIdRes = activeDb.exec('SELECT last_insert_rowid()');
          const dId = Number(lastDetalleIdRes[0].values[0][0]);

          const d: DetalleVenta = {
            DetallesId: dId,
            Fecha: ventaData.Fecha,
            NTicket: ventaData.NTicket,
            Plato: item.plato.Plato,
            Precio: itemPrice,
            Cantidad: item.cantidad,
            Categoria: item.plato.Categoria,
            Importe: importe,
          };
          createdDetalles.push(d);
          this.fallbackDetalles.push(d);
        });
        stmtDetalle.free();

        // Also record comanda with status 'Cobrado'
        const stmtComanda = activeDb.prepare(
          'INSERT INTO Comandas (Fecha, NTicket, Cliente, TipoServicio, Ubicacion, Estado, Monto, FormaPago, Notas, HoraCreacion, HoraActualizacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        stmtComanda.run([
          ventaData.Fecha,
          ventaData.NTicket,
          ventaData.Cliente,
          'Para llevar',
          'Venta Directa POS',
          'Cobrado',
          cleanTotal,
          ventaData.FormaPago,
          'Venta directa cobrada en caja',
          ventaData.Fecha.substring(11, 16) || '12:00',
          ventaData.Fecha.substring(11, 16) || '12:00',
        ]);
        stmtComanda.free();

        activeDb.run('COMMIT;');

        const newVenta: Venta = {
          VentasId: ventasId,
          Fecha: ventaData.Fecha,
          NTicket: ventaData.NTicket,
          Cliente: ventaData.Cliente,
          Monto: cleanTotal,
          FormaPago: ventaData.FormaPago,
        };

        this.fallbackVentas.push(newVenta);
        this.fallbackComandas.unshift({
          ComandaId: this.fallbackComandas.length + 1,
          Fecha: ventaData.Fecha,
          NTicket: ventaData.NTicket,
          Cliente: ventaData.Cliente,
          TipoServicio: 'Para llevar',
          Ubicacion: 'Venta Directa POS',
          Estado: 'Cobrado',
          Monto: cleanTotal,
          FormaPago: ventaData.FormaPago,
          Notas: 'Venta directa cobrada en caja',
          HoraCreacion: ventaData.Fecha.substring(11, 16) || '12:00',
          HoraActualizacion: ventaData.Fecha.substring(11, 16) || '12:00',
        });

        this.notify();
        return { venta: newVenta, detalles: createdDetalles };
      } catch (err) {
        try {
          activeDb.run('ROLLBACK;');
        } catch {
          // ignore
        }
        throw err;
      }
    } else {
      const vId = this.fallbackVentas.length + 1;
      const newVenta: Venta = {
        VentasId: vId,
        Fecha: ventaData.Fecha,
        NTicket: ventaData.NTicket,
        Cliente: ventaData.Cliente,
        Monto: cleanTotal,
        FormaPago: ventaData.FormaPago,
      };
      this.fallbackVentas.push(newVenta);

      let dCounter = this.fallbackDetalles.length + 1;
      cartItems.forEach((item) => {
        const itemPrice = safeParsePrice(item.plato.Precio);
        const importe = Number((itemPrice * item.cantidad).toFixed(2));
        const d: DetalleVenta = {
          DetallesId: dCounter++,
          Fecha: ventaData.Fecha,
          NTicket: ventaData.NTicket,
          Plato: item.plato.Plato,
          Precio: itemPrice,
          Cantidad: item.cantidad,
          Categoria: item.plato.Categoria,
          Importe: importe,
        };
        this.fallbackDetalles.push(d);
        createdDetalles.push(d);
      });

      this.fallbackComandas.unshift({
        ComandaId: this.fallbackComandas.length + 1,
        Fecha: ventaData.Fecha,
        NTicket: ventaData.NTicket,
        Cliente: ventaData.Cliente,
        TipoServicio: 'Para llevar',
        Ubicacion: 'Venta Directa POS',
        Estado: 'Cobrado',
        Monto: cleanTotal,
        FormaPago: ventaData.FormaPago,
        Notas: 'Venta directa cobrada en caja',
        HoraCreacion: ventaData.Fecha.substring(11, 16) || '12:00',
        HoraActualizacion: ventaData.Fecha.substring(11, 16) || '12:00',
      });

      this.notify();
      return { venta: newVenta, detalles: createdDetalles };
    }
  }

  // --- QUERY VENTAS BY DATE RANGE ---
  public getVentas(startDate?: string, endDate?: string): Venta[] {
    if (!this.db) {
      let filtered = [...this.fallbackVentas];
      if (startDate) {
        filtered = filtered.filter((v) => v.Fecha.split(' ')[0] >= startDate);
      }
      if (endDate) {
        filtered = filtered.filter((v) => v.Fecha.split(' ')[0] <= endDate);
      }
      return filtered.sort((a, b) => b.Fecha.localeCompare(a.Fecha));
    }

    try {
      let sql = 'SELECT VentasId, Fecha, NTicket, Cliente, Monto, FormaPago FROM Ventas';
      const params: any[] = [];

      if (startDate && endDate) {
        sql += " WHERE date(substr(Fecha, 1, 10)) BETWEEN date(?) AND date(?)";
        params.push(startDate, endDate);
      } else if (startDate) {
        sql += " WHERE date(substr(Fecha, 1, 10)) >= date(?)";
        params.push(startDate);
      } else if (endDate) {
        sql += " WHERE date(substr(Fecha, 1, 10)) <= date(?)";
        params.push(endDate);
      }

      sql += ' ORDER BY Fecha DESC';
      const stmt = this.db.prepare(sql);
      stmt.bind(params);

      const list: Venta[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        list.push({
          VentasId: Number(row.VentasId),
          Fecha: String(row.Fecha),
          NTicket: String(row.NTicket),
          Cliente: String(row.Cliente),
          Monto: safeParsePrice(row.Monto),
          FormaPago: row.FormaPago as any,
        });
      }
      stmt.free();
      return list;
    } catch (e) {
      console.error('getVentas error:', e);
      return [...this.fallbackVentas];
    }
  }

  // --- GET VENTA BY NTICKET ---
  public getVentaByTicket(nTicket: string): Venta | null {
    if (!this.db) {
      return this.fallbackVentas.find((v) => v.NTicket === nTicket) || null;
    }
    try {
      const stmt = this.db.prepare('SELECT VentasId, Fecha, NTicket, Cliente, Monto, FormaPago FROM Ventas WHERE NTicket = ? LIMIT 1');
      stmt.bind([nTicket]);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return {
          VentasId: Number(row.VentasId),
          Fecha: String(row.Fecha),
          NTicket: String(row.NTicket),
          Cliente: String(row.Cliente),
          Monto: safeParsePrice(row.Monto),
          FormaPago: row.FormaPago as any,
        };
      }
      stmt.free();
      return null;
    } catch {
      return this.fallbackVentas.find((v) => v.NTicket === nTicket) || null;
    }
  }

  // --- GET DETALLES BY NTICKET ---
  public getDetallesByTicket(nTicket: string): DetalleVenta[] {
    if (!this.db) {
      return this.fallbackDetalles.filter((d) => d.NTicket === nTicket);
    }
    try {
      let stmt: any;
      try {
        stmt = this.db.prepare(
          'SELECT rowid as _rowid, * FROM Detalles WHERE NTicket = ? ORDER BY rowid ASC'
        );
      } catch {
        stmt = this.db.prepare('SELECT * FROM Detalles WHERE NTicket = ?');
      }
      stmt.bind([nTicket]);
      const list: DetalleVenta[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        const dId = Number(row.DetallesId ?? row.DetalleId ?? row.ID ?? row.Id ?? row._rowid ?? 1);
        list.push({
          DetallesId: dId,
          Fecha: String(row.Fecha || ''),
          NTicket: String(row.NTicket || nTicket),
          Plato: String(row.Plato || ''),
          Precio: safeParsePrice(row.Precio),
          Cantidad: Number(row.Cantidad || 1),
          Categoria: String(row.Categoria || ''),
          Importe: safeParsePrice(row.Importe),
        });
      }
      stmt.free();
      return list;
    } catch (e) {
      console.error('getDetallesByTicket error:', e);
      return this.fallbackDetalles.filter((d) => d.NTicket === nTicket);
    }
  }

  // --- ACUMULADO DE PRODUCTOS ---
  public getAcumuladoProductos(startDate?: string, endDate?: string): AcumuladoProducto[] {
    if (!this.db) {
      let filtered = [...this.fallbackDetalles];
      if (startDate) {
        filtered = filtered.filter((d) => d.Fecha.split(' ')[0] >= startDate);
      }
      if (endDate) {
        filtered = filtered.filter((d) => d.Fecha.split(' ')[0] <= endDate);
      }
      const map = new Map<string, AcumuladoProducto>();
      filtered.forEach((d) => {
        if (!map.has(d.Plato)) {
          map.set(d.Plato, {
            Plato: d.Plato,
            Categoria: d.Categoria,
            CantidadTotal: 0,
            PrecioPromedio: d.Precio,
            MontoTotal: 0,
          });
        }
        const item = map.get(d.Plato)!;
        item.CantidadTotal += d.Cantidad;
        item.MontoTotal = Number((item.MontoTotal + d.Importe).toFixed(2));
      });
      return Array.from(map.values()).sort((a, b) => b.MontoTotal - a.MontoTotal);
    }

    try {
      let sql = `
        SELECT 
          Plato,
          Categoria,
          SUM(Cantidad) as CantidadTotal,
          AVG(Precio) as PrecioPromedio,
          SUM(Importe) as MontoTotal
        FROM Detalles
      `;
      const params: any[] = [];
      if (startDate && endDate) {
        sql += " WHERE date(substr(Fecha, 1, 10)) BETWEEN date(?) AND date(?)";
        params.push(startDate, endDate);
      } else if (startDate) {
        sql += " WHERE date(substr(Fecha, 1, 10)) >= date(?)";
        params.push(startDate);
      } else if (endDate) {
        sql += " WHERE date(substr(Fecha, 1, 10)) <= date(?)";
        params.push(endDate);
      }

      sql += ' GROUP BY Plato ORDER BY MontoTotal DESC';

      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      const list: AcumuladoProducto[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        list.push({
          Plato: String(row.Plato),
          Categoria: String(row.Categoria),
          CantidadTotal: Number(row.CantidadTotal),
          PrecioPromedio: safeParsePrice(row.PrecioPromedio),
          MontoTotal: safeParsePrice(row.MontoTotal),
        });
      }
      stmt.free();
      return list;
    } catch (e) {
      console.error('getAcumuladoProductos error:', e);
      return [];
    }
  }

  // --- ACUMULADO FORMAS DE PAGO ---
  public getAcumuladoFormasPago(startDate?: string, endDate?: string): AcumuladoFormaPago[] {
    const ventas = this.getVentas(startDate, endDate);
    const totalGlobal = ventas.reduce((acc, v) => acc + v.Monto, 0);

    const validMethods: Array<'Efectivo' | 'Pago Movil' | 'Punto de Venta' | 'Transferencia'> = [
      'Efectivo',
      'Pago Movil',
      'Punto de Venta',
      'Transferencia',
    ];

    const statsMap: Record<string, { count: number; monto: number }> = {
      Efectivo: { count: 0, monto: 0 },
      'Pago Movil': { count: 0, monto: 0 },
      'Punto de Venta': { count: 0, monto: 0 },
      Transferencia: { count: 0, monto: 0 },
    };

    ventas.forEach((v) => {
      if (statsMap[v.FormaPago]) {
        statsMap[v.FormaPago].count += 1;
        statsMap[v.FormaPago].monto += v.Monto;
      } else {
        statsMap[v.FormaPago] = { count: 1, monto: v.Monto };
      }
    });

    return validMethods.map((fp) => {
      const data = statsMap[fp] || { count: 0, monto: 0 };
      const percentage = totalGlobal > 0 ? (data.monto / totalGlobal) * 100 : 0;
      return {
        FormaPago: fp,
        Transacciones: data.count,
        MontoTotal: Number(data.monto.toFixed(2)),
        Porcentaje: Number(percentage.toFixed(1)),
      };
    });
  }

  // --- EVOLUCIÓN DIARIA ---
  public getDailySales(): DailySaleStat[] {
    const ventas = this.getVentas();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const map = new Map<string, { monto: number; tickets: number }>();

    ventas.forEach((v) => {
      const dateKey = v.Fecha.split(' ')[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, { monto: 0, tickets: 0 });
      }
      const cur = map.get(dateKey)!;
      cur.monto += v.Monto;
      cur.tickets += 1;
    });

    const result: DailySaleStat[] = [];
    Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([dateKey, val]) => {
        const d = new Date(dateKey + 'T12:00:00');
        result.push({
          fecha: dateKey,
          diaSemana: dayNames[d.getDay()],
          monto: Number(val.monto.toFixed(2)),
          tickets: val.tickets,
        });
      });

    return result;
  }

  // --- IMPORT DATABASE FILE ---
  public async importDatabase(file: File): Promise<number> {
    const buffer = await file.arrayBuffer();
    const binary = new Uint8Array(buffer);

    if (!this.SQL) {
      try {
        this.SQL = await initSqlJs({
          locateFile: () => sqlWasmUrl,
        });
      } catch {
        this.SQL = await initSqlJs({
          locateFile: (f) => `https://sql.js.org/dist/${f}`,
        });
      }
    }

    this.db = new this.SQL.Database(binary);
    this.createTablesIfNotExist();

    this.syncFallbackFromDb();

    const res = this.db.exec('SELECT COUNT(*) FROM Platos');
    const platosCount = res.length > 0 && res[0].values[0] ? Number(res[0].values[0][0]) : 0;

    this.notify();
    return platosCount;
  }

  public exportDatabase(): Uint8Array {
    if (this.db) {
      return this.db.export();
    }
    if (this.SQL) {
      const tempDb = new this.SQL.Database();
      tempDb.run(`
        CREATE TABLE Platos (ID INTEGER PRIMARY KEY AUTOINCREMENT, Plato TEXT NOT NULL, Precio REAL NOT NULL, Categoria TEXT NOT NULL, Imagen TEXT);
        CREATE TABLE Ventas (VentasId INTEGER PRIMARY KEY AUTOINCREMENT, Fecha TEXT NOT NULL, NTicket TEXT NOT NULL, Cliente TEXT NOT NULL, Monto REAL NOT NULL, FormaPago TEXT NOT NULL);
        CREATE TABLE Detalles (DetallesId INTEGER PRIMARY KEY AUTOINCREMENT, Fecha TEXT NOT NULL, NTicket TEXT NOT NULL, Plato TEXT NOT NULL, Precio REAL NOT NULL, Cantidad INTEGER NOT NULL, Categoria TEXT NOT NULL, Importe REAL NOT NULL);
        CREATE TABLE Comandas (ComandaId INTEGER PRIMARY KEY AUTOINCREMENT, Fecha TEXT NOT NULL, NTicket TEXT NOT NULL, Cliente TEXT NOT NULL, TipoServicio TEXT NOT NULL, Ubicacion TEXT NOT NULL, Estado TEXT NOT NULL, Monto REAL NOT NULL, FormaPago TEXT, Notas TEXT, HoraCreacion TEXT NOT NULL, HoraActualizacion TEXT);
      `);
      this.fallbackPlatos.forEach((p) => {
        tempDb.run('INSERT INTO Platos (Plato, Precio, Categoria, Imagen) VALUES (?, ?, ?, ?)', [p.Plato, p.Precio, p.Categoria, p.Imagen]);
      });
      this.fallbackVentas.forEach((v) => {
        tempDb.run('INSERT INTO Ventas (Fecha, NTicket, Cliente, Monto, FormaPago) VALUES (?, ?, ?, ?, ?)', [v.Fecha, v.NTicket, v.Cliente, v.Monto, v.FormaPago]);
      });
      this.fallbackDetalles.forEach((d) => {
        tempDb.run('INSERT INTO Detalles (Fecha, NTicket, Plato, Precio, Cantidad, Categoria, Importe) VALUES (?, ?, ?, ?, ?, ?, ?)', [d.Fecha, d.NTicket, d.Plato, d.Precio, d.Cantidad, d.Categoria, d.Importe]);
      });
      this.fallbackComandas.forEach((c) => {
        tempDb.run(
          'INSERT INTO Comandas (Fecha, NTicket, Cliente, TipoServicio, Ubicacion, Estado, Monto, FormaPago, Notas, HoraCreacion, HoraActualizacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [c.Fecha, c.NTicket, c.Cliente, c.TipoServicio, c.Ubicacion, c.Estado, c.Monto, c.FormaPago || null, c.Notas || '', c.HoraCreacion, c.HoraActualizacion || null]
        );
      });
      return tempDb.export();
    }
    throw new Error('No fue posible exportar la base de datos binaria.');
  }

  public downloadDatabaseFile(filename = 'TerrenoBroaster.db') {
    const binary = this.exportDatabase();
    const blob = new Blob([binary as unknown as BlobPart], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- RUN CUSTOM QUERY (NEVER THROWS "NO INICIALIZADA") ---
  public runCustomQuery(sql: string) {
    const cleanSql = sql.trim();

    if (this.db) {
      return this.db.exec(cleanSql);
    }

    const lower = cleanSql.toLowerCase();
    if (lower.startsWith('select')) {
      if (lower.includes('from platos')) {
        const rows = this.fallbackPlatos.map((p) => [p.ID, p.Plato, p.Precio, p.Categoria, p.Imagen]);
        return [{ columns: ['ID', 'Plato', 'Precio', 'Categoria', 'Imagen'], values: rows }];
      }
      if (lower.includes('from ventas')) {
        const rows = this.fallbackVentas.map((v) => [v.VentasId, v.Fecha, v.NTicket, v.Cliente, v.Monto, v.FormaPago]);
        return [{ columns: ['VentasId', 'Fecha', 'NTicket', 'Cliente', 'Monto', 'FormaPago'], values: rows }];
      }
      if (lower.includes('from detalles')) {
        const rows = this.fallbackDetalles.map((d) => [d.DetallesId, d.Fecha, d.NTicket, d.Plato, d.Precio, d.Cantidad, d.Categoria, d.Importe]);
        return [{ columns: ['DetallesId', 'Fecha', 'NTicket', 'Plato', 'Precio', 'Cantidad', 'Categoria', 'Importe'], values: rows }];
      }
      if (lower.includes('from comandas')) {
        const rows = this.fallbackComandas.map((c) => [c.ComandaId, c.Fecha, c.NTicket, c.Cliente, c.TipoServicio, c.Ubicacion, c.Estado, c.Monto, c.FormaPago, c.Notas, c.HoraCreacion, c.HoraActualizacion]);
        return [{ columns: ['ComandaId', 'Fecha', 'NTicket', 'Cliente', 'TipoServicio', 'Ubicacion', 'Estado', 'Monto', 'FormaPago', 'Notas', 'HoraCreacion', 'HoraActualizacion'], values: rows }];
      }
      if (lower.includes('from usuarios')) {
        const rows = this.fallbackUsuarios.map((u) => [u.Id || 1, u.Username, u.Role, u.FechaRegistro || '', u.UltimoAcceso || '']);
        return [{ columns: ['Id', 'Username', 'Role', 'FechaRegistro', 'UltimoAcceso'], values: rows }];
      }
    }

    return [{ columns: ['Resultado'], values: [['Consulta ejecutada en almacenamiento local']] }];
  }

  // --- USUARIOS & AUTENTICACIÓN ---
  public getUsuarios(): Usuario[] {
    if (!this.db) {
      return [...this.fallbackUsuarios];
    }
    try {
      const res = this.db.exec('SELECT Id, Username, Role, FechaRegistro, UltimoAcceso FROM Usuarios ORDER BY Id ASC');
      if (res.length === 0) return [...this.fallbackUsuarios];
      const cols = res[0].columns;
      return res[0].values.map((row) => {
        const item: any = {};
        cols.forEach((col, i) => { item[col] = row[i]; });
        return {
          Id: Number(item.Id),
          Username: String(item.Username),
          Role: (item.Role as any) || 'Administrador',
          FechaRegistro: String(item.FechaRegistro || ''),
          UltimoAcceso: item.UltimoAcceso ? String(item.UltimoAcceso) : undefined,
        };
      });
    } catch (e) {
      console.warn('Error reading Usuarios:', e);
      return [...this.fallbackUsuarios];
    }
  }

  public hasUsuarios(): boolean {
    const users = this.getUsuarios();
    return users.length > 0;
  }

  public createOrUpdateUsuario(
    username: string,
    password: string,
    role: 'Administrador' | 'Cajero' | 'Supervisor' = 'Administrador'
  ): { success: boolean; error?: string; user?: Usuario } {
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      return { success: false, error: 'El nombre de usuario es obligatorio' };
    }
    if (!cleanPass || cleanPass.length < 3) {
      return { success: false, error: 'La contraseña debe tener al menos 3 caracteres' };
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (this.db) {
      try {
        const checkStmt = this.db.prepare('SELECT Id FROM Usuarios WHERE LOWER(Username) = LOWER(?)');
        checkStmt.bind([cleanUser]);
        const exists = checkStmt.step();
        checkStmt.free();

        if (exists) {
          const updateStmt = this.db.prepare('UPDATE Usuarios SET Password = ?, Role = ?, UltimoAcceso = ? WHERE LOWER(Username) = LOWER(?)');
          updateStmt.run([cleanPass, role, now, cleanUser]);
          updateStmt.free();
        } else {
          const insertStmt = this.db.prepare('INSERT INTO Usuarios (Username, Password, Role, FechaRegistro, UltimoAcceso) VALUES (?, ?, ?, ?, ?)');
          insertStmt.run([cleanUser, cleanPass, role, now, now]);
          insertStmt.free();
        }

        const existingIdx = this.fallbackUsuarios.findIndex((u) => u.Username.toLowerCase() === cleanUser.toLowerCase());
        const userObj: Usuario = {
          Username: cleanUser,
          Role: role,
          FechaRegistro: now,
          UltimoAcceso: now,
        };
        if (existingIdx >= 0) {
          this.fallbackUsuarios[existingIdx] = { ...this.fallbackUsuarios[existingIdx], ...userObj, Password: cleanPass };
        } else {
          this.fallbackUsuarios.push({ ...userObj, Password: cleanPass });
        }

        this.notify();
        return { success: true, user: userObj };
      } catch (e: any) {
        console.error('Error in createOrUpdateUsuario:', e);
        return { success: false, error: e.message || 'Error al guardar usuario en base de datos' };
      }
    } else {
      const existingIdx = this.fallbackUsuarios.findIndex((u) => u.Username.toLowerCase() === cleanUser.toLowerCase());
      const userObj: Usuario = {
        Id: existingIdx >= 0 ? this.fallbackUsuarios[existingIdx].Id : this.fallbackUsuarios.length + 1,
        Username: cleanUser,
        Password: cleanPass,
        Role: role,
        FechaRegistro: now,
        UltimoAcceso: now,
      };
      if (existingIdx >= 0) {
        this.fallbackUsuarios[existingIdx] = userObj;
      } else {
        this.fallbackUsuarios.push(userObj);
      }
      this.notify();
      return { success: true, user: userObj };
    }
  }

  public validateUsuario(
    username: string,
    password: string
  ): { success: boolean; error?: string; user?: Usuario } {
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Por favor complete todos los campos' };
    }

    if (this.db) {
      try {
        const stmt = this.db.prepare('SELECT Id, Username, Password, Role, FechaRegistro FROM Usuarios WHERE LOWER(Username) = LOWER(?)');
        stmt.bind([cleanUser]);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          if (String(row.Password) === cleanPass) {
            const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
            try {
              const upd = this.db.prepare('UPDATE Usuarios SET UltimoAcceso = ? WHERE LOWER(Username) = LOWER(?)');
              upd.run([now, cleanUser]);
              upd.free();
              this.notify();
            } catch {}

            return {
              success: true,
              user: {
                Id: Number(row.Id),
                Username: String(row.Username),
                Role: (row.Role as any) || 'Administrador',
                FechaRegistro: String(row.FechaRegistro || ''),
                UltimoAcceso: now,
              },
            };
          } else {
            return { success: false, error: 'Contraseña incorrecta' };
          }
        } else {
          stmt.free();
          return { success: false, error: 'Usuario no encontrado' };
        }
      } catch (e: any) {
        console.error('validateUsuario error:', e);
      }
    }

    const found = this.fallbackUsuarios.find(
      (u) => u.Username.toLowerCase() === cleanUser.toLowerCase()
    );
    if (!found) {
      return { success: false, error: 'Usuario no encontrado' };
    }
    if (found.Password !== cleanPass) {
      return { success: false, error: 'Contraseña incorrecta' };
    }
    return {
      success: true,
      user: {
        Id: found.Id,
        Username: found.Username,
        Role: found.Role,
        FechaRegistro: found.FechaRegistro,
        UltimoAcceso: new Date().toISOString(),
      },
    };
  }

  // ==========================================
  // --- PEDIDOS WHATSAPP & INTEGRATION ---
  // ==========================================

  public getWhatsAppPhone(): string {
    const saved = localStorage.getItem('tb_whatsapp_phone');
    if (saved && saved.trim() !== '+58 412 876-5432') {
      return saved.trim();
    }
    return '';
  }

  public setWhatsAppPhone(phone: string): void {
    const clean = phone.trim();
    localStorage.setItem('tb_whatsapp_phone', clean);
    this.notify();
  }

  public getPedidosWhatsApp(estado?: EstadoPedidoWhatsApp): PedidoWhatsApp[] {
    if (!this.db) {
      let list = [...this.fallbackPedidosWhatsApp];
      if (estado) {
        list = list.filter((p) => p.Estado === estado);
      }
      return list.sort((a, b) => b.Id - a.Id);
    }

    try {
      let sql = 'SELECT Id, Fecha, TelefonoCliente, NombreCliente, TipoEntrega, DireccionEntrega, MensajeOriginal, ItemsJson, Total, FormaPago, Estado, NTicket, ComandaId, FechaCreacion, Notas FROM PedidosWhatsApp';
      const params: any[] = [];
      if (estado) {
        sql += ' WHERE Estado = ?';
        params.push(estado);
      }
      sql += ' ORDER BY Id DESC';

      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      const list: PedidoWhatsApp[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        let items: PedidoWhatsAppItem[] = [];
        try {
          items = JSON.parse(String(row.ItemsJson || '[]'));
        } catch {
          items = [];
        }

        list.push({
          Id: Number(row.Id),
          Fecha: String(row.Fecha || ''),
          TelefonoCliente: String(row.TelefonoCliente || ''),
          NombreCliente: String(row.NombreCliente || ''),
          TipoEntrega: (row.TipoEntrega as any) || 'Delivery',
          DireccionEntrega: row.DireccionEntrega ? String(row.DireccionEntrega) : undefined,
          MensajeOriginal: String(row.MensajeOriginal || ''),
          Items: items,
          Total: safeParsePrice(row.Total),
          FormaPago: (row.FormaPago as any) || 'Pago Movil',
          Estado: (row.Estado as EstadoPedidoWhatsApp) || 'Pendiente',
          NTicket: row.NTicket ? String(row.NTicket) : undefined,
          ComandaId: row.ComandaId ? Number(row.ComandaId) : undefined,
          FechaCreacion: String(row.FechaCreacion || ''),
          Notas: row.Notas ? String(row.Notas) : undefined,
        });
      }
      stmt.free();
      return list;
    } catch (e) {
      console.error('getPedidosWhatsApp db error:', e);
      let list = [...this.fallbackPedidosWhatsApp];
      if (estado) {
        list = list.filter((p) => p.Estado === estado);
      }
      return list.sort((a, b) => b.Id - a.Id);
    }
  }

  public addPedidoWhatsApp(pedidoData: Omit<PedidoWhatsApp, 'Id'>): PedidoWhatsApp {
    const cleanTotal = safeParsePrice(pedidoData.Total);
    const itemsJson = JSON.stringify(pedidoData.Items);

    if (this.db) {
      try {
        const stmt = this.db.prepare(
          'INSERT INTO PedidosWhatsApp (Fecha, TelefonoCliente, NombreCliente, TipoEntrega, DireccionEntrega, MensajeOriginal, ItemsJson, Total, FormaPago, Estado, NTicket, ComandaId, FechaCreacion, Notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        stmt.run([
          pedidoData.Fecha,
          pedidoData.TelefonoCliente,
          pedidoData.NombreCliente,
          pedidoData.TipoEntrega,
          pedidoData.DireccionEntrega || '',
          pedidoData.MensajeOriginal,
          itemsJson,
          cleanTotal,
          pedidoData.FormaPago,
          pedidoData.Estado,
          pedidoData.NTicket || null,
          pedidoData.ComandaId || null,
          pedidoData.FechaCreacion,
          pedidoData.Notas || '',
        ]);
        stmt.free();

        const lastIdRes = this.db.exec('SELECT last_insert_rowid()');
        const newId = Number(lastIdRes[0].values[0][0]);
        const created: PedidoWhatsApp = {
          ...pedidoData,
          Id: newId,
          Total: cleanTotal,
        };
        this.fallbackPedidosWhatsApp.unshift(created);
        this.notify();
        return created;
      } catch (e) {
        console.error('addPedidoWhatsApp db error:', e);
      }
    }

    const nextId = this.fallbackPedidosWhatsApp.length > 0
      ? Math.max(...this.fallbackPedidosWhatsApp.map((p) => p.Id)) + 1
      : 1;

    const created: PedidoWhatsApp = {
      ...pedidoData,
      Id: nextId,
      Total: cleanTotal,
    };
    this.fallbackPedidosWhatsApp.unshift(created);
    this.notify();
    return created;
  }

  public updatePedidoWhatsAppEstado(
    id: number,
    nuevoEstado: EstadoPedidoWhatsApp,
    nTicket?: string,
    comandaId?: number
  ): boolean {
    if (this.db) {
      try {
        const stmt = this.db.prepare(
          'UPDATE PedidosWhatsApp SET Estado = ?, NTicket = COALESCE(?, NTicket), ComandaId = COALESCE(?, ComandaId) WHERE Id = ?'
        );
        stmt.run([nuevoEstado, nTicket || null, comandaId || null, id]);
        stmt.free();
      } catch (e) {
        console.error('updatePedidoWhatsAppEstado db error:', e);
      }
    }

    const item = this.fallbackPedidosWhatsApp.find((p) => p.Id === id);
    if (item) {
      item.Estado = nuevoEstado;
      if (nTicket) item.NTicket = nTicket;
      if (comandaId) item.ComandaId = comandaId;
    }
    this.notify();
    return true;
  }

  public deletePedidoWhatsApp(id: number): boolean {
    if (this.db) {
      try {
        const stmt = this.db.prepare('DELETE FROM PedidosWhatsApp WHERE Id = ?');
        stmt.run([id]);
        stmt.free();
      } catch (e) {
        console.error('deletePedidoWhatsApp db error:', e);
      }
    }

    this.fallbackPedidosWhatsApp = this.fallbackPedidosWhatsApp.filter((p) => p.Id !== id);
    this.notify();
    return true;
  }

  /**
   * Converts a WhatsApp Order directly into an active Kitchen Comanda.
   */
  public convertWhatsAppPedidoToComanda(
    pedidoId: number
  ): { comanda: Comanda; nTicket: string } | null {
    const pedidos = this.getPedidosWhatsApp();
    const pedido = pedidos.find((p) => p.Id === pedidoId);
    if (!pedido) return null;

    const ticket = this.getNextTicketNumber();
    const platosDisponibles = this.getPlatos();

    // Map items to CartItem format
    const cartItems: CartItem[] = pedido.Items.map((waItem) => {
      // 1. Match by platoId if available
      let platoMatch = waItem.platoId
        ? platosDisponibles.find((p) => p.ID === waItem.platoId)
        : undefined;

      // 2. Match by exact plate name (case-insensitive)
      if (!platoMatch) {
        platoMatch = platosDisponibles.find(
          (p) => p.Plato.trim().toLowerCase() === waItem.platoNombre.trim().toLowerCase()
        );
      }

      // 3. Match by soft substring match
      if (!platoMatch) {
        const itemLower = waItem.platoNombre.trim().toLowerCase();
        platoMatch = platosDisponibles.find(
          (p) => p.Plato.toLowerCase().includes(itemLower) || itemLower.includes(p.Plato.toLowerCase())
        );
      }

      if (!platoMatch) {
        platoMatch = {
          ID: waItem.platoId || 9999,
          Plato: waItem.platoNombre,
          Precio: safeParsePrice(waItem.precioUnitario),
          Categoria: waItem.categoria || 'WhatsApp',
          Imagen: '',
        };
      }

      return {
        plato: platoMatch,
        cantidad: waItem.cantidad,
        nota: waItem.notas,
      };
    });

    const ubicacion =
      pedido.TipoEntrega === 'Delivery'
        ? `Delivery: ${pedido.DireccionEntrega || 'A convenir'}`
        : `Para Llevar #${ticket}`;

    const { comanda } = this.createComanda(
      {
        Fecha: pedido.Fecha,
        NTicket: ticket,
        Cliente: `${pedido.NombreCliente} (WA: ${pedido.TelefonoCliente})`,
        TipoServicio: pedido.TipoEntrega,
        Ubicacion: ubicacion,
        Estado: 'Cocina',
        Monto: pedido.Total,
        FormaPago: pedido.FormaPago,
        Notas: `[WhatsApp] ${pedido.Notas ? pedido.Notas + ' | ' : ''}Tlf: ${pedido.TelefonoCliente}`,
        HoraCreacion: pedido.FechaCreacion || new Date().toISOString().substring(11, 16),
      },
      cartItems
    );

    // Update WhatsApp order to En Cocina
    this.updatePedidoWhatsAppEstado(pedido.Id, 'En Cocina', ticket, comanda.ComandaId);
    this.notify();

    return { comanda, nTicket: ticket };
  }

  public resetToDefaults() {
    localStorage.removeItem('TerrenoBroaster_db_binary');
    localStorage.removeItem('tb_fallback_platos');
    localStorage.removeItem('tb_fallback_ventas');
    localStorage.removeItem('tb_fallback_detalles');
    localStorage.removeItem('tb_fallback_comandas');
    localStorage.removeItem('tb_fallback_usuarios');
    localStorage.removeItem('tb_fallback_pedidos_whatsapp');
    localStorage.removeItem('tb_whatsapp_phone');

    if (this.SQL) {
      this.db = new this.SQL.Database();
      this.createTablesIfNotExist();
      this.seedInitialData();
    }
    this.initDefaultFallback();
    this.notify();
  }
}


export const sqliteService = new SQLiteService();
