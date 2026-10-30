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
  Insumo,
  InsumoCategoria,
  UnidadMedida,
  RecetaItem,
  PlatoEscandallo,
  Proveedor,
  MovimientoInventario,
  TipoMovimientoInventario,
} from '../types';
import { DEFAULT_PLATOS, generateSeedSales, generateSeedComandas } from '../data/defaultData';
import { safeParsePrice } from '../utils/currency';
import { menuSyncService } from '../services/menuSyncService';
import { safeStorage } from '../utils/safeStorage';

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
  private fallbackInsumos: Insumo[] = [];
  private fallbackRecetas: RecetaItem[] = [];
  private fallbackProveedores: Proveedor[] = [];
  private fallbackMovimientos: MovimientoInventario[] = [];

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

  private syncToServerTimer: any = null;
  private localFileHandle: any = null;
  private linkedFileName: string | null = null;

  public isLocalFileLinked(): boolean {
    return !!this.localFileHandle;
  }

  public getLinkedFileName(): string | null {
    return this.linkedFileName;
  }

  /**
   * Prompts user to pick the local TerrenoBroaster.db file via File System Access API.
   * Once linked, every single change will write directly to their physical file on disk!
   */
  public async linkLocalDatabaseFile(): Promise<{ success: boolean; filename?: string; error?: string }> {
    // 1. If File System Access API is supported and we are not blocked by cross-origin iframe
    const canTryNativePicker =
      typeof window !== 'undefined' &&
      'showOpenFilePicker' in window &&
      typeof window.self !== 'undefined' &&
      typeof window.top !== 'undefined' &&
      window.self === window.top;

    if (canTryNativePicker) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Base de Datos SQLite (*.db)',
              accept: { 'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3'] },
            },
          ],
          multiple: false,
        });

        if (handle) {
          this.localFileHandle = handle;
          this.linkedFileName = handle.name;
          const file = await handle.getFile();
          await this.importDatabase(file);
          return { success: true, filename: handle.name };
        }
        return { success: false };
      } catch (err: any) {
        if (err.name === 'AbortError') return { success: false };
        console.warn('showOpenFilePicker failed, falling back to standard file input:', err);
      }
    }

    // 2. Universal standard fallback: HTML file input (works 100% inside iframes and cross-origin subframes)
    return this.promptImportDatabaseFile();
  }

  /**
   * Universal HTML5 File Picker that works without permission blocks in cross-origin iframes.
   */
  public async promptImportDatabaseFile(): Promise<{ success: boolean; filename?: string; error?: string }> {
    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        resolve({ success: false, error: 'Entorno sin DOM disponible.' });
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.db,.sqlite,.sqlite3';
      input.style.display = 'none';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve({ success: false });
          if (input.parentNode) document.body.removeChild(input);
          return;
        }

        try {
          await this.importDatabase(file);
          this.linkedFileName = file.name;
          this.notify();
          resolve({ success: true, filename: file.name });
        } catch (err: any) {
          console.error('Error importing selected database:', err);
          resolve({ success: false, error: `Error al leer ${file.name}: ${err?.message || err}` });
        } finally {
          if (input.parentNode) {
            document.body.removeChild(input);
          }
        }
      };

      input.oncancel = () => {
        resolve({ success: false });
        if (input.parentNode) {
          document.body.removeChild(input);
        }
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Directly writes the current database binary to the linked physical file on the user's hard drive.
   */
  public async saveToLinkedLocalFile(binary?: Uint8Array): Promise<boolean> {
    if (!this.localFileHandle) return false;
    try {
      const writable = await this.localFileHandle.createWritable();
      const data = binary || (this.db ? this.db.export() : this.exportDatabase());
      await writable.write(data);
      await writable.close();
      console.log(`[File System Access] Base de datos guardada en archivo local: ${this.linkedFileName}`);
      return true;
    } catch (e) {
      console.warn('Could not write to linked local file:', e);
      return false;
    }
  }

  public async uploadDatabaseToServer(binary?: Uint8Array): Promise<boolean> {
    try {
      const data = binary || (this.db ? this.db.export() : this.exportDatabase());
      if (!data || data.byteLength < 50) return false;

      // 1. If user linked a local file on their PC, auto-save straight to disk!
      this.saveToLinkedLocalFile(data);

      // 2. Upload raw binary to server (Fastest, zero base64 memory overhead)
      try {
        const binRes = await fetch('/api/database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: new Blob([data.buffer as ArrayBuffer]),
        });
        if (binRes.ok) {
          console.log(`[SQLite] Base de datos binaria guardada en servidor (${data.byteLength} bytes)`);
          return true;
        }
      } catch {
        // Fallback to base64 below
      }

      // 3. Fallback to base64 JSON upload
      let binaryStr = '';
      const len = data.byteLength;
      const chunkSize = 8192;
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = data.subarray(i, Math.min(i + chunkSize, len));
        binaryStr += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binaryStr);
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64 }),
      });
      if (res.ok) {
        console.log(`[SQLite] Base de datos guardada en servidor vía base64 (${data.byteLength} bytes)`);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Could not upload database to server:', e);
      return false;
    }
  }

  public scheduleServerDbSync() {
    if (this.syncToServerTimer) {
      clearTimeout(this.syncToServerTimer);
    }
    this.syncToServerTimer = setTimeout(() => {
      this.uploadDatabaseToServer();
    }, 350);
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

      // 1. Check if the server already has the permanent TerrenoBroaster.db
      let loadedFromServer = false;
      try {
        const dbRes = await fetch('/api/database', { cache: 'no-store' });
        if (dbRes.ok) {
          const ab = await dbRes.arrayBuffer();
          if (ab && ab.byteLength > 100) {
            this.db = new this.SQL.Database(new Uint8Array(ab));
            loadedFromServer = true;
            console.log(`[SQLite] Loaded master database from server (${ab.byteLength} bytes)`);
          }
        }
      } catch (e) {
        console.warn('Could not fetch database from server, trying local storage:', e);
      }

      // 2. If not on server, check local browser storage
      if (!loadedFromServer) {
        const savedDb = safeStorage.getItem('TerrenoBroaster_db_binary');
        if (savedDb) {
          try {
            const binary = Uint8Array.from(atob(savedDb), (c) => c.charCodeAt(0));
            this.db = new this.SQL.Database(binary);
            // Sync to server so all devices have it
            this.uploadDatabaseToServer(binary);
          } catch (e) {
            console.warn('Failed restoring saved SQLite binary, starting fresh:', e);
            this.db = new this.SQL.Database();
          }
        } else {
          this.db = new this.SQL.Database();
        }
      }

      this.createTablesIfNotExist();
      this.seedAdminUserIfNotExist();
      this.seedInitialInventoryIfEmpty();

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

    // TABLA: Insumos (Materia prima, ingredientes y productos de venta directa)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS Insumos (
        InsumoId INTEGER PRIMARY KEY AUTOINCREMENT,
        Nombre TEXT NOT NULL,
        Categoria TEXT NOT NULL,
        UnidadMedida TEXT NOT NULL,
        StockActual REAL NOT NULL DEFAULT 0,
        StockMinimo REAL NOT NULL DEFAULT 0,
        CostoUnitario REAL NOT NULL DEFAULT 0,
        ProveedorId INTEGER,
        EsVentaDirecta INTEGER DEFAULT 0,
        PlatoId INTEGER,
        UltimaActualizacion TEXT
      );
    `);

    // TABLA: Recetas (Escandallo de ingredientes por cada plato)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS Recetas (
        RecetaId INTEGER PRIMARY KEY AUTOINCREMENT,
        PlatoId INTEGER NOT NULL,
        InsumoId INTEGER NOT NULL,
        Cantidad REAL NOT NULL,
        UnidadMedida TEXT NOT NULL,
        Notas TEXT
      );
    `);

    // TABLA: Proveedores (Directorio de proveedores y contactos)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS Proveedores (
        ProveedorId INTEGER PRIMARY KEY AUTOINCREMENT,
        Nombre TEXT NOT NULL,
        Rif TEXT,
        Telefono TEXT,
        Email TEXT,
        Contacto TEXT,
        Direccion TEXT,
        CategoriasSuministro TEXT,
        DiasEntrega TEXT,
        Notas TEXT
      );
    `);

    // TABLA: MovimientosInventario (Kardex de trazabilidad: compras, ventas, mermas, ajustes)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS MovimientosInventario (
        MovimientoId INTEGER PRIMARY KEY AUTOINCREMENT,
        Fecha TEXT NOT NULL,
        InsumoId INTEGER NOT NULL,
        Tipo TEXT NOT NULL,
        Cantidad REAL NOT NULL,
        StockAnterior REAL NOT NULL,
        StockNuevo REAL NOT NULL,
        Referencia TEXT,
        Usuario TEXT,
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

  private seedAdminUserIfNotExist() {
    if (!this.db) return;
    try {
      const uRes = this.db.exec("SELECT COUNT(*) FROM Usuarios WHERE Username = 'admin'");
      const uCount = uRes.length > 0 && uRes[0].values[0] ? Number(uRes[0].values[0][0]) : 0;
      if (uCount === 0) {
        const now = new Date().toISOString().substring(0, 10);
        this.db.run(
          "INSERT INTO Usuarios (Username, Password, Role, FechaRegistro) VALUES ('admin', 'admin123', 'admin', ?)",
          [now]
        );
      }
    } catch {
      // ignore
    }
  }

  private seedInitialData() {
    this.seedAdminUserIfNotExist();
    this.seedInitialInventoryIfEmpty();
  }

  private seedWhatsAppOrders() {
    // No mock WhatsApp orders
  }

  private setupFallback() {
    const storedPlatos = safeStorage.getItem('tb_fallback_platos');
    const storedVentas = safeStorage.getItem('tb_fallback_ventas');
    const storedDetalles = safeStorage.getItem('tb_fallback_detalles');
    const storedComandas = safeStorage.getItem('tb_fallback_comandas');
    const storedUsuarios = safeStorage.getItem('tb_fallback_usuarios');
    const storedPedidosWA = safeStorage.getItem('tb_fallback_pedidos_whatsapp');

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
          this.fallbackComandas = [];
        }
        if (storedUsuarios) {
          this.fallbackUsuarios = JSON.parse(storedUsuarios);
        }
        if (storedPedidosWA) {
          this.fallbackPedidosWhatsApp = JSON.parse(storedPedidosWA);
        } else {
          this.fallbackPedidosWhatsApp = [];
        }
      } catch {
        this.initDefaultFallback();
      }
    } else {
      this.initDefaultFallback();
    }
  }

  private initDefaultFallback() {
    this.fallbackPlatos = [];
    this.fallbackVentas = [];
    this.fallbackDetalles = [];
    this.fallbackComandas = [];
    this.fallbackPedidosWhatsApp = [];
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
        safeStorage.setItem('TerrenoBroaster_db_binary', btoa(binaryStr));
        // Auto-persist binary directly to the server SQLite database file
        this.scheduleServerDbSync();
      } catch (e) {
        console.warn('LocalStorage save limit for SQLite binary:', e);
      }
    }

    safeStorage.setItem('tb_fallback_platos', JSON.stringify(this.fallbackPlatos));
    safeStorage.setItem('tb_fallback_ventas', JSON.stringify(this.fallbackVentas));
    safeStorage.setItem('tb_fallback_detalles', JSON.stringify(this.fallbackDetalles));
    safeStorage.setItem('tb_fallback_comandas', JSON.stringify(this.fallbackComandas));
    safeStorage.setItem('tb_fallback_usuarios', JSON.stringify(this.fallbackUsuarios));
    safeStorage.setItem('tb_fallback_pedidos_whatsapp', JSON.stringify(this.fallbackPedidosWhatsApp));
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

    let created: Plato;
    if (this.db) {
      const stmt = this.db.prepare('INSERT INTO Platos (Plato, Precio, Categoria, Imagen) VALUES (?, ?, ?, ?)');
      stmt.run([plato.Plato, cleanPrice, plato.Categoria, plato.Imagen || '']);
      stmt.free();

      const lastIdRes = this.db.exec('SELECT last_insert_rowid()');
      const newId = Number(lastIdRes[0].values[0][0]);
      
      created = { ID: newId, Plato: plato.Plato, Precio: cleanPrice, Categoria: plato.Categoria, Imagen: plato.Imagen };
      this.fallbackPlatos.push(created);
    } else {
      const newId = this.fallbackPlatos.length > 0 ? Math.max(...this.fallbackPlatos.map((p) => p.ID)) + 1 : 1;
      created = { ID: newId, Plato: plato.Plato, Precio: cleanPrice, Categoria: plato.Categoria, Imagen: plato.Imagen };
      this.fallbackPlatos.push(created);
    }
    this.notify();
    this.uploadDatabaseToServer();
    return created;
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
    this.uploadDatabaseToServer();
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
    this.uploadDatabaseToServer();
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
    const nowD = new Date();
    const localTimeDefault = `${String(nowD.getHours()).padStart(2, '0')}:${String(nowD.getMinutes()).padStart(2, '0')}:${String(nowD.getSeconds()).padStart(2, '0')}`;
    const timeOnly = comandaData.HoraCreacion || localTimeDefault;

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
        this.descontarInventarioPorItems(cartItems, comandaData.NTicket);
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

    // Bidirectional Sync: Keep PedidosWhatsApp in sync with Kitchen & POS Comandas
    let waEstado: EstadoPedidoWhatsApp = 'En Cocina';
    if (nuevoEstado === 'Cocina') waEstado = 'En Cocina';
    else if (nuevoEstado === 'Entregado') waEstado = 'Entregado';
    else if (nuevoEstado === 'Cobrado') waEstado = 'Cobrado';
    else if (nuevoEstado === 'Anulado') waEstado = 'Anulado';

    if (this.db) {
      try {
        const stmtWa = this.db.prepare('UPDATE PedidosWhatsApp SET Estado = ? WHERE NTicket = ?');
        stmtWa.run([waEstado, nTicket]);
        stmtWa.free();
      } catch (err) {
        console.error('Error syncing comanda status to PedidosWhatsApp:', err);
      }
    }

    const matchedWa = this.fallbackPedidosWhatsApp.filter((p) => p.NTicket === nTicket);
    matchedWa.forEach((p) => {
      p.Estado = waEstado;
    });

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

      try {
        const stmtWa = this.db.prepare('UPDATE PedidosWhatsApp SET Estado = "Anulado" WHERE NTicket = ?');
        stmtWa.run([nTicket]);
        stmtWa.free();
      } catch (err) {
        console.error('Error syncing anularComanda to PedidosWhatsApp:', err);
      }
    }

    const idx = this.fallbackComandas.findIndex((c) => c.NTicket === nTicket);
    if (idx !== -1) {
      this.fallbackComandas[idx].Estado = 'Anulado';
      this.fallbackComandas[idx].HoraActualizacion = nowTime;
      this.fallbackComandas[idx].Notas = this.fallbackComandas[idx].Notas
        ? `${this.fallbackComandas[idx].Notas} | ${motivoText}`
        : motivoText;
    }

    const matchedWa = this.fallbackPedidosWhatsApp.filter((p) => p.NTicket === nTicket);
    matchedWa.forEach((p) => {
      p.Estado = 'Anulado';
    });

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

        // If sale ticket belongs to a WhatsApp order, mark WhatsApp order as 'Cobrado'
        try {
          const stmtWa = activeDb.prepare('UPDATE PedidosWhatsApp SET Estado = "Cobrado" WHERE NTicket = ?');
          stmtWa.run([ventaData.NTicket]);
          stmtWa.free();
        } catch {}
        const waMatch = this.fallbackPedidosWhatsApp.find((p) => p.NTicket === ventaData.NTicket);
        if (waMatch) {
          waMatch.Estado = 'Cobrado';
        }

        this.descontarInventarioPorItems(cartItems, ventaData.NTicket);
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

      const waMatch = this.fallbackPedidosWhatsApp.find((p) => p.NTicket === ventaData.NTicket);
      if (waMatch) {
        waMatch.Estado = 'Cobrado';
      }

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
    this.seedAdminUserIfNotExist();
    this.seedInitialInventoryIfEmpty();

    this.syncFallbackFromDb();

    // Upload database binary to server so it is permanently saved in .data/TerrenoBroaster.db
    await this.uploadDatabaseToServer(binary);

    const res = this.db.exec('SELECT COUNT(*) FROM Platos');
    const platosCount = res.length > 0 && res[0].values[0] ? Number(res[0].values[0][0]) : 0;

    const platosList = this.getPlatos();
    const phone = this.getWhatsAppPhone();
    if (platosList.length > 0) {
      await menuSyncService.pushMenuToServer(platosList, phone, true);
    }

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
    const saved = safeStorage.getItem('tb_whatsapp_phone');
    if (saved && saved.trim() !== '+58 412 876-5432') {
      return saved.trim();
    }
    return '';
  }

  public setWhatsAppPhone(phone: string): void {
    const clean = phone.trim();
    safeStorage.setItem('tb_whatsapp_phone', clean);
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

    // Bidirectional sync: if this WhatsApp order has a linked NTicket or ComandaId, update the Comanda as well!
    const targetTicket = nTicket || (item ? item.NTicket : undefined);
    if (targetTicket) {
      const nowTime = new Date().toISOString().substring(11, 16);
      if (nuevoEstado === 'En Cocina') {
        if (this.db) {
          const stmtC = this.db.prepare('UPDATE Comandas SET Estado = "Cocina", HoraActualizacion = ? WHERE NTicket = ?');
          stmtC.run([nowTime, targetTicket]);
          stmtC.free();
        }
        const cIdx = this.fallbackComandas.findIndex((c) => c.NTicket === targetTicket);
        if (cIdx !== -1) {
          this.fallbackComandas[cIdx].Estado = 'Cocina';
          this.fallbackComandas[cIdx].HoraActualizacion = nowTime;
        }
      } else if (nuevoEstado === 'Entregado') {
        if (this.db) {
          const stmtC = this.db.prepare('UPDATE Comandas SET Estado = "Entregado", HoraActualizacion = ? WHERE NTicket = ?');
          stmtC.run([nowTime, targetTicket]);
          stmtC.free();
        }
        const cIdx = this.fallbackComandas.findIndex((c) => c.NTicket === targetTicket);
        if (cIdx !== -1) {
          this.fallbackComandas[cIdx].Estado = 'Entregado';
          this.fallbackComandas[cIdx].HoraActualizacion = nowTime;
        }
      } else if (nuevoEstado === 'Cobrado') {
        const fp = item ? item.FormaPago : 'Efectivo';
        if (this.db) {
          const stmtC = this.db.prepare('UPDATE Comandas SET Estado = "Cobrado", FormaPago = ?, HoraActualizacion = ? WHERE NTicket = ?');
          stmtC.run([fp, nowTime, targetTicket]);
          stmtC.free();

          const comanda = this.getComandaByTicket(targetTicket);
          if (comanda) {
            const existsVenta = this.db.exec(`SELECT COUNT(*) FROM Ventas WHERE NTicket = '${targetTicket}'`);
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
        const cIdx = this.fallbackComandas.findIndex((c) => c.NTicket === targetTicket);
        if (cIdx !== -1) {
          this.fallbackComandas[cIdx].Estado = 'Cobrado';
          this.fallbackComandas[cIdx].FormaPago = fp;
          this.fallbackComandas[cIdx].HoraActualizacion = nowTime;
          const exists = this.fallbackVentas.some((v) => v.NTicket === targetTicket);
          if (!exists) {
            this.fallbackVentas.push({
              VentasId: this.fallbackVentas.length + 1,
              Fecha: this.fallbackComandas[cIdx].Fecha,
              NTicket: targetTicket,
              Cliente: this.fallbackComandas[cIdx].Cliente,
              Monto: this.fallbackComandas[cIdx].Monto,
              FormaPago: fp,
            });
          }
        }
      } else if (nuevoEstado === 'Anulado' || nuevoEstado === 'Cancelado') {
        const motivo = 'Anulado desde pedidos WhatsApp';
        if (this.db) {
          const stmtC = this.db.prepare(
            'UPDATE Comandas SET Estado = "Anulado", Notas = CASE WHEN Notas IS NULL OR Notas = "" THEN ? ELSE Notas || " | " || ? END, HoraActualizacion = ? WHERE NTicket = ?'
          );
          stmtC.run([motivo, motivo, nowTime, targetTicket]);
          stmtC.free();
        }
        const cIdx = this.fallbackComandas.findIndex((c) => c.NTicket === targetTicket);
        if (cIdx !== -1) {
          this.fallbackComandas[cIdx].Estado = 'Anulado';
          this.fallbackComandas[cIdx].HoraActualizacion = nowTime;
          this.fallbackComandas[cIdx].Notas = this.fallbackComandas[cIdx].Notas ? `${this.fallbackComandas[cIdx].Notas} | ${motivo}` : motivo;
        }
      }
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

  // ==========================================
  // --- SISTEMA DE INVENTARIO & MATERIA PRIMA ---
  // ==========================================

  public getInsumos(): Insumo[] {
    if (!this.db) {
      return [...this.fallbackInsumos];
    }
    try {
      const res = this.db.exec(`
        SELECT i.InsumoId, i.Nombre, i.Categoria, i.UnidadMedida, i.StockActual, i.StockMinimo, i.CostoUnitario, i.ProveedorId, i.EsVentaDirecta, i.PlatoId, i.UltimaActualizacion, p.Nombre as ProveedorNombre
        FROM Insumos i
        LEFT JOIN Proveedores p ON i.ProveedorId = p.ProveedorId
        ORDER BY i.Categoria ASC, i.Nombre ASC
      `);
      if (res.length === 0 || !res[0].values) return [...this.fallbackInsumos];
      const cols = res[0].columns;
      return res[0].values.map((row) => {
        const item: any = {};
        cols.forEach((c, idx) => { item[c] = row[idx]; });
        return {
          InsumoId: Number(item.InsumoId),
          Nombre: String(item.Nombre),
          Categoria: item.Categoria as InsumoCategoria,
          UnidadMedida: item.UnidadMedida as UnidadMedida,
          StockActual: Number(item.StockActual) || 0,
          StockMinimo: Number(item.StockMinimo) || 0,
          CostoUnitario: Number(item.CostoUnitario) || 0,
          ProveedorId: item.ProveedorId ? Number(item.ProveedorId) : undefined,
          ProveedorNombre: item.ProveedorNombre ? String(item.ProveedorNombre) : undefined,
          EsVentaDirecta: Boolean(item.EsVentaDirecta),
          PlatoId: item.PlatoId ? Number(item.PlatoId) : undefined,
          UltimaActualizacion: item.UltimaActualizacion ? String(item.UltimaActualizacion) : undefined,
        };
      });
    } catch (e) {
      console.warn('getInsumos error:', e);
      return [...this.fallbackInsumos];
    }
  }

  public addInsumo(data: Omit<Insumo, 'InsumoId'>): Insumo {
    const now = new Date().toISOString().substring(0, 10);
    const cleanStock = Number(data.StockActual) || 0;
    const cleanMin = Number(data.StockMinimo) || 0;
    const cleanCost = safeParsePrice(data.CostoUnitario);

    if (this.db) {
      const stmt = this.db.prepare(
        'INSERT INTO Insumos (Nombre, Categoria, UnidadMedida, StockActual, StockMinimo, CostoUnitario, ProveedorId, EsVentaDirecta, PlatoId, UltimaActualizacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      stmt.run([
        data.Nombre.trim(),
        data.Categoria,
        data.UnidadMedida,
        cleanStock,
        cleanMin,
        cleanCost,
        data.ProveedorId || null,
        data.EsVentaDirecta ? 1 : 0,
        data.PlatoId || null,
        now,
      ]);
      stmt.free();

      const lastIdRes = this.db.exec('SELECT last_insert_rowid()');
      const newId = Number(lastIdRes[0].values[0][0]);

      // If initial stock > 0, log initial movement
      if (cleanStock > 0) {
        this.registrarMovimiento({
          Fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
          InsumoId: newId,
          Tipo: 'Entrada_Compra',
          Cantidad: cleanStock,
          StockAnterior: 0,
          StockNuevo: cleanStock,
          Referencia: 'Inventario Inicial',
          Usuario: 'Admin',
          Notas: 'Carga inicial de insumo',
        });
      }

      const created: Insumo = {
        InsumoId: newId,
        Nombre: data.Nombre.trim(),
        Categoria: data.Categoria,
        UnidadMedida: data.UnidadMedida,
        StockActual: cleanStock,
        StockMinimo: cleanMin,
        CostoUnitario: cleanCost,
        ProveedorId: data.ProveedorId,
        EsVentaDirecta: data.EsVentaDirecta,
        PlatoId: data.PlatoId,
        UltimaActualizacion: now,
      };

      this.fallbackInsumos.push(created);
      this.notify();
      this.uploadDatabaseToServer();
      return created;
    } else {
      const newId = this.fallbackInsumos.length > 0 ? Math.max(...this.fallbackInsumos.map((i) => i.InsumoId)) + 1 : 1;
      const created: Insumo = {
        InsumoId: newId,
        Nombre: data.Nombre.trim(),
        Categoria: data.Categoria,
        UnidadMedida: data.UnidadMedida,
        StockActual: cleanStock,
        StockMinimo: cleanMin,
        CostoUnitario: cleanCost,
        ProveedorId: data.ProveedorId,
        EsVentaDirecta: data.EsVentaDirecta,
        PlatoId: data.PlatoId,
        UltimaActualizacion: now,
      };
      this.fallbackInsumos.push(created);
      this.notify();
      this.uploadDatabaseToServer();
      return created;
    }
  }

  public updateInsumo(insumo: Insumo): boolean {
    const now = new Date().toISOString().substring(0, 10);
    const cleanCost = safeParsePrice(insumo.CostoUnitario);
    const cleanStock = Number(insumo.StockActual) || 0;
    const cleanMin = Number(insumo.StockMinimo) || 0;

    if (this.db) {
      const stmt = this.db.prepare(
        'UPDATE Insumos SET Nombre = ?, Categoria = ?, UnidadMedida = ?, StockActual = ?, StockMinimo = ?, CostoUnitario = ?, ProveedorId = ?, EsVentaDirecta = ?, PlatoId = ?, UltimaActualizacion = ? WHERE InsumoId = ?'
      );
      stmt.run([
        insumo.Nombre.trim(),
        insumo.Categoria,
        insumo.UnidadMedida,
        cleanStock,
        cleanMin,
        cleanCost,
        insumo.ProveedorId || null,
        insumo.EsVentaDirecta ? 1 : 0,
        insumo.PlatoId || null,
        now,
        insumo.InsumoId,
      ]);
      stmt.free();
    }

    const idx = this.fallbackInsumos.findIndex((i) => i.InsumoId === insumo.InsumoId);
    if (idx !== -1) {
      this.fallbackInsumos[idx] = { ...insumo, CostoUnitario: cleanCost, StockActual: cleanStock, StockMinimo: cleanMin, UltimaActualizacion: now };
    }

    this.notify();
    this.uploadDatabaseToServer();
    return true;
  }

  public deleteInsumo(insumoId: number): boolean {
    if (this.db) {
      this.db.run(`DELETE FROM Recetas WHERE InsumoId = ${insumoId}`);
      this.db.run(`DELETE FROM Insumos WHERE InsumoId = ${insumoId}`);
    }
    this.fallbackInsumos = this.fallbackInsumos.filter((i) => i.InsumoId !== insumoId);
    this.fallbackRecetas = this.fallbackRecetas.filter((r) => r.InsumoId !== insumoId);
    this.notify();
    this.uploadDatabaseToServer();
    return true;
  }

  public ajustarStockInsumo(
    insumoId: number,
    cantidad: number,
    tipo: TipoMovimientoInventario,
    referencia?: string,
    usuario?: string,
    notas?: string
  ): boolean {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let prevStock = 0;

    if (this.db) {
      const res = this.db.exec(`SELECT StockActual FROM Insumos WHERE InsumoId = ${insumoId}`);
      if (res.length > 0 && res[0].values.length > 0) {
        prevStock = Number(res[0].values[0][0]) || 0;
      }
    } else {
      const found = this.fallbackInsumos.find((i) => i.InsumoId === insumoId);
      if (found) prevStock = found.StockActual;
    }

    let nuevoStock = prevStock;
    if (tipo === 'Entrada_Compra') {
      nuevoStock = Number((prevStock + Math.abs(cantidad)).toFixed(3));
    } else if (tipo === 'Salida_Venta' || tipo === 'Merma_Desperdicio') {
      nuevoStock = Math.max(0, Number((prevStock - Math.abs(cantidad)).toFixed(3)));
    } else if (tipo === 'Ajuste_Manual') {
      nuevoStock = Math.max(0, Number(cantidad.toFixed(3)));
    }

    if (this.db) {
      this.db.run(`UPDATE Insumos SET StockActual = ?, UltimaActualizacion = ? WHERE InsumoId = ?`, [
        nuevoStock,
        now.substring(0, 10),
        insumoId,
      ]);
    }

    const idx = this.fallbackInsumos.findIndex((i) => i.InsumoId === insumoId);
    if (idx !== -1) {
      this.fallbackInsumos[idx].StockActual = nuevoStock;
      this.fallbackInsumos[idx].UltimaActualizacion = now.substring(0, 10);
    }

    this.registrarMovimiento({
      Fecha: now,
      InsumoId: insumoId,
      Tipo: tipo,
      Cantidad: tipo === 'Ajuste_Manual' ? Number((nuevoStock - prevStock).toFixed(3)) : cantidad,
      StockAnterior: prevStock,
      StockNuevo: nuevoStock,
      Referencia: referencia || 'Ajuste de Almacén',
      Usuario: usuario || 'Cajero/Admin',
      Notas: notas || '',
    });

    this.notify();
    this.uploadDatabaseToServer();
    return true;
  }

  // ==========================================
  // --- PROVEEDORES ---
  // ==========================================

  public getProveedores(): Proveedor[] {
    if (!this.db) {
      return [...this.fallbackProveedores];
    }
    try {
      const res = this.db.exec('SELECT * FROM Proveedores ORDER BY Nombre ASC');
      if (res.length === 0 || !res[0].values) return [...this.fallbackProveedores];
      const cols = res[0].columns;
      return res[0].values.map((row) => {
        const item: any = {};
        cols.forEach((c, idx) => { item[c] = row[idx]; });
        return {
          ProveedorId: Number(item.ProveedorId),
          Nombre: String(item.Nombre),
          Rif: item.Rif ? String(item.Rif) : undefined,
          Telefono: item.Telefono ? String(item.Telefono) : undefined,
          Email: item.Email ? String(item.Email) : undefined,
          Contacto: item.Contacto ? String(item.Contacto) : undefined,
          Direccion: item.Direccion ? String(item.Direccion) : undefined,
          CategoriasSuministro: item.CategoriasSuministro ? String(item.CategoriasSuministro) : undefined,
          DiasEntrega: item.DiasEntrega ? String(item.DiasEntrega) : undefined,
          Notas: item.Notas ? String(item.Notas) : undefined,
        };
      });
    } catch (e) {
      console.warn('getProveedores error:', e);
      return [...this.fallbackProveedores];
    }
  }

  public addProveedor(p: Omit<Proveedor, 'ProveedorId'>): Proveedor {
    if (this.db) {
      const stmt = this.db.prepare(
        'INSERT INTO Proveedores (Nombre, Rif, Telefono, Email, Contacto, Direccion, CategoriasSuministro, DiasEntrega, Notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      stmt.run([
        p.Nombre.trim(),
        p.Rif ? p.Rif.trim() : null,
        p.Telefono ? p.Telefono.trim() : null,
        p.Email ? p.Email.trim() : null,
        p.Contacto ? p.Contacto.trim() : null,
        p.Direccion ? p.Direccion.trim() : null,
        p.CategoriasSuministro ? p.CategoriasSuministro.trim() : null,
        p.DiasEntrega ? p.DiasEntrega.trim() : null,
        p.Notas ? p.Notas.trim() : null,
      ]);
      stmt.free();

      const lastIdRes = this.db.exec('SELECT last_insert_rowid()');
      const newId = Number(lastIdRes[0].values[0][0]);
      const created: Proveedor = { ProveedorId: newId, ...p };
      this.fallbackProveedores.push(created);
      this.notify();
      this.uploadDatabaseToServer();
      return created;
    } else {
      const newId = this.fallbackProveedores.length > 0 ? Math.max(...this.fallbackProveedores.map((pr) => pr.ProveedorId)) + 1 : 1;
      const created: Proveedor = { ProveedorId: newId, ...p };
      this.fallbackProveedores.push(created);
      this.notify();
      this.uploadDatabaseToServer();
      return created;
    }
  }

  public updateProveedor(p: Proveedor): boolean {
    if (this.db) {
      const stmt = this.db.prepare(
        'UPDATE Proveedores SET Nombre = ?, Rif = ?, Telefono = ?, Email = ?, Contacto = ?, Direccion = ?, CategoriasSuministro = ?, DiasEntrega = ?, Notas = ? WHERE ProveedorId = ?'
      );
      stmt.run([
        p.Nombre.trim(),
        p.Rif ? p.Rif.trim() : null,
        p.Telefono ? p.Telefono.trim() : null,
        p.Email ? p.Email.trim() : null,
        p.Contacto ? p.Contacto.trim() : null,
        p.Direccion ? p.Direccion.trim() : null,
        p.CategoriasSuministro ? p.CategoriasSuministro.trim() : null,
        p.DiasEntrega ? p.DiasEntrega.trim() : null,
        p.Notas ? p.Notas.trim() : null,
        p.ProveedorId,
      ]);
      stmt.free();
    }
    const idx = this.fallbackProveedores.findIndex((pr) => pr.ProveedorId === p.ProveedorId);
    if (idx !== -1) {
      this.fallbackProveedores[idx] = { ...p };
    }
    this.notify();
    this.uploadDatabaseToServer();
    return true;
  }

  public deleteProveedor(proveedorId: number): boolean {
    if (this.db) {
      this.db.run(`UPDATE Insumos SET ProveedorId = NULL WHERE ProveedorId = ${proveedorId}`);
      this.db.run(`DELETE FROM Proveedores WHERE ProveedorId = ${proveedorId}`);
    }
    this.fallbackProveedores = this.fallbackProveedores.filter((pr) => pr.ProveedorId !== proveedorId);
    this.notify();
    this.uploadDatabaseToServer();
    return true;
  }

  // ==========================================
  // --- RECETAS & ESCANDALLOS ---
  // ==========================================

  public getRecetas(): RecetaItem[] {
    if (!this.db) {
      return [...this.fallbackRecetas];
    }
    try {
      const res = this.db.exec(`
        SELECT r.RecetaId, r.PlatoId, r.InsumoId, r.Cantidad, r.UnidadMedida, r.Notas, i.Nombre as InsumoNombre, i.Categoria as InsumoCategoria, i.CostoUnitario as CostoUnitarioInsumo
        FROM Recetas r
        JOIN Insumos i ON r.InsumoId = i.InsumoId
        ORDER BY r.PlatoId ASC, r.RecetaId ASC
      `);
      if (res.length === 0 || !res[0].values) return [...this.fallbackRecetas];
      const cols = res[0].columns;
      return res[0].values.map((row) => {
        const item: any = {};
        cols.forEach((c, idx) => { item[c] = row[idx]; });
        const qty = Number(item.Cantidad) || 0;
        const unitCost = Number(item.CostoUnitarioInsumo) || 0;
        return {
          RecetaId: Number(item.RecetaId),
          PlatoId: Number(item.PlatoId),
          InsumoId: Number(item.InsumoId),
          Cantidad: qty,
          UnidadMedida: item.UnidadMedida as UnidadMedida,
          Notas: item.Notas ? String(item.Notas) : undefined,
          InsumoNombre: item.InsumoNombre ? String(item.InsumoNombre) : undefined,
          InsumoCategoria: item.InsumoCategoria as InsumoCategoria,
          CostoUnitarioInsumo: unitCost,
          CostoPorPorcion: Number((qty * unitCost).toFixed(2)),
        };
      });
    } catch (e) {
      console.warn('getRecetas error:', e);
      return [...this.fallbackRecetas];
    }
  }

  public getRecetaByPlato(platoId: number): RecetaItem[] {
    return this.getRecetas().filter((r) => r.PlatoId === platoId);
  }

  public setRecetaForPlato(
    platoId: number,
    items: Array<RecetaItem | { insumoId: number; cantidad: number; unidadMedida: UnidadMedida; notas?: string }>
  ): boolean {
    const normalized = items.map((it: any) => ({
      insumoId: Number(it.insumoId || it.InsumoId),
      cantidad: Number(it.cantidad ?? it.Cantidad ?? 0),
      unidadMedida: (it.unidadMedida || it.UnidadMedida || 'unidad') as UnidadMedida,
      notas: it.notas || it.Notas || '',
    }));

    if (this.db) {
      this.db.run(`DELETE FROM Recetas WHERE PlatoId = ${platoId}`);
      const stmt = this.db.prepare('INSERT INTO Recetas (PlatoId, InsumoId, Cantidad, UnidadMedida, Notas) VALUES (?, ?, ?, ?, ?)');
      normalized.forEach((it) => {
        if (it.insumoId && it.cantidad > 0) {
          stmt.run([platoId, it.insumoId, Number(it.cantidad), it.unidadMedida, it.notas || null]);
        }
      });
      stmt.free();
    }

    this.fallbackRecetas = this.fallbackRecetas.filter((r) => r.PlatoId !== platoId);
    normalized.forEach((it, idx) => {
      if (it.insumoId && it.cantidad > 0) {
        this.fallbackRecetas.push({
          RecetaId: Date.now() + idx,
          PlatoId: platoId,
          InsumoId: it.insumoId,
          Cantidad: Number(it.cantidad),
          UnidadMedida: it.unidadMedida,
          Notas: it.notas,
        });
      }
    });

    this.notify();
    this.uploadDatabaseToServer();
    return true;
  }

  public deleteRecetaItem(recetaId: number): boolean {
    if (this.db) {
      this.db.run(`DELETE FROM Recetas WHERE RecetaId = ${recetaId}`);
    }
    this.fallbackRecetas = this.fallbackRecetas.filter((r) => r.RecetaId !== recetaId);
    this.notify();
    this.uploadDatabaseToServer();
    return true;
  }

  /**
   * Generates a complete Escandallo (cost & profit structure) for every dish in the restaurant.
   */
  public getPlatosEscandallos(): PlatoEscandallo[] {
    const platos = this.getPlatos();
    const allRecetas = this.getRecetas();

    return platos.map((plato) => {
      const ingredientes = allRecetas.filter((r) => r.PlatoId === plato.ID);
      const costoTotalInsumos = ingredientes.reduce((acc, curr) => acc + (curr.CostoPorPorcion || 0), 0);
      const precioVenta = safeParsePrice(plato.Precio);
      const margenBruto = precioVenta - costoTotalInsumos;
      const margenPorcentaje = precioVenta > 0 ? ((precioVenta - costoTotalInsumos) / precioVenta) * 100 : 0;
      const margenSobreCosto = costoTotalInsumos > 0 ? ((precioVenta - costoTotalInsumos) / costoTotalInsumos) * 100 : 0;

      // Standard gastronomy pricing rules:
      // Price = Food Cost / (1 - Target Margin)
      // For 60% Margin (40% Food Cost): Cost / 0.40
      // For 50% Margin (50% Food Cost): Cost / 0.50
      // For 70% Margin (30% Food Cost): Cost / 0.30
      const precioSugeridoMargen60 = costoTotalInsumos > 0 ? Math.round(costoTotalInsumos / 0.40) : precioVenta;
      const precioSugeridoMargen50 = costoTotalInsumos > 0 ? Math.round(costoTotalInsumos / 0.50) : precioVenta;
      const precioSugeridoMargen70 = costoTotalInsumos > 0 ? Math.round(costoTotalInsumos / 0.30) : precioVenta;

      return {
        PlatoId: plato.ID,
        PlatoNombre: plato.Plato,
        Categoria: plato.Categoria,
        PrecioVentaActual: precioVenta,
        Ingredientes: ingredientes,
        CostoTotalInsumos: Number(costoTotalInsumos.toFixed(2)),
        MargenBruto: Number(margenBruto.toFixed(2)),
        MargenPorcentaje: Number(margenPorcentaje.toFixed(1)),
        MargenSobreCosto: Number(margenSobreCosto.toFixed(1)),
        PrecioSugeridoMargen60: precioSugeridoMargen60,
        PrecioSugeridoMargen50: precioSugeridoMargen50,
        PrecioSugeridoMargen70: precioSugeridoMargen70,
        TieneReceta: ingredientes.length > 0,
      };
    });
  }

  // ==========================================
  // --- MOVIMIENTOS & KARDEX DE TRAZABILIDAD ---
  // ==========================================

  public getMovimientosInventario(limit = 100): MovimientoInventario[] {
    if (!this.db) {
      return [...this.fallbackMovimientos].sort((a, b) => b.MovimientoId - a.MovimientoId).slice(0, limit);
    }
    try {
      const res = this.db.exec(`
        SELECT m.MovimientoId, m.Fecha, m.InsumoId, m.Tipo, m.Cantidad, m.StockAnterior, m.StockNuevo, m.Referencia, m.Usuario, m.Notas, i.Nombre as InsumoNombre
        FROM MovimientosInventario m
        LEFT JOIN Insumos i ON m.InsumoId = i.InsumoId
        ORDER BY m.MovimientoId DESC
        LIMIT ${limit}
      `);
      if (res.length === 0 || !res[0].values) return [...this.fallbackMovimientos].slice(0, limit);
      const cols = res[0].columns;
      return res[0].values.map((row) => {
        const item: any = {};
        cols.forEach((c, idx) => { item[c] = row[idx]; });
        return {
          MovimientoId: Number(item.MovimientoId),
          Fecha: String(item.Fecha),
          InsumoId: Number(item.InsumoId),
          InsumoNombre: item.InsumoNombre ? String(item.InsumoNombre) : undefined,
          Tipo: item.Tipo as TipoMovimientoInventario,
          Cantidad: Number(item.Cantidad),
          StockAnterior: Number(item.StockAnterior),
          StockNuevo: Number(item.StockNuevo),
          Referencia: item.Referencia ? String(item.Referencia) : undefined,
          Usuario: item.Usuario ? String(item.Usuario) : undefined,
          Notas: item.Notas ? String(item.Notas) : undefined,
        };
      });
    } catch (e) {
      console.warn('getMovimientosInventario error:', e);
      return [...this.fallbackMovimientos].slice(0, limit);
    }
  }

  public registrarMovimiento(mov: Omit<MovimientoInventario, 'MovimientoId' | 'Fecha'> & { Fecha?: string }): boolean {
    const fecha = mov.Fecha || new Date().toISOString().replace('T', ' ').substring(0, 19);
    if (this.db) {
      try {
        const stmt = this.db.prepare(
          'INSERT INTO MovimientosInventario (Fecha, InsumoId, Tipo, Cantidad, StockAnterior, StockNuevo, Referencia, Usuario, Notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        stmt.run([
          fecha,
          mov.InsumoId,
          mov.Tipo,
          Number(mov.Cantidad),
          Number(mov.StockAnterior),
          Number(mov.StockNuevo),
          mov.Referencia || null,
          mov.Usuario || null,
          mov.Notas || null,
        ]);
        stmt.free();
        return true;
      } catch (err) {
        console.warn('registrarMovimiento DB error:', err);
        return false;
      }
    } else {
      const newId = this.fallbackMovimientos.length > 0 ? Math.max(...this.fallbackMovimientos.map((m) => m.MovimientoId)) + 1 : 1;
      this.fallbackMovimientos.unshift({ MovimientoId: newId, Fecha: fecha, ...mov });
      return true;
    }
  }

  /**
   * Real-time trace deduction: Called automatically on POS sale or comanda creation.
   * Deducts recipe ingredients for prepared dishes (Pizza, Broaster, Hamburguesas)
   * or direct inventory for direct items (Bebidas), logging each to the Kardex.
   */
  public descontarInventarioPorItems(cartItems: CartItem[], ticket: string): void {
    if (!Array.isArray(cartItems) || cartItems.length === 0) return;
    try {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      cartItems.forEach((item) => {
        const platoId = item.plato.ID;
        const qtySold = item.cantidad;

        // 1. Check if the dish has recipe ingredients
        const receta = this.getRecetaByPlato(platoId);
        if (receta.length > 0) {
          receta.forEach((ing) => {
            const deductQty = Number((ing.Cantidad * qtySold).toFixed(3));
            let prevStock = 0;
            if (this.db) {
              const curRes = this.db.exec(`SELECT StockActual, Nombre FROM Insumos WHERE InsumoId = ${ing.InsumoId}`);
              if (curRes.length > 0 && curRes[0].values.length > 0) {
                prevStock = Number(curRes[0].values[0][0]) || 0;
                const newStock = Math.max(0, Number((prevStock - deductQty).toFixed(3)));
                this.db.run(`UPDATE Insumos SET StockActual = ?, UltimaActualizacion = ? WHERE InsumoId = ?`, [
                  newStock,
                  now.substring(0, 10),
                  ing.InsumoId,
                ]);

                this.registrarMovimiento({
                  Fecha: now,
                  InsumoId: ing.InsumoId,
                  Tipo: 'Salida_Venta',
                  Cantidad: deductQty,
                  StockAnterior: prevStock,
                  StockNuevo: newStock,
                  Referencia: ticket,
                  Usuario: 'Caja POS',
                  Notas: `Preparación de ${qtySold}x ${item.plato.Plato}`,
                });
              }
            } else {
              const fIdx = this.fallbackInsumos.findIndex((i) => i.InsumoId === ing.InsumoId);
              if (fIdx !== -1) {
                prevStock = this.fallbackInsumos[fIdx].StockActual;
                const newStock = Math.max(0, Number((prevStock - deductQty).toFixed(3)));
                this.fallbackInsumos[fIdx].StockActual = newStock;
                this.registrarMovimiento({
                  Fecha: now,
                  InsumoId: ing.InsumoId,
                  Tipo: 'Salida_Venta',
                  Cantidad: deductQty,
                  StockAnterior: prevStock,
                  StockNuevo: newStock,
                  Referencia: ticket,
                  Usuario: 'Caja POS',
                  Notas: `Preparación de ${qtySold}x ${item.plato.Plato}`,
                });
              }
            }
          });
        } else {
          // 2. Direct inventory deduction (e.g. Beverages or direct sales)
          const pName = item.plato.Plato.toLowerCase().trim();
          let directInsumoId: number | null = null;
          let prevStock = 0;

          if (this.db) {
            const dirRes = this.db.exec(
              `SELECT InsumoId, StockActual, Nombre FROM Insumos WHERE EsVentaDirecta = 1 AND (PlatoId = ${platoId} OR LOWER(Nombre) = '${pName}' OR LOWER(Nombre) LIKE '%${pName}%') LIMIT 1`
            );
            if (dirRes.length > 0 && dirRes[0].values.length > 0) {
              directInsumoId = Number(dirRes[0].values[0][0]);
              prevStock = Number(dirRes[0].values[0][1]) || 0;
            }
          } else {
            const fInsumo = this.fallbackInsumos.find(
              (i) => i.EsVentaDirecta && (i.PlatoId === platoId || i.Nombre.toLowerCase().includes(pName) || pName.includes(i.Nombre.toLowerCase()))
            );
            if (fInsumo) {
              directInsumoId = fInsumo.InsumoId;
              prevStock = fInsumo.StockActual;
            }
          }

          if (directInsumoId) {
            const newStock = Math.max(0, Number((prevStock - qtySold).toFixed(3)));
            if (this.db) {
              this.db.run(`UPDATE Insumos SET StockActual = ?, UltimaActualizacion = ? WHERE InsumoId = ?`, [
                newStock,
                now.substring(0, 10),
                directInsumoId,
              ]);
            } else {
              const fIdx = this.fallbackInsumos.findIndex((i) => i.InsumoId === directInsumoId);
              if (fIdx !== -1) this.fallbackInsumos[fIdx].StockActual = newStock;
            }

            this.registrarMovimiento({
              Fecha: now,
              InsumoId: directInsumoId,
              Tipo: 'Salida_Venta',
              Cantidad: qtySold,
              StockAnterior: prevStock,
              StockNuevo: newStock,
              Referencia: ticket,
              Usuario: 'Caja POS',
              Notas: `Venta directa de ${qtySold}x ${item.plato.Plato}`,
            });
          }
        }
      });
    } catch (err) {
      console.warn('Error in descontarInventarioPorItems:', err);
    }
  }

  // ==========================================
  // --- INVENTARIO SEED DATA ---
  // ==========================================

  private seedInitialInventoryIfEmpty(): void {
    if (!this.db) return;
    try {
      const pRes = this.db.exec("SELECT COUNT(*) FROM Proveedores");
      const pCount = pRes.length > 0 && pRes[0].values[0] ? Number(pRes[0].values[0][0]) : 0;
      if (pCount === 0) {
        const proveedores = [
          ['Molinos & Harinas La Suprema C.A.', 'J-30819201-9', '+58 414 777-4321', 'ventas@molinossuprema.com', 'Ing. Carlos Mendoza', 'Zona Industrial Los Galpones, Galpón 4', 'Harinas, Levaduras, Mantecas', 'Martes y Jueves', 'Proveedor de harinas para pizzas y panes'],
          ['Distribuidora Avícola Los Andes', 'J-40192831-2', '+58 412 555-1201', 'pedidos@avicolalosandes.com', 'Sr. Roberto Rivas', 'Carretera Nacional Km 12', 'Pollo beneficiado, Pechugas, Alitas', 'Lunes, Miércoles, Viernes', 'Pollo fresco para broaster'],
          ['Lácteos & Quesos del Valle', 'J-50129482-1', '+58 424 999-8811', 'lacteosdelvalle@gmail.com', 'Sra. Elena Morales', 'Av. Intercomunal Sector El Prado', 'Queso Mozzarella, Queso Amarillo', 'Diario', 'Mozzarella especial para pizzas fundidas'],
          ['Distribuidora Polar / Bebidas del Centro', 'J-00041362-8', '+58 412 333-7766', 'distribuidorpolar@polar.com', 'Lic. Fernando Gómez', 'Zona Industrial Este #88', 'Pepsi, Malta, Glup, Refrescos, Agua', 'Lunes y Jueves', 'Distribuidor de bebidas y refrescos'],
          ['Agro-Verduras & Salsas Central', 'V-18294819-0', '+58 416 222-3344', 'agroverduras@gmail.com', 'Pedro Castillo', 'Mercado Mayorista Local 14', 'Vegetales, Papas, Salsas, Condimentos', 'Martes y Viernes', 'Papas para freír y salsas'],
          ['Empaques & Desechables El Rosal', 'J-41209384-5', '+58 414 111-2233', 'ventas@empaqueselrosal.com', 'Mariana Dávila', 'Calle Comercio #45', 'Cajas de Pizza, Baldes Broaster, Servilletas', 'Miércoles', 'Empaques de alta resistencia']
        ];
        proveedores.forEach((p) => {
          this.db!.run(
            'INSERT INTO Proveedores (Nombre, Rif, Telefono, Email, Contacto, Direccion, CategoriasSuministro, DiasEntrega, Notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            p
          );
        });
      }

      const iRes = this.db.exec("SELECT COUNT(*) FROM Insumos");
      const iCount = iRes.length > 0 && iRes[0].values[0] ? Number(iRes[0].values[0][0]) : 0;
      if (iCount === 0) {
        const now = new Date().toISOString().substring(0, 10);
        const insumos = [
          // Pizzas raw ingredients
          ['Harina de Trigo Especial', 'Harinas & Panadería', 'kg', 50, 15, 1200, 1, 0, null, now],
          ['Levadura Seca Instantánea', 'Harinas & Panadería', 'kg', 5, 2, 8500, 1, 0, null, now],
          ['Sal Refinada', 'Salsas & Condimentos', 'kg', 20, 5, 450, 1, 0, null, now],
          ['Manteca Vegetal / Grasa', 'Aceites & Grasas', 'kg', 25, 8, 2800, 1, 0, null, now],
          ['Aceite Vegetal para Freidora', 'Aceites & Grasas', 'litro', 80, 20, 2400, 1, 0, null, now],
          ['Salsa de Tomate Base Pizza', 'Salsas & Condimentos', 'kg', 40, 10, 2200, 5, 0, null, now],
          ['Queso Mozzarella Rallado', 'Quesos & Lácteos', 'kg', 35, 10, 7500, 3, 0, null, now],
          ['Jamón Especial para Pizza', 'Carnes & Pollo', 'kg', 20, 6, 6200, 3, 0, null, now],
          ['Peperoni Rebanado', 'Carnes & Pollo', 'kg', 15, 5, 8900, 3, 0, null, now],
          ['Orégano Molido', 'Salsas & Condimentos', 'g', 1000, 200, 5, 5, 0, null, now],
          ['Caja de Pizza Mediana/Grande', 'Empaques & Desechables', 'unidad', 200, 50, 450, 6, 0, null, now],

          // Broaster & Chicken ingredients
          ['Pollo Beneficiado en Piezas', 'Carnes & Pollo', 'kg', 120, 30, 4200, 2, 0, null, now],
          ['Harina para Empanizado Broaster', 'Harinas & Panadería', 'kg', 60, 20, 1800, 1, 0, null, now],
          ['Mezcla Secreta de Especias Broaster', 'Salsas & Condimentos', 'kg', 15, 5, 4500, 5, 0, null, now],
          ['Papas para Freír', 'Vegetales & Verduras', 'kg', 90, 25, 1300, 5, 0, null, now],
          ['Caja / Balde para Broaster', 'Empaques & Desechables', 'unidad', 300, 80, 350, 6, 0, null, now],

          // Hamburguesas & Extras
          ['Pan de Hamburguesa Ajonjolí', 'Harinas & Panadería', 'unidad', 100, 30, 600, 1, 0, null, now],
          ['Carne de Res Moldeada', 'Carnes & Pollo', 'kg', 40, 12, 5800, 2, 0, null, now],
          ['Queso Amarillo Rebanado', 'Quesos & Lácteos', 'kg', 25, 8, 7200, 3, 0, null, now],
          ['Tocineta Ahumada', 'Carnes & Pollo', 'kg', 15, 5, 8400, 2, 0, null, now],

          // Direct sales (Bebidas)
          ['Pepsi 2 Litros', 'Bebidas (Venta Directa)', 'botella', 48, 12, 3800, 4, 1, 1, now],
          ['Pepsi 1.5 Litros', 'Bebidas (Venta Directa)', 'botella', 36, 10, 3100, 4, 1, null, now],
          ['Coca Cola 2 Litros', 'Bebidas (Venta Directa)', 'botella', 40, 12, 4200, 4, 1, null, now],
          ['Glup 2 Litros', 'Bebidas (Venta Directa)', 'botella', 30, 10, 2200, 4, 1, null, now],
          ['Malta Polar', 'Bebidas (Venta Directa)', 'botella', 60, 20, 1400, 4, 1, null, now],
          ['Agua Mineral 600ml', 'Bebidas (Venta Directa)', 'botella', 50, 15, 800, 4, 1, null, now]
        ];

        insumos.forEach((ins) => {
          this.db!.run(
            'INSERT INTO Insumos (Nombre, Categoria, UnidadMedida, StockActual, StockMinimo, CostoUnitario, ProveedorId, EsVentaDirecta, PlatoId, UltimaActualizacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ins
          );
        });

        this.seedInitialRecipes();
      }
    } catch (e) {
      console.warn('Error seeding initial inventory:', e);
    }
  }

  private seedInitialRecipes(): void {
    if (!this.db) return;
    try {
      const pRes = this.db.exec("SELECT ID, Plato, Categoria FROM Platos");
      if (pRes.length === 0 || !pRes[0].values) return;

      const insRes = this.db.exec("SELECT InsumoId, Nombre FROM Insumos");
      if (insRes.length === 0 || !insRes[0].values) return;

      const insMap: Record<string, number> = {};
      insRes[0].values.forEach((row) => {
        insMap[String(row[1]).toLowerCase()] = Number(row[0]);
      });

      const getIns = (term: string) => {
        const key = Object.keys(insMap).find((k) => k.includes(term.toLowerCase()));
        return key ? insMap[key] : null;
      };

      const harinaTrigo = getIns('harina de trigo');
      const levadura = getIns('levadura');
      const manteca = getIns('manteca');
      const sal = getIns('sal refinada');
      const salsaPizza = getIns('salsa de tomate base');
      const mozzarella = getIns('mozzarella');
      const cajaPizza = getIns('caja de pizza');

      const pollo = getIns('pollo beneficiado');
      const harinaBroaster = getIns('harina para empanizado');
      const especiasBroaster = getIns('especias broaster');
      const aceite = getIns('aceite vegetal');
      const papas = getIns('papas para fre');
      const baldeBroaster = getIns('caja / balde');

      const panHamb = getIns('pan de hamburguesa');
      const carneRes = getIns('carne de res');
      const quesoAmarillo = getIns('queso amarillo');

      const stmt = this.db.prepare('INSERT INTO Recetas (PlatoId, InsumoId, Cantidad, UnidadMedida, Notas) VALUES (?, ?, ?, ?, ?)');

      pRes[0].values.forEach((row) => {
        const id = Number(row[0]);
        const name = String(row[1]).toLowerCase();
        const cat = String(row[2]).toLowerCase();

        // Pizza recipes
        if (cat.includes('pizza') || name.includes('pizza') || name.includes('4 estaciones') || name.includes('charcutera') || name.includes('hawaiana')) {
          if (harinaTrigo) stmt.run([id, harinaTrigo, 0.25, 'kg', 'Masa de pizza']);
          if (levadura) stmt.run([id, levadura, 0.005, 'kg', 'Fermentación']);
          if (sal) stmt.run([id, sal, 0.003, 'kg', 'Sazón masa']);
          if (manteca) stmt.run([id, manteca, 0.015, 'kg', 'Grasa masa']);
          if (salsaPizza) stmt.run([id, salsaPizza, 0.09, 'kg', 'Base salsa']);
          if (mozzarella) stmt.run([id, mozzarella, 0.18, 'kg', 'Queso fundido']);
          if (cajaPizza) stmt.run([id, cajaPizza, 1, 'unidad', 'Empaque']);
        }
        // Broaster & Chicken recipes
        else if (cat.includes('pollo') || name.includes('broaster') || name.includes('clásica') || name.includes('ahorro') || name.includes('irresistible') || name.includes('alita')) {
          if (pollo) stmt.run([id, pollo, 0.55, 'kg', 'Piezas de pollo']);
          if (harinaBroaster) stmt.run([id, harinaBroaster, 0.1, 'kg', 'Empanizado crujiente']);
          if (especiasBroaster) stmt.run([id, especiasBroaster, 0.015, 'kg', 'Sabor tradicional']);
          if (aceite) stmt.run([id, aceite, 0.04, 'litro', 'Fritura']);
          if (papas) stmt.run([id, papas, 0.18, 'kg', 'Acompañante']);
          if (baldeBroaster) stmt.run([id, baldeBroaster, 1, 'unidad', 'Empaque']);
        }
        // Hamburguesas
        else if (cat.includes('hamburguesa') || name.includes('hamb')) {
          if (panHamb) stmt.run([id, panHamb, 1, 'unidad', 'Pan con ajonjolí']);
          if (carneRes) stmt.run([id, carneRes, 0.15, 'kg', 'Carne']);
          if (quesoAmarillo) stmt.run([id, quesoAmarillo, 0.04, 'kg', 'Queso']);
          if (papas) stmt.run([id, papas, 0.15, 'kg', 'Papas fritas']);
        }
      });

      stmt.free();
    } catch (e) {
      console.warn('Error seeding initial recipes:', e);
    }
  }

  public resetDatabase(): void {
    safeStorage.removeItem('TerrenoBroaster_db_binary');
    safeStorage.removeItem('tb_fallback_platos');
    safeStorage.removeItem('tb_fallback_ventas');
    safeStorage.removeItem('tb_fallback_detalles');
    safeStorage.removeItem('tb_fallback_comandas');
    safeStorage.removeItem('tb_fallback_usuarios');
    safeStorage.removeItem('tb_fallback_pedidos_whatsapp');
    safeStorage.removeItem('tb_whatsapp_phone');

    if (this.SQL) {
      this.db = new this.SQL.Database();
      this.createTablesIfNotExist();
      this.seedInitialData();
    }
    this.initDefaultFallback();
    this.notify();
  }

  public resetToDefaults(): void {
    this.resetDatabase();
  }
}


export const sqliteService = new SQLiteService();
