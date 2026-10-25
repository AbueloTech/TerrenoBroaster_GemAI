import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

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

  app.use(express.json({ limit: '10mb' }));

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

  // In-memory + local file persistence for menu catalog & orders
  const DATA_DIR = path.resolve(process.cwd(), '.data');
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create data directory:', e);
    }
  }

  const MENU_FILE = path.join(DATA_DIR, 'synced_menu.json');
  const ORDERS_FILE = path.join(DATA_DIR, 'incoming_orders.json');

  let currentMenu: SyncedMenu = {
    platos: [],
    restaurantPhone: '',
    updatedAt: new Date().toISOString(),
  };

  let queuedOrders: QueuedOrder[] = [];

  // Load cached menu from disk if present (saved from SQLite POS sync)
  try {
    if (fs.existsSync(MENU_FILE)) {
      const saved = JSON.parse(fs.readFileSync(MENU_FILE, 'utf-8'));
      if (saved && Array.isArray(saved.platos)) {
        currentMenu = saved;
      }
    }
  } catch (err) {
    console.warn('Could not read cached menu file:', err);
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

  // 1. GET /api/menu - Get synced dishes and restaurant phone for customers
  app.get('/api/menu', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json({
      success: true,
      menu: currentMenu,
    });
  });

  // 2. POST /api/menu - POS publishes active dishes and phone
  app.post('/api/menu', (req, res) => {
    try {
      const { platos, restaurantPhone } = req.body;
      if (Array.isArray(platos) && platos.length > 0) {
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

  // --- VITE MIDDLEWARE (Dev) or Static Files (Prod) ---
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
