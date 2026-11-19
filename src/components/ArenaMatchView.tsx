import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppLanguage,
  CategoryInfo,
  LifelinesInventory,
  PlayerProfile,
  QuestionItem,
} from '../types/game';
import { selectMatchQuestions } from '../data/questions';
import { getVipMultiplier } from '../services/storageRepository';
import { soundEngine } from '../utils/sound';
import { getCategoryName, tr } from '../utils/i18n';
import { antiCheatGuard, QuestionTimingToken } from '../utils/antiCheatGuard';
import { WithdrawMatchConfirmModal } from './ActionConfirmModals';
import {
  Timer,
  Trophy,
  Scissors,
  Snowflake,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Home,
} from 'lucide-react';

interface ArenaMatchViewProps {
  category: CategoryInfo;
  profile: PlayerProfile;
  lang: AppLanguage;
  onConsumeLifeline: (type: keyof LifelinesInventory) => boolean;
  onAwardInstantComboBonus: (coins: number, xp: number) => void;
  onRoundCompleteSync?: (
    roundPoints: number,
    roundCoins: number,
    roundXp: number,
    fairPlayPenalty: number
  ) => void;
  onCompleteMatch: (result: {
    roundScores: [number, number, number];
    officialPointsEarned: number;
    coinsEarnedInMatch: number;
    xpEarnedInMatch: number;
    maxComboInMatch: number;
    combosTriggeredCount: number;
    playedQuestionIds: string[];
    alreadySyncedRoundsInMatch?: boolean;
  }) => void;
  onRoundCompleteAdCheck?: () => void;
  onExitArena: () => void;
}

const QUESTION_TIME_LIMIT = 6;
const QUESTIONS_PER_ROUND = 6;
const TOTAL_ROUNDS = 3;

export function calculateRoundOfficialPoints(correctOutOfSix: number): number {
  if (correctOutOfSix === 6) return 2;
  if (correctOutOfSix > 3) return 1;
  return 0;
}

