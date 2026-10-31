// Service for Bluetooth & Thermal Kitchen Comanda printing (ESC/POS & Browser Print)

export interface KitchenTicketItem {
  nombre: string;
  cantidad: number;
  notas?: string;
  categoria?: string;
}

export interface KitchenTicketData {
  nTicket: string;
  fecha: string;
  cliente: string;
  tipoServicio: string; // 'Mesas', 'Delivery', 'Para llevar', 'WhatsApp'
  ubicacion: string; // 'Mesa 1', 'Mesa 2', 'WhatsApp Delivery', etc.
  items: KitchenTicketItem[];
  notas?: string;
  telefono?: string;
  direccion?: string;
}

// Standard Bluetooth Thermal Printer GATT Services & Characteristics
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard ESC/POS Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
  0x18f0,
  0xff00,
];

class KitchenPrinterService {
  private bluetoothDevice: any = null;
  private printCharacteristic: any = null;
  private connectedPrinterName: string = '';
  private autoPrintEnabled: boolean = true;
  private activeTicket: KitchenTicketData | null = null;
  private onTicketChangeCallbacks: Set<(ticket: KitchenTicketData | null) => void> = new Set();
  private onConnectionChangeCallbacks: Set<(connected: boolean, name: string) => void> = new Set();

  constructor() {
    try {
      const savedName = localStorage.getItem('tb_bluetooth_printer_name');
      if (savedName) this.connectedPrinterName = savedName;

      const savedAuto = localStorage.getItem('tb_autoprint_kitchen');
      if (savedAuto !== null) {
        this.autoPrintEnabled = savedAuto === 'true';
      }
    } catch (e) {
      // Ignore localStorage restrictions
    }
  }

  public isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public isBluetoothConnected(): boolean {
    return Boolean(this.bluetoothDevice && this.bluetoothDevice.gatt && this.bluetoothDevice.gatt.connected && this.printCharacteristic);
  }

  public getConnectedPrinterName(): string {
    return this.connectedPrinterName;
  }

  public isAutoPrintEnabled(): boolean {
    return this.autoPrintEnabled;
  }

  public setAutoPrintEnabled(enabled: boolean): void {
    this.autoPrintEnabled = enabled;
    try {
      localStorage.setItem('tb_autoprint_kitchen', String(enabled));
    } catch (e) {}
  }

  public subscribeTicketChange(cb: (ticket: KitchenTicketData | null) => void): () => void {
    this.onTicketChangeCallbacks.add(cb);
    return () => this.onTicketChangeCallbacks.delete(cb);
  }

  public subscribeConnectionChange(cb: (connected: boolean, name: string) => void): () => void {
    this.onConnectionChangeCallbacks.add(cb);
    return () => this.onConnectionChangeCallbacks.delete(cb);
  }

  private notifyConnection(connected: boolean, name: string) {
    this.onConnectionChangeCallbacks.forEach((cb) => cb(connected, name));
  }

  private notifyTicket(ticket: KitchenTicketData | null) {
    this.activeTicket = ticket;
    this.onTicketChangeCallbacks.forEach((cb) => cb(ticket));
  }

  public getActiveTicket(): KitchenTicketData | null {
    return this.activeTicket;
  }

  public closeActiveTicket(): void {
    this.notifyTicket(null);
  }

  /**
   * Request Bluetooth Pairing with Thermal Receipt Printer
   */
  public async connectBluetoothPrinter(): Promise<{ success: boolean; printerName?: string; error?: string }> {
    if (!this.isWebBluetoothSupported()) {
      return {
        success: false,
        error: 'Tu navegador no soporta Web Bluetooth. Puedes imprimir comandas usando el diálogo de impresión del sistema.',
      };
    }

    try {
      // Request device filter
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES,
      });

