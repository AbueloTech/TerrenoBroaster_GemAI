/**
 * Utilities for parsing and formatting restaurant prices for Terreno Broaster POS.
 * Solves the issue where 8.000 (meaning eight thousand) is wrongly parsed as 8.00.
 */

export function parsePrice(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }

  let s = String(val).trim();
  if (!s) return 0;

  // Remove currency symbols and spaces
  s = s.replace(/[\$\sBs\.]/g, (match) => {
    if (match === '.') {
      return '';
    }
    return '';
  });

  if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Intelligent price parser that preserves whether dot was thousands or decimal.
 * Specifically:
 * - "8.000" => 8000
 * - "8000"  => 8000
 * - "8.50"  => 8.5
 * - "8,00"  => 8
 * - "8.00"  => 8
 * - "8.000,50" => 8000.5
 */
export function safeParsePrice(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }

  let str = String(val).trim().replace(/[\$]/g, '').trim();

  // Pattern: "8.000" or "12.000" or "120.000" (dot followed by 3 digits)
  // In Latin America / Spanish notation this is a thousands separator!
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
 * Formats price cleanly.
 * If whole number: e.g. 8000 => "$8000" (or "$8000" instead of "$8,00" or "$8.00")
 * If with cents: e.g. 8.50 => "$8.50", 8000.5 => "$8000.50"
 */
export function formatPrice(val: any): string {
  const num = safeParsePrice(val);
  
  if (num % 1 === 0) {
    return `$${num.toString()}`;
  }

  return `$${num.toFixed(2)}`;
}

/**
 * Formats price with comma/dot option or plain clean number for inputs
 */
export function formatPriceClean(val: any): string {
  const num = safeParsePrice(val);
  if (num % 1 === 0) {
    return num.toString();
  }
  return num.toFixed(2);
}
