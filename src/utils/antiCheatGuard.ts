/**
 * نظام الحماية الداخلي ضد الغش والتلاعب بالوقت (Client-Side Anti-Cheat Guard)
 * - يرصد التلاعب بساعة الجهاز (System Clock Skew) مقارنة بالمؤقت الرتيب (performance.now)
 * - يتحقق من زمن الإجابة الفعلي (منع الإجابات الآلية الأسرع من 100ms أو المتأخرة عن المهلة)
 * - يفرض سقف الزيادة المسموح به في قواعد Firestore (+2 نقطة كحد أقصى لكل تحديث جولة)
 */

export interface QuestionTimingToken {
  questionId: string;
  startedWallClockMs: number;
  startedMonotonicMs: number;
  allowedSeconds: number;
  signature: string;
}

export interface AnswerValidationResult {
  isValidTiming: boolean;
  elapsedMs: number;
  clockTamperDetected: boolean;
  fairPlayPenalty: number;
  reason?: string;
}

function computeSimpleSignature(qId: string, wallMs: number, monoMs: number): string {
  const raw = `${qId}:${Math.round(wallMs)}:${Math.round(monoMs)}:midan_ac_v2`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export class AntiCheatGuard {
  private lastWallClockMs: number = Date.now();
  private lastMonotonicMs: number =
    typeof performance !== 'undefined' ? performance.now() : 0;

  /**
   * Starts a signed timing token when a new question is displayed.
   */
  public startQuestionTimer(
    questionId: string,
    baseLimitSeconds = 6
  ): QuestionTimingToken {
    const wall = Date.now();
    const mono = typeof performance !== 'undefined' ? performance.now() : 0;
    this.lastWallClockMs = wall;
    this.lastMonotonicMs = mono;

    return {
      questionId,
      startedWallClockMs: wall,
      startedMonotonicMs: mono,
      allowedSeconds: baseLimitSeconds,
      signature: computeSimpleSignature(questionId, wall, mono),
    };
  }

  /**
   * Extends the allowed question window when the player legitimately uses the Freeze (+5s) lifeline.
   */
  public extendQuestionTimerForFreeze(
    token: QuestionTimingToken,
    extraSeconds = 5
  ): QuestionTimingToken {
    return {
      ...token,
      allowedSeconds: token.allowedSeconds + extraSeconds,
    };
  }

  /**
   * Verifies answer timing and checks for device clock manipulation or impossible bot clicks.
   */
  public validateAnswerTiming(
    token: QuestionTimingToken | null,
    wasPausedByModal = false
  ): AnswerValidationResult {
    if (!token) {
      return {
        isValidTiming: true,
        elapsedMs: 1000,
        clockTamperDetected: false,
        fairPlayPenalty: 0,
      };
    }

    const nowWall = Date.now();
    const nowMono = typeof performance !== 'undefined' ? performance.now() : 0;

    const expectedSig = computeSimpleSignature(
      token.questionId,
      token.startedWallClockMs,
      token.startedMonotonicMs
    );

    if (expectedSig !== token.signature) {
      return {
        isValidTiming: false,
        elapsedMs: 0,
        clockTamperDetected: true,
        fairPlayPenalty: 10,
        reason: 'token_signature_mismatch',
      };
    }

    const wallDelta = nowWall - token.startedWallClockMs;
    const monoDelta = nowMono - token.startedMonotonicMs;

    // Detect if the user shifted their device system clock forward/backward by more than 4 seconds relative to monotonic clock
    const clockSkewMs = Math.abs(wallDelta - monoDelta);
    const clockTamperDetected = !wasPausedByModal && clockSkewMs > 4500;

    // Grace buffer of 1.5s for UI animation/state transitions
    const maxAllowedMs = (token.allowedSeconds + 1.5) * 1000;
    const withinTimeWindow = wasPausedByModal || monoDelta <= maxAllowedMs;

    // Bot click guard: human reaction + reading cannot be < 80ms
    const isSuperhumanBotSpeed = monoDelta < 80;

    if (clockTamperDetected || isSuperhumanBotSpeed) {
      return {
        isValidTiming: false,
        elapsedMs: Math.round(monoDelta),
        clockTamperDetected: true,
        fairPlayPenalty: 5,
        reason: clockTamperDetected ? 'system_clock_tamper' : 'automated_click_speed',
      };
    }

    return {
      isValidTiming: withinTimeWindow,
      elapsedMs: Math.round(monoDelta),
      clockTamperDetected: false,
      fairPlayPenalty: 0,
    };
  }

  private committedEventKeys: Set<string> = new Set();

  /**
   * Prevents duplicate processing of the same round or match completion event
   * (e.g., rapid double-taps or post-reconnect retries).
   * Returns true if this is a brand-new event and marks it committed; false if duplicate.
   */
  public claimUniqueEvent(eventKey: string): boolean {
    const cleanKey = eventKey.trim();
    if (!cleanKey) return true;
    if (this.committedEventKeys.has(cleanKey)) {
      return false;
    }
    this.committedEventKeys.add(cleanKey);
    // Keep memory bounded to last 200 events
    if (this.committedEventKeys.size > 200) {
      const oldest = this.committedEventKeys.values().next().value;
      if (oldest) this.committedEventKeys.delete(oldest);
    }
    return true;
  }

  /**
   * Deterministic server-matching round official points calculation:
   * 6/6 -> 2 pts, 4-5/6 -> 1 pt, <=3/6 -> 0 pts.
   */
  public computeExpectedRoundPoints(correctOutOfSix: number): number {
    const safeCorrect = Number.isFinite(correctOutOfSix)
      ? Math.max(0, Math.min(6, Math.floor(correctOutOfSix)))
      : 0;
    if (safeCorrect === 6) return 2;
    if (safeCorrect > 3) return 1;
    return 0;
  }

  /**
   * Validates and clamps a full 3-round match payload so scores, official points,
   * coins, and XP remain mathematically consistent and tamper-proof.
   */
  public validateMatchIntegrity(params: {
    roundScores: [number, number, number];
    officialPointsEarned: number;
    coinsEarnedInMatch: number;
    xpEarnedInMatch: number;
    coinsPerOfficialPoint: number;
  }): {
    safeRoundScores: [number, number, number];
    safeOfficialPoints: number;
    safeCoinsEarned: number;
    safeXpEarned: number;
    tamperDetected: boolean;
  } {
    const safeRoundScores: [number, number, number] = [
      Math.max(0, Math.min(6, Math.floor(Number(params.roundScores[0]) || 0))),
      Math.max(0, Math.min(6, Math.floor(Number(params.roundScores[1]) || 0))),
      Math.max(0, Math.min(6, Math.floor(Number(params.roundScores[2]) || 0))),
    ];

    const expectedOfficialPoints =
      this.computeExpectedRoundPoints(safeRoundScores[0]) +
      this.computeExpectedRoundPoints(safeRoundScores[1]) +
      this.computeExpectedRoundPoints(safeRoundScores[2]);

    const reportedPoints = Number.isFinite(params.officialPointsEarned)
      ? Math.max(0, Math.floor(params.officialPointsEarned))
      : 0;

    const tamperDetected = reportedPoints > expectedOfficialPoints;
    const safeOfficialPoints = Math.min(expectedOfficialPoints, reportedPoints);

    const maxLegalCoins = safeOfficialPoints * Math.max(5, Math.min(15, params.coinsPerOfficialPoint));
    const safeCoinsEarned = Math.max(
      0,
      Math.min(maxLegalCoins, Math.floor(Number(params.coinsEarnedInMatch) || 0))
    );

    // Max XP per match: 18 correct * 10 + 6 combos * 15 + 6 official pts * 20 = 390
    const safeXpEarned = Math.max(
      0,
      Math.min(450, Math.floor(Number(params.xpEarnedInMatch) || 0))
    );

    return {
      safeRoundScores,
      safeOfficialPoints,
      safeCoinsEarned,
      safeXpEarned,
      tamperDetected,
    };
  }

  /**
   * Enforces the Firestore rule constraint: maximum +2 official points per single round update.
   */
  public clampRoundOfficialPoints(rawPoints: number): number {
    if (!Number.isFinite(rawPoints) || rawPoints < 0) return 0;
    return Math.min(2, Math.floor(rawPoints));
  }

  /**
   * Enforces the Firestore rule constraint on coin delta in a single update.
   */
  public clampCoinsDelta(rawDelta: number, isVipUpgrade = false): number {
    const maxDelta = isVipUpgrade ? 2000 : 120;
    if (!Number.isFinite(rawDelta)) return 0;
    return Math.min(maxDelta, Math.floor(rawDelta));
  }
}

export const antiCheatGuard = new AntiCheatGuard();
