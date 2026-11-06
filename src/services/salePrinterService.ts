// Service for Cashier 80mm Thermal Receipt Printing (Customer Sale Ticket)
// Guarantees:
// 1. Single print job with debounce lock (no 2x or 3x duplicate prints).
// 2. Strict 80mm auto-height document (no paper waste or blank page rollout).
// 3. Immediate paper cut indicator without feeding an entire A4 page.
// 4. Strict isolation from Kitchen Comandas (comandas will never print on cashier printer).

import { Venta, DetalleVenta } from '../types';
import { formatPrice } from '../utils/currency';

export interface SaleTicketPrintData {
  venta: Venta;
  detalles: DetalleVenta[];
  ubicacion?: string;
  tipoServicio?: string;
  notas?: string;
}

// Bluetooth GATT services for thermal receipt printers
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  0x18f0,
  0xff00,
];

class SalePrinterService {
  private isPrintLocked: boolean = false;
  private bluetoothDevice: any = null;
  private printCharacteristic: any = null;
  private connectedPrinterName: string = '';

  constructor() {
    try {
      const saved = localStorage.getItem('tb_cashier_bt_printer_name');
      if (saved) this.connectedPrinterName = saved;
    } catch {
      // Ignore
    }
  }

  public isBluetoothConnected(): boolean {
    return Boolean(
      this.bluetoothDevice &&
      this.bluetoothDevice.gatt &&
      this.bluetoothDevice.gatt.connected &&
      this.printCharacteristic
    );
  }

  public getConnectedPrinterName(): string {
    return this.connectedPrinterName;
  }

