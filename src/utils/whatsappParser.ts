import { Plato, PedidoWhatsApp, PedidoWhatsAppItem, FormaPago } from '../types';

export interface ParsedWhatsAppOrder {
  nombreCliente: string;
  telefonoCliente: string;
  tipoEntrega: 'Delivery' | 'Para llevar';
  direccionEntrega: string;
  items: PedidoWhatsAppItem[];
  total: number;
  formaPago: FormaPago;
  notas: string;
}

/**
 * Normalizes text removing accents, punctuation quirks, and converting to lowercase for robust matching
 */
export function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Spanish words representing quantities
 */
const WORD_NUMBERS: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  media: 1,
  medio: 1,
};

/**
 * Extracts a leading or trailing quantity from an item segment text
 * e.g. "2x Combo Broaster" -> { qty: 2, cleanText: "combo broaster" }
 * e.g. "Balde Familiar x2" -> { qty: 2, cleanText: "balde familiar" }
 * e.g. "Dos Hamburguesas" -> { qty: 2, cleanText: "hamburguesas" }
 */
function extractQuantityAndText(rawSegment: string): { qty: number; text: string } {
  let seg = rawSegment.trim();
  // Remove leading bullets or emojis
  seg = seg.replace(/^[-*•>#🍗📦🛍️🛵]+\s*/, '').trim();

  // Strip trailing price notations e.g. " - $25.00", " [$25.00]", " ($25.00)", " - 25.00"
  seg = seg.replace(/\s*[-–]\s*\$?\s*\d+(?:[.,]\d+)?\s*$/, '').trim();
  seg = seg.replace(/\s*\[\$?\s*\d+(?:[.,]\d+)?\]\s*$/, '').trim();
  seg = seg.replace(/\s*\(\$?\s*\d+(?:[.,]\d+)?\)\s*$/, '').trim();

  // Pattern 1: Leading numeric quantity: "2x", "2 de", "2 -", "2"
  const leadingNumMatch = seg.match(/^(\d+)\s*(?:x|de|-|\.)?\s+(.+)/i);
  if (leadingNumMatch) {
    let text = leadingNumMatch[2].trim();
    text = text.replace(/\s*[-–]\s*\$?\s*\d+(?:[.,]\d+)?\s*$/, '').trim();
    return {
      qty: Math.max(1, parseInt(leadingNumMatch[1], 10)),
      text,
    };
  }

  // Pattern 2: Trailing numeric quantity: "Plato x2", "Plato (2)", "Plato 2x", "Plato x 3"
  const trailingNumMatch = seg.match(/(.+?)\s+(?:x\s*|\*|\(|\bx\b)?(\d+)(?:\s*\))?$/i);
  if (trailingNumMatch) {
    const candidateQty = parseInt(trailingNumMatch[2], 10);
    if (candidateQty > 0 && candidateQty <= 100) {
      let text = trailingNumMatch[1].trim();
      text = text.replace(/\s*[-–]\s*\$?\s*\d+(?:[.,]\d+)?\s*$/, '').trim();
      return {
        qty: candidateQty,
        text,
      };
    }
  }

  // Pattern 3: Spanish word quantity at start: "dos combos", "un balde"
  const leadingWordMatch = seg.match(/^([a-z]+)\s+(.+)/i);
  if (leadingWordMatch) {
    const wordKey = leadingWordMatch[1].toLowerCase();
    if (WORD_NUMBERS[wordKey]) {
      return {
        qty: WORD_NUMBERS[wordKey],
        text: leadingWordMatch[2].trim(),
      };
    }
  }

  return { qty: 1, text: seg };
}

/**
 * Finds the best matching dish in the restaurant menu for a given text fragment
 */
function matchDishInText(text: string, availablePlatos: Plato[]): { plato: Plato; score: number } | null {
  const normText = normalizeStr(text);
  if (!normText || normText.length < 2) return null;

  let bestPlato: Plato | null = null;
  let bestScore = 0;

  for (const plato of availablePlatos) {
    const normPlato = normalizeStr(plato.Plato);
    const platoWords = normPlato
      .split(/[\s+,()-]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2 && !['con', 'las', 'los', 'del', 'para', 'und', 'piezas', 'combo'].includes(w));

    // Exact string match
    if (normText === normPlato) {
      return { plato, score: 100 };
    }

    // Full inclusion
    if (normText.includes(normPlato)) {
      const score = 85 + (normPlato.length / (normText.length + 1)) * 10;
      if (score > bestScore) {
        bestScore = score;
        bestPlato = plato;
      }
      continue;
    }

    if (normPlato.includes(normText) && normText.length >= 4) {
      const score = 70 + (normText.length / normPlato.length) * 15;
      if (score > bestScore) {
        bestScore = score;
        bestPlato = plato;
      }
      continue;
    }

    // Word tokens overlap
    const matchedCount = platoWords.filter((w) => normText.includes(w)).length;
    if (matchedCount > 0) {
      const ratio = matchedCount / Math.max(1, platoWords.length);
      const score = ratio * 60 + matchedCount * 5;
      if (score > bestScore && score >= 35) {
        bestScore = score;
        bestPlato = plato;
      }
    }
  }

  return bestPlato && bestScore >= 35 ? { plato: bestPlato, score: bestScore } : null;
}

/**
 * Parses raw WhatsApp message into structured order fields matching restaurant dishes.
 * Fully supports multiple dishes per line, comma-separated lists, and flexible customer data.
 */
export function parseWhatsAppMessage(
  rawText: string,
  availablePlatos: Plato[]
): ParsedWhatsAppOrder {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let nombreCliente = '';
  let telefonoCliente = '';
  let tipoEntrega: 'Delivery' | 'Para llevar' = 'Delivery';
  let direccionEntrega = '';
  let formaPago: FormaPago = 'Efectivo';
  const notesLines: string[] = [];
  const detectedItems: PedidoWhatsAppItem[] = [];

  const normAll = normalizeStr(rawText);

  // Delivery vs Pickup detection
  if (
    normAll.includes('para llevar') ||
    normAll.includes('pasar buscando') ||
    normAll.includes('retiro en local') ||
    normAll.includes('retirar en restaurante') ||
    normAll.includes('recojo') ||
    normAll.includes('pick up') ||
    normAll.includes('pickup') ||
    normAll.includes('voy a retirar')
  ) {
    tipoEntrega = 'Para llevar';
  } else {
    tipoEntrega = 'Delivery';
  }

  // Payment method detection
  if (
    normAll.includes('pago movil') ||
    normAll.includes('pagomovil') ||
    normAll.includes('sinpe') ||
    normAll.includes('nequi') ||
    normAll.includes('daviplata') ||
    normAll.includes('yape') ||
    normAll.includes('plin') ||
    normAll.includes('bizum') ||
    normAll.includes('pix')
  ) {
    formaPago = 'Pago Movil';
  } else if (
    normAll.includes('punto') ||
    normAll.includes('tarjeta') ||
    normAll.includes('pos') ||
    normAll.includes('debito') ||
    normAll.includes('credito')
  ) {
    formaPago = 'Punto de Venta';
  } else if (
    normAll.includes('transferencia') ||
    normAll.includes('banco') ||
    normAll.includes('zelle') ||
    normAll.includes('iban')
  ) {
    formaPago = 'Transferencia';
  } else {
    formaPago = 'Efectivo';
  }

  // Candidate lines that might contain dishes
  const foodCandidateLines: string[] = [];

  // 1. Scan metadata lines
  for (const line of lines) {
    const normLine = normalizeStr(line);

    // Extract Name
    const nameMatch = line.match(/(?:nombre|cliente|a\s+nombre\s+de|soy)\s*[:=-]?\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,40})/i);
    if (nameMatch && nameMatch[1] && !normLine.includes('plato') && !normLine.includes('combo')) {
      nombreCliente = nameMatch[1].trim();
      continue;
    }

    // Extract Phone
    const phoneMatch = line.match(/(?:tel[eé]fono|tlf|cel|whatsapp|movil|contacto)?\s*[:=-]?\s*(\+?\d[\d\s\-().]{6,16}\d)/i);
    if (phoneMatch && phoneMatch[1]) {
      const cleanPhone = phoneMatch[1].replace(/[^\d+]/g, '');
      if (cleanPhone.length >= 7) {
        telefonoCliente = phoneMatch[1].trim();
        continue;
      }
    }

    // Extract Address
    const addressMatch = line.match(/(?:direcci[oó]n|dir|ubicaci[oó]n|enviar\s+a|despachar\s+a|calle|av|avenida|residencia|edif|casa)\s*[:=-]?\s*(.+)/i);
    if (addressMatch && addressMatch[1] && !normLine.startsWith('nombre') && !normLine.startsWith('tel')) {
      direccionEntrega = line.replace(/^(?:direcci[oó]n|dir|ubicaci[oó]n|enviar\s+a|despachar\s+a)\s*[:=-]?\s*/i, '').trim();
      continue;
    }

    // Extract Payment line if specific
    const pagoMatch = line.match(/(?:forma\s+de\s+pago|pago|metodo\s+de\s+pago)\s*[:=-]?\s*(.+)/i);
    if (pagoMatch && pagoMatch[1]) {
      const pText = normalizeStr(pagoMatch[1]);
      if (pText.includes('efectivo') || pText.includes('cash') || pText.includes('dolar')) formaPago = 'Efectivo';
      else if (pText.includes('tarjeta') || pText.includes('punto')) formaPago = 'Punto de Venta';
      else if (pText.includes('transferencia') || pText.includes('zelle')) formaPago = 'Transferencia';
      else if (pText.includes('movil') || pText.includes('nequi') || pText.includes('yape')) formaPago = 'Pago Movil';
      continue;
    }

    // Extract Delivery type line
    if (/^(?:tipo|servicio|entrega)\s*[:=-]?\s*(.+)/i.test(line)) {
      if (/llevar|retir|local/i.test(line)) tipoEntrega = 'Para llevar';
      else tipoEntrega = 'Delivery';
      continue;
    }

    foodCandidateLines.push(line);
  }

  // 2. Multi-item segment splitting:
  // Customers frequently list multiple dishes separated by commas, semicolons, plus signs,
  // or "y" (e.g., "1 Balde Broaster, 2 Papas Rusticas y 3 Refrescos").
  // We split lines into individual item candidates!
  const itemSegments: string[] = [];

  for (const rawLine of foodCandidateLines) {
    let cleanLine = rawLine;

    // Strip generic prefixes like "Pedido:", "Quiero:", "Orden:", "Por favor:"
    cleanLine = cleanLine.replace(/^(?:pedido|orden|platos?|quiero|solicito|deseo)\s*[:=-]?\s*/i, '').trim();

    // If line has comma, plus, semicolon, or " y " separating items, split them!
    // Example: "2 Combos Broaster, 1 Papas Fritas + 2 Refrescos" -> ["2 Combos Broaster", "1 Papas Fritas", "2 Refrescos"]
    // Example: "1 Balde Broaster y 2 Papas" -> ["1 Balde Broaster", "2 Papas"]
    const splitTokens = cleanLine
      .split(/(?:,|\+|\;|\band\b|\s+y\s+(?=\d|\bun\b|\bdos\b|\btres\b|\b[a-záéíóú]+\b))/i)
      .map((t) => t.trim())
      .filter((t) => t.length > 2);

    if (splitTokens.length > 1) {
      itemSegments.push(...splitTokens);
    } else {
      itemSegments.push(cleanLine);
    }
  }

  // 3. Match each segment to menu dishes
  for (const segment of itemSegments) {
    const { qty, text } = extractQuantityAndText(segment);
    const matched = matchDishInText(text, availablePlatos);

    if (matched) {
      // Check if this dish was already added in this order: if so, increment quantity
      const existing = detectedItems.find((i) => i.platoId === matched.plato.ID);
      if (existing) {
        existing.cantidad += qty;
      } else {
        detectedItems.push({
          platoId: matched.plato.ID,
          platoNombre: matched.plato.Plato,
          cantidad: qty,
          precioUnitario: matched.plato.Precio,
          categoria: matched.plato.Categoria,
        });
      }
    } else {
      // Check if it's a polite conversational phrase or a note
      const normSeg = normalizeStr(segment);
      if (
        !normSeg.includes('hola') &&
        !normSeg.includes('buenas') &&
        !normSeg.includes('gracias') &&
        !normSeg.includes('por favor') &&
        !normSeg.includes('saludos') &&
        segment.length > 3
      ) {
        notesLines.push(segment);
      }
    }
  }

  // 4. Secondary fallback scan:
  // If no items were detected by segmentation (e.g. dense paragraph), scan all available dishes in text
  if (detectedItems.length === 0 && availablePlatos.length > 0) {
    // Sort platos by name length descending so specific combos match before generic words
    const sortedPlatos = [...availablePlatos].sort((a, b) => b.Plato.length - a.Plato.length);
    for (const plato of sortedPlatos) {
      const normPlato = normalizeStr(plato.Plato);
      if (normPlato.length < 3) continue;

      // Check if dish name is in the full message
      if (normAll.includes(normPlato)) {
        // Try to find quantity right before the dish name in rawText
        const regexBefore = new RegExp(`(?:(\\d+)\\s*(?:x|de)?|[a-z]+\\s+)?${normPlato.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        const match = normAll.match(regexBefore);
        let foundQty = 1;
        if (match && match[1]) {
          foundQty = parseInt(match[1], 10) || 1;
        }

        detectedItems.push({
          platoId: plato.ID,
          platoNombre: plato.Plato,
          cantidad: foundQty,
          precioUnitario: plato.Precio,
          categoria: plato.Categoria,
        });
      }
    }
  }

  // 5. Default values if missing
  if (!nombreCliente) {
    nombreCliente = 'Cliente WhatsApp';
  }
  if (!telefonoCliente) {
    telefonoCliente = '';
  }

  // If still zero items detected, assign first dish as placeholder with warning note
  if (detectedItems.length === 0 && availablePlatos.length > 0) {
    const defaultP = availablePlatos[0];
    detectedItems.push({
      platoId: defaultP.ID,
      platoNombre: defaultP.Plato,
      cantidad: 1,
      precioUnitario: defaultP.Precio,
      categoria: defaultP.Categoria,
      notas: 'Verificar platos del mensaje',
    });
  }

  const total = detectedItems.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);

  return {
    nombreCliente,
    telefonoCliente,
    tipoEntrega,
    direccionEntrega: direccionEntrega || (tipoEntrega === 'Delivery' ? 'Dirección pendiente por confirmar' : 'Retiro en restaurante'),
    items: detectedItems,
    total,
    formaPago,
    notas: notesLines.slice(0, 3).join(' | '),
  };
}

/**
 * Formats a WhatsApp Web direct link to reply back to customer
 */
export function buildWhatsAppReplyUrl(
  phoneNumber: string,
  pedido: PedidoWhatsApp,
  tipoMensaje: 'recibido' | 'en_camino' | 'listo_retiro' | 'personalizado',
  customText?: string
): string {
  const cleanPhone = phoneNumber.replace(/[^\d]/g, '');

  let text = '';
  const itemsSummary = pedido.Items.map((i) => `• ${i.cantidad}x ${i.platoNombre}`).join('\n');

  if (tipoMensaje === 'recibido') {
    text = `¡Hola *${pedido.NombreCliente}*! 👋🍗\n\n` +
      `Recibimos tu pedido en *TERRENO BROASTER*:\n` +
      `${itemsSummary}\n\n` +
      `💰 *Total:* $${pedido.Total.toFixed(2)}\n` +
      `🛵 *Entrega:* ${pedido.TipoEntrega}${pedido.DireccionEntrega ? ` (${pedido.DireccionEntrega})` : ''}\n` +
      `💳 *Pago:* ${pedido.FormaPago}\n` +
      `⏱️ *Estado:* ¡Tu pedido ya está en preparación en cocina!\n\n` +
      `¡Muchas gracias por preferirnos! Te avisaremos apenas esté listo. 🔥`;
  } else if (tipoMensaje === 'en_camino') {
    text = `¡Hola *${pedido.NombreCliente}*! 🛵💨\n\n` +
      `Tu pedido de *TERRENO BROASTER* va *EN CAMINO* a tu dirección:\n` +
      `📍 ${pedido.DireccionEntrega || 'Dirección registrada'}\n\n` +
      `💵 Recuerda tener listo tu pago: $${pedido.Total.toFixed(2)} (${pedido.FormaPago})\n` +
      `¡Buen provecho! 🍗✨`;
  } else if (tipoMensaje === 'listo_retiro') {
    text = `¡Hola *${pedido.NombreCliente}*! 🛍️✨\n\n` +
      `Tu pedido ya está *LISTO PARA RETIRAR* en el restaurante *TERRENO BROASTER* caliente y crujiente.\n` +
      `Ticket: *${pedido.NTicket || 'WA-' + pedido.Id}*\n\n` +
      `¡Te esperamos! 🍗🔥`;
  } else if (customText) {
    text = customText;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export interface DigitalMenuOrderPayload {
  nombreCliente: string;
  telefonoCliente: string;
  tipoEntrega: 'Delivery' | 'Para llevar';
  direccionEntrega?: string;
  formaPago: FormaPago;
  notas?: string;
  items: {
    plato: Plato;
    cantidad: number;
    nota?: string;
  }[];
  total: number;
}

/**
 * Generates an exact, standardized WhatsApp message from the customer digital menu cart.
 * Uses the exact plate names from the database so the restaurant parser achieves 100% accuracy.
 */
export function generateCustomerOrderWhatsAppMessage(order: DigitalMenuOrderPayload): string {
  const itemsText = order.items
    .map((item) => {
      const sub = (item.plato.Precio * item.cantidad).toFixed(2);
      const noteStr = item.nota ? ` (${item.nota})` : '';
      return `• ${item.cantidad}x ${item.plato.Plato}${noteStr} - $${sub}`;
    })
    .join('\n');

  return (
    `🍗 *NUEVO PEDIDO - TERRENO BROASTER* 🍗\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Cliente:* ${order.nombreCliente}\n` +
    `📱 *Teléfono:* ${order.telefonoCliente || 'No especificado'}\n` +
    `🛵 *Servicio:* ${order.tipoEntrega}\n` +
    `📍 *Dirección:* ${order.direccionEntrega || (order.tipoEntrega === 'Delivery' ? 'Por confirmar' : 'Retiro en restaurante')}\n` +
    `💳 *Forma de Pago:* ${order.formaPago}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *PLATOS SELECCIONADOS:*\n` +
    `${itemsText}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *TOTAL A PAGAR:* $${order.total.toFixed(2)}\n` +
    (order.notas ? `📝 *Notas:* ${order.notas}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `¡Pedido generado desde el Menú Digital Terreno Broaster!`
  );
}

/**
 * Builds direct WhatsApp URL containing the standardized digital menu order
 */
export function buildDigitalMenuWhatsAppUrl(
  restaurantPhone: string,
  order: DigitalMenuOrderPayload
): string {
  const cleanPhone = restaurantPhone.replace(/[^\d]/g, '');
  const message = generateCustomerOrderWhatsAppMessage(order);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Returns the URL that customers can open or scan via QR to browse the Digital Menu on mobile.
 * Generates a clean URL and optionally embeds a compact base64 catalog hash so mobile phones
 * decode authentic SQLite dishes immediately even before network requests finish.
 */
export function buildDigitalMenuUrl(restaurantPhone?: string, platos?: Plato[]): string {
  if (typeof window === 'undefined') return '/?menu=true';
  const base = `${window.location.origin}${window.location.pathname}`;
  const clean = restaurantPhone ? restaurantPhone.replace(/[^\d]/g, '') : '';
  const url = clean ? `${base}?menu=true&phone=${clean}` : `${base}?menu=true`;

  if (platos && Array.isArray(platos) && platos.length > 0 && platos.length <= 40) {
    try {
      const compact = platos.map((p) => [
        p.ID,
        p.Plato,
        p.Precio,
        p.Categoria || '',
        p.Imagen || '',
      ]);
      const jsonStr = JSON.stringify(compact);
      const hash = btoa(unescape(encodeURIComponent(jsonStr)));
      if (hash && hash.length <= 1800) {
        return `${url}#c=${hash}`;
      }
    } catch {
      // fallback to clean url
    }
  }

  return url;
}

/**
 * Creates customer link that people can click or scan via QR code to send an order to restaurant
 */
export function buildCustomerOrderLink(restaurantPhone: string): string {
  const cleanPhone = restaurantPhone.replace(/[^\d]/g, '');
  const template = `¡Hola Terreno Broaster! 🍗 Quiero hacer un pedido:\n\n` +
    `• Nombre:\n` +
    `• Pedido (Platos y Cantidades):\n` +
    `• Tipo: (Delivery / Para llevar)\n` +
    `• Dirección de Entrega:\n` +
    `• Forma de Pago: (Efectivo / Transferencia / Tarjeta)`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(template)}`;
}

/**
 * Sample simulated incoming messages for demo & testing multi-item parsing
 */
export const SAMPLE_WHATSAPP_MESSAGES = [
  {
    title: 'Multi-platos en 1 sola línea (Comas)',
    sender: 'Carlos Mendoza',
    phone: '+1 (555) 345-6789',
    text: `Hola buenas noches! Quiero para delivery: 1 Balde Broaster Familiar, 2 Papas Rusticas, 3 Tequeños Tradicionales
Nombre: Carlos Mendoza
Teléfono: +1 555 345-6789
Dirección: Calle Principal Los Samanes, Residencias Doral, Torre B, Apto 5-2
Pago: Efectivo
Nota: Por favor salsas extras`,
  },
  {
    title: 'Combos + Hamburguesa + Refrescos (Para Llevar)',
    sender: 'Mariana Valero',
    phone: '+52 55 1234 5678',
    text: `Buenas tardes Terreno Broaster! Para retirar en el restaurante:
- 2 Combo Broaster 2 Piezas + Papas + Ensalada
- 1 Hamburguesa Crispy Broaster con Queso
Nombre: Mariana Valero
Teléfono: +52 55 1234 5678
Tipo: Para llevar
Pago: Tarjeta en el local
Paso buscando en 20 minutos`,
  },
  {
    title: 'Alitas + Tenders + Papas (Conector "+")',
    sender: 'Roberto Silva',
    phone: '+57 300 987 6543',
    text: `Hola amigos, quiero pedir: 2 Alitas Broaster Crispy + 1 Tenders de Pollo Crujiente + 1 Papas Rusticas
Cliente: Roberto Silva
Tlf: +57 300 987 6543
Dirección: Urbanización El Valle, Casa #45 frente al parque
Forma de Pago: Transferencia`,
  },
];
