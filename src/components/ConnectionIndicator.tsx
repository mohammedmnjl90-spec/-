import React, { useState, useEffect, useCallback } from 'react';
import { AppLanguage } from '../types/game';
import { CloudSyncStatus, storageRepo } from '../services/storageRepository';
import { testFirestoreConnection } from '../firebaseConfig';
import { tr } from '../utils/i18n';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export interface ConnectionIndicatorProps {
  lang: AppLanguage;
  cloudStatus?: CloudSyncStatus;
  onStatusChange?: (isOnline: boolean) => void;
  compact?: boolean;
}

/**
 * Real-time network & cloud connection indicator (`ConnectionIndicator`).
 * Listens directly to browser window `online` / `offline` events, Network Information API changes,
 * and CloudSyncStatus updates to instantaneously reflect (`متصل` / `غير متصل`) in the top toolbar.
 */
export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  lang,
  cloudStatus,
  onStatusChange,
  compact = false,
}) => {
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true
  );
  const [internalCloudStatus, setInternalCloudStatus] = useState<CloudSyncStatus>(() =>
    cloudStatus || storageRepo.getCloudStatus()
  );
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const verifyNetworkAndCloud = useCallback(async () => {
    const browserNowOnline =
      typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    setIsBrowserOnline(browserNowOnline);

    if (!browserNowOnline) {
      storageRepo.setCloudStatus(
        false,
        lang === 'en'
          ? 'Browser is offline — changes are saved locally until connection returns.'
          : 'المتصفح غير متصل بالإنترنت — يتم الحفظ محلياً حتى يعود الاتصال.'
      );
      onStatusChange?.(false);
      return;
    }

    setIsVerifying(true);
    try {
      const result = await testFirestoreConnection();
      storageRepo.setCloudStatus(result.connected, result.errorDetail || null);
      onStatusChange?.(result.connected);
    } finally {
      setIsVerifying(false);
    }
  }, [lang, onStatusChange]);

  useEffect(() => {
    if (cloudStatus) {
      setInternalCloudStatus(cloudStatus);
    }
  }, [cloudStatus]);

  useEffect(() => {
    const unsubRepo = storageRepo.subscribeToCloudStatus((nextStatus) => {
      setInternalCloudStatus(nextStatus);
    });

    const handleWindowOnline = () => {
      setIsBrowserOnline(true);
      void verifyNetworkAndCloud();
    };

    const handleWindowOffline = () => {
      setIsBrowserOnline(false);
      storageRepo.setCloudStatus(
        false,
        lang === 'en'
          ? 'Network disconnected (Offline)'
          : 'انقطع الاتصال بالشبكة (غير متصل)'
      );
      onStatusChange?.(false);
    };

    window.addEventListener('online', handleWindowOnline);
    window.addEventListener('offline', handleWindowOffline);

    // Also listen to Network Information API changes if available in the browser
    const navWithConnection = navigator as Navigator & {
      connection?: EventTarget;
    };
    const netConn = navWithConnection.connection;
    if (netConn && typeof netConn.addEventListener === 'function') {
      netConn.addEventListener('change', handleWindowOnline);
    }

    return () => {
      unsubRepo();
      window.removeEventListener('online', handleWindowOnline);
      window.removeEventListener('offline', handleWindowOffline);
      if (netConn && typeof netConn.removeEventListener === 'function') {
        netConn.removeEventListener('change', handleWindowOnline);
      }
    };
  }, [lang, onStatusChange, verifyNetworkAndCloud]);

  const isConnected = isBrowserOnline && internalCloudStatus.connected;

  return (
    <button
      type="button"
      onClick={() => {
        void verifyNetworkAndCloud();
      }}
      title={
        isConnected
          ? tr(
              lang,
              'الشبكة متصلة لحظياً (اضغط لفحص الاتصال)',
              'Network is online in real-time (Click to verify)'
            )
          : internalCloudStatus.lastError ||
            tr(lang, 'غير متصل بالشبكة حالياً', 'Currently disconnected from network')
      }
      className={`px-2.5 py-1.5 rounded-lg border text-xs font-extrabold inline-flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 ${
        isConnected
          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
          : 'bg-rose-500/15 border-rose-500/50 text-rose-400 hover:bg-rose-500/25'
      }`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {isConnected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isConnected ? 'bg-emerald-400' : 'bg-rose-500'
          }`}
        />
      </span>

      {isVerifying ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : isConnected ? (
        <Wifi className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
      )}

      <span className={compact ? 'hidden sm:inline' : ''}>
        {isConnected
          ? tr(lang, 'متصل', 'Connected')
          : tr(lang, 'غير متصل', 'Disconnected')}
      </span>
    </button>
  );
};