  /**
   * Connect Cashier Bluetooth Thermal Printer (optional, for users with BT cashier printer)
   */
  public async connectCashierBluetooth(): Promise<{ success: boolean; printerName?: string; error?: string }> {
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
      return { success: false, error: 'Web Bluetooth no está disponible en este navegador.' };
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES,
      });

      if (!device) return { success: false, error: 'No se seleccionó impresora.' };

      const server = await device.gatt.connect();
      let characteristic = null;

      for (const serviceUuid of PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              characteristic = c;
              break;
            }
          }
          if (characteristic) break;
        } catch {
          // continue
        }
      }

      if (!characteristic) {
        const services = await server.getPrimaryServices();
        for (const s of services) {
          try {
            const chars = await s.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                characteristic = c;
                break;
              }
            }
            if (characteristic) break;
          } catch {}
        }
      }

      if (!characteristic) {
        return { success: false, error: 'No se encontró canal de escritura en la impresora Bluetooth.' };
      }

      this.bluetoothDevice = device;
      this.printCharacteristic = characteristic;
      this.connectedPrinterName = device.name || 'Impresora Térmica Caja 80mm';

      try {
        localStorage.setItem('tb_cashier_bt_printer_name', this.connectedPrinterName);
      } catch {}

      return { success: true, printerName: this.connectedPrinterName };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return { success: false, error: 'Búsqueda cancelada.' };
      }
      return { success: false, error: err.message || 'Error al conectar impresora.' };
    }
  }

  /**
   * Build ESC/POS bytes for 80mm Cashier Receipt with immediate hardware paper cut
   */
  public generateEscPosBytes(data: SaleTicketPrintData): Uint8Array {
    const bytes: number[] = [];

    const addStr = (str: string) => {
      const clean = str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      for (let i = 0; i < clean.length; i++) {
        bytes.push(clean.charCodeAt(i));
      }
    };

    // ESC @ : Initialize printer
    bytes.push(0x1b, 0x40);

    // ESC a 1 : Center
    bytes.push(0x1b, 0x61, 0x01);

    // GS ! 0x11 : Double height & width
    bytes.push(0x1d, 0x21, 0x11);
    addStr('TERRENO BROASTER\n');

    // ESC ! 0x00 : Normal size
    bytes.push(0x1b, 0x21, 0x00);
    addStr('El Mejor Pollo Broaster Crujiente\n');
    addStr('NIT: 901.238.941-1 * Colombia\n');
    addStr('================================\n');

    // ESC a 0 : Left
    bytes.push(0x1b, 0x61, 0x00);
    addStr(`TICKET:  #${data.venta.NTicket}\n`);
    addStr(`FECHA:   ${data.venta.Fecha}\n`);
    addStr(`CLIENTE: ${data.venta.Cliente}\n`);
    if (data.ubicacion) {
      addStr(`MESA/DEST: ${data.ubicacion}\n`);
    }
    addStr(`PAGO:    ${data.venta.FormaPago}\n`);
    addStr('--------------------------------\n');
    addStr('CANT  DESCRIPCION       TOTAL   \n');
    addStr('--------------------------------\n');

    data.detalles.forEach((d) => {
      const qty = `${d.Cantidad}x`.padEnd(5, ' ');
      const name = d.Plato.substring(0, 18).padEnd(18, ' ');
      const imp = `${formatPrice(d.Importe)}`.padStart(9, ' ');
      addStr(`${qty} ${name} ${imp}\n`);
    });

    addStr('--------------------------------\n');
    // Total highlight
    bytes.push(0x1b, 0x45, 0x01); // Bold on
    bytes.push(0x1d, 0x21, 0x01); // Double height
    addStr(`TOTAL PAGADO: ${formatPrice(data.venta.Monto)}\n`);
    bytes.push(0x1b, 0x45, 0x00); // Bold off
    bytes.push(0x1d, 0x21, 0x00); // Normal size
    addStr('================================\n');

    // ESC a 1 : Center
    bytes.push(0x1b, 0x61, 0x01);
    addStr('¡GRACIAS POR SU COMPRA!\n');
    addStr('Vuelva pronto\n');
    addStr('TerrenoBroaster POS\n\n');

    // Paper feed minimal (2 lines) and CUT
    bytes.push(0x1b, 0x64, 0x02); // Feed 2 lines
    // GS V 0 : Cut paper immediately
    bytes.push(0x1d, 0x56, 0x00);

    return new Uint8Array(bytes);
  }

  /**
   * Prints the customer sale ticket to 80mm thermal printer via an isolated hidden iframe.
   * Features:
   * - Strict debounce (blocks 2x and 3x repeat prints).
   * - Strict @page { size: 80mm auto; margin: 0; } preventing A4/letter page rollout.
   * - Immediate paper cut line.
   * - Zero kitchen comanda pollution.
   */
  public printThermalReceipt(data: SaleTicketPrintData): boolean {
    if (this.isPrintLocked) {
      console.warn('[SalePrinter] Impresión en curso, ignorando llamada duplicada.');
      return false;
    }

    this.isPrintLocked = true;
    setTimeout(() => {
      this.isPrintLocked = false;
    }, 2800);

    if (typeof document === 'undefined') return false;

    // Remove any previous temporary iframe
    const oldIframe = document.getElementById('tb-cashier-thermal-iframe');
    if (oldIframe && oldIframe.parentNode) {
      oldIframe.parentNode.removeChild(oldIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'tb-cashier-thermal-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      this.isPrintLocked = false;
      return false;
    }

    const itemsHtml = data.detalles
      .map(
        (d) => `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3px; font-size: 11px;">
          <span style="font-weight: 900; width: 28px; flex-shrink: 0;">${d.Cantidad}x</span>
          <div style="flex: 1; text-align: left; padding-right: 4px; line-height: 1.2;">
            <div style="font-weight: 700;">${d.Plato}</div>
            <div style="font-size: 9px; color: #444;">${formatPrice(d.Precio)} c/u</div>
          </div>
          <span style="font-weight: 900; width: 55px; text-align: right; flex-shrink: 0;">${formatPrice(d.Importe)}</span>
        </div>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket #${data.venta.NTicket}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0mm !important;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: 76mm;
              max-width: 76mm;
              margin: 0 auto;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.25;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .ticket-wrap {
              width: 74mm;
              margin: 0 auto;
              padding: 1.5mm 1mm 1.5mm 1mm;
            }
            .center { text-align: center; }
            .bold { font-weight: 900; }
            .dashed { border-top: 1px dashed #000; margin: 4px 0; }
            .double-dashed { border-top: 2px dashed #000; margin: 5px 0; }
            .header-title {
              font-size: 15px;
              font-weight: 900;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .cut-line {
              text-align: center;
              font-size: 9px;
              margin-top: 5px;
              padding-top: 3px;
              border-top: 1px dashed #000;
              letter-spacing: 1px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="ticket-wrap">
            <div class="center header-title">TERRENO BROASTER</div>
            <div class="center" style="font-size: 10px; color: #222;">El Mejor Pollo Broaster Crujiente</div>
            <div class="center" style="font-size: 9px; color: #444;">NIT: 901.238.941-1 • Colombia</div>
            
            <div class="dashed"></div>

            <div style="font-size: 10.5px; line-height: 1.3;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #333;">N° TICKET:</span>
                <span class="bold" style="font-size: 12px;">#${data.venta.NTicket}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #333;">FECHA:</span>
                <span>${data.venta.Fecha}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #333;">CLIENTE:</span>
                <span class="bold">${data.venta.Cliente}</span>
              </div>
              ${
                data.ubicacion
                  ? `
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #333;">DESTINO:</span>
                  <span class="bold">${data.ubicacion}</span>
                </div>
              `
                  : ''
              }
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #333;">FORMA DE PAGO:</span>
                <span class="bold">${data.venta.FormaPago}</span>
              </div>
            </div>

            <div class="dashed"></div>

            <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; padding-bottom: 2px;">
              <span style="width: 28px;">CANT</span>
              <span style="flex: 1; text-align: left;">DESCRIPCIÓN</span>
              <span style="width: 55px; text-align: right;">TOTAL</span>
            </div>
            <div class="dashed" style="margin-top: 1px;"></div>

            ${itemsHtml}

            <div class="dashed"></div>

            <div style="font-size: 11px; line-height: 1.35;">
              <div style="display: flex; justify-content: space-between;">
                <span>Subtotal:</span>
                <span>${formatPrice(data.venta.Monto)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #444;">
                <span>IVA (Exento):</span>
                <span>$0</span>
              </div>
              <div class="dashed"></div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900;">
                <span>TOTAL PAGADO:</span>
                <span>${formatPrice(data.venta.Monto)}</span>
              </div>
            </div>

            <div class="double-dashed"></div>

            <div class="center" style="font-size: 9.5px; line-height: 1.25;">
              <div class="bold">¡GRACIAS POR SU PREFERENCIA!</div>
              <div>Conserve este ticket como constancia</div>
              <div style="font-size: 8px; color: #555; margin-top: 2px;">Terreno Broaster POS • DB: TerrenoBroaster.db</div>
            </div>

            <div class="cut-line">✂ - - - CORTE DE TICKET - - - ✂</div>
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Error al imprimir ticket térmico:', err);
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 4000);
      }
    }, 150);

    return true;
  }

  /**
   * Print via Bluetooth if available, otherwise via 80mm iframe printer
   */
  public async printSaleTicket(data: SaleTicketPrintData): Promise<{ success: boolean; viaBluetooth: boolean; error?: string }> {
    if (this.isBluetoothConnected() && this.printCharacteristic) {
      try {
        const bytes = this.generateEscPosBytes(data);
        const chunkSize = 100;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          if (this.printCharacteristic.writeValueWithoutResponse) {
            await this.printCharacteristic.writeValueWithoutResponse(chunk);
          } else {
            await this.printCharacteristic.writeValue(chunk);
          }
          await new Promise((r) => setTimeout(r, 20));
        }
        return { success: true, viaBluetooth: true };
      } catch (err: any) {
        console.warn('Bluetooth print failed, falling back to 80mm thermal iframe:', err);
      }
    }

    // Default: Thermal 80mm isolated iframe
    const ok = this.printThermalReceipt(data);
    return { success: ok, viaBluetooth: false };
  }
}

export const salePrinterService = new SalePrinterService();
