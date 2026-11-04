/**
 * Utility functions and types for Promotions in Terreno Broaster POS & Inventory
 */

export type TipoPromocion = 'Porcentaje' | 'PrecioFijo' | '2x1' | '3x1' | 'NxM';
export type VigenciaPromocion = 'Siempre' | 'Intervalo' | 'DiasSemana';

export interface PromoConfigItem {
  PromoActiva?: boolean | number;
  PromoTipo?: TipoPromocion;
  PromoValor?: number;
  PromoNxMLleva?: number;
  PromoNxMPaga?: number;
  PromoVigencia?: VigenciaPromocion;
  PromoFechaInicio?: string;
  PromoFechaFin?: string;
  PromoDiasSemana?: string | number[]; // e.g. "[1,3,5]" or [1,3,5]
  PromoEtiqueta?: string;
}

export interface PromoCalculation {
  isPromoActive: boolean;
  promoType: TipoPromocion;
  basePrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercent: number;
  badgeLabel: string;
  scheduleDescription?: string;
  detailSchedule?: string;
  isNxM?: boolean;
  nxmLleva?: number;
  nxmPaga?: number;
}

export const DIAS_SEMANA_MAP: { id: number; nombre: string; corto: string }[] = [
  { id: 1, nombre: 'Lunes', corto: 'Lun' },
  { id: 2, nombre: 'Martes', corto: 'Mar' },
  { id: 3, nombre: 'Miércoles', corto: 'Mié' },
  { id: 4, nombre: 'Jueves', corto: 'Jue' },
  { id: 5, nombre: 'Viernes', corto: 'Vie' },
  { id: 6, nombre: 'Sábado', corto: 'Sáb' },
  { id: 0, nombre: 'Domingo', corto: 'Dom' },
];

/**
 * Parses dias de semana from string, array, or JSON string into number[]
 */
export function parseDiasSemana(dias?: string | number[]): number[] {
  if (!dias) return [];
  if (Array.isArray(dias)) return dias.map(Number);
  try {
    const parsed = JSON.parse(dias);
    if (Array.isArray(parsed)) return parsed.map(Number);
  } catch {
    // try comma-separated
    return String(dias)
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n));
  }
  return [];
}

/**
 * Checks whether the promotion is active right now (or at given date)
 */
export function isPromoActive(item?: PromoConfigItem | null, targetDate: Date = new Date()): boolean {
  if (!item || !item.PromoActiva) return false;

  const vigencia = item.PromoVigencia || 'Siempre';

  if (vigencia === 'Siempre') {
    return true;
  }

  if (vigencia === 'Intervalo') {
    if (!item.PromoFechaInicio && !item.PromoFechaFin) return true;
    const nowStr = targetDate.toISOString().substring(0, 10);
    const start = item.PromoFechaInicio ? item.PromoFechaInicio.substring(0, 10) : '';
    const end = item.PromoFechaFin ? item.PromoFechaFin.substring(0, 10) : '';

    if (start && nowStr < start) return false;
    if (end && nowStr > end) return false;
    return true;
  }

  if (vigencia === 'DiasSemana') {
    const currentDay = targetDate.getDay(); // 0 is Sunday, 1 is Monday...
    const allowedDays = parseDiasSemana(item.PromoDiasSemana);
    if (allowedDays.length === 0) return true; // if no days selected, default active
    return allowedDays.includes(currentDay);
  }

  return true;
}

/**
 * Calculates current price, discount, and promo badge details.
 * Supports Porcentaje, PrecioFijo, 2x1, 3x1, and NxM (e.g. 3x2).
 */
