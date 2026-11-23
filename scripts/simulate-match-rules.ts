/**
 * Match Completion & Firestore Security Rules Simulator
 * -----------------------------------------------------
 * Faithfully evaluates BOTH the legacy `firestore.rules` and the updated `firestore.rules`
 * across realistic repeated-gameplay scenarios (5 consecutive matches, 15 rounds, badge coin
 * bursts, multi-device sessions, missing leaderboard_public recovery, month rollover) AND
 * adversarial security tests (cross-user writes, VIP tampering, rapid point farming).
 */

interface TimestampToken {
  __serverTimestamp: true;
  ms: number;
}

interface PlayerDoc {
  uid: string;
  playerId: string;
  username: string;
  usernameNormalized: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  monthlyRoundPoints: number;
  coins: number;
  xp: number;
  level: number;
  rankTitle: string;
  vipTier: 'none' | 'bronze' | 'silver' | 'gold' | 'legend';
  adsRemoved: boolean;
  fairPlayScore: number;
  lastProfileEditAt: number;
  updatedAtMs: number;
  lastPointsAt?: TimestampToken;
  currentMonthKey?: string;
}

interface PublicDoc {
  uid: string;
  playerId: string;
  username: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  monthlyRoundPoints: number;
  level: number;
  rankTitle: string;
  vipTier: 'none' | 'bronze' | 'silver' | 'gold' | 'legend';
  updatedAtMs: number;
  lastPointsAt?: TimestampToken;
  currentMonthKey?: string;
}

interface EvalResult {
  allowed: boolean;
  failedCheck?: string;
}

const FIFTY_DAYS_MS = 4_320_000_000;
const MONTH_REGEX = /^[0-9]{4}-[0-9]{2}$/;
const VIP_TIERS = new Set(['none', 'bronze', 'silver', 'gold', 'legend']);

function evalLegacyPlayerUpdate(
  authUid: string | null,
  docUid: string,
  existing: PlayerDoc,
  incoming: PlayerDoc,
  requestTimeMs: number
): EvalResult {
  if (!authUid || authUid !== docUid) return { allowed: false, failedCheck: 'isOwner(uid)' };
  if (incoming.uid !== existing.uid || incoming.playerId !== existing.playerId) {
    return { allowed: false, failedCheck: 'immutable_ids' };
  }
  if (incoming.vipTier !== existing.vipTier || incoming.adsRemoved !== existing.adsRemoved) {
    return { allowed: false, failedCheck: 'immutable_vip' };
  }
  const ptsDiff = incoming.monthlyRoundPoints - existing.monthlyRoundPoints;
  if (ptsDiff < 0 || ptsDiff > 2) {
    return { allowed: false, failedCheck: 'isValidPointsDelta()' };
  }
  if (ptsDiff > 0) {
    if (incoming.updatedAtMs !== requestTimeMs) {
      return {
        allowed: false,
        failedCheck: 'isValidPointsRateLimit(): incoming().updatedAtMs == request.time.toMillis()',
      };
    }
    if (requestTimeMs - existing.updatedAtMs < 25000) {
      return {
        allowed: false,
        failedCheck: 'isValidPointsRateLimit(): 25000ms cooldown',
      };
    }
  }
  if (incoming.coins - existing.coins > 120) {
    return { allowed: false, failedCheck: 'isValidCoinsDelta()' };
  }
  const identityUnchanged =
    incoming.username === existing.username &&
    incoming.usernameNormalized === existing.usernameNormalized &&
    incoming.countryCode === existing.countryCode &&
    incoming.lastProfileEditAt === existing.lastProfileEditAt;
  const cooldownElapsed =
    (existing.lastProfileEditAt === 0 ||
      requestTimeMs - existing.lastProfileEditAt >= FIFTY_DAYS_MS) &&
    incoming.lastProfileEditAt >= existing.lastProfileEditAt;
  if (!identityUnchanged && !cooldownElapsed) {
    return { allowed: false, failedCheck: 'isValidIdentityChangeCooldown()' };
  }
  if (incoming.fairPlayScore > existing.fairPlayScore || incoming.fairPlayScore < 0) {
    return { allowed: false, failedCheck: 'isValidFairPlayScoreUpdate()' };
  }
  return { allowed: true };
}

