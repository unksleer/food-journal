import { registerPlugin, Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

/** JS side of the small Swift plugin in ios/App/App/CloudKVPlugin.swift (NSUbiquitousKeyValueStore). */
export interface CloudKVPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
  keys(): Promise<{ keys: string[] }>;
  sync(): Promise<{ ok: boolean }>;
  addListener(eventName: 'changed', fn: (data: { keys: string[] }) => void): Promise<PluginListenerHandle>;
}

const webStub: CloudKVPlugin = {
  isAvailable: async () => ({ available: false }),
  get: async () => ({ value: null }),
  set: async () => undefined,
  remove: async () => undefined,
  keys: async () => ({ keys: [] }),
  sync: async () => ({ ok: false }),
  addListener: async () => ({ remove: async () => undefined }),
};

export const CloudKV = Capacitor.isNativePlatform()
  ? registerPlugin<CloudKVPlugin>('CloudKV')
  : webStub;