export function calculatePromoPrice(
  basePriceOrItem: number | (PromoConfigItem & { Precio?: number; CostoDirecto?: number; PrecioOriginal?: number }),
  item?: PromoConfigItem | null,
  targetDate: Date = new Date()
): PromoCalculation {
  let cleanBase = 0;
  let promoItem: PromoConfigItem | null | undefined = item;

  if (typeof basePriceOrItem === 'object' && basePriceOrItem !== null) {
    cleanBase = Number(basePriceOrItem.Precio ?? basePriceOrItem.PrecioOriginal ?? basePriceOrItem.CostoDirecto ?? 0);
    promoItem = basePriceOrItem;
  } else {
    cleanBase = Number(basePriceOrItem) || 0;
  }

  const defaultResult: PromoCalculation = {
    isPromoActive: false,
    promoType: (promoItem?.PromoTipo as TipoPromocion) || 'Porcentaje',
    basePrice: cleanBase,
    finalPrice: cleanBase,
    discountAmount: 0,
    discountPercent: 0,
    badgeLabel: '',
    scheduleDescription: '',
    detailSchedule: '',
    isNxM: false,
    nxmLleva: 1,
    nxmPaga: 1,
  };

  if (!promoItem || cleanBase <= 0) {
    return defaultResult;
  }

  const active = isPromoActive(promoItem, targetDate);
  const tipo = (promoItem.PromoTipo as TipoPromocion) || 'Porcentaje';
  const valor = Number(promoItem.PromoValor) || 0;

  if (!active) {
    return defaultResult;
  }

  let finalPrice = cleanBase;
  let discountAmount = 0;
  let discountPercent = 0;
  let badgeLabel = promoItem.PromoEtiqueta?.trim() || '';
  let isNxM = false;
  let nxmLleva = 1;
  let nxmPaga = 1;

  if (tipo === 'Porcentaje') {
    if (valor <= 0) return defaultResult;
    discountPercent = Math.min(100, Math.max(1, valor));
    discountAmount = Math.round(cleanBase * (discountPercent / 100));
    finalPrice = Math.max(0, cleanBase - discountAmount);
    if (!badgeLabel) {
      badgeLabel = `-${discountPercent}%`;
    }
  } else if (tipo === 'PrecioFijo') {
    if (valor <= 0 || valor >= cleanBase) return defaultResult;
    finalPrice = Math.max(0, valor);
    discountAmount = cleanBase - finalPrice;
    discountPercent = cleanBase > 0 ? Math.round((discountAmount / cleanBase) * 100) : 0;
    if (!badgeLabel) {
      badgeLabel = `OFERTA`;
    }
  } else if (tipo === '2x1') {
    isNxM = true;
    nxmLleva = 2;
    nxmPaga = 1;
    discountPercent = 50;
    finalPrice = cleanBase; // Individual unit base price; bundle logic applies in cart
    if (!badgeLabel) {
      badgeLabel = '2x1';
    }
  } else if (tipo === '3x1') {
    isNxM = true;
    nxmLleva = 3;
    nxmPaga = 1;
    discountPercent = 67;
    finalPrice = cleanBase;
    if (!badgeLabel) {
      badgeLabel = '3x1';
    }
  } else if (tipo === 'NxM') {
    isNxM = true;
    nxmLleva = Math.max(2, Number(promoItem.PromoNxMLleva) || 2);
    nxmPaga = Math.max(1, Math.min(nxmLleva - 1, Number(promoItem.PromoNxMPaga) || 1));
    discountPercent = Math.round(((nxmLleva - nxmPaga) / nxmLleva) * 100);
    finalPrice = cleanBase;
    if (!badgeLabel) {
      badgeLabel = `${nxmLleva}x${nxmPaga}`;
    }
  }

  // Generate friendly schedule description
  let scheduleDescription = '';
  const vigencia = promoItem.PromoVigencia || 'Siempre';
  if (vigencia === 'DiasSemana') {
    const days = parseDiasSemana(promoItem.PromoDiasSemana);
    const dayNames = days.map((d) => DIAS_SEMANA_MAP.find((m) => m.id === d)?.corto || '').filter(Boolean);
    scheduleDescription = dayNames.length > 0 ? `Días: ${dayNames.join(', ')}` : 'Días programados';
  } else if (vigencia === 'Intervalo') {
    scheduleDescription = `Válido: ${promoItem.PromoFechaInicio || ''} al ${promoItem.PromoFechaFin || ''}`;
  } else {
    scheduleDescription = 'Permanente';
  }

  return {
    isPromoActive: true,
    promoType: tipo,
    basePrice: cleanBase,
    finalPrice,
    discountAmount,
    discountPercent,
    badgeLabel,
    scheduleDescription,
    detailSchedule: scheduleDescription,
    isNxM,
    nxmLleva,
    nxmPaga,
  };
}

export interface LineItemCalculation {
  total: number;
  baseTotal: number;
  discountTotal: number;
  isPromoApplied: boolean;
  freeUnits: number;
  promoNotice: string;
  badgeLabel: string;
}

/**
 * Calculates total for an item given quantity and active promotion (supports 2x1, 3x1, NxM)
 */
export function calculateLineItemTotal(
  basePrice: number,
  cantidad: number,
  item?: PromoConfigItem | null,
  targetDate: Date = new Date()
): LineItemCalculation {
  const cleanBase = Number(basePrice) || 0;
  const qty = Math.max(1, Number(cantidad) || 1);
  const baseTotal = cleanBase * qty;

  const promo = calculatePromoPrice(cleanBase, item, targetDate);

  if (!promo.isPromoActive) {
    return {
      total: baseTotal,
      baseTotal,
      discountTotal: 0,
      isPromoApplied: false,
      freeUnits: 0,
      promoNotice: '',
      badgeLabel: '',
    };
  }

  if (promo.isNxM && promo.nxmLleva && promo.nxmPaga) {
    const n = promo.nxmLleva;
    const m = promo.nxmPaga;
    const fullBundles = Math.floor(qty / n);
    const remainder = qty % n;
    const paidUnits = fullBundles * m + remainder;
    const freeUnits = qty - paidUnits;
    const total = paidUnits * cleanBase;
    const discountTotal = freeUnits * cleanBase;

    let promoNotice = '';
    if (freeUnits > 0) {
      promoNotice = `🔥 Promo ${promo.badgeLabel}: ¡${freeUnits} ${freeUnits === 1 ? 'gratis' : 'gratis'}!`;
    } else if (qty < n) {
      promoNotice = `Agrega ${n - qty} más para activar ${promo.badgeLabel}`;
    }

    return {
      total,
      baseTotal,
      discountTotal,
      isPromoApplied: freeUnits > 0,
      freeUnits,
      promoNotice,
      badgeLabel: promo.badgeLabel,
    };
  }

  // Standard Porcentaje or PrecioFijo
  const total = promo.finalPrice * qty;
  const discountTotal = baseTotal - total;

  return {
    total,
    baseTotal,
    discountTotal,
    isPromoApplied: true,
    freeUnits: 0,
    promoNotice: `🔥 Promo ${promo.badgeLabel} aplicada`,
    badgeLabel: promo.badgeLabel,
  };
}
