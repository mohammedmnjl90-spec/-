import React, { useState, useEffect, useRef } from 'react';
import { AppLanguage, LifelinesInventory, PlayerProfile } from '../types/game';
import { getDailyBossQuestion } from '../data/questions';
import { getVipMultiplier } from '../services/storageRepository';
import { soundEngine } from '../utils/sound';
import { tr } from '../utils/i18n';
import { WithdrawMatchConfirmModal } from './ActionConfirmModals';
import {
  X,
  Gift,
  Flame,
  Target,
  CheckCircle2,
  XCircle,
  Coins,
  Sparkles,
  Timer,
  LogOut,
  Home,
} from 'lucide-react';

export interface SpinSegment {
  id: string;
  label: string;
  labelEn: string;
  rewardType: 'coins' | 'xp' | 'lifeline';
  amount: number;
  lifelineKey?: keyof LifelinesInventory;
  color: string;
}

export const SPIN_SEGMENTS: SpinSegment[] = [
  {
    id: 's1',
    label: '15 عملة ذهبية',
    labelEn: '15 Gold Coins',
    rewardType: 'coins',
    amount: 15,
    color: '#06B6D4',
  },
  {
    id: 's2',
    label: '30 XP خبرة',
    labelEn: '30 XP Bonus',
    rewardType: 'xp',
    amount: 30,
    color: '#8B5CF6',
  },
  {
    id: 's3',
    label: '25 عملة ذهبية',
    labelEn: '25 Gold Coins',
    rewardType: 'coins',
    amount: 25,
    color: '#F59E0B',
  },
  {
    id: 's4',
    label: 'مساعدة 50:50',
    labelEn: '50:50 Lifeline',
    rewardType: 'lifeline',
    amount: 1,
    lifelineKey: 'fiftyFifty',
    color: '#10B981',
  },
  {
    id: 's5',
    label: '40 عملة ذهبية',
    labelEn: '40 Gold Coins',
    rewardType: 'coins',
    amount: 40,
    color: '#EC4899',
  },
  {
    id: 's6',
    label: 'تجميد +5 ثوانٍ',
    labelEn: 'Freeze +5s',
    rewardType: 'lifeline',
    amount: 1,
    lifelineKey: 'freezeTime',
    color: '#3B82F6',
  },
  {
    id: 's7',
    label: '60 عملة ذهبية',
    labelEn: '60 Gold Coins',
    rewardType: 'coins',
    amount: 60,
    color: '#EAB308',
  },
  {
    id: 's8',
    label: 'حل فوري مجاني',
    labelEn: 'Instant Solve',
    rewardType: 'lifeline',
    amount: 1,
    lifelineKey: 'instantSolve',
    color: '#A855F7',
  },
];

interface SpinWheelModalProps {
  profile: PlayerProfile;
  lang: AppLanguage;
  onClose: () => void;
  onClaimSpinReward: (segment: SpinSegment, isPaidExtraSpin: boolean) => void;
}

