import { Capacitor } from '@capacitor/core';
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from '@capacitor/barcode-scanner';

export interface ScannedFood {
  barcode: string;
  name: string;
  brand?: string;
  servingSize?: string;
  /** Net carbs for one serving when the label gives a serving, else per 100 g. */
  netCarbs: number;
  perServing: boolean;
  carbs: number;
  fiber: number;
  source: 'openfoodfacts';
}

/** Opens the native scanner UI and returns the barcode, or null if cancelled or unsupported. */
export async function scanBarcode(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { ScanResult } = await CapacitorBarcodeScanner.scanBarcode({ hint: CapacitorBarcodeScannerTypeHint.ALL, scanText: 'Point at the barcode on the label' });
    const code = (ScanResult || '').trim();
    return code || null;
  } catch (err) {
    console.warn('barcode scan failed', err);
    return null;
  }
}

interface OffProduct {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

function num(v: number | string | undefined): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Looks a barcode up on Open Food Facts (free, no key). Returns null when unknown. */
export async function lookupBarcode(code: string): Promise<ScannedFood | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,serving_size,nutriments`;
  const res = await fetch(url, { headers: { 'User-Agent': 'FuelTracker/1.1 (support: unksleer.github.io/app-support)' } });
  if (!res.ok) return null;
  const json = (await res.json()) as { status?: number; product?: OffProduct };
  const p = json.product;
  if (!p || json.status === 0) return null;
  const n = p.nutriments ?? {};
  const carbsServing = num(n['carbohydrates_serving']);
  const fiberServing = num(n['fiber_serving']);
  const carbs100 = num(n['carbohydrates_100g']);
  const fiber100 = num(n['fiber_100g']);
  const perServing = carbsServing !== undefined;
  const carbs = perServing ? carbsServing : carbs100;
  if (carbs === undefined) return null;
  const fiber = (perServing ? fiberServing : fiber100) ?? 0;
  return {
    barcode: code,
    name: (p.product_name || '').trim() || `Item ${code}`,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    servingSize: p.serving_size?.trim() || undefined,
    netCarbs: Math.max(0, Math.round((carbs - fiber) * 10) / 10),
    perServing,
    carbs,
    fiber,
    source: 'openfoodfacts',
  };
}
