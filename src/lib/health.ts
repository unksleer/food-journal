import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';
import type { HealthDataType } from '@capgo/capacitor-health';
import type { WeightUnit } from '../types';

const READ: HealthDataType[] = ['steps', 'calories', 'workouts'];
const WRITE: HealthDataType[] = ['weight'];

export async function healthAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const r = await Health.isAvailable();
    return !!r.available;
  } catch {
    return false;
  }
}

/** Shows the Health permission sheet. Returns what the user allowed. */
export async function requestHealthAccess(write: boolean, read: boolean): Promise<{ write: boolean; read: boolean }> {
  if (!(await healthAvailable())) return { write: false, read: false };
  try {
    const st = await Health.requestAuthorization({ read: read ? READ : [], write: write ? WRITE : [] });
    // iOS never reveals denied READ permissions, so treat "asked" as usable and let queries return empty.
    return { write: st.writeAuthorized.includes('weight'), read };
  } catch (err) {
    console.warn('health authorization failed', err);
    return { write: false, read: false };
  }
}

export async function writeWeightToHealth(value: number, unit: WeightUnit, date: string): Promise<boolean> {
  if (!(await healthAvailable())) return false;
  const kg = unit === 'kg' ? value : value * 0.45359237;
  const at = new Date(date + 'T08:00:00').toISOString();
  try {
    await Health.saveSample({ dataType: 'weight', value: Math.round(kg * 100) / 100, unit: 'kilogram', startDate: at, endDate: at });
    return true;
  } catch (err) {
    console.warn('health weight write failed', err);
    return false;
  }
}

export interface HealthActivity {
  steps: number;
  activeKcal: number;
  workouts: { type: string; minutes: number; kcal?: number }[];
}

const WORKOUT_LABELS: Record<string, string> = {
  walking: 'Walk', running: 'Run', cycling: 'Cycling', hiking: 'Hike', yoga: 'Yoga', swimming: 'Swim',
  traditionalStrengthTraining: 'Strength', functionalStrengthTraining: 'Strength', elliptical: 'Elliptical',
  highIntensityIntervalTraining: 'HIIT', pilates: 'Pilates', rowing: 'Rowing', stairClimbing: 'Stairs',
};

export async function readHealthActivity(date: string): Promise<HealthActivity | null> {
  if (!(await healthAvailable())) return null;
  const start = new Date(date + 'T00:00:00').toISOString();
  const end = new Date(date + 'T23:59:59').toISOString();
  const out: HealthActivity = { steps: 0, activeKcal: 0, workouts: [] };
  try {
    const steps = await Health.queryAggregated({ dataType: 'steps', startDate: start, endDate: end, bucket: 'day', aggregation: 'sum' });
    out.steps = Math.round(steps.samples.reduce((s, x) => s + (x.value || 0), 0));
  } catch (err) { console.warn('steps query failed', err); }
  try {
    const cal = await Health.queryAggregated({ dataType: 'calories', startDate: start, endDate: end, bucket: 'day', aggregation: 'sum' });
    out.activeKcal = Math.round(cal.samples.reduce((s, x) => s + (x.value || 0), 0));
  } catch (err) { console.warn('calorie query failed', err); }
  try {
    const w = await Health.queryWorkouts({ startDate: start, endDate: end, limit: 20 });
    out.workouts = w.workouts.map(x => ({
      type: WORKOUT_LABELS[x.workoutType] ?? x.workoutType.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()),
      minutes: Math.round((x.duration || 0) / 60),
      kcal: x.totalEnergyBurned ? Math.round(x.totalEnergyBurned) : undefined,
    }));
  } catch (err) { console.warn('workout query failed', err); }
  return out;
}
