import { CloudKV } from './cloudKV';
import { loadAllDays, loadDay, loadSettings, saveDay, saveSettings } from '../storage';
import type { DayLog, Settings } from '../types';

const DAY_PREFIX = 'day:';
const SETTINGS_KEY = 'settings';
/** iCloud key-value storage is capped at 1 MB, so only the most recent two years travel. */
const MAX_DAYS = 730;

export interface SyncReport { pushed: number; pulled: number; available: boolean }

export async function cloudAvailable(): Promise<boolean> {
  try {
    return (await CloudKV.isAvailable()).available;
  } catch {
    return false;
  }
}

function compact(day: DayLog): string {
  return JSON.stringify(day);
}

export async function pushDay(day: DayLog): Promise<void> {
  try {
    await CloudKV.set({ key: DAY_PREFIX + day.date, value: compact(day) });
  } catch (err) {
    console.warn('cloud push failed', err);
  }
}

/** Settings that make sense to share across devices (not reminders or device integrations). */
function shareableSettings(s: Settings) {
  const { proteinGoal, carbLimit, waterGoal, weightUnit, ketoneMethod, favorites } = s;
  return { proteinGoal, carbLimit, waterGoal, weightUnit, ketoneMethod, favorites, updatedAt: Date.now() };
}

export async function pushSettings(s: Settings): Promise<void> {
  try {
    await CloudKV.set({ key: SETTINGS_KEY, value: JSON.stringify(shareableSettings(s)) });
  } catch (err) {
    console.warn('cloud settings push failed', err);
  }
}

/** Pulls one day; the newer of local vs cloud wins. Returns the day if local changed. */
async function pullDay(date: string): Promise<DayLog | null> {
  const { value } = await CloudKV.get({ key: DAY_PREFIX + date });
  if (!value) return null;
  const remote = JSON.parse(value) as DayLog;
  const local = loadDay(date);
  if (local && (local.updatedAt ?? 0) >= (remote.updatedAt ?? 0)) return null;
  saveDay(remote, 'remote');
  return remote;
}

async function pullSettings(): Promise<boolean> {
  const { value } = await CloudKV.get({ key: SETTINGS_KEY });
  if (!value) return false;
  const remote = JSON.parse(value) as ReturnType<typeof shareableSettings>;
  const local = loadSettings();
  if ((local.settingsUpdatedAt ?? 0) >= (remote.updatedAt ?? 0)) return false;
  saveSettings({ ...local, proteinGoal: remote.proteinGoal, carbLimit: remote.carbLimit, waterGoal: remote.waterGoal, weightUnit: remote.weightUnit, ketoneMethod: remote.ketoneMethod, favorites: remote.favorites ?? [], settingsUpdatedAt: remote.updatedAt });
  return true;
}

/** Full two-way merge. Run when sync is switched on and whenever the app comes to the foreground. */
export async function fullSync(): Promise<SyncReport> {
  const report: SyncReport = { pushed: 0, pulled: 0, available: false };
  if (!(await cloudAvailable())) return report;
  report.available = true;
  try {
    await CloudKV.sync();
    const { keys } = await CloudKV.keys();
    const remoteDates = new Set(keys.filter(k => k.startsWith(DAY_PREFIX)).map(k => k.slice(DAY_PREFIX.length)));
    for (const date of remoteDates) {
      if (await pullDay(date)) report.pulled++;
    }
    if (await pullSettings()) report.pulled++;
    const local = loadAllDays();
    const dates = Object.keys(local).sort().slice(-MAX_DAYS);
    for (const date of dates) {
      const day = local[date];
      if (!remoteDates.has(date)) {
        await pushDay(day);
        report.pushed++;
        continue;
      }
      const { value } = await CloudKV.get({ key: DAY_PREFIX + date });
      const remote = value ? (JSON.parse(value) as DayLog) : null;
      if (!remote || (day.updatedAt ?? 0) > (remote.updatedAt ?? 0)) {
        await pushDay(day);
        report.pushed++;
      }
    }
    await pushSettings(loadSettings());
  } catch (err) {
    console.warn('cloud sync failed', err);
  }
  return report;
}

/** Applies keys that another device changed. Returns the dates whose local copy changed. */
export async function applyRemoteChanges(keys: string[]): Promise<string[]> {
  const changed: string[] = [];
  for (const k of keys) {
    try {
      if (k.startsWith(DAY_PREFIX)) {
        if (await pullDay(k.slice(DAY_PREFIX.length))) changed.push(k.slice(DAY_PREFIX.length));
      } else if (k === SETTINGS_KEY) {
        if (await pullSettings()) changed.push(SETTINGS_KEY);
      }
    } catch (err) {
      console.warn('apply remote change failed', k, err);
    }
  }
  return changed;
}

export function onRemoteChange(fn: (keys: string[]) => void): () => void {
  let handle: { remove: () => Promise<void> } | null = null;
  void CloudKV.addListener('changed', d => fn(d.keys ?? [])).then(h => { handle = h; });
  return () => { void handle?.remove(); };
}