export const SpinWheelModal: React.FC<SpinWheelModalProps> = ({
  profile,
  lang,
  onClose,
  onClaimSpinReward,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [wonSegment, setWonSegment] = useState<SpinSegment | null>(null);

  const canSpinFree = !profile.daily.spinUsed;
  const extraSpinCost = 25;
  const canSpinExtra =
    profile.daily.spinUsed &&
    profile.daily.extraSpinsToday < 2 &&
    profile.coins >= extraSpinCost;

  const vipInfo = getVipMultiplier(profile.vipTier);

  const handleSpin = (isPaid: boolean) => {
    if (isSpinning) return;
    if (!isPaid && !canSpinFree) return;
    if (isPaid && !canSpinExtra) return;

    setWonSegment(null);
    setIsSpinning(true);
    soundEngine.playClick();

    const winIdx = Math.floor(Math.random() * SPIN_SEGMENTS.length);
    const segmentAngle = 360 / SPIN_SEGMENTS.length;
    const targetRotation =
      rotationDeg + 360 * 5 + (360 - winIdx * segmentAngle - segmentAngle / 2);

    setRotationDeg(targetRotation);

    let ticks = 0;
    const tickInterval = window.setInterval(() => {
      ticks += 1;
      soundEngine.playSpinTick();
      if (ticks >= 12) window.clearInterval(tickInterval);
    }, 200);

    window.setTimeout(() => {
      window.clearInterval(tickInterval);
      setIsSpinning(false);
      const chosen = SPIN_SEGMENTS[winIdx];
      setWonSegment(chosen);
      soundEngine.playReward();
      onClaimSpinReward(chosen, isPaid);
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 relative shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-extrabold text-white">
              {tr(lang, 'عجلة الحظ اليومية', 'Daily Lucky Spin')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSpinning}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-slate-300">
            {tr(
              lang,
              'لك لفة مجانية واحدة كل يوم لربح العملات الذهبية أو المساعدات الفورية!',
              'You get 1 free spin every day to win gold coins or instant lifelines!'
            )}
          </p>
          {profile.vipTier !== 'none' && (
            <p className="text-xs text-amber-400 font-bold">
              {tr(
                lang,
                `ميزة ${vipInfo.labelAr}: مضاعفة جوائز العملات في العجلة (${vipInfo.dailySpinMultiplier}×)`,
                `${vipInfo.labelEn} Perk: Wheel coin prizes multiplied (${vipInfo.dailySpinMultiplier}x)`
              )}
            </p>
          )}
        </div>

        {/* Visual Wheel Representation */}
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          {/* Top Pointer */}
          <div className="absolute -top-3 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-400 drop-shadow" />

          <div
            className="w-60 h-60 rounded-full border-4 border-slate-700 relative overflow-hidden shadow-xl transition-transform duration-[2800ms] ease-out"
            style={{
              transform: `rotate(${rotationDeg}deg)`,
              background:
                'conic-gradient(#06B6D4 0deg 45deg, #8B5CF6 45deg 90deg, #F59E0B 90deg 135deg, #10B981 135deg 180deg, #EC4899 180deg 225deg, #3B82F6 225deg 270deg, #EAB308 270deg 315deg, #A855F7 315deg 360deg)',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#080C16] border-2 border-amber-400 flex items-center justify-center shadow-inner">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Prizes Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {SPIN_SEGMENTS.map((seg) => (
            <div
              key={seg.id}
              className="p-2 rounded-lg bg-[#0B1120] border border-slate-800 text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1.5"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate">{lang === 'en' ? seg.labelEn : seg.label}</span>
            </div>
          ))}
        </div>

        {wonSegment && (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/50 text-center space-y-1">
            <div className="text-xs text-amber-300 font-semibold">
              {tr(lang, 'مبارك! لقد ربحت:', 'Congratulations! You won:')}
            </div>
            <div className="text-base font-black text-white">
              {lang === 'en' ? wonSegment.labelEn : wonSegment.label}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {canSpinFree ? (
            <button
              type="button"
              disabled={isSpinning}
              onClick={() => handleSpin(false)}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-l from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-sm cursor-pointer transition-all whitespace-nowrap"
            >
              {isSpinning
                ? tr(lang, 'جاري دوران العجلة...', 'Spinning wheel...')
                : tr(lang, 'تدوير العجلة مجاناً (لفة اليوم)', 'Free Daily Spin')}
            </button>
          ) : (
            <button
              type="button"
              disabled={isSpinning || !canSpinExtra}
              onClick={() => handleSpin(true)}
              className="w-full py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold text-sm cursor-pointer transition-all whitespace-nowrap"
            >
              {profile.daily.extraSpinsToday >= 2
                ? tr(
                    lang,
                    'استنفدت جميع لفات اليوم، عد غداً!',
                    'All spins used for today, come back tomorrow!'
                  )
                : tr(
                    lang,
                    `لفة إضافية مقابل ${extraSpinCost} عملة ذهبية`,
                    `Extra Spin for ${extraSpinCost} Gold Coins`
                  )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface DailyBossModalProps {
  profile: PlayerProfile;
  lang: AppLanguage;
  isPausedByNetwork?: boolean;
  onClose: () => void;
  onFinishDailyBoss: (won: boolean) => void;
}

const DAILY_BOSS_TIME_LIMIT = 5;
const BOSS_LETTERS_AR = ['أ', 'ب', 'ج', 'د'];
const BOSS_LETTERS_EN = ['A', 'B', 'C', 'D'];

/**
 * Full-Screen Immersive Daily Boss Arena (`100dvh`) matching the main Arena Match HUD,
 * dynamic color-shifting timer bar, unclipped full question card, 1-column mobile answer
 * buttons with glow/shake feedback, and instant timer freeze on network disconnect.
 */
export const DailyBossModal: React.FC<DailyBossModalProps> = ({
  profile,
  lang,
  isPausedByNetwork = false,
  onClose,
  onFinishDailyBoss,
}) => {
  const [question] = useState(() => getDailyBossQuestion(profile.daily.dateKey, lang));
  const [started, setStarted] = useState(profile.daily.dailyBossAttempted);
  const [timeLeft, setTimeLeft] = useState(DAILY_BOSS_TIME_LIMIT);
  const [timeProgressPct, setTimeProgressPct] = useState(100);
  const remainingBossMsRef = useRef<number>(DAILY_BOSS_TIME_LIMIT * 1000);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [locked, setLocked] = useState(profile.daily.dailyBossAttempted);
  const [isWithdrawConfirmOpen, setIsWithdrawConfirmOpen] = useState(false);
  const onFinishDailyBossRef = useRef(onFinishDailyBoss);

  useEffect(() => {
    onFinishDailyBossRef.current = onFinishDailyBoss;
  }, [onFinishDailyBoss]);

  useEffect(() => {
    if (!started || locked || isWithdrawConfirmOpen || isPausedByNetwork) return;

    let lastTickMs = performance.now();

    const timer = window.setInterval(() => {
      const nowMs = performance.now();
      const deltaMs = Math.max(0, nowMs - lastTickMs);
      lastTickMs = nowMs;

      remainingBossMsRef.current = Math.max(0, remainingBossMsRef.current - deltaMs);
      const nextSeconds = Math.ceil(remainingBossMsRef.current / 1000);
      const nextPct = Math.min(
        100,
        Math.max(
          0,
          Math.round((remainingBossMsRef.current / (DAILY_BOSS_TIME_LIMIT * 1000)) * 100)
        )
      );

      setTimeProgressPct(nextPct);
      setTimeLeft((prevSeconds) => {
        if (nextSeconds !== prevSeconds) {
          if (nextSeconds > 0 && nextSeconds < prevSeconds) {
            soundEngine.playTick(nextSeconds <= 2);
          }
          return nextSeconds;
        }
        return prevSeconds;
      });

      if (remainingBossMsRef.current <= 0) {
        window.clearInterval(timer);
        setLocked(true);
        soundEngine.playWrong();
        onFinishDailyBossRef.current(false);
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [started, locked, isWithdrawConfirmOpen, isPausedByNetwork]);

  const handleSelect = (opt: string) => {
    if (locked || isPausedByNetwork) return;
    setLocked(true);
    setSelectedOpt(opt);
    const won = opt === question.correctAnswer;
    if (won) {
      soundEngine.playReward();
    } else {
      soundEngine.playWrong();
    }
    onFinishDailyBoss(won);
  };

  const handleRequestExit = () => {
    soundEngine.playClick();
    if (started && !locked) {
      setIsWithdrawConfirmOpen(true);
    } else {
      onClose();
    }
  };

  const isUrgentTime = timeLeft <= 2;
  const isMidTime = timeLeft > 2 && timeProgressPct <= 60;
  const progressBarClass = isUrgentTime
    ? 'bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.65)] animate-timer-pulse'
    : isMidTime
    ? 'bg-gradient-to-l from-amber-400 to-yellow-400'
    : 'bg-gradient-to-l from-emerald-400 to-cyan-400';

  const timerTextClass = isUrgentTime
    ? 'text-rose-400 animate-timer-pulse'
    : isMidTime
    ? 'text-amber-400'
    : 'text-cyan-400';

  const optionLetters = lang === 'ar' ? BOSS_LETTERS_AR : BOSS_LETTERS_EN;

  return (
    <div className="fixed inset-0 z-40 h-[100dvh] w-full bg-[#080C16] text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      <div className="pointer-events-none absolute -top-28 right-1/4 w-80 h-80 rounded-full bg-purple-600/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/4 w-80 h-80 rounded-full bg-amber-500/8 blur-3xl" />

      {/* Compact Game HUD */}
      <header className="relative z-10 w-full bg-[#0B1120]/95 border-b border-slate-800/80 px-3.5 sm:px-6 pt-[max(0.65rem,env(safe-area-inset-top))] pb-2.5 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleRequestExit}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#111827] border border-rose-500/30 hover:border-rose-400/80 text-xs font-extrabold text-rose-300 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>
                {started && !locked
                  ? tr(lang, 'انسحاب', 'Withdraw')
                  : tr(lang, 'خروج', 'Exit')}
              </span>
            </button>

            <div className="text-center min-w-0 px-1">
              <div className="text-xs sm:text-sm font-black text-white flex items-center justify-center gap-1.5 whitespace-nowrap truncate">
                <Flame className="w-4 h-4 text-purple-400 shrink-0" />
                <span>{tr(lang, 'سؤال اليوم النادر', 'Daily Boss Challenge')}</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-400">
                {tr(lang, 'محاولة واحدة · 5 ثوانٍ', '1 Attempt · 5 Seconds')}
              </div>
            </div>

            <div className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#111827] border border-amber-500/35 flex items-center gap-1.5 whitespace-nowrap shrink-0 font-mono-num">
              <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs font-black text-amber-300">+35</span>
            </div>
          </div>

          {started && (
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-2.5 bg-[#080C16] rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-[width,background-color] duration-100 ease-linear ${progressBarClass}`}
                  style={{ width: `${locked ? 0 : timeProgressPct}%` }}
                />
              </div>
              <div
                className={`flex items-center gap-1 font-mono-num text-sm sm:text-base font-black whitespace-nowrap shrink-0 min-w-[54px] justify-end ${
                  locked ? 'text-slate-500' : timerTextClass
                }`}
              >
                <Timer className="w-3.5 h-3.5 shrink-0" />
                <span>00:0{locked ? 0 : timeLeft}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Center Content */}
      <main className="relative z-10 flex-1 min-h-0 w-full max-w-3xl mx-auto px-3.5 sm:px-6 py-4 flex flex-col justify-center gap-4 overflow-y-auto">
        {!started ? (
          <div className="bg-[#111827] border border-purple-500/35 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl max-w-xl w-full mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-500/15 border border-purple-400/40 text-purple-300 mx-auto">
              <Timer className="w-10 h-10" />
            </div>
            <div className="space-y-2.5">
              <h2
                className="text-2xl sm:text-3xl font-black text-white"
                style={{ textWrap: 'balance' }}
              >
                {tr(lang, 'تحدي الـ 5 ثوانٍ النادر', 'Rare 5-Second Challenge')}
              </h2>
              <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto leading-relaxed">
                {tr(
                  lang,
                  'سؤال ثقافي نادر بمحاولة واحدة فقط يومياً ومهلة 5 ثوانٍ. الإجابة الصحيحة تمنحك فوراً +35 عملة ذهبية و +50 XP!',
                  'A rare trivia question with 1 daily attempt and a 5-second limit. A correct answer grants +35 Gold Coins and +50 XP!'
                )}
              </p>
            </div>
            <button
              type="button"
              disabled={isPausedByNetwork}
              onClick={() => {
                soundEngine.playClick();
                remainingBossMsRef.current = DAILY_BOSS_TIME_LIMIT * 1000;
                setTimeLeft(DAILY_BOSS_TIME_LIMIT);
                setTimeProgressPct(100);
                setStarted(true);
              }}
              className="w-full min-h-[52px] py-3.5 px-6 rounded-xl bg-gradient-to-l from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-sm sm:text-base cursor-pointer shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all whitespace-nowrap"
            >
              {tr(
                lang,
                'أنا مستعد · ابدأ تحدي الـ 5 ثوانٍ',
                'I am Ready · Start 5-Second Challenge'
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Unclipped Full Question Card */}
            <section className="w-full rounded-2xl px-4 py-4 sm:px-7 sm:py-6 bg-[#111827] border border-purple-500/35 shadow-xl flex flex-col items-center justify-center">
              <h2
                className="text-[clamp(1.05rem,3.9vw,1.55rem)] font-extrabold text-white leading-relaxed text-center break-words w-full"
                style={{ textWrap: 'balance' }}
              >
                {question.question}
              </h2>
            </section>

            {/* 4 Options: 1-Column Stack on Mobile, 2x2 on Desktop */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5 w-full">
              {question.options.map((opt, idx) => {
                const isCorrect = opt === question.correctAnswer;
                const isChosen = selectedOpt === opt;
                const isWrongChosen = locked && isChosen && !isCorrect;
                const isCorrectRevealed = locked && isCorrect;

                let style =
                  'bg-[#0F172A] border-slate-700/80 hover:border-purple-400/80 text-slate-100 active:scale-[0.985]';
                let letterStyle = 'bg-[#080C16] border-slate-700 text-purple-300';

                if (locked) {
                  if (isCorrectRevealed) {
                    style =
                      'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_24px_-4px_rgba(16,185,129,0.6)]';
                    letterStyle =
                      'bg-emerald-500/25 border-emerald-400/70 text-emerald-200';
                  } else if (isWrongChosen) {
                    style =
                      'bg-rose-500/20 border-rose-400 text-rose-100 shadow-[0_0_24px_-4px_rgba(244,63,94,0.6)] animate-answer-shake';
                    letterStyle =
                      'bg-rose-500/25 border-rose-400/70 text-rose-200';
                  } else {
                    style = 'bg-[#0B1120]/55 border-slate-800/70 text-slate-500 opacity-65';
                    letterStyle = 'bg-[#080C16]/60 border-slate-800 text-slate-600';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={locked || isPausedByNetwork}
                    onClick={() => handleSelect(opt)}
                    className={`min-h-[50px] sm:min-h-[58px] px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-start font-bold text-sm sm:text-base flex items-center justify-between gap-3 cursor-pointer transition-all ${style}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border text-xs sm:text-sm font-black flex items-center justify-center shrink-0 ${letterStyle}`}
                      >
                        {optionLetters[idx] || idx + 1}
                      </span>
                      <span className="leading-snug break-words">{opt}</span>
                    </div>
                    {isCorrectRevealed && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    )}
                    {isWrongChosen && (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </section>

            {locked && (
              <div
                className={`p-4 rounded-xl border text-center text-sm font-bold space-y-1 ${
                  profile.daily.dailyBossWon
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                    : 'bg-rose-500/15 border-rose-400/40 text-rose-200'
                }`}
              >
                <div>
                  {profile.daily.dailyBossWon
                    ? tr(
                        lang,
                        'إجابة عبقرية! حصلت على +35 عملة ذهبية و +50 XP.',
                        'Brilliant answer! You earned +35 Gold Coins and +50 XP.'
                      )
                    : tr(
                        lang,
                        `انتهت محاولة اليوم! الإجابة الصحيحة هي: ${question.correctAnswer}`,
                        `Today’s attempt ended! Correct answer: ${question.correctAnswer}`
                      )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Action Footer */}
      <footer className="relative z-10 w-full bg-[#0B1120]/95 border-t border-slate-800/80 px-3.5 sm:px-6 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-semibold">
            {tr(lang, 'مكافأة الفوز: +35 عملة · +50 XP', 'Win Reward: +35 Coins · +50 XP')}
          </div>
          {locked && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer flex items-center gap-2 whitespace-nowrap transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>{tr(lang, 'العودة للرئيسية', 'Back to Home')}</span>
            </button>
          )}
        </div>
      </footer>

      {isWithdrawConfirmOpen && (
        <WithdrawMatchConfirmModal
          lang={lang}
          onContinuePlaying={() => setIsWithdrawConfirmOpen(false)}
          onConfirmWithdraw={onClose}
        />
      )}
    </div>
  );
};

interface DailyMissionsModalProps {
  profile: PlayerProfile;
  lang: AppLanguage;
  onClose: () => void;
  onClaimMission: (missionId: string) => void;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  profile,
  lang,
  onClose,
  onClaimMission,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-extrabold text-white">
              {tr(lang, 'المهام اليومية المتجددة', 'Daily Missions')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          {tr(
            lang,
            `تتجدد هذه المهام تلقائياً كل يوم (${profile.daily.dateKey}). أكمل التحديات واستلم عملاتك الذهبية ونقاط الخبرة!`,
            `These missions refresh automatically every day (${profile.daily.dateKey}). Complete challenges to claim gold coins and XP!`
          )}
        </p>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {profile.daily.missions.map((mission) => {
            const isCompleted = mission.progress >= mission.target;
            const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));

            return (
              <div
                key={mission.id}
                className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      {lang === 'en' && mission.titleEn ? mission.titleEn : mission.title}
                    </span>
                    <span className="text-xs font-mono-num text-cyan-400">
                      {mission.progress} / {mission.target}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {lang === 'en' && mission.descriptionEn
                      ? mission.descriptionEn
                      : mission.description}
                  </p>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-amber-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />+{mission.rewardCoins}{' '}
                      {tr(lang, 'عملة', 'Coins')}
                    </span>
                    <span className="text-purple-400">+{mission.rewardXp} XP</span>
                  </div>
                </div>

                <div className="shrink-0">
                  {mission.claimed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 px-3 py-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {tr(lang, 'تم الاستلام', 'Claimed')}
                    </span>
                  ) : isCompleted ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playReward();
                        onClaimMission(mission.id);
                      }}
                      className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer whitespace-nowrap"
                    >
                      {tr(lang, 'استلام المكافأة', 'Claim Reward')}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 px-3 py-2 block text-center">
                      {tr(lang, 'قيد الإنجاز', 'In Progress')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