function evalUpdatedPlayerUpdate(
  authUid: string | null,
  docUid: string,
  existing: PlayerDoc,
  incoming: PlayerDoc,
  requestTimeMs: number
): EvalResult {
  if (!authUid || authUid !== docUid) return { allowed: false, failedCheck: 'isOwner(uid)' };
  if (
    !VIP_TIERS.has(incoming.vipTier) ||
    incoming.playerId.length !== 10 ||
    incoming.username.length < 2 ||
    incoming.username.length > 24 ||
    incoming.usernameNormalized.length < 2 ||
    incoming.usernameNormalized.length > 24
  ) {
    return { allowed: false, failedCheck: 'isValidPlayerShape()' };
  }
  if (incoming.uid !== existing.uid || incoming.playerId !== existing.playerId) {
    return { allowed: false, failedCheck: 'immutable_ids' };
  }
  if (incoming.vipTier !== existing.vipTier || incoming.adsRemoved !== existing.adsRemoved) {
    return { allowed: false, failedCheck: 'immutable_vip' };
  }

  const validMonthKeyTransition =
    !existing.currentMonthKey ||
    (Boolean(incoming.currentMonthKey) &&
      MONTH_REGEX.test(incoming.currentMonthKey!) &&
      incoming.currentMonthKey! >= existing.currentMonthKey);

  if (!validMonthKeyTransition) {
    return { allowed: false, failedCheck: 'isValidMonthKeyTransition()' };
  }

  const isNewMonthReset = Boolean(
    existing.currentMonthKey &&
      incoming.currentMonthKey &&
      MONTH_REGEX.test(incoming.currentMonthKey) &&
      incoming.currentMonthKey > existing.currentMonthKey
  );

  const validPointsDelta =
    (incoming.monthlyRoundPoints >= existing.monthlyRoundPoints &&
      incoming.monthlyRoundPoints - existing.monthlyRoundPoints <= 2) ||
    (isNewMonthReset && incoming.monthlyRoundPoints >= 0 && incoming.monthlyRoundPoints <= 2);

  if (!validPointsDelta) {
    return { allowed: false, failedCheck: 'isValidPointsDelta()' };
  }

  const pointsIncreased =
    (!isNewMonthReset && incoming.monthlyRoundPoints > existing.monthlyRoundPoints) ||
    (isNewMonthReset && incoming.monthlyRoundPoints > 0);

  if (pointsIncreased) {
    const hasServerTs = Boolean(
      incoming.lastPointsAt &&
        incoming.lastPointsAt.__serverTimestamp &&
        incoming.lastPointsAt.ms === requestTimeMs
    );
    if (!hasServerTs) {
      return {
        allowed: false,
        failedCheck: 'isValidPointsRateLimit(): incoming().lastPointsAt == request.time',
      };
    }
    if (existing.lastPointsAt && requestTimeMs < existing.lastPointsAt.ms + 8000) {
      return {
        allowed: false,
        failedCheck: 'isValidPointsRateLimit(): 8s server-timestamp cooldown',
      };
    }
  }

  if (incoming.coins - existing.coins > 120) {
    return { allowed: false, failedCheck: 'isValidCoinsDelta()' };
  }

  const identityUnchanged =
    incoming.username === existing.username &&
    incoming.usernameNormalized === existing.usernameNormalized &&
    incoming.countryCode === existing.countryCode &&
    incoming.lastProfileEditAt === existing.lastProfileEditAt;
  const cooldownElapsed =
    (existing.lastProfileEditAt === 0 ||
      requestTimeMs - existing.lastProfileEditAt >= FIFTY_DAYS_MS) &&
    incoming.lastProfileEditAt >= existing.lastProfileEditAt;
  if (!identityUnchanged && !cooldownElapsed) {
    return { allowed: false, failedCheck: 'isValidIdentityChangeCooldown()' };
  }

  if (incoming.fairPlayScore > existing.fairPlayScore || incoming.fairPlayScore < 0) {
    return { allowed: false, failedCheck: 'isValidFairPlayScoreUpdate()' };
  }

  return { allowed: true };
}

function evalUpdatedPublicCreate(
  authUid: string | null,
  docUid: string,
  incoming: PublicDoc,
  playerDoc: PlayerDoc | null
): EvalResult {
  if (!authUid || authUid !== docUid) return { allowed: false, failedCheck: 'isOwner(uid)' };
  const freshCreate = incoming.vipTier === 'none' && incoming.monthlyRoundPoints <= 2;
  const matchesPlayer =
    playerDoc !== null &&
    incoming.vipTier === playerDoc.vipTier &&
    incoming.monthlyRoundPoints === playerDoc.monthlyRoundPoints;
  if (!freshCreate && !matchesPlayer) {
    return { allowed: false, failedCheck: 'leaderboard_public create guard' };
  }
  return { allowed: true };
}

