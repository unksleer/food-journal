import type { DayLog, Entry, EntryKind, KetoneMethod, Meal, Settings, Tier } from '../types';

export interface TierInfo {
  key: Tier;
  kind: EntryKind;
  label: string;
  short: string;
  /** value per unit of amount */
  perUnit: number;
  unit: string;
  hint: string;
}

export const TIERS: TierInfo[] = [
  { key: 'VLP', kind: 'protein', label: 'Very lean', short: 'VLP', perUnit: 35, unit: 'oz', hint: '35 cal per oz' },
  { key: 'LP', kind: 'protein', label: 'Lean', short: 'LP', perUnit: 55, unit: 'oz', hint: '55 cal per oz' },
  { key: 'MP', kind: 'protein', label: 'Medium', short: 'MP', perUnit: 75, unit: 'oz', hint: '75 cal per oz' },
  { key: 'NSV', kind: 'carb', label: 'Non-starchy veg', short: 'NSV', perUnit: 5, unit: 'serving', hint: '5 g net per 1 c raw or ½ c cooked' },
  { key: 'SV', kind: 'carb', label: 'Starchy veg', short: 'SV', perUnit: 12, unit: 'serving', hint: '10–15 g net per ½ c cooked' },
  { key: 'F', kind: 'carb', label: 'Fruit', short: 'F', perUnit: 15, unit: 'serving', hint: '15 g net per ½ c or 1 small' },
  { key: 'G', kind: 'carb', label: 'Other carb', short: 'G', perUnit: 0, unit: 'serving', hint: 'enter net carbs from the label' },
  { key: 'FAT', kind: 'fat', label: 'Healthy fat', short: 'FAT', perUnit: 5, unit: 'serving', hint: '5 g fat, about 45 cal per serving' },
];

export function tiersFor(kind: EntryKind): TierInfo[] {
  return TIERS.filter(t => t.kind === kind);
}

export function tierInfo(key: Tier | undefined): TierInfo | undefined {
  return TIERS.find(t => t.key === key);
}

export function valueUnit(kind: EntryKind): string {
  return kind === 'protein' ? 'kcal' : 'g';
}

export function defaultTier(kind: EntryKind): Tier {
  return kind === 'protein' ? 'LP' : kind === 'carb' ? 'NSV' : 'FAT';
}

export interface DayTotals {
  proteinKcal: number;
  netCarbs: number;
  fatGrams: number;
  fatKcal: number;
  carbKcal: number;
  totalKcal: number;
}

export function dayTotals(day: DayLog | undefined): DayTotals {
  const t: DayTotals = { proteinKcal: 0, netCarbs: 0, fatGrams: 0, fatKcal: 0, carbKcal: 0, totalKcal: 0 };
  if (!day) return t;
  for (const e of day.entries) {
    if (e.kind === 'protein') t.proteinKcal += e.value || 0;
    else if (e.kind === 'carb') t.netCarbs += e.value || 0;
    else t.fatGrams += e.value || 0;
  }
  t.carbKcal = t.netCarbs * 4;
  t.fatKcal = t.fatGrams * 9;
  t.totalKcal = t.proteinKcal + t.carbKcal + t.fatKcal;
  return t;
}

export function mealTotals(entries: Entry[], meal: Meal): { kcal: number; carbs: number } {
  let kcal = 0;
  let carbs = 0;
  for (const e of entries) {
    if (e.meal !== meal) continue;
    if (e.kind === 'protein') kcal += e.value;
    else if (e.kind === 'carb') { carbs += e.value; kcal += e.value * 4; }
    else kcal += e.value * 9;
  }
  return { kcal, carbs };
}

export type DayStatus = 'empty' | 'on-plan' | 'over' | 'in-progress';

export function dayStatus(day: DayLog | undefined, settings: Settings, isToday: boolean): DayStatus {
  if (!day || day.entries.length === 0) return 'empty';
  const t = dayTotals(day);
  if (t.netCarbs > settings.carbLimit) return 'over';
  if (isToday) return 'in-progress';
  return 'on-plan';
}

export function mealForHour(h: number = new Date().getHours()): Meal {
  if (h < 10) return 'B';
  if (h < 14) return 'L';
  if (h < 17) return 'S';
  return 'D';
}

export interface KetoneZone {
  key: 'none' | 'light' | 'optimal' | 'high' | 'caution';
  label: string;
}

/** Zones are the commonly cited nutritional-ketosis ranges; informational only. */
export function ketoneZone(value: number | undefined, method: KetoneMethod): KetoneZone | undefined {
  if (value === undefined || Number.isNaN(value)) return undefined;
  if (method === 'blood') {
    if (value < 0.5) return { key: 'none', label: 'Below ketosis' };
    if (value < 1.5) return { key: 'light', label: 'Light ketosis' };
    if (value <= 3.0) return { key: 'optimal', label: 'Optimal nutritional ketosis' };
    if (value <= 5.0) return { key: 'high', label: 'High' };
    return { key: 'caution', label: 'Very high, check with your clinic' };
  }
  if (method === 'breath') {
    if (value < 2) return { key: 'none', label: 'Below ketosis' };
    if (value < 10) return { key: 'light', label: 'Light ketosis' };
    if (value <= 40) return { key: 'optimal', label: 'Ketosis' };
    return { key: 'high', label: 'High' };
  }
  if (value < 5) return { key: 'none', label: 'Negative' };
  if (value < 15) return { key: 'light', label: 'Trace to small' };
  if (value <= 40) return { key: 'optimal', label: 'Moderate' };
  return { key: 'high', label: 'Large' };
}

export function ketoneUnit(method: KetoneMethod): string {
  return method === 'blood' ? 'mmol/L' : method === 'breath' ? 'ppm' : 'mg/dL';
}

export function inKetosis(day: DayLog | undefined, settings: Settings): boolean {
  if (!day?.checkin.ketones) return false;
  const z = ketoneZone(day.checkin.ketones, day.checkin.ketoneMethod ?? settings.ketoneMethod);
  return !!z && (z.key === 'light' || z.key === 'optimal' || z.key === 'high');
}
