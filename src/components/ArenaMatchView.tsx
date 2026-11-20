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
  LogOut,
  Flame,
} from 'lucide-react';

interface ArenaMatchViewProps {
  category: CategoryInfo;
  profile: PlayerProfile;
  lang: AppLanguage;
  isPausedByNetwork?: boolean;
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

const OPTION_LETTERS_AR = ['أ', 'ب', 'ج', 'د'];
const OPTION_LETTERS_EN = ['A', 'B', 'C', 'D'];

export function calculateRoundOfficialPoints(correctOutOfSix: number): number {
  if (correctOutOfSix === 6) return 2;
  if (correctOutOfSix > 3) return 1;
  return 0;
}

export const ArenaMatchView: React.FC<ArenaMatchViewProps> = ({
  category,
  profile,
  lang,
  isPausedByNetwork = false,
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

  // Score animation trigger whenever points/correct answers increase
  const [scorePopTick, setScorePopTick] = useState<number>(0);

  // Withdraw confirmation modal state (pauses timer when true)
  const [isWithdrawConfirmOpen, setIsWithdrawConfirmOpen] = useState<boolean>(false);
  const wasPausedInQuestionRef = useRef<boolean>(false);

  // Pending post-answer advance if network dropped during the 900ms feedback window
  const pendingAdvanceScoresRef = useRef<[number, number, number] | null>(null);

  const [roundCorrectCounts, setRoundCorrectCounts] = useState<[number, number, number]>([0, 0, 0]);
  const [comboStreak, setComboStreak] = useState<number>(0);
  const [maxComboInMatch, setMaxComboInMatch] = useState<number>(0);
  const [combosTriggeredCount, setCombosTriggeredCount] = useState<number>(0);
  const [totalComboCoinsInMatch, setTotalComboCoinsInMatch] = useState<number>(0);
  const [totalXpInMatch, setTotalXpInMatch] = useState<number>(0);
  const roundFairPlayPenaltyRef = useRef<number>(0);

  const transitionTimeoutRef = useRef<number | null>(null);
  const timingTokenRef = useRef<QuestionTimingToken | null>(null);
  const isPausedByNetworkRef = useRef<boolean>(isPausedByNetwork);

  const globalQuestionIndex = (currentRound - 1) * QUESTIONS_PER_ROUND + questionIndexInRound;
  const currentQuestion: QuestionItem | undefined = matchQuestions[globalQuestionIndex];

  const vipInfo = getVipMultiplier(profile.vipTier);
  const coinsPerOfficialPoint = 5 + vipInfo.coinBonusPerOfficialPoint;

  const categoryDisplayName = getCategoryName(category, lang);

  useEffect(() => {
    isPausedByNetworkRef.current = isPausedByNetwork;
  }, [isPausedByNetwork]);

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

  // Mark question as legitimately paused whenever Withdraw dialog or Offline overlay is active
  useEffect(() => {
    if (isWithdrawConfirmOpen || isPausedByNetwork) {
      wasPausedInQuestionRef.current = true;
    }
  }, [isWithdrawConfirmOpen, isPausedByNetwork]);

  // Calculate current earned official points across completed/active rounds
  const earnedPointsSoFar =
    (currentRound > 1 ? calculateRoundOfficialPoints(roundCorrectCounts[0]) : 0) +
    (currentRound > 2 ? calculateRoundOfficialPoints(roundCorrectCounts[1]) : 0) +
    calculateRoundOfficialPoints(roundCorrectCounts[currentRound - 1]);

  const advanceAfterQuestion = useCallback(
    (updatedRoundScores: [number, number, number]) => {
      pendingAdvanceScoresRef.current = null;
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

  // Resume deferred post-answer transition once network reconnects
  useEffect(() => {
    if (!isPausedByNetwork && pendingAdvanceScoresRef.current) {
      const pending = pendingAdvanceScoresRef.current;
      pendingAdvanceScoresRef.current = null;
      transitionTimeoutRef.current = window.setTimeout(() => {
        advanceAfterQuestion(pending);
      }, 350);
    }
  }, [isPausedByNetwork, advanceAfterQuestion]);

  const handleAnswerSubmission = useCallback(
    (chosenOption: string | null, isInstantSolveLifeline = false) => {
      if (isAnswerLocked || !currentQuestion || isPausedByNetworkRef.current) return;
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
        setScorePopTick((prev) => prev + 1);

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
        if (isPausedByNetworkRef.current) {
          pendingAdvanceScoresRef.current = updatedRoundScores;
          return;
        }
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

  // High-precision 6-second monotonic countdown timer — freezes instantaneously on withdraw modal OR network drop
  useEffect(() => {
    if (
      stage !== 'playing_question' ||
      isAnswerLocked ||
      isWithdrawConfirmOpen ||
      isPausedByNetwork
    ) {
      return;
    }

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
  }, [
    stage,
    isAnswerLocked,
    isWithdrawConfirmOpen,
    isPausedByNetwork,
    currentRound,
    questionIndexInRound,
  ]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const handleUseFiftyFifty = () => {
    if (
      isPausedByNetwork ||
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
      isPausedByNetwork ||
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
    if (
      isPausedByNetwork ||
      isAnswerLocked ||
      !currentQuestion ||
      profile.lifelines.instantSolve <= 0
    ) {
      return;
    }
    const ok = onConsumeLifeline('instantSolve');
    if (!ok) return;

    soundEngine.playLifeline();
    handleAnswerSubmission(currentQuestion.correctAnswer, true);
  };

  const handleStartNextRoundOrFinish = () => {
    if (isPausedByNetwork) return;
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
    if (isPausedByNetwork) return;
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
    setScorePopTick(0);
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

  /* -------------------------------------------------------------------------- */
  /* STAGE 1: ROUND SUMMARY (Full-Screen Immersive Container)                   */
  /* -------------------------------------------------------------------------- */
  if (stage === 'round_summary') {
    const correctCount = roundCorrectCounts[currentRound - 1];
    const roundPoints = calculateRoundOfficialPoints(correctCount);
    const roundCoins = roundPoints * coinsPerOfficialPoint;

    const roundLabelAr =
      currentRound === 1 ? 'الأولى' : currentRound === 2 ? 'الثانية' : 'الثالثة';

    return (
      <div className="fixed inset-0 z-40 h-[100dvh] w-full bg-[#080C16] flex flex-col justify-between overflow-y-auto px-4 py-5 sm:p-6">
        <div className="max-w-2xl w-full mx-auto flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setIsWithdrawConfirmOpen(true);
            }}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#111827] border border-rose-500/30 hover:border-rose-400 text-xs font-extrabold text-rose-300 cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{tr(lang, 'انسحاب', 'Withdraw')}</span>
          </button>

          <div className="font-bold text-slate-300">
            <span>{categoryDisplayName}</span>
            <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono-num">
              {tr(lang, `الجولة ${currentRound}/${TOTAL_ROUNDS}`, `Round ${currentRound}/${TOTAL_ROUNDS}`)}
            </span>
          </div>
        </div>

        <div className="my-auto max-w-2xl w-full mx-auto bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-3 py-1">
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

            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {tr(
                lang,
                `نتيجة الجولة ${roundLabelAr}`,
                `Round ${currentRound} Summary`
              )}
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
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
                    'عوّض في الجولة القادمة واجمع أكثر من 3 إجابات صحيحة!',
                    'Bounce back in the next round and get more than 3 correct answers!'
                  )}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#0B1120] border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono-num">
                {correctCount}/6
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1">
                {tr(lang, 'إجابات صحيحة', 'Correct')}
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-[#0B1120] border border-cyan-500/30">
              <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono-num">
                +{roundPoints}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1">
                {tr(lang, 'نقاط التصنيف', 'Points')}
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-[#0B1120] border border-amber-500/30">
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono-num">
                +{roundCoins}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1">
                {tr(lang, 'عملات ذهبية', 'Gold Coins')}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartNextRoundOrFinish}
            className="w-full min-h-[52px] py-3.5 px-6 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span>
              {currentRound < TOTAL_ROUNDS
                ? tr(
                    lang,
                    `بدء الجولة ${currentRound + 1}`,
                    `Start Round ${currentRound + 1}`
                  )
                : tr(lang, 'عرض النتيجة النهائية', 'View Final Match Results')}
            </span>
            {lang === 'ar' ? (
              <ArrowLeft className="w-5 h-5" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="h-2" />

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

  /* -------------------------------------------------------------------------- */
  /* STAGE 2: FINAL MATCH SUMMARY (Full-Screen Immersive Container)             */
  /* -------------------------------------------------------------------------- */
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
      <div className="fixed inset-0 z-40 h-[100dvh] w-full bg-[#080C16] flex flex-col justify-center overflow-y-auto px-4 py-6 sm:p-6">
        <div className="max-w-2xl w-full mx-auto bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="text-xs text-cyan-400 font-semibold">
              {tr(lang, 'نهاية التحدي', 'Challenge Complete')} · {categoryDisplayName}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
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
                  className="p-3.5 sm:p-4 rounded-xl bg-[#0B1120] border border-slate-800 text-center space-y-1"
                >
                  <div className="text-xs text-slate-400">
                    {tr(lang, `الجولة ${rIdx + 1}`, `Round ${rIdx + 1}`)}
                  </div>
                  <div className="text-lg font-extrabold text-white font-mono-num">
                    {cCount}/6
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
              <div className="text-xl font-black text-emerald-400 font-mono-num flex items-center justify-center gap-1">
                <span>{maxComboInMatch}</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {tr(lang, 'أعلى سلسلة', 'Best Streak')}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleRestartNewMatch}
              className="w-full sm:flex-1 min-h-[50px] py-3.5 px-5 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{tr(lang, 'جولة تحدي جديدة', 'Play Again')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onExitArena();
              }}
              className="w-full sm:w-auto min-h-[50px] py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              <span>{tr(lang, 'العودة للرئيسية', 'Back to Home')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  /* -------------------------------------------------------------------------- */
  /* STAGE 3: ACTIVE FULL-SCREEN IMMERSIVE GAMEPLAY (100dvh, NO SCROLL NEEDED)  */
  /* -------------------------------------------------------------------------- */
  const timerPercentage = timeProgressPct;
  const isUrgentTime = !isFrozen && timeLeft <= 2;
  const isMidTime = !isFrozen && timeLeft > 2 && timerPercentage <= 55;

  const progressBarColorClass = isFrozen
    ? 'bg-gradient-to-l from-sky-300 to-cyan-400 shadow-[0_0_14px_rgba(56,189,248,0.5)]'
    : isUrgentTime
    ? 'bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.65)] animate-timer-pulse'
    : isMidTime
    ? 'bg-gradient-to-l from-amber-400 to-yellow-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
    : 'bg-gradient-to-l from-emerald-400 to-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.35)]';

  const timerNumberColorClass = isFrozen
    ? 'text-sky-300'
    : isUrgentTime
    ? 'text-rose-400 animate-timer-pulse'
    : isMidTime
    ? 'text-amber-400'
    : 'text-cyan-400';

  const optionLetters = lang === 'ar' ? OPTION_LETTERS_AR : OPTION_LETTERS_EN;

  return (
    <div className="fixed inset-0 z-40 h-[100dvh] w-full bg-[#080C16] text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      {/* Subtle Ambient Arena Atmosphere */}
      <div className="pointer-events-none absolute -top-28 right-1/4 w-80 h-80 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/4 w-80 h-80 rounded-full bg-indigo-600/8 blur-3xl" />

      {/* 1. COMPACT TOP GAME HUD + DYNAMIC COUNTDOWN BAR */}
      <header className="relative z-10 w-full bg-[#0B1120]/95 border-b border-slate-800/80 px-3.5 sm:px-6 pt-[max(0.65rem,env(safe-area-inset-top))] pb-2.5 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* HUD Single Row: Withdraw | Round & Question | Live Score */}
          <div className="flex items-center justify-between gap-2">
            {/* Withdraw Button */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setIsWithdrawConfirmOpen(true);
              }}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#111827] border border-rose-500/30 hover:border-rose-400/80 hover:bg-rose-500/10 text-xs font-extrabold text-rose-300 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>{tr(lang, 'انسحاب', 'Withdraw')}</span>
            </button>

            {/* Clean Unboxed Round & Question Indicator */}
            <div className="text-center min-w-0 px-1">
              <div className="text-xs sm:text-sm font-black text-white font-mono-num whitespace-nowrap truncate">
                {tr(
                  lang,
                  `الجولة ${currentRound}/${TOTAL_ROUNDS} · السؤال ${
                    questionIndexInRound + 1
                  }/${QUESTIONS_PER_ROUND}`,
                  `Round ${currentRound}/${TOTAL_ROUNDS} · Q ${
                    questionIndexInRound + 1
                  }/${QUESTIONS_PER_ROUND}`
                )}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 truncate">
                {categoryDisplayName}
                {comboStreak >= 2 && (
                  <span className="text-amber-400 font-bold">
                    {' '}
                    · {comboStreak}× {tr(lang, 'سلسلة', 'Streak')}
                  </span>
                )}
              </div>
            </div>

            {/* Live Score Counter with Pop Animation */}
            <div
              key={scorePopTick}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl bg-[#111827] border border-cyan-500/35 flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                scorePopTick > 0 ? 'animate-score-pop' : ''
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs sm:text-sm font-black text-cyan-300 font-mono-num">
                {roundCorrectCounts[currentRound - 1]}/6
              </span>
              <span className="text-[11px] font-extrabold text-amber-400 font-mono-num">
                (+{earnedPointsSoFar})
              </span>
            </div>
          </div>

          {/* Dynamic Color-Shifting Countdown Bar + Numeric Seconds */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-2.5 bg-[#080C16] rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-[width,background-color] duration-100 ease-linear ${progressBarColorClass}`}
                style={{ width: `${timerPercentage}%` }}
              />
            </div>

            <div
              className={`flex items-center gap-1 font-mono-num text-sm sm:text-base font-black whitespace-nowrap shrink-0 min-w-[54px] justify-end ${timerNumberColorClass}`}
            >
              {isFrozen ? (
                <Snowflake className="w-3.5 h-3.5 text-sky-300 shrink-0" />
              ) : (
                <Timer className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>00:{String(timeLeft).padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. FLEXIBLE MIDDLE PLAY ZONE: FULL UNCLIPPED QUESTION + 4 ANSWERS */}
      <main className="relative z-10 flex-1 min-h-0 w-full max-w-3xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-4 flex flex-col justify-center gap-3 sm:gap-5 overflow-y-auto">
        {/* Prominent Full-Text Question Card (Zero line-clamp / Zero text clipping) */}
        <section
          className={`w-full rounded-2xl px-4 py-4 sm:px-7 sm:py-6 border shadow-xl flex flex-col items-center justify-center ${
            category.isSpecialGold
              ? 'bg-gradient-to-b from-[#1B1609] to-[#111827] border-amber-500/45'
              : 'bg-[#111827] border-slate-800/90'
          }`}
        >
          <h2
            className="text-[clamp(1.05rem,3.9vw,1.55rem)] font-extrabold text-white leading-relaxed text-center break-words w-full"
            style={{ textWrap: 'balance' }}
          >
            {currentQuestion.question}
          </h2>
        </section>

        {/* 4 Answer Buttons: 1-Column Stack on Mobile for Long Text Clarity, 2x2 on Desktop */}
        <section
          aria-label={tr(lang, 'خيارات الإجابة', 'Answer Options')}
          className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5 w-full"
        >
          {currentQuestion.options.map((option, idx) => {
            const isHidden = hiddenOptions.includes(option);
            if (isHidden) {
              return (
                <div
                  key={idx}
                  aria-hidden="true"
                  className="min-h-[48px] sm:min-h-[58px] px-4 py-2.5 rounded-xl bg-[#0B1120]/35 border border-slate-800/40 text-slate-700 flex items-center justify-center text-sm select-none"
                >
                  —
                </div>
              );
            }

            const isCorrectOption = option === currentQuestion.correctAnswer;
            const isChosen = selectedOption === option;
            const isWrongChosen = isAnswerLocked && isChosen && !isCorrectOption;
            const isCorrectRevealed = isAnswerLocked && isCorrectOption;

            let btnStyle =
              'bg-[#0F172A] border-slate-700/80 hover:border-cyan-400/75 hover:bg-[#131F36] text-slate-100 active:scale-[0.985]';
            let letterStyle =
              'bg-[#080C16] border-slate-700 text-cyan-400';

            if (isAnswerLocked) {
              if (isCorrectRevealed) {
                btnStyle =
                  'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_24px_-4px_rgba(16,185,129,0.6)]';
                letterStyle =
                  'bg-emerald-500/25 border-emerald-400/70 text-emerald-200';
              } else if (isWrongChosen) {
                btnStyle =
                  'bg-rose-500/20 border-rose-400 text-rose-100 shadow-[0_0_24px_-4px_rgba(244,63,94,0.6)] animate-answer-shake';
                letterStyle =
                  'bg-rose-500/25 border-rose-400/70 text-rose-200';
              } else {
                btnStyle =
                  'bg-[#0B1120]/55 border-slate-800/70 text-slate-500 opacity-65';
                letterStyle =
                  'bg-[#080C16]/60 border-slate-800 text-slate-600';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isAnswerLocked || isPausedByNetwork}
                onClick={() => handleAnswerSubmission(option)}
                className={`min-h-[50px] sm:min-h-[58px] px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-start font-bold text-sm sm:text-base transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border text-xs sm:text-sm font-black flex items-center justify-center shrink-0 ${letterStyle}`}
                  >
                    {optionLetters[idx] || idx + 1}
                  </span>
                  <span className="leading-snug break-words">{option}</span>
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
      </main>

      {/* 3. BOTTOM THUMB-ZONE LIFELINES BAR */}
      <footer className="relative z-10 w-full bg-[#0B1120]/95 border-t border-slate-800/80 px-3.5 sm:px-6 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2 sm:gap-3">
          <button
            type="button"
            disabled={
              isPausedByNetwork ||
              isAnswerLocked ||
              usedFiftyInQuestion ||
              profile.lifelines.fiftyFifty <= 0
            }
            onClick={handleUseFiftyFifty}
            className="min-h-[52px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#111827] border border-slate-800 hover:border-cyan-400/60 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none transition-all flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-1 sm:gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Scissors className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-extrabold text-slate-200 whitespace-nowrap">
                {tr(lang, 'حذف 50:50', '50:50')}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-mono-num font-black text-cyan-400">
              {profile.lifelines.fiftyFifty}
            </span>
          </button>

          <button
            type="button"
            disabled={
              isPausedByNetwork ||
              isAnswerLocked ||
              usedFreezeInQuestion ||
              profile.lifelines.freezeTime <= 0
            }
            onClick={handleUseFreezeTime}
            className="min-h-[52px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#111827] border border-slate-800 hover:border-sky-400/60 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none transition-all flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-1 sm:gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Snowflake className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-extrabold text-slate-200 whitespace-nowrap">
                {tr(lang, 'تجميد +5ث', 'Freeze +5s')}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-mono-num font-black text-sky-400">
              {profile.lifelines.freezeTime}
            </span>
          </button>

          <button
            type="button"
            disabled={
              isPausedByNetwork ||
              isAnswerLocked ||
              profile.lifelines.instantSolve <= 0
            }
            onClick={handleUseInstantSolve}
            className="min-h-[52px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#111827] border border-slate-800 hover:border-amber-400/60 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none transition-all flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-1 sm:gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-extrabold text-slate-200 whitespace-nowrap">
                {tr(lang, 'الحل الفوري', 'Instant Solve')}
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-mono-num font-black text-amber-400">
              {profile.lifelines.instantSolve}
            </span>
          </button>
        </div>
      </footer>

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
