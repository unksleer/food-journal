import { registerPlugin } from '@capacitor/core';
import { isNative } from './native';

export interface StoreKitStatus {
  unlocked: boolean;
  grandfathered?: boolean;
  displayPrice: string;
}

export interface StoreKitPurchaseResult {
  unlocked: boolean;
  cancelled?: boolean;
  pending?: boolean;
}

interface StoreKitPlugin {
  status(): Promise<StoreKitStatus>;
  purchase(): Promise<StoreKitPurchaseResult>;
  restore(): Promise<{ unlocked: boolean; grandfathered?: boolean }>;
}

const StoreKit = registerPlugin<StoreKitPlugin>('StoreKit');

export async function getProStatus(): Promise<StoreKitStatus> {
  if (!isNative()) {
    return { unlocked: true, grandfathered: true, displayPrice: '$4.99' };
  }
  try {
    return await StoreKit.status();
  } catch {
    return { unlocked: false, displayPrice: '$4.99' };
  }
}

export async function purchasePro(): Promise<StoreKitPurchaseResult> {
  if (!isNative()) {
    return { unlocked: true };
  }
  return await StoreKit.purchase();
}

export async function restorePro(): Promise<{ unlocked: boolean; grandfathered?: boolean }> {
  if (!isNative()) {
    return { unlocked: true, grandfathered: true };
  }
  return await StoreKit.restore();
}
