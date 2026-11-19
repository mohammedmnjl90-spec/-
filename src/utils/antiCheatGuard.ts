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
