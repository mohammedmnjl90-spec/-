import React, { useState, useEffect } from 'react';
import { AppLanguage, PlayerProfile } from '../types/game';
import { CloudSyncStatus, storageRepo } from '../services/storageRepository';
import { soundEngine } from '../utils/sound';
import { tr } from '../utils/i18n';
import { AuthModal } from './AuthModal';
import { ConnectionIndicator } from './ConnectionIndicator';
import { Trophy, Globe, Cloud, CloudOff } from 'lucide-react';

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
  const [stage, setStage] = useState<'splash' | 'auth'>(initialMode);
  const [savedAccounts, setSavedAccounts] = useState<PlayerProfile[]>(() =>
    storageRepo.loadAllSavedAccounts()
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setSavedAccounts(storageRepo.loadAllSavedAccounts());
  }, [stage]);

  useEffect(() => {
    if (stage !== 'splash') return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 65);

    return () => clearInterval(interval);
  }, [stage]);

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

  if (stage === 'splash') {
    const topAccount = savedAccounts[0];
    const bestStreak = topAccount ? topAccount.stats.maxComboEver : 0;

    return (
      <div className="min-h-screen bg-[#080C16] text-slate-100 flex flex-col items-center justify-between p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl" />

        {/* Top Bar with Cloud Status & Manual Language Toggle */}
        <div className="w-full max-w-4xl pt-2 flex items-center justify-between gap-3 z-10 flex-wrap">
          <span className="text-xs font-bold tracking-wide text-amber-400">
            {tr(lang, 'قمة التحدي · ساحة الأبطال', 'Peak of Challenge · Arena of Champions')}
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

        <div className="my-auto max-w-2xl w-full text-center space-y-8 z-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-amber-500/20 border border-cyan-400/30 shadow-lg shadow-cyan-500/10 mx-auto">
            <Trophy className="w-12 h-12 text-amber-400" />
          </div>

          <div className="space-y-3">
            <h1
              className="text-4xl md:text-6xl font-black tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              {tr(lang, 'قمة التحدي', 'Peak of Challenge')}
            </h1>
            <p className="text-base md:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
              {tr(
                lang,
                'انطلق في جولات تنافسية سريعة، أثبت حضورك المعرفي، وارتقِ نحو صدارة الأبطال.',
                'Enter fast-paced competitive rounds, prove your knowledge, and climb to the top of the leaderboard.'
              )}
            </p>
          </div>

          {/* 3 Interactive Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-xl mx-auto">
            <button
              type="button"
              onClick={handleEnterFromSplash}
              className="p-4 rounded-2xl bg-[#111827] border border-amber-500/30 hover:border-amber-400 transition-all text-center space-y-1 cursor-pointer"
            >
              <div className="text-sm font-black text-amber-400">
                {tr(lang, '🏆 تحدي الشهر', '🏆 Monthly Challenge')}
              </div>
              <div className="text-xs text-slate-300">
                {tr(lang, 'نافس على جوائز المراكز الخمسة', 'Compete for the Top 5 Prizes')}
              </div>
            </button>

            <button
              type="button"
              onClick={handleEnterFromSplash}
              className="p-4 rounded-2xl bg-[#111827] border border-purple-500/30 hover:border-purple-400 transition-all text-center space-y-1 cursor-pointer"
            >
              <div className="text-sm font-black text-purple-400">
                {tr(lang, '🔥 سلسلة الانتصارات', '🔥 Winning Streak')}
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
              className="p-4 rounded-2xl bg-[#111827] border border-cyan-500/30 hover:border-cyan-400 transition-all text-center space-y-1 cursor-pointer"
            >
              <div className="text-sm font-black text-cyan-400">
                {tr(lang, '⚡ جاهز للتحدي', '⚡ Ready for Action')}
              </div>
              <div className="text-xs text-slate-300">
                {tr(lang, 'انطلاق فوري للمنافسة', 'Instant Arena Match')}
              </div>
            </button>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-cyan-400 via-purple-500 to-amber-400 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>

            <button
              type="button"
              onClick={handleEnterFromSplash}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-base shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>{tr(lang, 'ابدأ التحدي الآن 🚀', 'Start Challenge Now 🚀')}</span>
            </button>
          </div>
        </div>

        <div className="w-full max-w-4xl pb-4 text-center text-xs font-semibold text-slate-400">
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
      {/* Top Bar: App Title + Cloud Connection Status + Language Switcher */}
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
