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

export interface WeekSummary {
  start: string;
  end: string;
  daysLogged: number;
  daysOnPlan: number;
  avgNetCarbs: number;
  avgProteinKcal: number;
  weightStart?: number;
  weightEnd?: number;
  weightDelta?: number;
  avgKetones?: number;
  bestStreak: number;
}

/** Longest run of consecutive on-plan days anywhere in the journal (today counts if it is on plan so far). */
export function bestStreak(days: Record<string, DayLog>, settings: Settings, today: string): number {
  const dates = Object.keys(days).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    const st = dayStatus(days[d], settings, d === today);
    const good = st === 'on-plan' || (st === 'in-progress' && dayTotals(days[d]).netCarbs <= settings.carbLimit);
    if (!good) { run = 0; prev = null; continue; }
    if (prev !== null) {
      const gap = (Date.parse(d + 'T12:00:00') - Date.parse(prev + 'T12:00:00')) / 86_400_000;
      run = Math.round(gap) === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    prev = d;
    if (run > best) best = run;
  }
  return best;
}

export function weekSummary(days: Record<string, DayLog>, settings: Settings, dates: string[], today: string): WeekSummary {
  const logged = dates.filter(d => days[d] && days[d].entries.length > 0);
  const onPlan = dates.filter(d => {
    const st = dayStatus(days[d], settings, d === today);
    return st === 'on-plan' || (st === 'in-progress' && dayTotals(days[d]).netCarbs <= settings.carbLimit);
  }).length;
  const totals = logged.map(d => dayTotals(days[d]));
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const weights = dates.map(d => days[d]?.checkin.weight).filter((w): w is number => typeof w === 'number');
  const ketones = dates.map(d => days[d]?.checkin).filter(c => c && typeof c.ketones === 'number' && (c.ketoneMethod ?? settings.ketoneMethod) === 'blood').map(c => c!.ketones as number);
  return {
    start: dates[0],
    end: dates[dates.length - 1],
    daysLogged: logged.length,
    daysOnPlan: onPlan,
    avgNetCarbs: avg(totals.map(t => t.netCarbs)),
    avgProteinKcal: avg(totals.map(t => t.proteinKcal)),
    weightStart: weights[0],
    weightEnd: weights[weights.length - 1],
    weightDelta: weights.length >= 2 ? weights[weights.length - 1] - weights[0] : undefined,
    avgKetones: ketones.length ? avg(ketones) : undefined,
    bestStreak: bestStreak(days, settings, today),
  };
}
