import { Capacitor, registerPlugin } from '@capacitor/core';

/** JS side of ios/App/App/WidgetBridgePlugin.swift: App Group UserDefaults plus a WidgetKit reload. */
interface WidgetBridgePlugin {
  setItem(options: { group: string; key: string; value: string }): Promise<void>;
  removeItem(options: { group: string; key: string }): Promise<void>;
  reload(options: { kind: string }): Promise<void>;
}
const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');
import { dayTotals, inKetosis } from './nutrition';
import type { DayLog, Settings } from '../types';

/** Must match the App Group added in Xcode to both the app and the widget extension. */
export const APP_GROUP = 'group.com.leeunks.ketojournal';
export const WIDGET_KEY = 'today';
export const WIDGET_KIND = 'FuelWidget';

export interface WidgetSnapshot {
  date: string;
  proteinKcal: number;
  proteinGoal: number;
  netCarbs: number;
  carbLimit: number;
  streak: number;
  inKetosis: boolean;
  updatedAt: number;
}

export function widgetSnapshot(day: DayLog, settings: Settings, streak: number): WidgetSnapshot {
  const t = dayTotals(day);
  return {
    date: day.date,
    proteinKcal: Math.round(t.proteinKcal),
    proteinGoal: settings.proteinGoal,
    netCarbs: Math.round(t.netCarbs),
    carbLimit: settings.carbLimit,
    streak,
    inKetosis: inKetosis(day, settings),
    updatedAt: Date.now(),
  };
}

/** Writes today's numbers where the widget can read them and asks WidgetKit to refresh. */
export async function pushWidget(snapshot: WidgetSnapshot): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await WidgetBridge.setItem({ group: APP_GROUP, key: WIDGET_KEY, value: JSON.stringify(snapshot) });
    await WidgetBridge.reload({ kind: WIDGET_KIND });
  } catch (err) {
    console.warn('widget update failed', err);
  }
}

export async function clearWidget(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await WidgetBridge.removeItem({ group: APP_GROUP, key: WIDGET_KEY });
    await WidgetBridge.reload({ kind: WIDGET_KIND });
  } catch (err) {
    console.warn('widget clear failed', err);
  }
}
