import { Plato, Venta, DetalleVenta, Comanda } from '../types';

// Real database mode: no test/mock dishes are hardcoded.
// All dishes come exclusively from table 'Platos' in TerrenoBroaster.db.
export const DEFAULT_PLATOS: Omit<Plato, 'ID'>[] = [];

// Sample gastronomical images mapped by common dish names/keywords
export const SAMPLE_FALLBACK_IMAGES: Record<string, string> = {};

// Empty initial sales - real sales come from TerrenoBroaster.db
export function generateSeedSales(): { ventas: Venta[]; detalles: DetalleVenta[] } {
  return { ventas: [], detalles: [] };
}

// Empty initial comandas - real comandas come from TerrenoBroaster.db
export function generateSeedComandas(): { comandas: Comanda[]; detallesComandas: DetalleVenta[] } {
  return { comandas: [], detallesComandas: [] };
}
