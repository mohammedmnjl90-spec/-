import React from 'react';
import { AppLanguage } from '../types/game';
import { soundEngine } from '../utils/sound';
import { tr } from '../utils/i18n';
import { LogOut, Power, RotateCcw, AlertTriangle } from 'lucide-react';

interface LogoutConfirmModalProps {
  lang?: AppLanguage;
  onConfirmLogout: () => void;
  onCancel: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  lang = 'ar',
  onConfirmLogout,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400 mx-auto">
          <LogOut className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-white">
            {tr(lang, 'تسجيل الخروج من الحساب', 'Account Logout')}
          </h3>
          <p className="text-sm text-slate-200 font-bold leading-relaxed">
            {tr(
              lang,
              'هل أنت متأكد من تسجيل الخروج من حسابك؟',
              'Are you sure you want to log out of your account?'
            )}
          </p>
          <p className="text-xs text-slate-400">
            {tr(
              lang,
              'ستبقى جميع بيانات حسابك ونقاطك الشهرية وعملاتك محفوظة بالكامل للعودة إليها في أي وقت.',
              'All your account data, monthly points, and coins will remain safely saved for whenever you return.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onConfirmLogout();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer transition-colors whitespace-nowrap"
          >
            {tr(lang, 'نعم، تسجيل الخروج', 'Yes, Log Out')}
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onCancel();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
          >
            {tr(lang, 'إلغاء', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ExitGameConfirmModalProps {
  lang?: AppLanguage;
  onConfirmExit: () => void;
  onCancel: () => void;
}

export const ExitGameConfirmModal: React.FC<ExitGameConfirmModalProps> = ({
  lang = 'ar',
  onConfirmExit,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center text-rose-400 mx-auto">
          <Power className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-white">
            {tr(lang, 'الخروج من اللعبة', 'Exit Game')}
          </h3>
          <p className="text-sm text-slate-200 font-bold leading-relaxed">
            {tr(
              lang,
              'هل أنت متأكد أنك تريد الخروج من اللعبة؟',
              'Are you sure you want to exit the game?'
            )}
          </p>
          <p className="text-xs text-slate-400">
            {tr(
              lang,
              'سيتم حفظ تقدمك الحالي وإغلاق التطبيق بأمان.',
              'Your current progress will be saved and the app will close safely.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onCancel();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs cursor-pointer transition-colors whitespace-nowrap"
          >
            {tr(lang, 'البقاء في اللعبة', 'Stay in Game')}
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onConfirmExit();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs cursor-pointer transition-colors whitespace-nowrap"
          >
            {tr(lang, 'نعم، خروج', 'Yes, Exit')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface WithdrawMatchConfirmModalProps {
  lang?: AppLanguage;
  onContinuePlaying: () => void;
  onConfirmWithdraw: () => void;
}

export const WithdrawMatchConfirmModal: React.FC<WithdrawMatchConfirmModalProps> = ({
  lang = 'ar',
  onContinuePlaying,
  onConfirmWithdraw,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400 mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-white">
            {tr(lang, 'تأكيد الانسحاب', 'Confirm Withdrawal')}
          </h3>
          <p className="text-sm text-slate-200 font-bold leading-relaxed">
            {tr(
              lang,
              'هل أنت متأكد أنك تريد الانسحاب من المباراة؟ (ستخسر نقاط هذه الجولة)',
              'Are you sure you want to withdraw from the match? (You will lose this round’s points)'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onContinuePlaying();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs cursor-pointer transition-colors whitespace-nowrap"
          >
            {tr(lang, 'متابعة اللعب', 'Continue Playing')}
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onConfirmWithdraw();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs cursor-pointer transition-colors whitespace-nowrap"
          >
            {tr(lang, 'نعم، انسحاب', 'Yes, Withdraw')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Triggers native BackHandler.exitApp() if running inside React Native / Cordova / Capacitor WebView,
 * and shows a clean Closed State screen in web browsers.
 */
export function triggerNativeAppExit() {
  try {
    const win = window as unknown as {
      BackHandler?: { exitApp?: () => void };
      ReactNativeWebView?: { postMessage?: (msg: string) => void };
      navigator?: { app?: { exitApp?: () => void } };
    };
    if (win.BackHandler && typeof win.BackHandler.exitApp === 'function') {
      win.BackHandler.exitApp();
    }
    if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
      win.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EXIT_APP' }));
    }
    if (win.navigator?.app && typeof win.navigator.app.exitApp === 'function') {
      win.navigator.app.exitApp();
    }
  } catch {
    // ignore in standard browser
  }
}

export const AppClosedScreen: React.FC<{
  lang?: AppLanguage;
  onRelaunch: () => void;
}> = ({ lang = 'ar', onRelaunch }) => {
  return (
    <div className="min-h-screen bg-[#080C16] text-slate-100 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-[#111827] border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400 mx-auto">
          <Power className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">
            {tr(lang, 'تم إغلاق اللعبة بنجاح', 'Game Closed Safely')}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {tr(
              lang,
              'تم حفظ جميع نقاطك وعملاتك في جلسة حسابك بأمان. نراك قريباً في «قمة التحدي»!',
              'All your points and coins have been safely saved in your account session. See you soon in Peak of Challenge!'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onRelaunch();
          }}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{tr(lang, 'إعادة تشغيل اللعبة', 'Relaunch Game')}</span>
        </button>
      </div>
    </div>
  );
};
