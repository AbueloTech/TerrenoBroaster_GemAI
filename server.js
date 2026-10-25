// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
var isProduction = process.env.NODE_ENV === "production";
var PORT = Number(process.env.PORT) || 3e3;
async function createServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  const DATA_DIR = path.resolve(process.cwd(), ".data");
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn("Could not create data directory:", e);
    }
  }
  const MENU_FILE = path.join(DATA_DIR, "synced_menu.json");
  const ORDERS_FILE = path.join(DATA_DIR, "incoming_orders.json");
  let currentMenu = {
    platos: [],
    restaurantPhone: "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  let queuedOrders = [];
  try {
    if (fs.existsSync(MENU_FILE)) {
      currentMenu = JSON.parse(fs.readFileSync(MENU_FILE, "utf-8"));
    }
  } catch (err) {
    console.warn("Could not read cached menu file:", err);
  }
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      queuedOrders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
    }
  } catch (err) {
    console.warn("Could not read cached orders file:", err);
  }
  app.get("/api/menu", (req, res) => {
    res.json({
      success: true,
      menu: currentMenu
    });
  });
  app.post("/api/menu", (req, res) => {
    try {
      const { platos, restaurantPhone } = req.body;
      if (Array.isArray(platos) && platos.length > 0) {
        currentMenu = {
          platos,
          restaurantPhone: restaurantPhone || currentMenu.restaurantPhone,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        try {
          fs.writeFileSync(MENU_FILE, JSON.stringify(currentMenu, null, 2), "utf-8");
        } catch (writeErr) {
          console.warn("Could not persist menu to file:", writeErr);
        }
      }
      res.json({ success: true, count: currentMenu.platos.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/customer-order", (req, res) => {
    try {
      const orderData = req.body;
      const orderEntry = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        order: orderData,
        receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
        processed: false
      };
      queuedOrders.push(orderEntry);
      if (queuedOrders.length > 200) {
        queuedOrders = queuedOrders.slice(-200);
      }
      try {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(queuedOrders, null, 2), "utf-8");
      } catch (writeErr) {
        console.warn("Could not persist orders to file:", writeErr);
      }
      res.json({ success: true, orderId: orderEntry.id });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/customer-orders", (req, res) => {
    const unprocessed = queuedOrders.filter((o) => !o.processed);
    res.json({
      success: true,
      orders: unprocessed
    });
  });
  app.post("/api/customer-orders/ack", (req, res) => {
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
          fs.writeFileSync(ORDERS_FILE, JSON.stringify(queuedOrders, null, 2), "utf-8");
        } catch (writeErr) {
          console.warn("Could not persist updated orders to file:", writeErr);
        }
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
createServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
