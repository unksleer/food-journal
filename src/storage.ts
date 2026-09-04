import { DEFAULT_SETTINGS, emptyDay, uid } from './types';
import type { DayLog, Entry, Meal, Settings, Tier } from './types';
import { mealForHour } from './lib/nutrition';
import { todayStr } from './lib/date';

const NS = 'ft2:';
const KEY_INDEX = NS + 'days';
const KEY_SETTINGS = NS + 'settings';
const KEY_MIGRATED = NS + 'migrated';
const LEGACY_HISTORY = 'food-journal-history';
const LEGACY_LOG = 'food-journal-log';

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('storage write failed', key, err);
  }
}

function dayKey(date: string) {
  return NS + 'day:' + date;
}

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>(KEY_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(s ?? {}), favorites: s?.favorites ?? [] };
}

export function saveSettings(s: Settings) {
  write(KEY_SETTINGS, s);
}

export function loadAllDays(): Record<string, DayLog> {
  const index = read<string[]>(KEY_INDEX) ?? [];
  const out: Record<string, DayLog> = {};
  for (const date of index) {
    const d = read<DayLog>(dayKey(date));
    if (d) out[date] = normalizeDay(d);
  }
  return out;
}

export function saveDay(day: DayLog) {
  const index = new Set(read<string[]>(KEY_INDEX) ?? []);
  const isEmpty =
    day.entries.length === 0 && day.water === 0 && day.activities.length === 0 && !day.notes &&
    Object.keys(day.checkin).length === 0;
  if (isEmpty) {
    // Do not clutter the index with untouched days, but never delete a day that had data.
    if (!index.has(day.date)) return;
  }
  write(dayKey(day.date), day);
  if (!index.has(day.date)) {
    index.add(day.date);
    write(KEY_INDEX, [...index].sort());
  }
}

function normalizeDay(d: Partial<DayLog> & { date: string }): DayLog {
  return {
    ...emptyDay(d.date),
    ...d,
    entries: d.entries ?? [],
    activities: d.activities ?? [],
    checkin: d.checkin ?? {},
  };
}

/* ---------- Legacy (v3.1) migration ---------- */

interface LegacyFood { id?: string; source: string; time: string; serving: string; calories: number }
interface LegacyCarb { id?: string; source: string; time: string; serving: string; netCarbs: number }
interface LegacyFat { id?: string; source: string; time: string; serving: string; fatGrams: number }
interface LegacyActivity { id?: string; type: string; duration: string; calories?: string }
interface LegacyLog {
  date: string;
  proteinGoal?: string;
  notes?: string;
  waterIntake?: number;
  foodEntries?: LegacyFood[];
  carbEntries?: LegacyCarb[];
  fatSourceEntries?: LegacyFat[];
  activities?: LegacyActivity[];
}

function legacyMeal(time: string | undefined): Meal {
  if (!time) return 'S';
  const t = time.toUpperCase();
  if (t === 'B' || t === 'L' || t === 'D' || t === 'S') return t;
  const h = parseInt(t.split(':')[0], 10);
  return Number.isNaN(h) ? 'S' : mealForHour(h);
}

function parseServing(s: string | undefined): number {
  const n = parseFloat((s ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function convertLegacyDay(l: LegacyLog): DayLog {
  const createdAt = Date.now();
  const entries: Entry[] = [];
  for (const f of l.foodEntries ?? []) {
    if (!f.source) continue;
    entries.push({ id: f.id || uid(), kind: 'protein', name: f.source, amount: parseServing(f.serving), unit: 'oz', value: Number(f.calories) || 0, meal: legacyMeal(f.time), createdAt });
  }
  for (const c of l.carbEntries ?? []) {
    if (!c.source) continue;
    const tier = (['NSV', 'SV', 'F', 'G'] as Tier[]).includes(c.time as Tier) ? (c.time as Tier) : 'G';
    entries.push({ id: c.id || uid(), kind: 'carb', name: c.source, tier, amount: parseServing(c.serving), unit: 'serving', value: Number(c.netCarbs) || 0, meal: 'L', createdAt });
  }
  for (const f of l.fatSourceEntries ?? []) {
    if (!f.source) continue;
    entries.push({ id: f.id || uid(), kind: 'fat', name: f.source, tier: 'FAT', amount: parseServing(f.serving), unit: 'serving', value: Number(f.fatGrams) || 0, meal: legacyMeal(f.time), createdAt });
  }
  return {
    date: l.date,
    entries,
    water: Number(l.waterIntake) || 0,
    activities: (l.activities ?? []).filter(a => a.type).map(a => ({ id: a.id || uid(), type: a.type, duration: a.duration ?? '', calories: a.calories })),
    notes: l.notes ?? '',
    checkin: {},
  };
}

/** Runs once. Copies v3.1 localStorage journals into the new store; leaves the old keys untouched. */
export function migrateLegacy(): { migratedDays: number; proteinGoal?: number } {
  if (read<boolean>(KEY_MIGRATED)) return { migratedDays: 0 };
  const result = { migratedDays: 0, proteinGoal: undefined as number | undefined };
  try {
    const history = read<LegacyLog[]>(LEGACY_HISTORY) ?? [];
    const draft = read<LegacyLog>(LEGACY_LOG);
    const all = [...history];
    if (draft?.date && !all.some(h => h.date === draft.date)) all.push(draft);
    for (const l of all) {
      if (!l?.date) continue;
      const day = convertLegacyDay(l);
      if (day.entries.length || day.water || day.activities.length || day.notes) {
        saveDay(day);
        result.migratedDays++;
      }
      const goal = parseInt(l.proteinGoal ?? '', 10);
      if (Number.isFinite(goal) && goal > 0) result.proteinGoal = goal;
    }
  } catch (err) {
    console.error('legacy migration failed', err);
  }
  write(KEY_MIGRATED, true);
  return result;
}

/* ---------- Backup ---------- */

export interface Backup { version: 2; exportedAt: string; settings: Settings; days: DayLog[] }

export function exportBackup(): Backup {
  return { version: 2, exportedAt: new Date().toISOString(), settings: loadSettings(), days: Object.values(loadAllDays()) };
}

export function importBackup(json: string): { days: number } {
  const b = JSON.parse(json) as Partial<Backup>;
  if (!Array.isArray(b.days)) throw new Error('Not a Fuel Tracker backup');
  let n = 0;
  for (const d of b.days) {
    if (d && typeof d.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
      saveDay(normalizeDay(d));
      n++;
    }
  }
  if (b.settings) saveSettings({ ...DEFAULT_SETTINGS, ...b.settings });
  return { days: n };
}

export function ensureToday(days: Record<string, DayLog>): Record<string, DayLog> {
  const t = todayStr();
  return days[t] ? days : { ...days, [t]: emptyDay(t) };
}