function runSimulation() {
  const uid = 'player_uid_001';
  const baseTime = 1_795_000_000_000;
  const networkLatencyMs = 145;

  const initialPlayer: PlayerDoc = {
    uid,
    playerId: '1234567890',
    username: 'بطل_الميدان',
    usernameNormalized: 'بطل_الميدان',
    countryCode: 'SA',
    countryName: 'السعودية',
    countryFlag: '🇸🇦',
    monthlyRoundPoints: 0,
    coins: 50,
    xp: 0,
    level: 1,
    rankTitle: 'مبتدئ واعد',
    vipTier: 'none',
    adsRemoved: false,
    fairPlayScore: 100,
    lastProfileEditAt: baseTime - 5 * 86_400_000, // edited 5 days ago
    updatedAtMs: baseTime,
    currentMonthKey: '2026-11',
  };

  console.log('=== 1. LEGACY RULES FAILURE REPRODUCTION ===');
  // Round 1 ends 15s later; client Date.now() differs from server request.time by 145ms latency
  const clientRound1Time = baseTime + 15_000;
  const serverRound1Time = clientRound1Time + networkLatencyMs;
  const legacyRound1 = evalLegacyPlayerUpdate(
    uid,
    uid,
    initialPlayer,
    { ...initialPlayer, monthlyRoundPoints: 2, coins: 70, updatedAtMs: clientRound1Time },
    serverRound1Time
  );
  console.log('Legacy Round 1 (15s, 145ms latency):', legacyRound1);

  // Even with 0ms latency, fast 16s round fails 25s rule
  const legacyFastRound = evalLegacyPlayerUpdate(
    uid,
    uid,
    initialPlayer,
    { ...initialPlayer, monthlyRoundPoints: 2, coins: 70, updatedAtMs: baseTime + 16_000 },
    baseTime + 16_000
  );
  console.log('Legacy Fast Round (16s, 0ms latency):', legacyFastRound);

  // Multi-device Device B with local lastProfileEditAt = 0
  const legacyDeviceB = evalLegacyPlayerUpdate(
    uid,
    uid,
    initialPlayer,
    {
      ...initialPlayer,
      coins: 65,
      lastProfileEditAt: 0,
      updatedAtMs: baseTime + 40_000,
    },
    baseTime + 40_000
  );
  console.log('Legacy Multi-Device B (lastProfileEditAt=0):', legacyDeviceB);

  console.log('\n=== 2. UPDATED RULES + SERIALIZED SYNC: 5 CONSECUTIVE MATCHES (15 ROUNDS) ===');
  let cloudPlayer: PlayerDoc = { ...initialPlayer };
  let simTime = baseTime + 12_000;
  let allPassed = true;

  for (let match = 1; match <= 5; match++) {
    for (let round = 1; round <= 3; round++) {
      simTime += 11_000; // realistic fast 11s round
      const nextDoc: PlayerDoc = {
        ...cloudPlayer,
        monthlyRoundPoints: cloudPlayer.monthlyRoundPoints + 2,
        coins: cloudPlayer.coins + 25,
        xp: cloudPlayer.xp + 30,
        updatedAtMs: simTime - networkLatencyMs,
        lastPointsAt: { __serverTimestamp: true, ms: simTime },
      };
      const res = evalUpdatedPlayerUpdate(uid, uid, cloudPlayer, nextDoc, simTime);
      if (!res.allowed) {
        allPassed = false;
        console.error(`FAIL Match ${match} Round ${round}:`, res);
      } else {
        cloudPlayer = nextDoc;
      }
    }

    // Match completion metadata & badge bonus write immediately after Round 3 (+0 pts, +80 coins)
    simTime += 500;
    const postMatchDoc: PlayerDoc = {
      ...cloudPlayer,
      coins: cloudPlayer.coins + 80,
      xp: cloudPlayer.xp + 50,
      updatedAtMs: simTime - networkLatencyMs,
    };
    const matchRes = evalUpdatedPlayerUpdate(uid, uid, cloudPlayer, postMatchDoc, simTime);
    if (!matchRes.allowed) {
      allPassed = false;
      console.error(`FAIL Match ${match} Completion:`, matchRes);
    } else {
      cloudPlayer = postMatchDoc;
    }
  }
  console.log(
    `5 Consecutive Matches (15 rounds + 5 completions): ${allPassed ? 'ALL PASSED' : 'FAILED'} | Final Points: ${cloudPlayer.monthlyRoundPoints} | Coins: ${cloudPlayer.coins}`
  );

  // Test Device B preserving cloud identity fields
  simTime += 10_000;
  const deviceBRes = evalUpdatedPlayerUpdate(
    uid,
    uid,
    cloudPlayer,
    {
      ...cloudPlayer,
      monthlyRoundPoints: cloudPlayer.monthlyRoundPoints + 1,
      lastPointsAt: { __serverTimestamp: true, ms: simTime },
      updatedAtMs: simTime - 200,
    },
    simTime
  );
  console.log('Multi-Device B (preserving cloud identity):', deviceBRes);

  // Test missing leaderboard_public recovery for player with 30 points
  const recoverPublicRes = evalUpdatedPublicCreate(
    uid,
    uid,
    {
      uid,
      playerId: cloudPlayer.playerId,
      username: cloudPlayer.username,
      countryCode: cloudPlayer.countryCode,
      countryName: cloudPlayer.countryName,
      countryFlag: cloudPlayer.countryFlag,
      monthlyRoundPoints: cloudPlayer.monthlyRoundPoints,
      level: cloudPlayer.level,
      rankTitle: cloudPlayer.rankTitle,
      vipTier: cloudPlayer.vipTier,
      updatedAtMs: simTime,
      currentMonthKey: '2026-11',
    },
    cloudPlayer
  );
  console.log('Missing leaderboard_public recovery (30 pts):', recoverPublicRes);

  // Test legitimate month rollover (2026-11 -> 2026-12, reset to 0)
  simTime += 10_000;
  const monthRolloverRes = evalUpdatedPlayerUpdate(
    uid,
    uid,
    cloudPlayer,
    {
      ...cloudPlayer,
      currentMonthKey: '2026-12',
      monthlyRoundPoints: 0,
      updatedAtMs: simTime,
    },
    simTime
  );
  console.log('New Month Rollover (2026-11 -> 2026-12, reset 0):', monthRolloverRes);

  console.log('\n=== 3. SECURITY & ANTI-CHEAT ATTACK SIMULATION (MUST ALL BE DENIED) ===');
  const attackTests: Array<{ name: string; result: EvalResult }> = [
    {
      name: 'Cross-player modification (attacker editing victim)',
      result: evalUpdatedPlayerUpdate('attacker_uid', uid, cloudPlayer, cloudPlayer, simTime + 10_000),
    },
    {
      name: 'Unauthenticated write (auth == null)',
      result: evalUpdatedPlayerUpdate(null, uid, cloudPlayer, cloudPlayer, simTime + 10_000),
    },
    {
      name: 'VIP self-elevation (none -> legend)',
      result: evalUpdatedPlayerUpdate(
        uid,
        uid,
        cloudPlayer,
        { ...cloudPlayer, vipTier: 'legend' },
        simTime + 10_000
      ),
    },
    {
      name: 'Points jump > +2 (+5 in single write)',
      result: evalUpdatedPlayerUpdate(
        uid,
        uid,
        cloudPlayer,
        {
          ...cloudPlayer,
          monthlyRoundPoints: cloudPlayer.monthlyRoundPoints + 5,
          lastPointsAt: { __serverTimestamp: true, ms: simTime + 10_000 },
        },
        simTime + 10_000
      ),
    },
    {
      name: 'Rapid points farming (< 8s cooldown)',
      result: evalUpdatedPlayerUpdate(
        uid,
        uid,
        cloudPlayer,
        {
          ...cloudPlayer,
          monthlyRoundPoints: cloudPlayer.monthlyRoundPoints + 2,
          lastPointsAt: { __serverTimestamp: true, ms: cloudPlayer.lastPointsAt!.ms + 3000 },
        },
        cloudPlayer.lastPointsAt!.ms + 3000
      ),
    },
    {
      name: 'Coins inflation (+500 in single write)',
      result: evalUpdatedPlayerUpdate(
        uid,
        uid,
        cloudPlayer,
        { ...cloudPlayer, coins: cloudPlayer.coins + 500 },
        simTime + 10_000
      ),
    },
    {
      name: 'Month key rollback (2026-11 -> 2026-10)',
      result: evalUpdatedPlayerUpdate(
        uid,
        uid,
        cloudPlayer,
        { ...cloudPlayer, currentMonthKey: '2026-10', monthlyRoundPoints: 0 },
        simTime + 10_000
      ),
    },
  ];

  let allAttacksBlocked = true;
  for (const test of attackTests) {
    console.log(`  [${test.result.allowed ? 'LEAK!' : 'BLOCKED'}] ${test.name} -> ${test.result.failedCheck}`);
    if (test.result.allowed) allAttacksBlocked = false;
  }

  if (!allPassed || !deviceBRes.allowed || !recoverPublicRes.allowed || !monthRolloverRes.allowed || !allAttacksBlocked) {
    process.exit(1);
  }
  console.log('\nSIMULATION VERDICT: ALL LEGITIMATE SCENARIOS PASSED & ALL ATTACKS BLOCKED.');
}

runSimulation();
