import React from 'react';
import { AppLanguage } from '../types/game';
import { soundEngine } from '../utils/sound';
import { tr } from '../utils/i18n';
import { WifiOff, RefreshCw, ShieldAlert } from 'lucide-react';

interface OfflineBlockingOverlayProps {
  lang: AppLanguage;
  isChecking: boolean;
  isMidMatch?: boolean;
  retryFailedCount?: number;
  onRetry: () => void;
}

/**
 * Full-screen blocking overlay displayed instantaneously whenever internet
 * or Cloud Firebase connectivity is lost. Halts all gameplay interactions
 * until live connectivity is verified again.
 */
export const OfflineBlockingOverlay: React.FC<OfflineBlockingOverlayProps> = ({
  lang,
  isChecking,
  isMidMatch = false,
  retryFailedCount = 0,
  onRetry,
}) => {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="offline-blocking-title"
      aria-describedby="offline-blocking-desc"
      className="fixed inset-0 z-[100] h-[100dvh] w-full bg-[#080C16]/95 backdrop-blur-md flex items-center justify-center p-5 select-none"
    >
      <div className="pointer-events-none absolute -top-24 right-1/4 w-72 h-72 rounded-full bg-rose-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative w-full max-w-md bg-[#111827] border border-rose-500/35 rounded-3xl p-7 sm:p-8 shadow-2xl text-center space-y-6">
        {/* Wi-Fi Off Visual Emblem */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/40">
          <WifiOff className="w-10 h-10" strokeWidth={2.2} />
        </div>

        {/* Clear Arabic / English Message */}
        <div className="space-y-3">
          <h2
            id="offline-blocking-title"
            className="text-2xl sm:text-3xl font-black text-white tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            {tr(lang, 'لا يوجد اتصال بالإنترنت', 'No Internet Connection')}
          </h2>

          <p
            id="offline-blocking-desc"
            className="text-sm sm:text-base text-slate-300 leading-relaxed"
          >
            {tr(
              lang,
              'لعبة قمة التحدي تتطلب اتصالاً دائماً بالإنترنت للعب ومزامنة النقاط والمتصدرين. يرجى التحقق من الشبكة والمحاولة مرة أخرى.',
              'Peak of Challenge requires a continuous internet connection to play and sync your points and leaderboard rank. Please check your network and try again.'
            )}
          </p>
        </div>

        {/* Mid-Match Pause Reassurance */}
        {isMidMatch && (
          <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-200 flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {tr(
                lang,
                'تم إيقاف المؤقت مؤقتاً — سيُستأنف سؤالك تلقائياً فور عودة الاتصال.',
                'Match timer paused — your question will resume automatically once connected.'
              )}
            </span>
          </div>
        )}

        {/* Retry Action Button */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={isChecking}
            onClick={() => {
              soundEngine.playClick();
              onRetry();
            }}
            className="w-full min-h-[50px] py-3.5 px-6 rounded-xl bg-gradient-to-l from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-65 text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5 whitespace-nowrap"
          >
            <RefreshCw
              className={`w-4 h-4 shrink-0 ${isChecking ? 'animate-spin' : ''}`}
            />
            <span>
              {isChecking
                ? tr(lang, 'جاري فحص الاتصال...', 'Checking connection...')
                : tr(lang, 'إعادة المحاولة', 'Retry Connection')}
            </span>
          </button>

          {retryFailedCount > 0 && !isChecking && (
            <p className="text-xs font-semibold text-rose-400">
              {tr(
                lang,
                'لا يزال الاتصال غير متوفر — تأكد من تفعيل Wi-Fi أو بيانات الجوال.',
                'Still unable to connect — please verify your Wi-Fi or mobile data.'
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
