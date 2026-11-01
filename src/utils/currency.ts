/**
 * Utilities for parsing and formatting restaurant prices for Terreno Broaster POS.
 * Tailored for Colombian Pesos (COP):
 * - Currency: Pesos Colombianos (COP)
 * - Whole numbers formatted with dot thousands separator (e.g. 50.000, 8.000, 250.000)
 * - No centavos/decimals used in Colombian restaurant operations.
 */

export const CURRENCY_CODE = 'COP';
export const CURRENCY_NAME = 'Pesos Colombianos';
export const CURRENCY_SYMBOL = '$';

export function parsePrice(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }

  let s = String(val).trim();
  if (!s) return 0;

  // Remove currency symbols, spaces, COP suffixes
  s = s.replace(/[\$\sCOPcopBs]/g, '');

  if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Intelligent price parser that preserves Colombian thousands notation.
 * Specifically:
 * - "8.000" => 8000
 * - "50.000" => 50000
 * - "8000"  => 8000
 * - "8.50"  => 8.5
 * - "8,00"  => 8
 * - "8.000,50" => 8000.5
 */
export function safeParsePrice(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }

  let str = String(val).trim().replace(/[\$COPcopBs]/g, '').trim();

  // Pattern: "8.000" or "50.000" or "120.000" (dot followed by 3 digits)
  // In Colombia / Latin America this is a thousands separator!
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    return parseInt(str.replace(/\./g, ''), 10);
  }

  // Pattern: "8.000,00" or "8.000,50"
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(str)) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }

  // Pattern: "8,000.00" or "8,000"
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    return parseFloat(str.replace(/,/g, ''));
  }

  // Pattern: "8,50" or "8,00" (comma as decimal)
  if (/^\d+,\d+$/.test(str)) {
    return parseFloat(str.replace(',', '.'));
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats price cleanly according to Colombian Pesos (COP) conventions.
 * Colombian Pesos do not use cents/decimals:
 * e.g. 8000 => "$ 8.000"
 *      50000 => "$ 50.000"
 *      250000 => "$ 250.000"
 *
 * @param val Number or string price
 * @param withCopSuffix If true, outputs "$ 50.000 COP"
 */
export function formatPrice(val: any, withCopSuffix: boolean = false): string {
  const num = safeParsePrice(val);
  
  // Format in Colombian Pesos standard (thousands separated by dot)
  const isWhole = Math.abs(num % 1) < 0.001;
  const formatted = isWhole
    ? Math.round(num).toLocaleString('es-CO')
    : num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  if (withCopSuffix) {
    return `$ ${formatted} COP`;
  }
  return `$ ${formatted}`;
}

export const formatCurrency = (val: any) => formatPrice(val, false);
export const formatCurrencyCOP = (val: any) => formatPrice(val, true);

/**
 * Formats price as clean plain integer or decimal string for input fields
 */
export function formatPriceClean(val: any): string {
  const num = safeParsePrice(val);
  if (Math.abs(num % 1) < 0.001) {
    return Math.round(num).toString();
  }
  return num.toFixed(2);
}

