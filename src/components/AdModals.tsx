import React, { useState, useEffect } from 'react';
import { AppLanguage } from '../types/game';
import { soundEngine } from '../utils/sound';
import { tr } from '../utils/i18n';
import { Tv, Coins, Crown, X, CheckCircle2, Sparkles } from 'lucide-react';

interface InterstitialAdModalProps {
  lang: AppLanguage;
  onCloseAd: () => void;
  onUpgradeVipClick: () => void;
}

/**
 * Hourly Interstitial Ad Modal — Shown after completing a round once 60 minutes
 * of active play have accumulated (exempting VIP members).
 */
export const InterstitialAdModal: React.FC<InterstitialAdModalProps> = ({
  lang,
  onCloseAd,
  onUpgradeVipClick,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [secondsLeft]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111827] border-2 border-cyan-500/40 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl text-center">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-extrabold text-cyan-400 flex items-center gap-1.5">
            <Tv className="w-4 h-4" />
            <span>{tr(lang, 'إعلان الساعة البيني', 'Hourly Interstitial Ad')}</span>
          </span>

          {secondsLeft > 0 ? (
            <span className="px-2.5 py-1 rounded-lg bg-[#0B1120] border border-slate-700 text-xs font-mono-num text-amber-400 font-bold">
              {tr(lang, `إغلاق بعد ${secondsLeft}ث`, `Skip in ${secondsLeft}s`)}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onCloseAd();
              }}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-extrabold text-white flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>{tr(lang, 'إغلاق الإعلان', 'Close Ad')}</span>
            </button>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1B1035] via-[#0B1120] to-[#111827] border border-purple-500/40 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center text-amber-400 mx-auto">
            <Crown className="w-9 h-9" />
          </div>
          <h3 className="text-xl font-black text-white">
            {tr(
              lang,
              'استمتع باللعب بلا فواصل مع عضوية VIP!',
              'Play Uninterrupted with VIP Membership!'
            )}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {tr(
              lang,
              'لقد أتممت ساعة كاملة من اللعب النشط. اشترك في أي باقة VIP لإزالة جميع الإعلانات نهائياً والحصول على عملات ومساعدات فورية!',
              'You completed a full hour of active play. Upgrade to any VIP package to remove all ads permanently and claim instant coins & lifelines!'
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onUpgradeVipClick();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-l from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Crown className="w-4 h-4" />
            <span>{tr(lang, 'إزالة الإعلانات مع VIP', 'Remove Ads with VIP')}</span>
          </button>

          <button
            type="button"
            disabled={secondsLeft > 0}
            onClick={() => {
              soundEngine.playClick();
              onCloseAd();
            }}
            className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 font-bold text-xs cursor-pointer"
          >
            {secondsLeft > 0
              ? tr(lang, `انتظر ${secondsLeft} ثوانٍ...`, `Wait ${secondsLeft}s...`)
              : tr(lang, 'متابعة اللعب', 'Continue Playing')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface RewardedAdModalProps {
  lang: AppLanguage;
  onCompleteReward: () => void;
  onCancel: () => void;
}

/**
 * Store Rewarded Video Ad Modal — Grants +20 Gold Coins after watching a 5-second ad (max 3/day).
 */
export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  lang,
  onCompleteReward,
  onCancel,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      setCompleted(true);
      soundEngine.playReward();
      return;
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const progressPct = Math.round(((5 - secondsLeft) / 5) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111827] border-2 border-amber-400/50 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-center">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
            <Tv className="w-4 h-4" />
            <span>{tr(lang, 'إعلان المكافأة الذهبية', 'Rewarded Gold Ad')}</span>
          </span>
          <span className="text-xs font-mono-num text-slate-400">
            {completed
              ? tr(lang, 'اكتمل العرض ✓', 'Ad Completed ✓')
              : `00:0${secondsLeft}`}
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-[#0B1120] border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400 mx-auto">
            {completed ? (
              <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            ) : (
              <Sparkles className="w-9 h-9 animate-pulse" />
            )}
          </div>

          <h3 className="text-xl font-black text-white">
            {completed
              ? tr(lang, 'مبارك! استلم +20 عملة ذهبية', 'Congrats! Claim +20 Gold Coins')
              : tr(lang, 'جارٍ عرض إعلان المكافأة...', 'Playing Rewarded Video Ad...')}
          </h3>

          <div className="w-full h-2.5 bg-[#111827] rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-l from-amber-400 to-cyan-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {completed ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onCompleteReward();
              }}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-l from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span>{tr(lang, 'استلام +20 عملة ذهبية', 'Claim +20 Gold Coins')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold cursor-pointer"
            >
              {tr(lang, 'إلغاء الإعلان (لن تحصل على المكافأة)', 'Cancel Ad (No Reward)')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