      if (!device) {
        return { success: false, error: 'No se seleccionó ninguna impresora Bluetooth.' };
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.printCharacteristic = null;
        this.notifyConnection(false, this.connectedPrinterName);
      });

      const server = await device.gatt.connect();
      let characteristic = null;

      // Scan known printer services
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
        } catch (e) {
          // Continue to next service
        }
      }

      // If still not found, search all services
      if (!characteristic) {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const chars = await service.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                characteristic = c;
                break;
              }
            }
            if (characteristic) break;
          } catch (e) {}
        }
      }

      if (!characteristic) {
        return {
          success: false,
          error: 'No se encontró la característica de escritura en el dispositivo Bluetooth.',
        };
      }

      this.bluetoothDevice = device;
      this.printCharacteristic = characteristic;
      this.connectedPrinterName = device.name || 'Impresora Bluetooth Cocina';

      try {
        localStorage.setItem('tb_bluetooth_printer_name', this.connectedPrinterName);
      } catch (e) {}

      this.notifyConnection(true, this.connectedPrinterName);
      return { success: true, printerName: this.connectedPrinterName };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return { success: false, error: 'Búsqueda de Bluetooth cancelada.' };
      }
      return { success: false, error: err.message || 'Error al conectar con la impresora Bluetooth.' };
    }
  }

  public disconnectBluetoothPrinter(): void {
    if (this.bluetoothDevice && this.bluetoothDevice.gatt) {
      try {
        this.bluetoothDevice.gatt.disconnect();
      } catch (e) {}
    }
    this.bluetoothDevice = null;
    this.printCharacteristic = null;
    this.notifyConnection(false, this.connectedPrinterName);
  }

  /**
   * Build ESC/POS Byte Array for Kitchen Comanda Ticket
   */
  public generateEscPosBytes(data: KitchenTicketData): Uint8Array {
    const bytes: number[] = [];

    const addStr = (str: string) => {
      // Clean accents for POS printers ASCII compatibility
      const clean = str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      for (let i = 0; i < clean.length; i++) {
        bytes.push(clean.charCodeAt(i));
      }
    };

    // ESC @ : Initialize printer
    bytes.push(0x1b, 0x40);

    // ESC a 1 : Center alignment
    bytes.push(0x1b, 0x61, 0x01);

    // GS ! 0x11 : Double height & width
    bytes.push(0x1d, 0x21, 0x11);
    addStr('*** COCINA ***\n');

    // ESC ! 0x00 : Normal size
    bytes.push(0x1b, 0x21, 0x00);
    addStr('TERRENO BROASTER\n');
    addStr('================================\n');

    // Large table / location destination
    bytes.push(0x1d, 0x21, 0x11); // Double size
    addStr(`[ ${data.ubicacion.toUpperCase()} ]\n`);
    bytes.push(0x1b, 0x21, 0x00); // Normal size

    // ESC a 0 : Left alignment
    bytes.push(0x1b, 0x61, 0x00);
    addStr(`TICKET:  #${data.nTicket}\n`);
    addStr(`FECHA:   ${data.fecha}\n`);
    addStr(`CLIENTE: ${data.cliente}\n`);
    addStr(`TIPO:    ${data.tipoServicio}\n`);

    if (data.telefono) {
      addStr(`TEL:     ${data.telefono}\n`);
    }
    if (data.direccion) {
      addStr(`DIR:     ${data.direccion}\n`);
    }
    if (data.notas) {
      addStr(`NOTA:    ${data.notas}\n`);
    }

    addStr('--------------------------------\n');
    bytes.push(0x1b, 0x45, 0x01); // Bold on
    addStr('CANT  PRODUCTO / PLATO\n');
    bytes.push(0x1b, 0x45, 0x00); // Bold off
    addStr('--------------------------------\n');

    let totalCant = 0;
    data.items.forEach((item) => {
      totalCant += item.cantidad;
      // Large bold quantity and name
      bytes.push(0x1b, 0x45, 0x01); // Bold on
      addStr(` ${item.cantidad}x  ${item.nombre}\n`);
      bytes.push(0x1b, 0x45, 0x00); // Bold off

      if (item.notas && item.notas.trim()) {
        addStr(`     -> NOTA: ${item.notas.trim()}\n`);
      }
    });

    addStr('--------------------------------\n');
    bytes.push(0x1b, 0x45, 0x01);
    addStr(`TOTAL PRODUCTOS: ${totalCant}\n`);
    bytes.push(0x1b, 0x45, 0x00);
    addStr('================================\n');

    // Center alignment
    bytes.push(0x1b, 0x61, 0x01);
    addStr('¡PREPARAR CON PRIORIDAD!\n\n\n\n');

    // GS V 66 0 : Cut paper
    bytes.push(0x1d, 0x56, 0x42, 0x00);

    return new Uint8Array(bytes);
  }

  /**
   * Send ESC/POS bytes in chunks to Bluetooth Printer
   */
  public async printToBluetooth(data: KitchenTicketData): Promise<{ success: boolean; error?: string }> {
    if (!this.isBluetoothConnected() || !this.printCharacteristic) {
      return { success: false, error: 'No hay impresora Bluetooth conectada.' };
    }

    try {
      const bytes = this.generateEscPosBytes(data);
      const chunkSize = 100; // Safe MTU size for Bluetooth LE

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        if (this.printCharacteristic.writeValueWithoutResponse) {
          await this.printCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.printCharacteristic.writeValue(chunk);
        }
        // Small delay between packets
        await new Promise((r) => setTimeout(r, 20));
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error al imprimir por Bluetooth:', err);
      return { success: false, error: err.message || 'Error al transmitir datos a la impresora Bluetooth.' };
    }
  }

  /**
   * Print Kitchen Ticket (Dispatches to Bluetooth if connected, and opens ticket modal)
   */
  public async printComanda(ticket: KitchenTicketData): Promise<{ printedViaBluetooth: boolean; error?: string }> {
    // Notify active ticket modal
    this.notifyTicket(ticket);

    // If Bluetooth printer is connected, send direct ESC/POS command
    if (this.isBluetoothConnected()) {
      const res = await this.printToBluetooth(ticket);
      if (res.success) {
        return { printedViaBluetooth: true };
      }
      return { printedViaBluetooth: false, error: res.error };
    }

    // If not connected via Bluetooth, trigger browser print dialog automatically if enabled
    if (this.autoPrintEnabled) {
      setTimeout(() => {
        window.print();
      }, 300);
    }

    return { printedViaBluetooth: false };
  }
}

export const kitchenPrinterService = new KitchenPrinterService();
