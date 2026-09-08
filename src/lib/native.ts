import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { InAppReview } from '@capacitor-community/in-app-review';
import type { Reminders } from '../types';

const MORNING_ID = 101;
const EVENING_ID = 102;

export const isNative = () => Capacitor.isNativePlatform();

function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number);
  return { hour: Number.isFinite(h) ? h : 8, minute: Number.isFinite(m) ? m : 0 };
}

function nextAt(time: string, skipToday: boolean): Date {
  const { hour, minute } = parseTime(time);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (skipToday || d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

/** Ask for permission. Returns true when notifications may be shown. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const cur = await LocalNotifications.checkPermissions();
    if (cur.display === 'granted') return true;
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted';
  } catch (err) {
    console.warn('notification permission failed', err);
    return false;
  }
}

/**
 * Re-schedules both daily reminders from the current settings.
 * `loggedToday` pushes the evening reminder to tomorrow so it never nags after a logged day.
 */
export async function syncReminders(r: Reminders, loggedToday: boolean): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: MORNING_ID }, { id: EVENING_ID }] });
    if (!r.morning && !r.evening) return;
    const ok = await requestNotificationPermission();
    if (!ok) return;
    const list = [];
    if (r.morning) {
      list.push({
        id: MORNING_ID,
        title: 'Morning check-in',
        body: 'Log your ketones and weight before breakfast.',
        schedule: { at: nextAt(r.morningTime, false), repeats: true, every: 'day' as const, allowWhileIdle: true },
      });
    }
    if (r.evening) {
      list.push({
        id: EVENING_ID,
        title: 'Nothing logged yet today',
        body: 'Add what you ate so today counts toward your streak.',
        schedule: { at: nextAt(r.eveningTime, loggedToday), repeats: true, every: 'day' as const, allowWhileIdle: true },
      });
    }
    await LocalNotifications.schedule({ notifications: list });
  } catch (err) {
    console.warn('reminder scheduling failed', err);
  }
}

/** Asks iOS to show the App Store rating sheet. iOS decides whether it actually appears. */
export async function requestReview(): Promise<void> {
  if (!isNative()) return;
  try {
    await InAppReview.requestReview();
  } catch (err) {
    console.warn('review request failed', err);
  }
}