export const ArenaMatchView: React.FC<ArenaMatchViewProps> = ({
  category,
  profile,
  lang,
  onConsumeLifeline,
  onAwardInstantComboBonus,
  onRoundCompleteSync,
  onCompleteMatch,
  onRoundCompleteAdCheck,
  onExitArena,
}) => {
  const [matchQuestions, setMatchQuestions] = useState<QuestionItem[]>(() =>
    selectMatchQuestions(category.id, profile.recentlyPlayedQuestionIds, 18, lang)
  );

  const [stage, setStage] = useState<'playing_question' | 'round_summary' | 'match_summary'>(
    'playing_question'
  );
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [questionIndexInRound, setQuestionIndexInRound] = useState<number>(0);

  const [timeLeft, setTimeLeft] = useState<number>(QUESTION_TIME_LIMIT);
  const [timeProgressPct, setTimeProgressPct] = useState<number>(100);
  const remainingMsRef = useRef<number>(QUESTION_TIME_LIMIT * 1000);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState<boolean>(false);
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [usedFiftyInQuestion, setUsedFiftyInQuestion] = useState<boolean>(false);
  const [usedFreezeInQuestion, setUsedFreezeInQuestion] = useState<boolean>(false);

  // Withdraw confirmation modal state (pauses timer when true)
  const [isWithdrawConfirmOpen, setIsWithdrawConfirmOpen] = useState<boolean>(false);
  const wasPausedInQuestionRef = useRef<boolean>(false);

  const [roundCorrectCounts, setRoundCorrectCounts] = useState<[number, number, number]>([0, 0, 0]);
  const [comboStreak, setComboStreak] = useState<number>(0);
  const [maxComboInMatch, setMaxComboInMatch] = useState<number>(0);
  const [combosTriggeredCount, setCombosTriggeredCount] = useState<number>(0);
  const [totalComboCoinsInMatch, setTotalComboCoinsInMatch] = useState<number>(0);
  const [totalXpInMatch, setTotalXpInMatch] = useState<number>(0);
  const roundFairPlayPenaltyRef = useRef<number>(0);

  const transitionTimeoutRef = useRef<number | null>(null);
  const timingTokenRef = useRef<QuestionTimingToken | null>(null);

  const globalQuestionIndex = (currentRound - 1) * QUESTIONS_PER_ROUND + questionIndexInRound;
  const currentQuestion: QuestionItem | undefined = matchQuestions[globalQuestionIndex];

  const vipInfo = getVipMultiplier(profile.vipTier);
  const coinsPerOfficialPoint = 5 + vipInfo.coinBonusPerOfficialPoint;

  const categoryDisplayName = getCategoryName(category, lang);

  // Start Anti-Cheat monotonic timing token whenever a new question starts
  useEffect(() => {
    if (stage === 'playing_question' && currentQuestion) {
      timingTokenRef.current = antiCheatGuard.startQuestionTimer(
        currentQuestion.id,
        QUESTION_TIME_LIMIT
      );
      wasPausedInQuestionRef.current = false;
    }
  }, [stage, currentQuestion?.id]);

  useEffect(() => {
    if (isWithdrawConfirmOpen) {
      wasPausedInQuestionRef.current = true;
    }
  }, [isWithdrawConfirmOpen]);

  // Calculate current earned points across completed/active rounds
  const earnedPointsSoFar =
    (currentRound > 1 ? calculateRoundOfficialPoints(roundCorrectCounts[0]) : 0) +
    (currentRound > 2 ? calculateRoundOfficialPoints(roundCorrectCounts[1]) : 0) +
    calculateRoundOfficialPoints(roundCorrectCounts[currentRound - 1]);

  const advanceAfterQuestion = useCallback(
    (updatedRoundScores: [number, number, number]) => {
      if (questionIndexInRound + 1 < QUESTIONS_PER_ROUND) {
        remainingMsRef.current = QUESTION_TIME_LIMIT * 1000;
        setQuestionIndexInRound((prev) => prev + 1);
        setTimeLeft(QUESTION_TIME_LIMIT);
        setTimeProgressPct(100);
        setIsFrozen(false);
        setSelectedOption(null);
        setIsAnswerLocked(false);
        setHiddenOptions([]);
        setUsedFiftyInQuestion(false);
        setUsedFreezeInQuestion(false);
      } else {
        const correctInFinishedRound = updatedRoundScores[currentRound - 1];
        const pts = antiCheatGuard.clampRoundOfficialPoints(
          calculateRoundOfficialPoints(correctInFinishedRound)
        );
        const rCoins = pts * coinsPerOfficialPoint;
        const rXp = pts * 20;
        soundEngine.playRoundComplete(pts);

        // Immediately sync single round points (+0, +1, or +2 max) to Cloud Firestore
        onRoundCompleteSync?.(
          pts,
          rCoins,
          rXp,
          roundFairPlayPenaltyRef.current
        );
        roundFairPlayPenaltyRef.current = 0;

        setStage('round_summary');
        // Check if 60 minutes of active play have elapsed to show Hourly Interstitial Ad after round finishes
        onRoundCompleteAdCheck?.();
      }
    },
    [
      questionIndexInRound,
      currentRound,
      coinsPerOfficialPoint,
      onRoundCompleteSync,
      onRoundCompleteAdCheck,
    ]
  );

  const handleAnswerSubmission = useCallback(
    (chosenOption: string | null, isInstantSolveLifeline = false) => {
      if (isAnswerLocked || !currentQuestion) return;
      setIsAnswerLocked(true);
      setSelectedOption(chosenOption);

      // Anti-Cheat validation: verify answer timing & detect device clock tampering
      const timingCheck = isInstantSolveLifeline
        ? { isValidTiming: true, clockTamperDetected: false, fairPlayPenalty: 0 }
        : antiCheatGuard.validateAnswerTiming(
            timingTokenRef.current,
            wasPausedInQuestionRef.current
          );

      if (timingCheck.fairPlayPenalty > 0) {
        roundFairPlayPenaltyRef.current += timingCheck.fairPlayPenalty;
      }

      const isCorrect =
        chosenOption !== null &&
        chosenOption === currentQuestion.correctAnswer &&
        timingCheck.isValidTiming;

      const updatedRoundScores: [number, number, number] = [...roundCorrectCounts] as [
        number,
        number,
        number,
      ];

      if (isCorrect) {
        soundEngine.playCorrect();
        updatedRoundScores[currentRound - 1] += 1;
        setRoundCorrectCounts(updatedRoundScores);

        const nextCombo = comboStreak + 1;
        setComboStreak(nextCombo);
        setMaxComboInMatch((prev) => Math.max(prev, nextCombo));
        setTotalXpInMatch((prev) => prev + 10);

        if (nextCombo > 0 && nextCombo % 3 === 0) {
          soundEngine.playCombo();
          setCombosTriggeredCount((prev) => prev + 1);
          setTotalComboCoinsInMatch((prev) => prev + 3);
          setTotalXpInMatch((prev) => prev + 15);
          onAwardInstantComboBonus(3, 15);
        }
      } else {
        soundEngine.playWrong();
        setComboStreak(0);
      }

      transitionTimeoutRef.current = window.setTimeout(() => {
        advanceAfterQuestion(updatedRoundScores);
      }, 900);
    },
    [
      isAnswerLocked,
      currentQuestion,
      roundCorrectCounts,
      currentRound,
      comboStreak,
      onAwardInstantComboBonus,
      advanceAfterQuestion,
    ]
  );

  const handleAnswerSubmissionRef = useRef(handleAnswerSubmission);
  useEffect(() => {
    handleAnswerSubmissionRef.current = handleAnswerSubmission;
  }, [handleAnswerSubmission]);

  // Intercept Hardware Back Button during match to pause timer and open Withdraw Confirmation
  useEffect(() => {
    if (stage === 'match_summary') return;

    window.history.pushState({ matchActiveGuard: true }, '');

    const handleMatchPopState = (e: PopStateEvent) => {
      e.stopImmediatePropagation();
      setIsWithdrawConfirmOpen(true);
      window.history.pushState({ matchActiveGuard: true }, '');
    };

    window.addEventListener('popstate', handleMatchPopState, true);
    return () => window.removeEventListener('popstate', handleMatchPopState, true);
  }, [stage]);

  // High-precision 6-second monotonic countdown timer — immune to parent re-renders
  useEffect(() => {
    if (stage !== 'playing_question' || isAnswerLocked || isWithdrawConfirmOpen) return;

    let lastTickMs = performance.now();

    const timer = window.setInterval(() => {
      const nowMs = performance.now();
      const deltaMs = Math.max(0, nowMs - lastTickMs);
      lastTickMs = nowMs;

      remainingMsRef.current = Math.max(0, remainingMsRef.current - deltaMs);
      const nextSeconds = Math.ceil(remainingMsRef.current / 1000);
      const nextPct = Math.min(
        100,
        Math.max(0, Math.round((remainingMsRef.current / (QUESTION_TIME_LIMIT * 1000)) * 100))
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

      if (remainingMsRef.current <= 0) {
        window.clearInterval(timer);
        handleAnswerSubmissionRef.current(null);
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [stage, isAnswerLocked, isWithdrawConfirmOpen, currentRound, questionIndexInRound]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const handleUseFiftyFifty = () => {
    if (
      isAnswerLocked ||
      usedFiftyInQuestion ||
      !currentQuestion ||
      profile.lifelines.fiftyFifty <= 0
    ) {
      return;
    }
    const ok = onConsumeLifeline('fiftyFifty');
    if (!ok) return;

    soundEngine.playLifeline();
    setUsedFiftyInQuestion(true);
    const wrongOptions = currentQuestion.options.filter(
      (opt) => opt !== currentQuestion.correctAnswer
    );
    setHiddenOptions(wrongOptions.slice(0, 2));
  };

  const handleUseFreezeTime = () => {
    if (
      isAnswerLocked ||
      usedFreezeInQuestion ||
      !currentQuestion ||
      profile.lifelines.freezeTime <= 0
    ) {
      return;
    }
    const ok = onConsumeLifeline('freezeTime');
    if (!ok) return;

    soundEngine.playLifeline();
    setUsedFreezeInQuestion(true);
    setIsFrozen(true);
    if (timingTokenRef.current) {
      timingTokenRef.current = antiCheatGuard.extendQuestionTimerForFreeze(
        timingTokenRef.current,
        5
      );
    }
    remainingMsRef.current += 5000;
    const updatedSec = Math.ceil(remainingMsRef.current / 1000);
    setTimeLeft(updatedSec);
    setTimeProgressPct(
      Math.min(100, Math.round((remainingMsRef.current / (QUESTION_TIME_LIMIT * 1000)) * 100))
    );
  };

  const handleUseInstantSolve = () => {
    if (isAnswerLocked || !currentQuestion || profile.lifelines.instantSolve <= 0) {
      return;
    }
    const ok = onConsumeLifeline('instantSolve');
    if (!ok) return;

    soundEngine.playLifeline();
    handleAnswerSubmission(currentQuestion.correctAnswer, true);
  };

  const handleStartNextRoundOrFinish = () => {
    soundEngine.playClick();
    if (currentRound < TOTAL_ROUNDS) {
      remainingMsRef.current = QUESTION_TIME_LIMIT * 1000;
      setCurrentRound((prev) => prev + 1);
      setQuestionIndexInRound(0);
      setTimeLeft(QUESTION_TIME_LIMIT);
      setTimeProgressPct(100);
      setIsFrozen(false);
      setSelectedOption(null);
      setIsAnswerLocked(false);
      setHiddenOptions([]);
      setUsedFiftyInQuestion(false);
      setUsedFreezeInQuestion(false);
      setStage('playing_question');
    } else {
      const r1Pts = calculateRoundOfficialPoints(roundCorrectCounts[0]);
      const r2Pts = calculateRoundOfficialPoints(roundCorrectCounts[1]);
      const r3Pts = calculateRoundOfficialPoints(roundCorrectCounts[2]);
      const totalOfficialPoints = r1Pts + r2Pts + r3Pts;
      const roundCoins = totalOfficialPoints * coinsPerOfficialPoint;
      const finalXp = totalXpInMatch;

      onCompleteMatch({
        roundScores: roundCorrectCounts,
        officialPointsEarned: totalOfficialPoints,
        coinsEarnedInMatch: roundCoins,
        xpEarnedInMatch: finalXp,
        maxComboInMatch,
        combosTriggeredCount,
        playedQuestionIds: matchQuestions.map((q) => q.id),
        alreadySyncedRoundsInMatch: Boolean(onRoundCompleteSync),
      });

      setStage('match_summary');
    }
  };

  const handleRestartNewMatch = () => {
    soundEngine.playClick();
    remainingMsRef.current = QUESTION_TIME_LIMIT * 1000;
    setMatchQuestions(
      selectMatchQuestions(category.id, profile.recentlyPlayedQuestionIds, 18, lang)
    );
    setCurrentRound(1);
    setQuestionIndexInRound(0);
    setRoundCorrectCounts([0, 0, 0]);
    setComboStreak(0);
    setMaxComboInMatch(0);
    setCombosTriggeredCount(0);
    setTotalComboCoinsInMatch(0);
    setTotalXpInMatch(0);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setTimeProgressPct(100);
    setIsFrozen(false);
    setSelectedOption(null);
    setIsAnswerLocked(false);
    setHiddenOptions([]);
    setUsedFiftyInQuestion(false);
    setUsedFreezeInQuestion(false);
    setStage('playing_question');
  };

  if (stage === 'round_summary') {
    const correctCount = roundCorrectCounts[currentRound - 1];
    const roundPoints = calculateRoundOfficialPoints(correctCount);
    const roundCoins = roundPoints * coinsPerOfficialPoint;

    const roundLabelAr =
      currentRound === 1 ? 'الأولى' : currentRound === 2 ? 'الثانية' : 'الثالثة';

    return (
      <div className="max-w-2xl mx-auto my-6 bg-[#111827] border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-4">
          <span className="font-bold text-white">{categoryDisplayName}</span>
          <span>
            {tr(
              lang,
              `الجولة ${currentRound} من ${TOTAL_ROUNDS}`,
              `Round ${currentRound} of ${TOTAL_ROUNDS}`
            )}
          </span>
        </div>

        <div className="text-center space-y-3 py-2">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl border mx-auto ${
              roundPoints === 2
                ? 'bg-amber-500/15 border-amber-400/50 text-amber-400'
                : roundPoints === 1
                ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-400'
                : 'bg-slate-800/70 border-slate-700 text-slate-400'
            }`}
          >
            <Trophy className="w-10 h-10" />
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white">
            {tr(
              lang,
              `نتيجة الجولة ${roundLabelAr}`,
              `Round ${currentRound} Summary`
            )}
          </h2>

          <p className="text-sm text-slate-300">
            {roundPoints === 2
              ? tr(
                  lang,
                  'العلامة الكاملة! أداء بطولي يمنحك نقطتين في التصنيف الشهري.',
                  'Perfect score! Heroic performance earning you +2 monthly ranking points.'
                )
              : roundPoints === 1
              ? tr(
                  lang,
                  'أداء متميز! حصدت نقطة إضافية في التصنيف الشهري.',
                  'Great performance! You earned +1 monthly ranking point.'
                )
              : tr(
                  lang,
                  'عوض في الجولة القادمة واجمع أكثر من 3 إجابات صحيحة!',
                  'Bounce back in the next round and get more than 3 correct answers!'
                )}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800">
            <div className="text-2xl md:text-3xl font-black text-white font-mono-num">
              {correctCount} / 6
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {tr(lang, 'الإجابات الصحيحة', 'Correct Answers')}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1120] border border-cyan-500/30">
            <div className="text-2xl md:text-3xl font-black text-cyan-400 font-mono-num">
              +{roundPoints}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {tr(lang, 'النقاط المكتسبة', 'Points Earned')}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1120] border border-amber-500/30">
            <div className="text-2xl md:text-3xl font-black text-amber-400 font-mono-num">
              +{roundCoins}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {tr(lang, 'العملات الذهبية', 'Gold Coins')}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartNextRoundOrFinish}
          className="w-full py-4 px-6 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-base shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span>
            {currentRound < TOTAL_ROUNDS
              ? tr(
                  lang,
                  `بدء الجولة ${currentRound + 1} 🚀`,
                  `Start Round ${currentRound + 1} 🚀`
                )
              : tr(lang, 'عرض النتيجة النهائية 🏆', 'View Final Match Results 🏆')}
          </span>
          {lang === 'ar' ? (
            <ArrowLeft className="w-5 h-5" />
          ) : (
            <ArrowRight className="w-5 h-5" />
          )}
        </button>

        {isWithdrawConfirmOpen && (
          <WithdrawMatchConfirmModal
            lang={lang}
            onContinuePlaying={() => setIsWithdrawConfirmOpen(false)}
            onConfirmWithdraw={onExitArena}
          />
        )}
      </div>
    );
  }

  if (stage === 'match_summary') {
    const r1Pts = calculateRoundOfficialPoints(roundCorrectCounts[0]);
    const r2Pts = calculateRoundOfficialPoints(roundCorrectCounts[1]);
    const r3Pts = calculateRoundOfficialPoints(roundCorrectCounts[2]);
    const totalOfficialPoints = r1Pts + r2Pts + r3Pts;
    const totalCorrect =
      roundCorrectCounts[0] + roundCorrectCounts[1] + roundCorrectCounts[2];
    const totalCoinsEarned =
      totalOfficialPoints * coinsPerOfficialPoint + totalComboCoinsInMatch;

    return (
      <div className="max-w-2xl mx-auto my-6 bg-[#111827] border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="text-xs text-cyan-400 font-semibold">
            {tr(lang, 'نهاية التحدي', 'Challenge Complete')} · {categoryDisplayName}
          </div>
          <h2 className="text-3xl font-black text-white">
            {tr(lang, 'حصيلة المباراة النهائية', 'Final Match Summary')}
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((rIdx) => {
            const cCount = roundCorrectCounts[rIdx];
            const pts = calculateRoundOfficialPoints(cCount);
            return (
              <div
                key={rIdx}
                className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 text-center space-y-1"
              >
                <div className="text-xs text-slate-400">
                  {tr(lang, `الجولة ${rIdx + 1}`, `Round ${rIdx + 1}`)}
                </div>
                <div className="text-lg font-extrabold text-white font-mono-num">
                  {cCount} / 6
                </div>
                <div
                  className={`text-xs font-bold font-mono-num ${
                    pts === 2
                      ? 'text-amber-400'
                      : pts === 1
                      ? 'text-cyan-400'
                      : 'text-slate-500'
                  }`}
                >
                  +{pts} {tr(lang, 'نقطة', 'pt')}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <div className="text-xl font-black text-cyan-400 font-mono-num">
              +{totalOfficialPoints}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              {tr(lang, 'نقاط التصنيف', 'Ranking Points')}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="text-xl font-black text-amber-400 font-mono-num">
              +{totalCoinsEarned}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              {tr(lang, 'العملات الذهبية', 'Gold Coins')}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <div className="text-xl font-black text-purple-400 font-mono-num">
              {totalCorrect}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              {tr(lang, 'إجابات صحيحة', 'Correct Answers')}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-xl font-black text-emerald-400 font-mono-num">
              {maxComboInMatch}🔥
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              {tr(lang, 'أعلى سلسلة', 'Best Streak')}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleRestartNewMatch}
            className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{tr(lang, 'جولة تحدي جديدة 🚀', 'Play Again 🚀')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onExitArena();
            }}
            className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
            <span>{tr(lang, 'الرئيسية', 'Home')}</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const timerPercentage = timeProgressPct;

  return (
    <div className="max-w-3xl mx-auto my-4 space-y-5">
      {/* Clean Match HUD: Withdraw Button, Round & Question Number, Current Points, and 6s Timer */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          {/* Withdraw Button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setIsWithdrawConfirmOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#0B1120] border border-rose-500/30 hover:border-rose-400 text-xs font-extrabold text-rose-300 cursor-pointer whitespace-nowrap transition-colors"
          >
            {tr(lang, 'انسحاب', 'Withdraw')}
          </button>

          {/* Round & Question Number */}
          <div className="text-center">
            <div className="text-sm font-black text-white">
              {tr(
                lang,
                `الجولة ${currentRound} من ${TOTAL_ROUNDS} · السؤال ${
                  questionIndexInRound + 1
                } من ${QUESTIONS_PER_ROUND}`,
                `Round ${currentRound}/${TOTAL_ROUNDS} · Question ${
                  questionIndexInRound + 1
                }/${QUESTIONS_PER_ROUND}`
              )}
            </div>
          </div>

          {/* Current Points in Round / Match */}
          <div className="px-3.5 py-2 rounded-xl bg-[#0B1120] border border-cyan-500/30 text-xs font-extrabold text-cyan-400 font-mono-num whitespace-nowrap">
            {tr(lang, 'النقاط:', 'Score:')} {roundCorrectCounts[currentRound - 1]}/6 (+
            {earnedPointsSoFar})
          </div>
        </div>

        {/* 6-second countdown bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-cyan-400" />
              <span>{tr(lang, 'الوقت المتبقي', 'Time Remaining')}</span>
              {isFrozen && (
                <span className="text-cyan-300 font-semibold">
                  {tr(lang, '· +5 ثوانٍ ❄️', '· +5s Frozen ❄️')}
                </span>
              )}
            </span>
            <span
              className={`font-mono-num text-base font-black ${
                timeLeft <= 2 ? 'text-rose-400' : 'text-cyan-400'
              }`}
            >
              00:{String(timeLeft).padStart(2, '0')}
            </span>
          </div>

          <div className="w-full h-2.5 bg-[#0B1120] rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-100 ease-linear ${
                timeLeft <= 2
                  ? 'bg-rose-500'
                  : isFrozen
                  ? 'bg-cyan-300'
                  : 'bg-gradient-to-l from-cyan-400 to-purple-500'
              }`}
              style={{ width: `${timerPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Clean Question & Answers Card (no extra badges or distractions) */}
      <div
        className={`rounded-2xl p-6 md:p-8 border shadow-xl space-y-6 ${
          category.isSpecialGold
            ? 'bg-gradient-to-b from-[#17140A] to-[#111827] border-amber-500/40'
            : 'bg-[#111827] border-slate-800'
        }`}
      >
        <h3
          className="text-xl md:text-2xl font-extrabold text-white leading-snug line-clamp-2 text-center py-2"
          style={{ textWrap: 'balance' }}
        >
          {currentQuestion.question}
        </h3>

        {/* 4 Shuffled Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          {currentQuestion.options.map((option, idx) => {
            const isHidden = hiddenOptions.includes(option);
            if (isHidden) {
              return (
                <div
                  key={idx}
                  className="min-h-[56px] px-4 py-3.5 rounded-xl bg-[#0B1120]/40 border border-slate-800/40 text-slate-600 flex items-center justify-center text-sm select-none"
                >
                  —
                </div>
              );
            }

            const isCorrectOption = option === currentQuestion.correctAnswer;
            const isChosen = selectedOption === option;

            let btnStyle =
              'bg-[#0B1120] border-slate-700/80 hover:border-cyan-400/70 text-slate-100';
            if (isAnswerLocked) {
              if (isCorrectOption) {
                btnStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-200';
              } else if (isChosen && !isCorrectOption) {
                btnStyle = 'bg-rose-500/20 border-rose-400 text-rose-200';
              } else {
                btnStyle = 'bg-[#0B1120]/60 border-slate-800 text-slate-500';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isAnswerLocked}
                onClick={() => handleAnswerSubmission(option)}
                className={`min-h-[56px] px-5 py-3.5 rounded-xl border text-start font-bold text-base transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
              >
                <span className="leading-snug">{option}</span>
                {isAnswerLocked && isCorrectOption && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                {isAnswerLocked && isChosen && !isCorrectOption && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Lifelines Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4">
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            disabled={
              isAnswerLocked || usedFiftyInQuestion || profile.lifelines.fiftyFifty <= 0
            }
            onClick={handleUseFiftyFifty}
            className="p-3 rounded-xl bg-[#0B1120] border border-slate-800 hover:border-cyan-400/60 disabled:opacity-40 disabled:pointer-events-none transition-colors flex flex-col sm:flex-row items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
                {tr(lang, 'حذف إجابتين 50:50', '50:50 Remove 2')}
              </span>
            </div>
            <span className="text-xs font-mono-num font-bold text-cyan-400">
              ({profile.lifelines.fiftyFifty})
            </span>
          </button>

          <button
            type="button"
            disabled={
              isAnswerLocked || usedFreezeInQuestion || profile.lifelines.freezeTime <= 0
            }
            onClick={handleUseFreezeTime}
            className="p-3 rounded-xl bg-[#0B1120] border border-slate-800 hover:border-purple-400/60 disabled:opacity-40 disabled:pointer-events-none transition-colors flex flex-col sm:flex-row items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
                {tr(lang, 'تجميد +5 ثوانٍ', 'Freeze +5s')}
              </span>
            </div>
            <span className="text-xs font-mono-num font-bold text-purple-400">
              ({profile.lifelines.freezeTime})
            </span>
          </button>

          <button
            type="button"
            disabled={isAnswerLocked || profile.lifelines.instantSolve <= 0}
            onClick={handleUseInstantSolve}
            className="p-3 rounded-xl bg-[#0B1120] border border-slate-800 hover:border-amber-400/60 disabled:opacity-40 disabled:pointer-events-none transition-colors flex flex-col sm:flex-row items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
                {tr(lang, 'الحل الفوري', 'Instant Solve')}
              </span>
            </div>
            <span className="text-xs font-mono-num font-bold text-amber-400">
              ({profile.lifelines.instantSolve})
            </span>
          </button>
        </div>
      </div>

      {/* Withdraw Confirmation Modal (Pauses Timer) */}
      {isWithdrawConfirmOpen && (
        <WithdrawMatchConfirmModal
          lang={lang}
          onContinuePlaying={() => setIsWithdrawConfirmOpen(false)}
          onConfirmWithdraw={onExitArena}
        />
      )}
    </div>
  );
};
