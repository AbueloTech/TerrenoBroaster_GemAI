import { Plato, PedidoWhatsApp, PedidoWhatsAppItem } from '../types';
import { DigitalMenuOrderPayload } from '../utils/whatsappParser';
import { imageService } from './imageService';

export interface SyncedMenuResponse {
  success: boolean;
  menu?: {
    platos: Plato[];
    restaurantPhone: string;
    updatedAt: string;
  };
  availableImages?: string[];
}

class MenuSyncService {
  private lastPushedJson: string = '';
  private isPushing: boolean = false;

  /**
   * Pushes the active SQLite database dishes and restaurant phone to the backend API
   * so all mobile clients scanning the QR code see the exact same real dishes.
   */
  public async pushMenuToServer(platos: Plato[], restaurantPhone: string, force = false): Promise<boolean> {
    if (!Array.isArray(platos) || platos.length === 0) return false;

    // Build signature representing all dishes (IDs, names, prices, categories, images) and phone
    const signature = `${platos.length}|` + platos.map((p) => `${p.ID}:${p.Plato}:${p.Precio}:${p.Categoria || ''}:${p.Imagen || ''}`).join(';') + `|${restaurantPhone}`;
    if (!force && signature === this.lastPushedJson && !this.isPushing) {
      return true;
    }

    this.isPushing = true;
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platos,
          restaurantPhone,
        }),
      });

      if (res.ok) {
        this.lastPushedJson = signature;
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Could not sync menu to server:', e);
      return false;
    } finally {
      this.isPushing = false;
    }
  }

  /**
   * Fetches real dishes and restaurant phone from server API for the customer mobile menu
   */
  public async fetchMenuFromServer(): Promise<{ platos: Plato[]; restaurantPhone: string } | null> {
    try {
      const res = await fetch(`/api/menu?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data: SyncedMenuResponse = await res.json();
      if (data.availableImages && Array.isArray(data.availableImages)) {
        imageService.setServerImages(data.availableImages);
      }
      if (data.success && data.menu && Array.isArray(data.menu.platos) && data.menu.platos.length > 0) {
        return {
          platos: data.menu.platos,
          restaurantPhone: data.menu.restaurantPhone || '',
        };
      }
      return null;
    } catch (e) {
      console.warn('Could not fetch menu from server:', e);
      return null;
    }
  }

  /**
   * Submits a customer order to the server so the POS on the PC receives it in real time
   */
  public async submitCustomerOrder(
    payload: DigitalMenuOrderPayload
  ): Promise<{ success: boolean; orderId?: string }> {
    try {
      const res = await fetch('/api/customer-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, orderId: data.orderId };
      }
      return { success: false };
    } catch (e) {
      console.warn('Could not post customer order to server:', e);
      return { success: false };
    }
  }

  /**
   * Retrieves unprocessed orders from the server for the POS
   */
  public async fetchPendingOrders(): Promise<any[]> {
    try {
      const res = await fetch('/api/customer-orders');
      if (!res.ok) return [];
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        return data.orders;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Acknowledges that the POS has imported the orders into its local SQLite database
   */
  public async ackOrders(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    try {
      await fetch('/api/customer-orders/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } catch {
      // ignore
    }
  }

  /**
   * Encodes dishes into a compact URL-safe hash representation as an offline fallback
   */
  public encodeCatalogHash(platos: Plato[]): string {
    if (!platos || platos.length === 0) return '';
    try {
      const compact = platos.map((p) => [
        p.ID,
        p.Plato,
        p.Precio,
        p.Categoria || '',
        p.Imagen || '',
      ]);
      const jsonStr = JSON.stringify(compact);
      return btoa(unescape(encodeURIComponent(jsonStr)));
    } catch {
      return '';
    }
  }

  /**
   * Decodes dishes from URL hash representation if present
   */
  public decodeCatalogHash(hashStr: string): Plato[] | null {
    if (!hashStr) return null;
    try {
      const clean = hashStr.replace(/^#?c=/, '').replace(/^#/, '');
      if (!clean) return null;
      const jsonStr = decodeURIComponent(escape(atob(clean)));
      const raw = JSON.parse(jsonStr);
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((item: any, idx: number) => ({
          ID: item[0] || idx + 1,
          Plato: String(item[1] || ''),
          Precio: Number(item[2] || 0),
          Categoria: String(item[3] || 'General'),
          Imagen: item[4] ? String(item[4]) : '',
        }));
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const menuSyncService = new MenuSyncService();
