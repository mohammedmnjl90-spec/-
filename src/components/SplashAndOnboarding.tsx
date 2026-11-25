import React, { useState, useEffect } from 'react';
import { AppLanguage, PlayerProfile } from '../types/game';
import { CloudSyncStatus, storageRepo } from '../services/storageRepository';
import { soundEngine } from '../utils/sound';
import { tr } from '../utils/i18n';
import { AuthModal } from './AuthModal';
import { ConnectionIndicator } from './ConnectionIndicator';
import {
  FullAppCoverArtwork,
  PreEntryLoadingArtwork,
  RoyalArenaEmblem,
} from './AppVisualArt';
import { Globe, Play, Trophy, Flame, Zap } from 'lucide-react';

interface SplashAndOnboardingProps {
  hasExistingProfile: boolean;
  initialMode?: 'splash' | 'auth';
  lang: AppLanguage;
  cloudStatus: CloudSyncStatus;
  onToggleLanguage: (nextLang: AppLanguage) => void;
  onSplashComplete: () => void;
  onAuthSuccess: (profile: PlayerProfile) => void;
}

export const SplashAndOnboarding: React.FC<SplashAndOnboardingProps> = ({
  hasExistingProfile,
  initialMode = 'splash',
  lang,
  cloudStatus,
  onToggleLanguage,
  onSplashComplete,
  onAuthSuccess,
}) => {
  // Stage flow:
  // 1) 'loading' — Pre-entry full-screen illustrated loading screen ("جاري التحميل...")
  // 2) 'splash'  — Full-app cover artwork welcome screen before entering completely
  // 3) 'auth'    — Sign in / Create account screen if no profile is active
  const [stage, setStage] = useState<'loading' | 'splash' | 'auth'>(
    initialMode === 'auth' ? 'auth' : 'loading'
  );
  const [savedAccounts, setSavedAccounts] = useState<PlayerProfile[]>(() =>
    storageRepo.loadAllSavedAccounts()
  );
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    setSavedAccounts(storageRepo.loadAllSavedAccounts());
  }, [stage]);

  // Smooth pre-entry loading bar animation before revealing the full-app cover artwork
  useEffect(() => {
    if (stage !== 'loading') return;

    const interval = window.setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(interval);
          return 100;
        }
        return Math.min(100, prev + 4);
      });
    }, 55);

    return () => window.clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'loading' || loadProgress < 100) return;
    const doneTimer = window.setTimeout(() => {
      setStage('splash');
    }, 320);
    return () => window.clearTimeout(doneTimer);
  }, [stage, loadProgress]);

  const handleEnterFromSplash = () => {
    soundEngine.playClick();
    if (hasExistingProfile) {
      onSplashComplete();
    } else {
      setStage('auth');
    }
  };

  const handleSwitchLanguageClick = () => {
    soundEngine.playClick();
    onToggleLanguage(lang === 'ar' ? 'en' : 'ar');
  };

  const renderCloudBadge = () => (
    <div className="flex items-center gap-2">
      <ConnectionIndicator lang={lang} cloudStatus={cloudStatus} />
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* STAGE 1: PRE-ENTRY ILLUSTRATED LOADING SCREEN ("جاري التحميل...")           */
  /* -------------------------------------------------------------------------- */
  if (stage === 'loading') {
    const loadingHint =
      loadProgress < 35
        ? tr(lang, 'جاري تهيئة ساحة التحدي...', 'Preparing the Challenge Arena...')
        : loadProgress < 75
        ? tr(lang, 'جاري تجهيز الأقسام والأسئلة...', 'Loading Categories & Questions...')
        : tr(lang, 'جاري التحميل... استعد للمنافسة', 'Loading... Get Ready to Compete');

    return (
      <div className="min-h-[100dvh] w-full bg-[#060A14] text-slate-100 relative overflow-hidden flex flex-col items-center justify-between p-6">
        {/* Full-bleed Pre-Entry Illustrated Mountain Summit & Golden Astrolabe Artwork */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <PreEntryLoadingArtwork />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060A14]/45 via-[#060A14]/25 to-[#060A14]/92" />
        </div>

        {/* Subtle Top Header */}
        <div className="relative z-10 w-full max-w-4xl pt-2 flex items-center justify-between gap-3">
          <span className="text-xs font-bold tracking-wide text-amber-300/90">
            {tr(lang, 'قمة التحدي · ساحة الأبطال', 'Peak of Challenge · Arena of Champions')}
          </span>
          <button
            type="button"
            onClick={handleSwitchLanguageClick}
            className="px-3.5 py-1.5 rounded-xl bg-[#0B1120]/80 backdrop-blur border border-slate-700/80 hover:border-cyan-400 text-xs font-extrabold text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>

        {/* Centerpiece Sculpted Royal Crest & Title */}
        <div className="relative z-10 my-auto flex flex-col items-center text-center space-y-5 max-w-lg w-full">
          <div className="relative">
            <RoyalArenaEmblem className="w-32 h-32 sm:w-36 sm:h-36 drop-shadow-[0_12px_36px_rgba(245,158,11,0.35)]" />
          </div>

          <div className="space-y-2">
            <h1
              className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.65)]"
              style={{ textWrap: 'balance' }}
            >
              {tr(lang, 'قمة التحدي', 'Peak of Challenge')}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-amber-200/90">
              {tr(
                lang,
                'أكبر منصة مسابقات ثقافية تنافسية',
                'The Premier Competitive Trivia Arena'
              )}
            </p>
          </div>
        </div>

        {/* Bottom Progress Bar & "جاري التحميل..." */}
        <div className="relative z-10 w-full max-w-md pb-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="text-slate-200">{loadingHint}</span>
            <span className="font-mono-num text-amber-300">{loadProgress}%</span>
          </div>

          <div className="w-full h-2.5 bg-[#0B1120]/90 border border-slate-700/80 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-l from-amber-300 via-amber-400 to-cyan-400 rounded-full transition-[width] duration-100 ease-out"
              style={{ width: `${loadProgress}%` }}
            />
          </div>

          <div className="text-center text-[11px] font-semibold text-slate-400">
            {tr(lang, 'جاري التحميل...', 'Loading...')}
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* STAGE 2: FULL-APP COVER ARTWORK WELCOME SCREEN BEFORE ENTERING COMPLETELY  */
  /* -------------------------------------------------------------------------- */
  if (stage === 'splash') {
    const topAccount = savedAccounts[0];
    const bestStreak = topAccount ? topAccount.stats.maxComboEver : 0;

    return (
      <div className="min-h-[100dvh] bg-[#060A14] text-slate-100 flex flex-col items-center justify-between p-5 sm:p-6 relative overflow-hidden">
        {/* Full-App Cinematic Architectural Championship Cover Artwork */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <FullAppCoverArtwork />
          {/* Measured dark scrim ensuring 4.5:1+ contrast for all overlaid text */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#060A14]/70 via-[#060A14]/55 to-[#060A14]/95" />
        </div>

        {/* Top Bar with Connection Status & Language Toggle */}
        <div className="w-full max-w-4xl pt-2 flex items-center justify-between gap-3 z-10 flex-wrap">
          <span className="text-xs font-bold tracking-wide text-amber-300">
            {tr(lang, 'قمة التحدي · ساحة الأبطال', 'Peak of Challenge · Arena of Champions')}
          </span>
          <div className="flex items-center gap-2">
            {renderCloudBadge()}
            <button
              type="button"
              onClick={handleSwitchLanguageClick}
              className="px-3.5 py-1.5 rounded-xl bg-[#0B1120]/85 backdrop-blur border border-slate-700 hover:border-cyan-400 text-xs font-extrabold text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>

        {/* Main Full-App Cover Showcase */}
        <div className="my-auto max-w-2xl w-full text-center space-y-7 z-10 py-6">
          {/* Framed Full-App Preview Artwork Card + Royal Crest */}
          <div className="relative mx-auto max-w-xl rounded-3xl overflow-hidden border border-amber-400/35 shadow-2xl shadow-amber-500/10 bg-[#0B1120]/70 backdrop-blur-md">
            <div className="relative h-44 sm:h-52 w-full overflow-hidden">
              <FullAppCoverArtwork />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/25 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <RoyalArenaEmblem className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_8px_24px_rgba(245,158,11,0.4)]" />
              </div>
            </div>

            <div className="px-5 pb-6 pt-2 space-y-2.5">
              <h1
                className="text-3xl sm:text-5xl font-black tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                {tr(lang, 'قمة التحدي', 'Peak of Challenge')}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto leading-relaxed">
                {tr(
                  lang,
                  'انطلق في جولات تنافسية سريعة عبر 13 قسماً معرفياً، تزداد صعوبتها مع ارتفاع نقاطك، وتصدّر قائمة الأوائل.',
                  'Enter fast-paced competitive rounds across 13 knowledge categories that scale in difficulty as your points rise.'
                )}
              </p>
            </div>
          </div>

          {/* 3 Clean Interactive Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
            <button
              type="button"
              onClick={handleEnterFromSplash}
              className="p-4 rounded-2xl bg-[#0F172A]/85 backdrop-blur border border-amber-500/30 hover:border-amber-400 transition-all text-center space-y-1.5 cursor-pointer"
            >
              <div className="text-sm font-black text-amber-400 flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4 shrink-0" />
                <span>{tr(lang, 'تحدي الشهر', 'Monthly Challenge')}</span>
              </div>
              <div className="text-xs text-slate-300">
                {tr(lang, 'نافس على جوائز المراكز الخمسة', 'Compete for Top 5 Prizes')}
              </div>
            </button>

            <button
              type="button"
              onClick={handleEnterFromSplash}
              className="p-4 rounded-2xl bg-[#0F172A]/85 backdrop-blur border border-purple-500/30 hover:border-purple-400 transition-all text-center space-y-1.5 cursor-pointer"
            >
              <div className="text-sm font-black text-purple-300 flex items-center justify-center gap-1.5">
                <Flame className="w-4 h-4 shrink-0" />
                <span>{tr(lang, 'سلسلة الانتصارات', 'Winning Streak')}</span>
              </div>
              <div className="text-xs text-slate-300 font-mono-num">
                {bestStreak > 0
                  ? tr(lang, `أفضل رقم: ${bestStreak} متتالي`, `Best Streak: ${bestStreak}`)
                  : tr(lang, 'حقق رقمك القياسي', 'Set Your Record')}
              </div>
            </button>

            <button
              type="button"
              onClick={handleEnterFromSplash}
              className="p-4 rounded-2xl bg-[#0F172A]/85 backdrop-blur border border-cyan-500/30 hover:border-cyan-400 transition-all text-center space-y-1.5 cursor-pointer"
            >
              <div className="text-sm font-black text-cyan-300 flex items-center justify-center gap-1.5">
                <Zap className="w-4 h-4 shrink-0" />
                <span>{tr(lang, 'تحدٍ متدرج الصعوبة', 'Adaptive Difficulty')}</span>
              </div>
              <div className="text-xs text-slate-300">
                {tr(lang, 'أسئلة أصعب مع كل تقدم', 'Tougher as Points Grow')}
              </div>
            </button>
          </div>

          <div className="max-w-md mx-auto">
            <button
              type="button"
              onClick={handleEnterFromSplash}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-l from-amber-400 via-yellow-400 to-cyan-400 hover:brightness-105 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{tr(lang, 'دخول إلى التطبيق وبدء التحدي', 'Enter App & Start Challenge')}</span>
            </button>
          </div>
        </div>

        <div className="w-full max-w-4xl pb-3 text-center text-xs font-semibold text-slate-400 z-10">
          {tr(
            lang,
            'اختبر سرعة بديهتك، اجمع النقاط، وتصدّر قائمة الأوائل',
            'Test your quick wit, collect points, and top the leaderboard'
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C16] text-slate-100 flex flex-col items-center justify-between p-4 md:p-8 relative">
      {/* Top Bar: App Title + Connection Status + Language Switcher */}
      <div className="w-full max-w-xl flex items-center justify-between gap-3 pb-3 flex-wrap">
        <span className="text-sm font-black text-white">
          {tr(lang, 'قمة التحدي', 'Peak of Challenge')}
        </span>
        <div className="flex items-center gap-2">
          {renderCloudBadge()}
          <button
            type="button"
            onClick={handleSwitchLanguageClick}
            className="px-3.5 py-1.5 rounded-xl bg-[#111827] border border-slate-700 hover:border-cyan-400 text-xs font-extrabold text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>

      <div className="my-auto w-full flex justify-center">
        <AuthModal
          lang={lang}
          cloudStatus={cloudStatus}
          onAuthSuccess={onAuthSuccess}
        />
      </div>

      <div className="w-full max-w-4xl pt-4 text-center text-xs font-semibold text-slate-400">
        {tr(
          lang,
          'اختبر سرعة بديهتك، اجمع النقاط، وتصدّر قائمة الأوائل',
          'Test your quick wit, collect points, and top the leaderboard'
        )}
      </div>
    </div>
  );
};
