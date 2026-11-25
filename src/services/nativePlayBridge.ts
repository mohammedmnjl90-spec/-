/**
 * Native Google Play Billing & Google AdMob Bridge (Capacitor Android Ready)
 *
 * This module provides a clean runtime bridge between the web app and native
 * Capacitor plugins when packaged for Google Play Store:
 * - Google Play Billing: `cordova-plugin-purchase` (CdvPurchase) or `@revenuecat/purchases-capacitor`
 * - Google AdMob: `@capacitor-community/admob`
 *
 * On web browsers / preview mode, all calls degrade safely without crashing.
 */

import { VipTier } from '../types/game';

export const PLAY_STORE_SKUS = {
  subscriptions: {
    bronze: 'com.qimataltahadi.vip.bronze',
    silver: 'com.qimataltahadi.vip.silver',
    gold: 'com.qimataltahadi.vip.gold',
  } as Record<Exclude<VipTier, 'none'>, string>,
  consumables: {
    coins250: 'pack_coins_250',
    coins700: 'pack_coins_700',
    coins1800: 'pack_coins_1800',
  },
} as const;

/**
 * Configure your real Google AdMob unit IDs via environment variables before
 * building the signed `.aab` release bundle. Defaults use Google's official
 * Android test unit IDs so testing never violates AdMob policies.
 */
export const ADMOB_UNIT_IDS = {
  androidAppId:
    import.meta.env.VITE_ADMOB_ANDROID_APP_ID ||
    'ca-app-pub-3940256099942544~3347511713',
  interstitialAdUnitId:
    import.meta.env.VITE_ADMOB_INTERSTITIAL_ID ||
    'ca-app-pub-3940256099942544/1033173712',
  rewardedAdUnitId:
    import.meta.env.VITE_ADMOB_REWARDED_ID ||
    'ca-app-pub-3940256099942544/5224354917',
  isTesting: import.meta.env.VITE_ADMOB_TESTING !== 'false',
} as const;

interface CapacitorWindow extends Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    Plugins?: {
      AdMob?: {
        initialize?: (options?: Record<string, unknown>) => Promise<void>;
        prepareInterstitial?: (options: Record<string, unknown>) => Promise<void>;
        showInterstitial?: () => Promise<void>;
        prepareRewardVideoAd?: (options: Record<string, unknown>) => Promise<void>;
        showRewardVideoAd?: () => Promise<{ type?: string; amount?: number }>;
      };
      Purchases?: {
        purchaseProduct?: (options: { productIdentifier: string }) => Promise<{
          customerInfo?: unknown;
          transaction?: { transactionIdentifier?: string };
        }>;
      };
    };
  };
}

function getCapacitorWindow(): CapacitorWindow | null {
  if (typeof window === 'undefined') return null;
  return window as CapacitorWindow;
}

export function isNativeAndroidRuntime(): boolean {
  const win = getCapacitorWindow();
  return Boolean(
    win?.Capacitor?.isNativePlatform?.() && win?.Capacitor?.getPlatform?.() === 'android'
  );
}

let admobInitialized = false;

export async function initializeNativeAdMob(): Promise<boolean> {
  if (!isNativeAndroidRuntime()) return false;
  const admob = getCapacitorWindow()?.Capacitor?.Plugins?.AdMob;
  if (!admob?.initialize) return false;

  if (!admobInitialized) {
    try {
      await admob.initialize({
        initializeForTesting: ADMOB_UNIT_IDS.isTesting,
      });
      admobInitialized = true;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Attempts to display a native Google AdMob Interstitial ad when running inside
 * the Android app. Returns `true` if the native ad was shown, or `false` so the
 * caller can gracefully fall back to the built-in modal experience on web.
 */
export async function showNativeInterstitialAd(): Promise<boolean> {
  const ready = await initializeNativeAdMob();
  if (!ready) return false;
  const admob = getCapacitorWindow()?.Capacitor?.Plugins?.AdMob;
  if (!admob?.prepareInterstitial || !admob?.showInterstitial) return false;

  try {
    await admob.prepareInterstitial({
      adId: ADMOB_UNIT_IDS.interstitialAdUnitId,
      isTesting: ADMOB_UNIT_IDS.isTesting,
    });
    await admob.showInterstitial();
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempts to display a native Google AdMob Rewarded Video ad on Android.
 * Returns `{ handled: true, rewarded: true }` when the user finishes watching
 * the native rewarded ad, or `{ handled: false, rewarded: false }` on web.
 */
export async function showNativeRewardedAd(): Promise<{
  handled: boolean;
  rewarded: boolean;
}> {
  const ready = await initializeNativeAdMob();
  if (!ready) return { handled: false, rewarded: false };
  const admob = getCapacitorWindow()?.Capacitor?.Plugins?.AdMob;
  if (!admob?.prepareRewardVideoAd || !admob?.showRewardVideoAd) {
    return { handled: false, rewarded: false };
  }

  try {
    await admob.prepareRewardVideoAd({
      adId: ADMOB_UNIT_IDS.rewardedAdUnitId,
      isTesting: ADMOB_UNIT_IDS.isTesting,
    });
    const reward = await admob.showRewardVideoAd();
    return { handled: true, rewarded: Boolean(reward) };
  } catch {
    return { handled: false, rewarded: false };
  }
}

/**
 * Attempts to invoke a native Google Play Billing purchase via Capacitor Purchases
 * plugin when available inside the Android app.
 */
export async function invokeNativePlayPurchase(productId: string): Promise<{
  handled: boolean;
  purchaseToken?: string;
}> {
  if (!isNativeAndroidRuntime()) {
    return { handled: false };
  }
  const purchases = getCapacitorWindow()?.Capacitor?.Plugins?.Purchases;
  if (!purchases?.purchaseProduct) {
    return { handled: false };
  }

  const result = await purchases.purchaseProduct({ productIdentifier: productId });
  return {
    handled: true,
    purchaseToken: result?.transaction?.transactionIdentifier,
  };
}
