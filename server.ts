import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import initSqlJs from 'sql.js';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

interface SyncedMenu {
  platos: any[];
  restaurantPhone: string;
  updatedAt: string;
}

interface QueuedOrder {
  id: string;
  order: any;
  receivedAt: string;
  processed: boolean;
}

async function createServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

  // Enable full CORS for cross-origin mobile customers scanning QR codes
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // In-memory + local file persistence for menu catalog, orders & uploaded dish images
  const DATA_DIR = path.resolve(process.cwd(), '.data');
  const IMAGES_DIR = path.resolve(DATA_DIR, 'images');

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create data directory:', e);
    }
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    try {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create images directory:', e);
    }
  }

  const MENU_FILE = path.join(DATA_DIR, 'synced_menu.json');
  const ORDERS_FILE = path.join(DATA_DIR, 'incoming_orders.json');
  const DB_FILE = path.join(DATA_DIR, 'TerrenoBroaster.db');

  let currentMenu: SyncedMenu = {
    platos: [],
    restaurantPhone: '',
    updatedAt: new Date().toISOString(),
  };

  let queuedOrders: QueuedOrder[] = [];

  // Helper to sync dishes directly from the SQLite database file on disk
  async function syncMenuFromSqliteDb(): Promise<boolean> {
    try {
      if (!fs.existsSync(DB_FILE)) return false;
      const SQL = await initSqlJs();
      const filebuffer = fs.readFileSync(DB_FILE);
      if (!filebuffer || filebuffer.length < 100) return false;
      const db = new SQL.Database(filebuffer);
      const res = db.exec('SELECT ID, Plato, Precio, Categoria, Imagen FROM Platos ORDER BY ID ASC');
      if (res.length > 0 && res[0].values) {
        const cols = res[0].columns;
        const dbPlatos = res[0].values.map((row) => {
          const obj: any = {};
          cols.forEach((c, idx) => {
            obj[c] = row[idx];
          });
          return {
            ID: Number(obj.ID),
            Plato: String(obj.Plato),
            Precio: Number(obj.Precio) || 0,
            Categoria: String(obj.Categoria || 'General'),
            Imagen: String(obj.Imagen || ''),
          };
        });

        if (dbPlatos.length > 0) {
          currentMenu = {
            platos: dbPlatos,
            restaurantPhone: currentMenu.restaurantPhone || '',
            updatedAt: new Date().toISOString(),
          };
          try {
            fs.writeFileSync(MENU_FILE, JSON.stringify(currentMenu, null, 2));
            console.log(`[Database Auto-Sync] Extracted ${dbPlatos.length} real dishes from TerrenoBroaster.db`);
          } catch (e) {
            console.warn('Could not write synced_menu.json:', e);
          }
          return true;
        }
      }
    } catch (err) {
      console.warn('Could not sync dishes from TerrenoBroaster.db:', err);
    }
    return false;
  }

  // Load cached menu from disk if present (saved from SQLite POS sync)
  try {
    if (fs.existsSync(MENU_FILE)) {
      const saved = JSON.parse(fs.readFileSync(MENU_FILE, 'utf-8'));
      if (saved && Array.isArray(saved.platos) && saved.platos.length > 0) {
        currentMenu = saved;
      }
    }
  } catch (err) {
    console.warn('Could not read cached menu file:', err);
  }

  // If menu is empty, auto-sync from SQLite master database
  if (!currentMenu.platos || currentMenu.platos.length === 0) {
    await syncMenuFromSqliteDb();
  }

  // Load cached orders from disk if present
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      queuedOrders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('Could not read cached orders file:', err);
  }

  // ==========================================
  // --- REAL-TIME POS & CUSTOMER API ---
  // ==========================================

  // 1. GET /api/menu - Get synced dishes, restaurant phone and available server images for customers
  app.get('/api/menu', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    let availableImages: string[] = [];
    try {
      if (fs.existsSync(IMAGES_DIR)) {
        availableImages = fs.readdirSync(IMAGES_DIR);
      }
    } catch {
      // ignore
    }

    res.json({
      success: true,
      menu: currentMenu,
      availableImages,
    });
  });

  // 1b. GET /api/images/* - Serve uploaded dish image with multi-pattern matching
  app.get('/api/images/:filename(*)', (req, res) => {
    try {
      const raw = decodeURIComponent(req.params.filename || '').trim();
      if (!raw) return res.status(404).send('Not found');

      // Strip any path prefixes like 'img\', 'img/', './img/'
      const cleanTarget = raw.replace(/^(\.[\/\\])*img[\/\\]/i, '').replace(/[\/\\]/g, '/');
      const baseName = path.basename(cleanTarget).toLowerCase();

      if (!fs.existsSync(IMAGES_DIR)) return res.status(404).send('No images dir');
      const files = fs.readdirSync(IMAGES_DIR);

      // Check 1: direct filename match
      let match = files.find((f) => f.toLowerCase() === baseName);

      // Check 2: match without extension
      if (!match) {
        const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');
        if (nameWithoutExt) {
          match = files.find((f) => f.toLowerCase().replace(/\.[^/.]+$/, '') === nameWithoutExt);
        }
      }

      // Check 3: cleaned name (where special chars converted to _)
      if (!match) {
        const cleanName = baseName.replace(/[^a-z0-9._-]/g, '_');
        match = files.find((f) => f.toLowerCase() === cleanName);
      }

      if (match) {
        const filePath = path.join(IMAGES_DIR, match);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(filePath);
      }

      return res.status(404).send('Image not found');
    } catch (err: any) {
      return res.status(500).send('Image error: ' + err.message);
    }
  });

  // 1c. POST /api/upload-images - Upload base64 dish images from POS to server disk
  app.post('/api/upload-images', (req, res) => {
    try {
      const { images } = req.body; // map of { [filename]: base64DataUrl }
      if (!images || typeof images !== 'object') {
        return res.status(400).json({ success: false, error: 'Formato de imágenes inválido' });
      }

      let savedCount = 0;
      for (const [rawFilename, dataUrl] of Object.entries(images)) {
        if (typeof dataUrl === 'string' && dataUrl.includes('base64,')) {
          // Normalize filename by removing path prefixes
          const baseOnly = path.basename(rawFilename.replace(/\\/g, '/')).toLowerCase();
          const cleanName = baseOnly.replace(/[^a-z0-9._-]/g, '_');
          const base64Data = dataUrl.split('base64,')[1];
          const buffer = Buffer.from(base64Data, 'base64');

          fs.writeFileSync(path.join(IMAGES_DIR, cleanName), buffer);
          if (cleanName !== baseOnly) {
            fs.writeFileSync(path.join(IMAGES_DIR, baseOnly), buffer);
          }
          savedCount++;
        }
      }

      res.json({ success: true, savedCount, totalInDir: fs.readdirSync(IMAGES_DIR).length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1d. GET /api/images-manifest - List all image filenames currently on server
  app.get('/api/images-manifest', (req, res) => {
    try {
      const files = fs.readdirSync(IMAGES_DIR);
      res.json({ success: true, images: files });
    } catch {
      res.json({ success: true, images: [] });
    }
  });

  // 1e. GET /api/database - Serves permanent TerrenoBroaster.db SQLite binary if present
  app.get('/api/database', (req, res) => {
    try {
      if (fs.existsSync(DB_FILE)) {
        res.setHeader('Content-Type', 'application/x-sqlite3');
        res.setHeader('Content-Disposition', 'attachment; filename="TerrenoBroaster.db"');
        res.setHeader('Cache-Control', 'no-cache');
        return res.sendFile(DB_FILE);
      }
      return res.status(404).json({ success: false, message: 'Base de datos aún no cargada en servidor' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1f. GET /api/database/status - Checks if permanent database file exists
  app.get('/api/database/status', (req, res) => {
    const exists = fs.existsSync(DB_FILE);
    let size = 0;
    if (exists) {
      try {
        size = fs.statSync(DB_FILE).size;
      } catch {
        // ignore
      }
    }
    res.json({
      success: true,
      exists,
      size,
      platosCount: currentMenu.platos.length,
      updatedAt: currentMenu.updatedAt,
    });
  });

  // 1g. POST /api/database - Uploads & saves permanent TerrenoBroaster.db SQLite binary
  app.post('/api/database', async (req, res) => {
    try {
      let buffer: Buffer | null = null;
      if (Buffer.isBuffer(req.body) && req.body.length > 50) {
        buffer = req.body;
      } else if (req.body && typeof req.body.base64 === 'string') {
        buffer = Buffer.from(req.body.base64, 'base64');
      }

      if (!buffer || buffer.length < 50) {
        return res.status(400).json({ success: false, error: 'Datos binarios de SQLite no válidos' });
      }

      fs.writeFileSync(DB_FILE, buffer);
      console.log(`[Database] TerrenoBroaster.db guardado exitosamente en disco (${buffer.length} bytes)`);

      // Automatically sync dishes to currentMenu and synced_menu.json
      await syncMenuFromSqliteDb();

      res.json({ success: true, size: buffer.length, platosCount: currentMenu.platos.length });
    } catch (err: any) {
      console.error('[Database Upload Error]:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. POST /api/menu - POS publishes active dishes and phone
  app.post('/api/menu', (req, res) => {
    try {
      const { platos, restaurantPhone } = req.body;
      if (Array.isArray(platos) && platos.length > 0) {
        // Strictly reject any attempt to re-inject the 15 mock combos
        const hasMockCombo = platos.some(
          (p) =>
            p &&
            typeof p.Plato === 'string' &&
            (p.Plato.toLowerCase().includes('combo broaster 2 piezas') ||
              p.Plato.toLowerCase().includes('balde broaster familiar (8 piezas') ||
              p.Plato.toLowerCase().includes('tenders de pollo crujiente (5 unidades)'))
        );

        if (hasMockCombo) {
          console.warn('[Menu API] Blocked attempt to publish test mock combos.');
          return res.status(400).json({ success: false, error: 'Productos de prueba bloqueados.' });
        }

        currentMenu = {
          platos,
          restaurantPhone: restaurantPhone || currentMenu.restaurantPhone,
          updatedAt: new Date().toISOString(),
        };
        try {
          fs.writeFileSync(MENU_FILE, JSON.stringify(currentMenu, null, 2), 'utf-8');
        } catch (writeErr) {
          console.warn('Could not persist menu to file:', writeErr);
        }
      }
      res.json({ success: true, count: currentMenu.platos.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. POST /api/customer-order - Customer submits order from digital menu
  app.post('/api/customer-order', (req, res) => {
    try {
      const orderData = req.body;
      const orderEntry: QueuedOrder = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        order: orderData,
        receivedAt: new Date().toISOString(),
        processed: false,
      };

      queuedOrders.push(orderEntry);
      // Keep max 200 orders
      if (queuedOrders.length > 200) {
        queuedOrders = queuedOrders.slice(-200);
      }

      try {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(queuedOrders, null, 2), 'utf-8');
      } catch (writeErr) {
        console.warn('Could not persist orders to file:', writeErr);
      }

      res.json({ success: true, orderId: orderEntry.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. GET /api/customer-orders - POS polls for unprocessed orders
  app.get('/api/customer-orders', (req, res) => {
    const unprocessed = queuedOrders.filter((o) => !o.processed);
    res.json({
      success: true,
      orders: unprocessed,
    });
  });

  // 5. POST /api/customer-orders/ack - POS marks orders as received
  app.post('/api/customer-orders/ack', (req, res) => {
    try {
      const { ids } = req.body;
      if (Array.isArray(ids)) {
        const idSet = new Set(ids);
        queuedOrders.forEach((o) => {
          if (idSet.has(o.id)) {
            o.processed = true;
          }
        });
        try {
          fs.writeFileSync(ORDERS_FILE, JSON.stringify(queuedOrders, null, 2), 'utf-8');
        } catch (writeErr) {
          console.warn('Could not persist updated orders to file:', writeErr);
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- STATIC ASSETS & VITE MIDDLEWARE ---
  const distPath = path.resolve(process.cwd(), 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

  if (fs.existsSync(path.join(distPath, 'assets'))) {
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1d',
      immutable: true,
    }));
  }

  if (hasDist) {
    console.log('[Server] Sirviendo build compilado optimizado desde dist/');
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('[Server] Iniciando middleware de desarrollo Vite...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
