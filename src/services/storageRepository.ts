import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AppLanguage,
  BadgeDefinition,
  CategoryId,
  ChatMessage,
  ChatThreadMeta,
  CountryInfo,
  DailyMission,
  DailyState,
  FriendContact,
  FriendRequest,
  LeaderboardEntry,
  MatchHistoryRecord,
  PlayerProfile,
  SupportTicket,
  SupportTicketCategory,
  UserPresence,
  VipPurchaseReceipt,
  VipTier,
} from '../types/game';
import { COUNTRIES_LIST } from '../data/countries';
import { detectInitialLanguage } from '../utils/i18n';
import {
  auth,
  createUserWithEmailAndPassword,
  db,
  ensureFirebaseAuthSession,
  formatFirebaseAuthOrFirestoreError,
  handleFirestoreError,
  isNetworkConnectivityError,
  OperationType,
  phoneToSyntheticEmail,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from '../firebaseConfig';
import { antiCheatGuard } from '../utils/antiCheatGuard';
import { globalErrorHandler } from '../utils/globalErrorHandler';

const STORAGE_KEY_LEGACY_PROFILE = 'midan_almarifa_player_v1';
const STORAGE_KEY_ACCOUNTS = 'midan_almarifa_accounts_v2';
const STORAGE_KEY_ACTIVE_ID = 'midan_almarifa_active_id_v2';
const STORAGE_KEY_COMPETITORS = 'midan_almarifa_competitors_v1';

export const BADGES_CATALOG: BadgeDefinition[] = [
  {
    id: 'first_match',
    title: 'بداية التحدي',
    titleEn: 'First Challenge',
    description: 'إكمال أول مباراة كاملة من 3 جولات في الميدان',
    descriptionEn: 'Complete your first full 3-round match in the arena',
    iconName: 'Play',
    conditionText: 'العب مباراة واحدة',
    rewardCoins: 15,
  },
  {
    id: 'perfect_round',
    title: 'العلامة الكاملة',
    titleEn: 'Perfect Round',
    description: 'الإجابة على 6 من 6 أسئلة صحيحة في جولة واحدة',
    descriptionEn: 'Answer 6 out of 6 questions correctly in a single round',
    iconName: 'CheckCircle2',
    conditionText: 'حقق 6/6 في جولة',
    rewardCoins: 20,
  },
  {
    id: 'combo_master',
    title: 'شعلة الحماس 🔥',
    titleEn: 'Combo Master 🔥',
    description: 'الوصول إلى سلسلة كومبو 6 إجابات صحيحة متتالية بدون خطأ',
    descriptionEn: 'Reach a streak of 6 consecutive correct answers without mistake',
    iconName: 'Flame',
    conditionText: 'كومبو 6 متتالي',
    rewardCoins: 25,
  },
  {
    id: 'quran_scholar',
    title: 'أهل القرآن',
    titleEn: 'Quran Scholar',
    description: 'إكمال 3 مباريات في قسم القرآن الكريم',
    descriptionEn: 'Complete 3 matches in the Holy Quran category',
    iconName: 'BookOpen',
    conditionText: '3 مباريات في القرآن الكريم',
    rewardCoins: 30,
  },
  {
    id: 'perfect_match',
    title: 'أسطورة الميدان',
    titleEn: 'Arena Legend',
    description: 'تحقيق العلامة الكاملة (18 من 18) في مباراة كاملة',
    descriptionEn: 'Achieve a full 18/18 score across all 3 rounds in a match',
    iconName: 'Crown',
    conditionText: '18/18 في مباراة',
    rewardCoins: 75,
  },
  {
    id: 'boss_slayer',
    title: 'قاهر سؤال اليوم',
    titleEn: 'Daily Boss Slayer',
    description: 'الفوز في تحدي سؤال اليوم النادر (Daily Boss)',
    descriptionEn: 'Win the rare Daily Boss 5-second challenge',
    iconName: 'Zap',
    conditionText: 'حل سؤال اليوم النادر',
    rewardCoins: 30,
  },
  {
    id: 'veteran_10',
    title: 'فارس المعرفة',
    titleEn: 'Knight of Knowledge',
    description: 'إتمام 10 مباريات تنافسية في الميدان',
    descriptionEn: 'Complete 10 competitive matches in the arena',
    iconName: 'Award',
    conditionText: 'أكمل 10 مباريات',
    rewardCoins: 50,
  },
  {
    id: 'points_50',
    title: 'نجم التصنيف الشهري',
    titleEn: 'Monthly Leaderboard Star',
    description: 'جمع 50 نقطة رسمية في الرصيد الشهري',
    descriptionEn: 'Accumulate 50 official monthly leaderboard points',
    iconName: 'Trophy',
    conditionText: 'اجمع 50 نقطة شهرية',
    rewardCoins: 60,
  },
];

export const SIMULATED_COMPETITORS: LeaderboardEntry[] = [
  {
    playerId: '9841205731',
    username: 'صقر_الجزيرة',
    country: COUNTRIES_LIST[1], // Saudi Arabia
    monthlyPoints: 64,
    level: 14,
    rankTitle: 'علامة الميدان',
    rankTitleEn: 'Arena Grandmaster',
    vipTier: 'gold',
  },
  {
    playerId: '7410928364',
    username: 'النابغة_المصري',
    country: COUNTRIES_LIST[2], // Egypt
    monthlyPoints: 58,
    level: 13,
    rankTitle: 'علامة الميدان',
    rankTitleEn: 'Arena Grandmaster',
    vipTier: 'gold',
  },
  {
    playerId: '6301948271',
    username: 'فارس_الإمارات',
    country: COUNTRIES_LIST[3], // UAE
    monthlyPoints: 51,
    level: 11,
    rankTitle: 'حكيم المعرفة',
    rankTitleEn: 'Sage of Knowledge',
    vipTier: 'silver',
  },
  {
    playerId: '5192837465',
    username: 'نجم_اليمن',
    country: COUNTRIES_LIST[0], // Yemen
    monthlyPoints: 45,
    level: 10,
    rankTitle: 'حكيم المعرفة',
    rankTitleEn: 'Sage of Knowledge',
    vipTier: 'gold',
  },
  {
    playerId: '4081726359',
    username: 'درع_الشام',
    country: COUNTRIES_LIST[7], // Jordan
    monthlyPoints: 39,
    level: 9,
    rankTitle: 'خبير متمرس',
    rankTitleEn: 'Seasoned Expert',
    vipTier: 'silver',
  },
  {
    playerId: '3918273645',
    username: 'أسد_الأطلس',
    country: COUNTRIES_LIST[12], // Morocco
    monthlyPoints: 32,
    level: 8,
    rankTitle: 'خبير متمرس',
    rankTitleEn: 'Seasoned Expert',
    vipTier: 'bronze',
  },
  {
    playerId: '2837465910',
    username: 'نور_الرافدين',
    country: COUNTRIES_LIST[8], // Iraq
    monthlyPoints: 26,
    level: 7,
    rankTitle: 'مثقف متألق',
    rankTitleEn: 'Brilliant Scholar',
    vipTier: 'bronze',
  },
  {
    playerId: '1928374650',
    username: 'فخر_الكويت',
    country: COUNTRIES_LIST[4], // Kuwait
    monthlyPoints: 19,
    level: 6,
    rankTitle: 'مثقف متألق',
    rankTitleEn: 'Brilliant Scholar',
    vipTier: 'none',
  },
  {
    playerId: '8172635490',
    username: 'شعلة_الجزائر',
    country: COUNTRIES_LIST[13], // Algeria
    monthlyPoints: 14,
    level: 5,
    rankTitle: 'باحث طموح',
    rankTitleEn: 'Ambitious Seeker',
    vipTier: 'none',
  },
  {
    playerId: '6758493021',
    username: 'نسر_تونس',
    country: COUNTRIES_LIST[14], // Tunisia
    monthlyPoints: 8,
    level: 4,
    rankTitle: 'باحث طموح',
    rankTitleEn: 'Ambitious Seeker',
    vipTier: 'none',
  },
  {
    playerId: '5544332211',
    username: 'سلطان_عمان',
    country: COUNTRIES_LIST[6], // Oman
    monthlyPoints: 4,
    level: 3,
    rankTitle: 'مبتدئ واعد',
    rankTitleEn: 'Rising Challenger',
    vipTier: 'none',
  },
];

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function normalizeUsernameKey(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[.#$[\]/]/g, '_');
}

export function buildCanonicalChatId(idA: string, idB: string): string {
  return [idA.trim(), idB.trim()].sort().join('_');
}

export function buildSortedUidPair(uidA: string, uidB: string): [string, string] {
  const sorted = [uidA.trim(), uidB.trim()].sort();
  return [sorted[0], sorted[1]];
}

export function generateUnique10DigitId(existingIds: string[] = []): string {
  const existingSet = new Set(existingIds);
  for (let attempt = 0; attempt < 50; attempt++) {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    let rest = '';
    for (let i = 0; i < 9; i++) {
      rest += String(Math.floor(Math.random() * 10));
    }
    const candidate = `${firstDigit}${rest}`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
  }
  return String(Date.now()).slice(-10);
}

export function calculateLevelAndRank(xp: number): {
  level: number;
  rankTitle: string;
  rankTitleEn: string;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  const xpPerLevel = 120;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const currentLevelXp = xp % xpPerLevel;
  const progressPercent = Math.min(100, Math.round((currentLevelXp / xpPerLevel) * 100));

  let rankTitle = 'مبتدئ واعد';
  let rankTitleEn = 'Rising Challenger';
  if (level >= 15) {
    rankTitle = 'أسطورة المعرفة';
    rankTitleEn = 'Legend of Knowledge';
  } else if (level >= 12) {
    rankTitle = 'علامة الميدان';
    rankTitleEn = 'Arena Grandmaster';
  } else if (level >= 9) {
    rankTitle = 'حكيم المعرفة';
    rankTitleEn = 'Sage of Knowledge';
  } else if (level >= 6) {
    rankTitle = 'خبير متمرس';
    rankTitleEn = 'Seasoned Expert';
  } else if (level >= 4) {
    rankTitle = 'مثقف متألق';
    rankTitleEn = 'Brilliant Scholar';
  } else if (level >= 2) {
    rankTitle = 'باحث طموح';
    rankTitleEn = 'Ambitious Seeker';
  }

  return {
    level,
    rankTitle,
    rankTitleEn,
    currentLevelXp,
    nextLevelXp: xpPerLevel,
    progressPercent,
  };
}

export const IDENTITY_COOLDOWN_DAYS = 50;
export const FIFTY_DAYS_MS = 50 * 24 * 60 * 60 * 1000; // 4,320,000,000 ms

export function getIdentityChangeCooldownDays(lastIdentityChangeAt?: string): number {
  if (!lastIdentityChangeAt) return 0;
  const lastTimeMs = new Date(lastIdentityChangeAt).getTime();
  if (Number.isNaN(lastTimeMs) || lastTimeMs <= 0) return 0;
  const elapsedMs = Date.now() - lastTimeMs;
  if (elapsedMs >= FIFTY_DAYS_MS) return 0;
  return Math.max(1, Math.ceil((FIFTY_DAYS_MS - elapsedMs) / (24 * 60 * 60 * 1000)));
}

const ADMIN_EMAILS = new Set(['mohammedmnjl90@gmail.com']);

/**
 * Checks whether the current account has Administrator privileges.
 * Used to restrict sensitive Cloud Data / Firebase Rules controls strictly to Admins.
 */
export function isAdminProfile(profile?: PlayerProfile | null): boolean {
  if (!profile) return false;
  if (profile.isAdmin === true || profile.role === 'admin') {
    return true;
  }
  const candidateEmails = [
    profile.email,
    profile.contactType === 'email' ? profile.contactValue : undefined,
    auth.currentUser?.email ?? undefined,
  ];
  for (const raw of candidateEmails) {
    if (raw && ADMIN_EMAILS.has(raw.trim().toLowerCase())) {
      return true;
    }
  }
  return false;
}

export function createDefaultDailyMissions(): DailyMission[] {
  return [
    {
      id: 'mission_matches',
      title: 'خوض المباريات',
      titleEn: 'Play Arena Matches',
      description: 'أكمل مباراتين (6 جولات) في أي قسم من أقسام الميدان اليوم',
      descriptionEn: 'Complete 2 full matches (6 rounds) in any category today',
      target: 2,
      progress: 0,
      rewardCoins: 20,
      rewardXp: 40,
      claimed: false,
      type: 'play_matches',
    },
    {
      id: 'mission_correct',
      title: 'صائد الإجابات الصحيحة',
      titleEn: 'Correct Answer Hunter',
      description: 'أجب على 12 سؤالاً بشكل صحيح خلال مباريات اليوم',
      descriptionEn: 'Answer 12 questions correctly across today’s matches',
      target: 12,
      progress: 0,
      rewardCoins: 25,
      rewardXp: 50,
      claimed: false,
      type: 'correct_answers',
    },
    {
      id: 'mission_perfect_round',
      title: 'جولة العلامة الكاملة',
      titleEn: 'Perfect Round Master',
      description: 'حقق 6 من 6 في جولة واحدة على الأقل اليوم',
      descriptionEn: 'Score 6/6 in at least one round today',
      target: 1,
      progress: 0,
      rewardCoins: 30,
      rewardXp: 60,
      claimed: false,
      type: 'perfect_round',
    },
    {
      id: 'mission_combo',
      title: 'سلسلة الكومبو المشتعلة',
      titleEn: 'Blazing Combo Streak',
      description: 'فعّل مكافأة الكومبو (3 إجابات متتالية) مرتين اليوم',
      descriptionEn: 'Trigger the 3-in-a-row Combo Streak bonus twice today',
      target: 2,
      progress: 0,
      rewardCoins: 15,
      rewardXp: 35,
      claimed: false,
      type: 'combo_streak',
    },
  ];
}

export function createFreshDailyState(): DailyState {
  return {
    dateKey: getTodayKey(),
    spinUsed: false,
    extraSpinsToday: 0,
    dailyBossAttempted: false,
    dailyBossWon: false,
    rewardedAdsWatchedToday: 0,
    missions: createDefaultDailyMissions(),
  };
}

export function getVipMultiplier(tier: VipTier): {
  coinBonusPerOfficialPoint: number;
  dailySpinMultiplier: number;
  labelAr: string;
  labelEn: string;
} {
  switch (tier) {
    case 'bronze':
      return {
        coinBonusPerOfficialPoint: 1,
        dailySpinMultiplier: 1.2,
        labelAr: 'VIP برونزي',
        labelEn: 'Bronze VIP',
      };
    case 'silver':
      return {
        coinBonusPerOfficialPoint: 2,
        dailySpinMultiplier: 1.5,
        labelAr: 'VIP فضي',
        labelEn: 'Silver VIP',
      };
    case 'gold':
      return {
        coinBonusPerOfficialPoint: 4,
        dailySpinMultiplier: 2,
        labelAr: 'VIP ذهبي',
        labelEn: 'Gold VIP',
      };
    default:
      return {
        coinBonusPerOfficialPoint: 0,
        dailySpinMultiplier: 1,
        labelAr: 'عضو قياسي',
        labelEn: 'Standard Member',
      };
  }
}

export function buildAutomatedSupportReply(
  username: string,
  playerId: string,
  category: SupportTicketCategory,
  subject: string
): string {
  switch (category) {
    case 'prizes':
      return `مرحباً بك يا ${username} (ID: ${playerId}). تم استلام استفسارك بخصوص الجوائز الشهرية («${subject}»). يتم اعتماد ترتيب المتصدرين الخمسة الأوائل تلقائياً بنهاية الشهر، وسيتواصل معك فريق الجوائز مباشرة عبر بيانات حسابك لتسليم جائزتك.`;
    case 'technical':
      return `أهلاً بك يا ${username} (ID: ${playerId}). شكراً لإبلاغنا بالملاحظة التقنية («${subject}»). تم فحص سجل جلستك والتأكد من سلامة نقاطك وعملاتك المحفوظة، ويعمل الفريق التقني على معالجة أي ملاحظة فوراً.`;
    case 'suggestion':
      return `شكراً جزيلاً لك يا ${username} على اقتراحك القيّم («${subject}»)! نحن نعتز بأفكار لاعبي قمة التحدي وقد تم رفع مقترحك لفريق التطوير لإدراجه في التحديث القادم.`;
    case 'complaint':
      return `نقدّر تواصلك معنا يا ${username} (ID: ${playerId}). تم تسجيل بلاغك («${subject}») برقم أولوية لدى إدارة التطبيق وسيتم مراجعته بدقة لضمان أعلى معايير النزاهة والعدالة التنافسية.`;
  }
}

export function buildFriendSmartReply(
  friend: FriendContact,
  userMessage: string,
  lang: AppLanguage
): string {
  const lower = userMessage.toLowerCase();
  if (lang === 'en') {
    if (
      lower.includes('hi') ||
      lower.includes('hello') ||
      lower.includes('hey') ||
      lower.includes('salam')
    ) {
      return `Hey there! Great to connect with you in the Arena ${friend.country.flag}. Ready for today's rounds?`;
    }
    if (lower.includes('score') || lower.includes('point') || lower.includes('rank')) {
      return `I'm pushing hard for the Top 5 monthly prizes! Keep up the 6/6 perfect rounds 🔥`;
    }
    if (lower.includes('good luck') || lower.includes('gg') || lower.includes('nice')) {
      return `Thanks champion! Wishing you a blazing combo streak in your next match ⚡`;
    }
    const enPool = [
      `Awesome! Let's see who climbs higher on the monthly leaderboard 🏆`,
      `That 6-second timer is intense! The Cocktail category is my favorite challenge 🚀`,
      `Great hearing from you! Keep stacking those 6/6 rounds 💪`,
      `I just finished a match! Let's compete for the top spots this month 🔥`,
    ];
    return enPool[userMessage.length % enPool.length];
  }

  if (
    lower.includes('سلام') ||
    lower.includes('مرحبا') ||
    lower.includes('اهلا') ||
    lower.includes('أهلا') ||
    lower.includes('هلا')
  ) {
    return `يا هلا ومرحبا بك يا بطل! سعيد بصداقتك في قمة التحدي ${friend.country.flag}، هل أنت جاهز لجولات اليوم؟`;
  }
  if (
    lower.includes('نقاط') ||
    lower.includes('ترتيب') ||
    lower.includes('متصدر') ||
    lower.includes('جائزة')
  ) {
    return `المنافسة هذا الشهر مشتعلة جداً على المراكز الخمسة الأولى! ركز على تحقيق 6/6 في الجولات لحصد النقاط المضاعفة 🏆`;
  }
  if (
    lower.includes('مبروك') ||
    lower.includes('كفو') ||
    lower.includes('بطل') ||
    lower.includes('بالتوفيق')
  ) {
    return `تسلم يا غالي! بالتوفيق لك أيضاً، نلتقي في قمة المتصدرين بإذن الله 🔥⚡`;
  }

  const arPool = [
    `تحدي الـ 6 ثوانٍ يحتاج سرعة بديهة عالية! أي قسم تفضّل اللعب فيه اليوم؟ 🚀`,
    `سعيد بتواصلك يا صديقي! شد حيلك في الجولات القادمة لنرى اسمك في الصدارة 🏆`,
    `أنهيت للتو مباراة قوية في قسم الكوكتيل الشامل، المنافسة ممتعة جداً! 🔥`,
    `يا أهلاً بك! حافظ على سلسلة الكومبو لحصد عملات إضافية في كل جولة 💪`,
  ];
  return arPool[userMessage.length % arPool.length];
}

function resolveCountryByCode(code?: string, fallback?: CountryInfo): CountryInfo {
  if (fallback && fallback.code && fallback.flag) return fallback;
  if (code) {
    const found = COUNTRIES_LIST.find(
      (c) => c.code.toLowerCase() === code.trim().toLowerCase()
    );
    if (found) return found;
  }
  return COUNTRIES_LIST[0];
}

/**
 * Online-Only Cloud Firestore Repository
 * - Requires live internet & Firebase connectivity for active gameplay and syncing
 * - Reserves unique usernames globally in usernames/{nameNormalized}
 * - Enforces +2 max round points per cloud update, 50-day identity cooldown, and fairPlayScore integrity
 * - Provides real-time onSnapshot listeners for Leaderboard, Friends Private Chat, and Support Tickets
 */
export interface CloudSyncStatus {
  connected: boolean;
  isNetworkOffline: boolean;
  lastSyncedAtMs?: number;
  lastError: string | null;
}

export class StorageRepository {
  private cloudLeaderboardCache: LeaderboardEntry[] = [];
  private rateLimitRetryTimer: number | null = null;
  private isSyncInFlight = false;
  private pendingSyncRequest: {
    profile: PlayerProfile;
    oldUsernameNormalized?: string;
    isIdentityEdit?: boolean;
  } | null = null;
  private lastPlayerPointsWriteAtMs = 0;
  private lastPublicPointsWriteAtMs = 0;
  private cloudStatus: CloudSyncStatus = {
    connected: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
    isNetworkOffline: typeof navigator !== 'undefined' ? navigator.onLine === false : false,
    lastError: null,
  };
  private cloudStatusListeners = new Set<(status: CloudSyncStatus) => void>();

  public getCloudStatus(): CloudSyncStatus {
    return this.cloudStatus;
  }

  public subscribeToCloudStatus(
    listener: (status: CloudSyncStatus) => void
  ): () => void {
    this.cloudStatusListeners.add(listener);
    listener(this.cloudStatus);
    return () => {
      this.cloudStatusListeners.delete(listener);
    };
  }

  public setCloudStatus(
    connected: boolean,
    lastError: string | null = null,
    isNetworkOffline = false
  ): void {
    this.cloudStatus = {
      connected,
      isNetworkOffline: connected ? false : isNetworkOffline,
      lastSyncedAtMs: connected ? Date.now() : this.cloudStatus.lastSyncedAtMs,
      lastError,
    };
    for (const listener of this.cloudStatusListeners) {
      listener(this.cloudStatus);
    }
  }

  private ensureProfileFields(parsed: PlayerProfile): PlayerProfile {
    const today = getTodayKey();
    const currentMonth = getCurrentMonthKey();

    if (!parsed.daily || parsed.daily.dateKey !== today) {
      parsed.daily = createFreshDailyState();
    } else {
      if (typeof parsed.daily.rewardedAdsWatchedToday !== 'number') {
        parsed.daily.rewardedAdsWatchedToday = 0;
      }
      if (parsed.daily.missions) {
        const defaults = createDefaultDailyMissions();
        parsed.daily.missions = parsed.daily.missions.map((m) => {
          const def = defaults.find((d) => d.id === m.id);
          return {
            ...m,
            titleEn: m.titleEn || def?.titleEn,
            descriptionEn: m.descriptionEn || def?.descriptionEn,
          };
        });
      }
    }

    if (parsed.currentMonthKey !== currentMonth) {
      parsed.currentMonthKey = currentMonth;
      parsed.monthlyPoints = 0;
      parsed.monthlyRoundPoints = 0;
    }

    if (typeof parsed.monthlyRoundPoints !== 'number') {
      parsed.monthlyRoundPoints = parsed.monthlyPoints || 0;
    }

    if (typeof parsed.fairPlayScore !== 'number') {
      parsed.fairPlayScore = 100;
    }

    if (typeof parsed.lastProfileEditAt !== 'number') {
      parsed.lastProfileEditAt = parsed.lastIdentityChangeAt
        ? new Date(parsed.lastIdentityChangeAt).getTime() || 0
        : 0;
    }

    if (!parsed.usernameNormalized) {
      parsed.usernameNormalized = normalizeUsernameKey(parsed.username || 'player');
    }

    if (!parsed.supportTickets) {
      parsed.supportTickets = [];
    }

    if (!parsed.friends) {
      parsed.friends = [];
    }

    if (!parsed.chatThreads) {
      parsed.chatThreads = {};
    }

    if (typeof parsed.activePlaySeconds !== 'number') {
      parsed.activePlaySeconds = 0;
    }

    if (typeof parsed.lastInterstitialHourShown !== 'number') {
      parsed.lastInterstitialHourShown = 0;
    }

    if (typeof parsed.adsRemoved !== 'boolean') {
      parsed.adsRemoved = parsed.vipTier !== 'none';
    }

    if (parsed.vipExpiryDate) {
      const expiryMs = new Date(parsed.vipExpiryDate).getTime();
      if (Number.isNaN(expiryMs) || Date.now() > expiryMs) {
        parsed.vipTier = 'none';
        parsed.vipExpiryDate = undefined;
        parsed.adsRemoved = false;
      }
    } else if (parsed.vipTier !== 'none' && !parsed.vipExpiryDate) {
      parsed.vipExpiryDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    }

    if (!parsed.vipReceipts) {
      parsed.vipReceipts = [];
    }

    if (!parsed.settings) {
      parsed.settings = {
        soundEnabled: true,
        vibrationEnabled: true,
        language: detectInitialLanguage(),
      };
    } else if (!parsed.settings.language) {
      parsed.settings.language = detectInitialLanguage();
    }

    return parsed;
  }

  public loadAllSavedAccounts(): PlayerProfile[] {
    try {
      const rawAccounts = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      let accounts: PlayerProfile[] = [];
      if (rawAccounts) {
        const parsed = JSON.parse(rawAccounts);
        if (Array.isArray(parsed)) {
          accounts = parsed.map((p) => this.ensureProfileFields(p));
        }
      }

      const rawLegacy = localStorage.getItem(STORAGE_KEY_LEGACY_PROFILE);
      if (rawLegacy) {
        const legacyProfile = this.ensureProfileFields(
          JSON.parse(rawLegacy) as PlayerProfile
        );
        const exists = accounts.some((a) => a.playerId === legacyProfile.playerId);
        if (!exists) {
          accounts.unshift(legacyProfile);
          this.saveAllAccounts(accounts);
        }
      }

      return accounts;
    } catch {
      return [];
    }
  }

  private saveAllAccounts(accounts: PlayerProfile[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    } catch {
      // ignore storage quota errors
    }
  }

  public loadProfile(): PlayerProfile | null {
    try {
      const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      const accounts = this.loadAllSavedAccounts();

      if (activeId === '__LOGGED_OUT__') {
        return null;
      }

      if (activeId) {
        const found = accounts.find((a) => a.playerId === activeId);
        if (found) {
          const updated = this.ensureProfileFields(found);
          this.saveProfile(updated, { skipCloudSync: true });
          return updated;
        }
      }

      if (accounts.length > 0) {
        const first = this.ensureProfileFields(accounts[0]);
        localStorage.setItem(STORAGE_KEY_ACTIVE_ID, first.playerId);
        this.saveProfile(first, { skipCloudSync: true });
        return first;
      }

      return null;
    } catch {
      return null;
    }
  }

  public saveProfile(
    profile: PlayerProfile,
    options?: {
      skipCloudSync?: boolean;
      oldUsernameNormalized?: string;
      isIdentityEdit?: boolean;
    }
  ): PlayerProfile {
    const unlockedSet = new Set(profile.unlockedBadges);
    let bonusBadgeCoins = 0;

    for (const badge of BADGES_CATALOG) {
      if (!unlockedSet.has(badge.id) && this.checkBadgeCondition(profile, badge.id)) {
        unlockedSet.add(badge.id);
        bonusBadgeCoins += badge.rewardCoins;
      }
    }

    const activeUid = auth.currentUser?.uid || profile.uid;
    const normalizedName = normalizeUsernameKey(profile.username);
    const editEpochMs = profile.lastIdentityChangeAt
      ? new Date(profile.lastIdentityChangeAt).getTime() || profile.lastProfileEditAt || 0
      : profile.lastProfileEditAt || 0;

    const updated: PlayerProfile = {
      ...profile,
      uid: activeUid,
      usernameNormalized: normalizedName,
      monthlyRoundPoints: profile.monthlyPoints,
      fairPlayScore:
        typeof profile.fairPlayScore === 'number'
          ? Math.max(0, Math.min(100, Math.floor(profile.fairPlayScore)))
          : 100,
      lastProfileEditAt: editEpochMs,
      coins: profile.coins + bonusBadgeCoins,
      unlockedBadges: Array.from(unlockedSet),
    };

    try {
      const accounts = this.loadAllSavedAccounts();
      const idx = accounts.findIndex((a) => a.playerId === updated.playerId);
      if (idx >= 0) {
        accounts[idx] = updated;
      } else {
        accounts.unshift(updated);
      }
      this.saveAllAccounts(accounts);
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, updated.playerId);
      localStorage.setItem(STORAGE_KEY_LEGACY_PROFILE, JSON.stringify(updated));
    } catch {
      // ignore quota errors
    }

    if (!options?.skipCloudSync) {
      void this.syncProfileToFirestore(
        updated,
        options?.oldUsernameNormalized,
        false,
        Boolean(options?.isIdentityEdit || options?.oldUsernameNormalized)
      );
    }

    return updated;
  }

  /**
   * Builds the optional contact fields (`email`, `phone`, `contactType`, `contactValue`)
   * for `players/{uid}` without undefined values.
   */
  private buildContactFieldsForFirestore(
    profile: PlayerProfile
  ): Record<string, string> {
    const out: Record<string, string> = {};
    if (profile.contactType) {
      out.contactType = profile.contactType;
    }
    if (profile.contactValue) {
      out.contactValue = profile.contactValue.slice(0, 120);
    }
    if (profile.email) {
      out.email = profile.email.slice(0, 120);
    } else if (profile.contactType === 'email' && profile.contactValue) {
      out.email = profile.contactValue.slice(0, 120);
    }
    if (profile.phone) {
      out.phone = profile.phone.slice(0, 30);
    } else if (profile.contactType === 'phone' && profile.contactValue) {
      out.phone = profile.contactValue.slice(0, 30);
    }
    return out;
  }

  /**
   * Builds the public non-sensitive leaderboard document for `/leaderboard_public/{uid}`.
   * Explicitly excludes `email`, `phone`, `contactType`, `contactValue`, `coins`, and `fairPlayScore`.
   */
  private buildPublicLeaderboardPayload(params: {
    uid: string;
    playerId: string;
    username: string;
    usernameNormalized: string;
    countryCode: string;
    countryName: string;
    countryFlag: string;
    monthlyRoundPoints: number;
    level: number;
    rankTitle: string;
    rankTitleEn: string;
    vipTier: VipTier;
    updatedAtMs: number;
    currentMonthKey?: string;
    lastPointsAt?: unknown;
  }) {
    const base: Record<string, unknown> = {
      uid: params.uid,
      playerId: params.playerId,
      username: params.username,
      usernameNormalized: params.usernameNormalized,
      countryCode: params.countryCode,
      countryName: params.countryName,
      countryFlag: params.countryFlag,
      monthlyRoundPoints: params.monthlyRoundPoints,
      level: params.level,
      rankTitle: params.rankTitle,
      rankTitleEn: params.rankTitleEn,
      vipTier: params.vipTier,
      updatedAtMs: params.updatedAtMs,
    };
    if (params.currentMonthKey && /^[0-9]{4}-[0-9]{2}$/.test(params.currentMonthKey)) {
      base.currentMonthKey = params.currentMonthKey;
    }
    if (params.lastPointsAt !== undefined && params.lastPointsAt !== null) {
      base.lastPointsAt = params.lastPointsAt;
    }
    return base;
  }

  private extractTimestampMs(value: unknown): number {
    if (
      value &&
      typeof value === 'object' &&
      'toMillis' in value &&
      typeof (value as { toMillis?: unknown }).toMillis === 'function'
    ) {
      const ms = (value as { toMillis: () => number }).toMillis();
      return Number.isFinite(ms) ? ms : 0;
    }
    return 0;
  }

  private sanitizeSyncStrings(
    profile: PlayerProfile,
    uid: string
  ): {
    safePlayerId: string;
    safeUsername: string;
    safeUsernameNorm: string;
    safeCountryCode: string;
    safeCountryName: string;
    safeCountryFlag: string;
    safeMonthKey: string;
  } {
    const rawId = String(profile.playerId || '').replace(/\D/g, '');
    const safePlayerId =
      rawId.length === 10 ? rawId : rawId.padEnd(10, '0').slice(0, 10);

    let safeUsername = (profile.username || '').trim().slice(0, 24);
    if (safeUsername.length < 2) {
      safeUsername = `بطل_${uid.slice(0, 4)}`;
    }

    let safeUsernameNorm = normalizeUsernameKey(safeUsername).slice(0, 24);
    if (safeUsernameNorm.length < 2) {
      safeUsernameNorm = `p_${uid.slice(0, 8)}`.slice(0, 24);
    }

    const rawCode = (profile.country?.code || 'SA').trim().slice(0, 4);
    const safeCountryCode = rawCode.length >= 2 ? rawCode : 'SA';

    const rawCountryName = (profile.country?.name || 'السعودية').trim().slice(0, 50);
    const safeCountryName = rawCountryName.length >= 2 ? rawCountryName : 'السعودية';

    const rawFlag = (profile.country?.flag || '🌍').trim().slice(0, 16);
    const safeCountryFlag = rawFlag.length >= 1 ? rawFlag : '🌍';

    const rawMonth = profile.currentMonthKey || getCurrentMonthKey();
    const safeMonthKey = /^[0-9]{4}-[0-9]{2}$/.test(rawMonth)
      ? rawMonth
      : getCurrentMonthKey();

    return {
      safePlayerId,
      safeUsername,
      safeUsernameNorm,
      safeCountryCode,
      safeCountryName,
      safeCountryFlag,
      safeMonthKey,
    };
  }

  private scheduleFollowUpSync(delayMs: number): void {
    if (typeof window === 'undefined') return;
    if (this.rateLimitRetryTimer) {
      window.clearTimeout(this.rateLimitRetryTimer);
    }
    this.rateLimitRetryTimer = window.setTimeout(() => {
      this.rateLimitRetryTimer = null;
      const latestLocal = this.loadProfile();
      if (latestLocal) {
        void this.syncProfileToFirestore(latestLocal);
      }
    }, Math.max(2000, delayMs));
  }

  /**
   * Synchronizes the player profile to:
   * 1. Private document `/players/{uid}` (readable strictly by `isOwner(uid)`)
   * 2. Public leaderboard document `/leaderboard_public/{uid}` (non-sensitive fields only)
   * 3. Global username reservation `/usernames/{nameNormalized}` (only on creation or explicit rename)
   *
   * Serialized via single-flight queue so rapid consecutive rounds/matches NEVER collide
   * on Firestore snapshots or trigger `permission-denied` rate-limit races.
   */
  public async syncProfileToFirestore(
    profile: PlayerProfile,
    oldUsernameNormalized?: string,
    throwOnError = false,
    isIdentityEdit = false
  ): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setCloudStatus(
        false,
        profile.settings?.language === 'en'
          ? 'No internet connection'
          : 'لا يوجد اتصال بالإنترنت',
        true
      );
      if (throwOnError) {
        throw new Error('network-request-failed');
      }
      return;
    }

    // Coalesce concurrent non-blocking sync calls so only one write pipeline runs at a time
    if (this.isSyncInFlight && !throwOnError) {
      this.pendingSyncRequest = {
        profile,
        oldUsernameNormalized:
          oldUsernameNormalized || this.pendingSyncRequest?.oldUsernameNormalized,
        isIdentityEdit: isIdentityEdit || this.pendingSyncRequest?.isIdentityEdit,
      };
      return;
    }

    this.isSyncInFlight = true;
    try {
      await this.executeSyncProfileToFirestore(
        profile,
        oldUsernameNormalized,
        throwOnError,
        isIdentityEdit
      );
    } finally {
      this.isSyncInFlight = false;
      if (this.pendingSyncRequest) {
        const nextReq = this.pendingSyncRequest;
        this.pendingSyncRequest = null;
        void this.syncProfileToFirestore(
          nextReq.profile,
          nextReq.oldUsernameNormalized,
          false,
          Boolean(nextReq.isIdentityEdit)
        );
      }
    }
  }

  private async executeSyncProfileToFirestore(
    profile: PlayerProfile,
    oldUsernameNormalized?: string,
    throwOnError = false,
    isIdentityEdit = false
  ): Promise<void> {
    let activeOpPath = 'players/sync';
    let activeOpType: OperationType = OperationType.WRITE;

    try {
      const uid = auth.currentUser?.uid || profile.uid || (await ensureFirebaseAuthSession());
      if (!uid) {
        if (throwOnError) {
          throw new Error('Auth session missing');
        }
        return;
      }

      const playerRef = doc(db, 'players', uid);
      const publicRef = doc(db, 'leaderboard_public', uid);
      const levelInfo = calculateLevelAndRank(profile.xp);
      const contactFields = this.buildContactFieldsForFirestore(profile);
      const sanitized = this.sanitizeSyncStrings(profile, uid);

      activeOpPath = `players/${uid}`;
      activeOpType = OperationType.GET;

      let existingPlayerSnap;
      let existingPublicSnap;
      try {
        [existingPlayerSnap, existingPublicSnap] = await globalErrorHandler.withSafeRetry(
          () => Promise.all([getDoc(playerRef), getDoc(publicRef)]),
          { maxRetries: 2, baseDelayMs: 500 }
        );
      } catch (err) {
        const formatted = formatFirebaseAuthOrFirestoreError(
          err,
          profile.settings?.language || 'ar',
          'sync'
        );
        this.setCloudStatus(false, formatted, isNetworkConnectivityError(err));
        handleFirestoreError(err, OperationType.GET, `players/${uid}`, false, 'sync');
        if (throwOnError) throw err;
        return;
      }

      const targetPoints = Math.max(0, Math.floor(profile.monthlyPoints));
      const targetCoins = Math.max(0, Math.floor(profile.coins));
      const targetXp = Math.max(0, Math.floor(profile.xp));
      const targetFairPlay = Math.max(
        0,
        Math.min(100, Math.floor(profile.fairPlayScore ?? 100))
      );
      const safeRankTitle = (levelInfo.rankTitle || 'مبتدئ واعد').slice(0, 40);
      const safeRankTitleEn = (levelInfo.rankTitleEn || 'Rising Challenger').slice(0, 40);
      const safeLevel = Math.max(1, Math.floor(levelInfo.level || 1));
      const lastEditMs = Math.max(0, Math.floor(profile.lastProfileEditAt ?? 0));
      const nowMs = Date.now();
      const POINTS_COOLDOWN_MS = 8500;

      if (!existingPlayerSnap.exists()) {
        // Initial create: obeys firestore.rules (vipTier == 'none', adsRemoved == false, coins <= 100, monthlyRoundPoints <= 2, fairPlayScore == 100)
        const initialPoints = Math.min(2, targetPoints);
        const initialCoins = Math.min(100, targetCoins);

        const initialDocData: Record<string, unknown> = {
          uid,
          playerId: sanitized.safePlayerId,
          username: sanitized.safeUsername,
          usernameNormalized: sanitized.safeUsernameNorm,
          countryCode: sanitized.safeCountryCode,
          countryName: sanitized.safeCountryName,
          countryFlag: sanitized.safeCountryFlag,
          country: profile.country,
          ...contactFields,
          monthlyRoundPoints: initialPoints,
          monthlyPoints: initialPoints,
          currentMonthKey: sanitized.safeMonthKey,
          coins: initialCoins,
          xp: targetXp,
          level: safeLevel,
          rankTitle: safeRankTitle,
          rankTitleEn: safeRankTitleEn,
          vipTier: 'none' as VipTier,
          adsRemoved: false,
          fairPlayScore: 100,
          lastProfileEditAt: lastEditMs,
          createdAt: profile.createdAt || new Date().toISOString(),
          updatedAtMs: nowMs,
        };
        if (initialPoints > 0) {
          initialDocData.lastPointsAt = serverTimestamp();
        }

        activeOpPath = `players/${uid}`;
        activeOpType = OperationType.CREATE;
        await globalErrorHandler.withSafeRetry(() => setDoc(playerRef, initialDocData));
        if (initialPoints > 0) {
          this.lastPlayerPointsWriteAtMs = Date.now();
        }

        // Mirror public non-sensitive fields to `/leaderboard_public/{uid}`
        activeOpPath = `leaderboard_public/${uid}`;
        activeOpType = existingPublicSnap.exists()
          ? OperationType.UPDATE
          : OperationType.CREATE;
        await globalErrorHandler.withSafeRetry(() =>
          setDoc(
            publicRef,
            this.buildPublicLeaderboardPayload({
              uid,
              playerId: sanitized.safePlayerId,
              username: sanitized.safeUsername,
              usernameNormalized: sanitized.safeUsernameNorm,
              countryCode: sanitized.safeCountryCode,
              countryName: sanitized.safeCountryName,
              countryFlag: sanitized.safeCountryFlag,
              monthlyRoundPoints: initialPoints,
              level: safeLevel,
              rankTitle: safeRankTitle,
              rankTitleEn: safeRankTitleEn,
              vipTier: 'none',
              updatedAtMs: nowMs,
              currentMonthKey: sanitized.safeMonthKey,
              lastPointsAt: initialPoints > 0 ? serverTimestamp() : undefined,
            })
          )
        );
        if (initialPoints > 0) {
          this.lastPublicPointsWriteAtMs = Date.now();
        }

        // Reserve username globally only if unoccupied or already owned by this UID
        try {
          const usernameRef = doc(db, 'usernames', sanitized.safeUsernameNorm);
          const uSnap = await getDoc(usernameRef);
          if (!uSnap.exists() || uSnap.data()?.uid === uid) {
            await setDoc(usernameRef, {
              uid,
              username: sanitized.safeUsername,
              playerId: sanitized.safePlayerId,
              createdAt: nowMs,
              reservedAtMs: nowMs,
            });
          }
        } catch (uErr) {
          handleFirestoreError(
            uErr,
            OperationType.WRITE,
            `usernames/${sanitized.safeUsernameNorm}`,
            false,
            'sync'
          );
        }

        if (targetPoints > initialPoints || targetCoins > initialCoins) {
          this.scheduleFollowUpSync(9000);
        }

        this.setCloudStatus(true, null, false);
        return;
      }

      // Existing cloud document update — strictly obeys all security rules:
      // 1) Owner-only, immutable uid/playerId/vipTier/adsRemoved
      // 2) Points delta <= +2 (or legitimate new-month reset), serverTimestamp `lastPointsAt` >= 8s
      // 3) Coins delta <= +120
      // 4) Identity fields preserved from cloudData unless explicit identity edit
      // 5) fairPlayScore never increased
      const cloudData = existingPlayerSnap.data();
      const currentCloudPts =
        typeof cloudData.monthlyRoundPoints === 'number'
          ? Math.max(0, Math.floor(cloudData.monthlyRoundPoints))
          : 0;
      const currentCloudCoins =
        typeof cloudData.coins === 'number' ? Math.max(0, Math.floor(cloudData.coins)) : 50;
      const currentCloudFairPlay =
        typeof cloudData.fairPlayScore === 'number'
          ? Math.max(0, Math.min(100, Math.floor(cloudData.fairPlayScore)))
          : 100;
      const cloudMonthKey =
        typeof cloudData.currentMonthKey === 'string' &&
        /^[0-9]{4}-[0-9]{2}$/.test(cloudData.currentMonthKey)
          ? cloudData.currentMonthKey
          : null;

      // Never roll month key backward
      const effectivePlayerMonthKey =
        cloudMonthKey && cloudMonthKey > sanitized.safeMonthKey
          ? cloudMonthKey
          : sanitized.safeMonthKey;
      const isPlayerNewMonthReset = Boolean(
        cloudMonthKey && effectivePlayerMonthKey > cloudMonthKey
      );

      // Preserve cloud identity fields on normal match/gameplay syncs so multi-device
      // sessions NEVER trip the 50-day identity cooldown check (`isValidIdentityChangeCooldown`)
      const allowIdentityMutation = Boolean(isIdentityEdit || oldUsernameNormalized);
      const finalUsername = allowIdentityMutation
        ? sanitized.safeUsername
        : typeof cloudData.username === 'string' && cloudData.username.length >= 2
        ? cloudData.username.slice(0, 24)
        : sanitized.safeUsername;
      const finalUsernameNorm = allowIdentityMutation
        ? sanitized.safeUsernameNorm
        : typeof cloudData.usernameNormalized === 'string' &&
          cloudData.usernameNormalized.length >= 2
        ? cloudData.usernameNormalized.slice(0, 24)
        : sanitized.safeUsernameNorm;
      const finalCountryCode = allowIdentityMutation
        ? sanitized.safeCountryCode
        : typeof cloudData.countryCode === 'string' && cloudData.countryCode.length >= 2
        ? cloudData.countryCode.slice(0, 4)
        : sanitized.safeCountryCode;
      const finalCountryName = allowIdentityMutation
        ? sanitized.safeCountryName
        : typeof cloudData.countryName === 'string' && cloudData.countryName.length >= 2
        ? cloudData.countryName.slice(0, 50)
        : sanitized.safeCountryName;
      const finalCountryFlag = allowIdentityMutation
        ? sanitized.safeCountryFlag
        : typeof cloudData.countryFlag === 'string' && cloudData.countryFlag.length >= 1
        ? cloudData.countryFlag.slice(0, 16)
        : sanitized.safeCountryFlag;
      const finalLastEditAt = allowIdentityMutation
        ? Math.max(
            typeof cloudData.lastProfileEditAt === 'number' ? cloudData.lastProfileEditAt : 0,
            lastEditMs
          )
        : typeof cloudData.lastProfileEditAt === 'number'
        ? cloudData.lastProfileEditAt
        : 0;

      const safePlayerId =
        typeof cloudData.playerId === 'string' && cloudData.playerId.length === 10
          ? cloudData.playerId
          : sanitized.safePlayerId;
      const safeFairPlay = Math.min(currentCloudFairPlay, targetFairPlay);
      const lockedVipTier: VipTier = (cloudData.vipTier as VipTier) || 'none';
      const lockedAdsRemoved = Boolean(cloudData.adsRemoved);

      // Cap client coin increase at <= 120 per update (decreases are always valid)
      const nextCoins =
        targetCoins >= currentCloudCoins
          ? Math.min(targetCoins, currentCloudCoins + 120)
          : targetCoins;

      // Enforce 8.5s server-timestamp cooldown before incrementing monthlyRoundPoints
      const existingPlayerLastPointsMs = this.extractTimestampMs(cloudData.lastPointsAt);
      const elapsedFromCloudPlayerMs =
        existingPlayerLastPointsMs > 0
          ? Math.max(0, nowMs - existingPlayerLastPointsMs)
          : Infinity;
      const elapsedFromLocalPlayerMs =
        this.lastPlayerPointsWriteAtMs > 0
          ? Math.max(0, nowMs - this.lastPlayerPointsWriteAtMs)
          : Infinity;
      const effectivePlayerCooldownElapsedMs = Math.min(
        elapsedFromCloudPlayerMs,
        elapsedFromLocalPlayerMs
      );
      const playerCooldownReady = effectivePlayerCooldownElapsedMs >= POINTS_COOLDOWN_MS;

      let nextPlayerPts = currentCloudPts;
      let playerPointsIncreased = false;

      if (isPlayerNewMonthReset) {
        if (targetPoints > 0 && playerCooldownReady) {
          nextPlayerPts = Math.min(2, targetPoints);
          playerPointsIncreased = nextPlayerPts > 0;
        } else {
          nextPlayerPts = 0;
          playerPointsIncreased = false;
        }
      } else if (targetPoints > currentCloudPts && playerCooldownReady) {
        nextPlayerPts = Math.min(targetPoints, currentCloudPts + 2);
        playerPointsIncreased = nextPlayerPts > currentCloudPts;
      }

      const playerPayload: Record<string, unknown> = {
        uid,
        playerId: safePlayerId,
        username: finalUsername,
        usernameNormalized: finalUsernameNorm,
        countryCode: finalCountryCode,
        countryName: finalCountryName,
        countryFlag: finalCountryFlag,
        country: allowIdentityMutation ? profile.country : cloudData.country || profile.country,
        ...contactFields,
        monthlyRoundPoints: nextPlayerPts,
        monthlyPoints: nextPlayerPts,
        currentMonthKey: effectivePlayerMonthKey,
        coins: nextCoins,
        xp: targetXp,
        level: safeLevel,
        rankTitle: safeRankTitle,
        rankTitleEn: safeRankTitleEn,
        vipTier: lockedVipTier,
        adsRemoved: lockedAdsRemoved,
        fairPlayScore: safeFairPlay,
        lastProfileEditAt: finalLastEditAt,
        createdAt: cloudData.createdAt || profile.createdAt || new Date().toISOString(),
        updatedAtMs: nowMs,
      };

      if (playerPointsIncreased) {
        playerPayload.lastPointsAt = serverTimestamp();
      } else if (cloudData.lastPointsAt !== undefined && cloudData.lastPointsAt !== null) {
        playerPayload.lastPointsAt = cloudData.lastPointsAt;
      }

      activeOpPath = `players/${uid}`;
      activeOpType = OperationType.UPDATE;
      await globalErrorHandler.withSafeRetry(() => setDoc(playerRef, playerPayload));
      if (playerPointsIncreased) {
        this.lastPlayerPointsWriteAtMs = Date.now();
      }

      // Now synchronize `/leaderboard_public/{uid}` independently using its own snapshot
      let nextPublicPts = nextPlayerPts;
      let publicPointsIncreased = false;
      let publicNeedsFollowUp = false;

      if (!existingPublicSnap.exists()) {
        // Creating missing public leaderboard doc matching `players/{uid}` (permitted by updated rules)
        activeOpPath = `leaderboard_public/${uid}`;
        activeOpType = OperationType.CREATE;
        await globalErrorHandler.withSafeRetry(() =>
          setDoc(
            publicRef,
            this.buildPublicLeaderboardPayload({
              uid,
              playerId: safePlayerId,
              username: finalUsername,
              usernameNormalized: finalUsernameNorm,
              countryCode: finalCountryCode,
              countryName: finalCountryName,
              countryFlag: finalCountryFlag,
              monthlyRoundPoints: nextPlayerPts,
              level: safeLevel,
              rankTitle: safeRankTitle,
              rankTitleEn: safeRankTitleEn,
              vipTier: lockedVipTier,
              updatedAtMs: nowMs,
              currentMonthKey: effectivePlayerMonthKey,
              lastPointsAt: nextPlayerPts > 0 ? serverTimestamp() : undefined,
            })
          )
        );
        if (nextPlayerPts > 0) {
          this.lastPublicPointsWriteAtMs = Date.now();
        }
      } else {
        const publicData = existingPublicSnap.data();
        const currentPublicPts =
          typeof publicData.monthlyRoundPoints === 'number'
            ? Math.max(0, Math.floor(publicData.monthlyRoundPoints))
            : 0;
        const lockedPublicVipTier: VipTier =
          (publicData.vipTier as VipTier) || lockedVipTier || 'none';
        const publicMonthKey =
          typeof publicData.currentMonthKey === 'string' &&
          /^[0-9]{4}-[0-9]{2}$/.test(publicData.currentMonthKey)
            ? publicData.currentMonthKey
            : null;
        const effectivePublicMonthKey =
          publicMonthKey && publicMonthKey > effectivePlayerMonthKey
            ? publicMonthKey
            : effectivePlayerMonthKey;
        const isPublicNewMonthReset = Boolean(
          publicMonthKey && effectivePublicMonthKey > publicMonthKey
        );

        const existingPublicLastPointsMs = this.extractTimestampMs(publicData.lastPointsAt);
        const elapsedFromCloudPublicMs =
          existingPublicLastPointsMs > 0
            ? Math.max(0, nowMs - existingPublicLastPointsMs)
            : Infinity;
        const elapsedFromLocalPublicMs =
          this.lastPublicPointsWriteAtMs > 0
            ? Math.max(0, nowMs - this.lastPublicPointsWriteAtMs)
            : Infinity;
        const publicCooldownReady =
          Math.min(elapsedFromCloudPublicMs, elapsedFromLocalPublicMs) >= POINTS_COOLDOWN_MS;

        nextPublicPts = currentPublicPts;
        if (isPublicNewMonthReset) {
          if (nextPlayerPts > 0 && publicCooldownReady) {
            nextPublicPts = Math.min(2, nextPlayerPts);
            publicPointsIncreased = nextPublicPts > 0;
          } else {
            nextPublicPts = 0;
            publicPointsIncreased = false;
          }
        } else if (nextPlayerPts > currentPublicPts && publicCooldownReady) {
          nextPublicPts = Math.min(nextPlayerPts, currentPublicPts + 2);
          publicPointsIncreased = nextPublicPts > currentPublicPts;
        }

        if (targetPoints > nextPublicPts) {
          publicNeedsFollowUp = true;
        }

        const publicPayload = this.buildPublicLeaderboardPayload({
          uid,
          playerId:
            typeof publicData.playerId === 'string' && publicData.playerId.length === 10
              ? publicData.playerId
              : safePlayerId,
          username: finalUsername,
          usernameNormalized: finalUsernameNorm,
          countryCode: finalCountryCode,
          countryName: finalCountryName,
          countryFlag: finalCountryFlag,
          monthlyRoundPoints: nextPublicPts,
          level: safeLevel,
          rankTitle: safeRankTitle,
          rankTitleEn: safeRankTitleEn,
          vipTier: lockedPublicVipTier,
          updatedAtMs: nowMs,
          currentMonthKey: effectivePublicMonthKey,
          lastPointsAt: publicPointsIncreased
            ? serverTimestamp()
            : publicData.lastPointsAt !== undefined && publicData.lastPointsAt !== null
            ? publicData.lastPointsAt
            : undefined,
        });

        activeOpPath = `leaderboard_public/${uid}`;
        activeOpType = OperationType.UPDATE;
        await globalErrorHandler.withSafeRetry(() => setDoc(publicRef, publicPayload));
        if (publicPointsIncreased) {
          this.lastPublicPointsWriteAtMs = Date.now();
        }
      }

      // Schedule automatic follow-up sync if any points or coins remain queued behind cooldown/caps
      const remainingPoints = targetPoints > nextPlayerPts || publicNeedsFollowUp;
      const remainingCoins = targetCoins > nextCoins;
      if (remainingPoints || remainingCoins) {
        const waitMs = remainingPoints ? 9000 : 2500;
        this.scheduleFollowUpSync(waitMs);
      }

      // Update username reservation ONLY when the player explicitly changed their username
      if (
        allowIdentityMutation &&
        oldUsernameNormalized &&
        oldUsernameNormalized !== finalUsernameNorm
      ) {
        try {
          await deleteDoc(doc(db, 'usernames', oldUsernameNormalized));
        } catch {
          // ignore if old reservation didn't exist
        }
        try {
          const newUsernameRef = doc(db, 'usernames', finalUsernameNorm);
          const existingNameSnap = await getDoc(newUsernameRef);
          if (!existingNameSnap.exists() || existingNameSnap.data()?.uid === uid) {
            await setDoc(newUsernameRef, {
              uid,
              username: finalUsername,
              playerId: safePlayerId,
              createdAt: nowMs,
              reservedAtMs: nowMs,
            });
          }
        } catch (uErr) {
          handleFirestoreError(
            uErr,
            OperationType.WRITE,
            `usernames/${finalUsernameNorm}`,
            false,
            'sync'
          );
        }
      }

      this.setCloudStatus(true, null, false);
    } catch (error) {
      const formatted = formatFirebaseAuthOrFirestoreError(
        error,
        profile.settings?.language || 'ar',
        'sync'
      );
      this.setCloudStatus(false, formatted, isNetworkConnectivityError(error));
      handleFirestoreError(error, activeOpType, activeOpPath, false, 'sync');
      if (throwOnError) {
        throw error;
      }
    }
  }

  /**
   * Registers a new player using real Firebase Authentication (`createUserWithEmailAndPassword`)
   * with either Email + Password OR Phone (converted internally to `phone_<digits>@neurox.app`) + Password,
   * and immediately creates the player document in `players/{uid}` and reserves `usernames/{usernameNormalized}`.
   */
  public async registerAccountWithFirebaseAuth(params: {
    username: string;
    country: CountryInfo;
    contactType: 'phone' | 'email';
    rawContactValue: string;
    password: string;
    lang: AppLanguage;
    validatedSyntheticEmail?: string;
    validatedNormalizedPhone?: string;
  }): Promise<{ ok: true; profile: PlayerProfile } | { ok: false; error: string }> {
    const cleanName = params.username.trim().slice(0, 24);
    const normalizedName = normalizeUsernameKey(cleanName);

    try {
      // 1. Check global username availability in Firestore first
      const usernameDocSnap = await getDoc(doc(db, 'usernames', normalizedName));
      if (usernameDocSnap.exists()) {
        return {
          ok: false,
          error:
            params.lang === 'en'
              ? 'This username is already taken. Please choose another username.'
              : 'هذا الاسم مستخدم بالفعل، يرجى اختيار اسم آخر.',
        };
      }
    } catch (err) {
      if (isNetworkConnectivityError(err)) {
        const formatted = formatFirebaseAuthOrFirestoreError(err, params.lang, 'auth');
        this.setCloudStatus(false, formatted, true);
        return { ok: false, error: formatted };
      }
    }

    let authEmail = '';
    let finalContactValue = '';
    let emailField: string | undefined;
    let phoneField: string | undefined;

    if (params.contactType === 'phone') {
      const converted =
        params.validatedSyntheticEmail && params.validatedNormalizedPhone
          ? {
              syntheticEmail: params.validatedSyntheticEmail,
              normalizedPhone: params.validatedNormalizedPhone,
            }
          : phoneToSyntheticEmail(params.country.dialCode, params.rawContactValue);

      if (
        !/^\+[1-9][0-9]{7,14}$/.test(converted.normalizedPhone) ||
        !/^phone_[1-9][0-9]{7,14}@neurox\.app$/.test(converted.syntheticEmail)
      ) {
        return {
          ok: false,
          error:
            params.lang === 'en'
              ? 'Invalid phone number format. Please check your country code and mobile number.'
              : 'صيغة رقم الجوال غير صحيحة. يرجى التأكد من مفتاح الدولة ورقم الجوال.',
        };
      }

      authEmail = converted.syntheticEmail;
      finalContactValue = converted.normalizedPhone;
      phoneField = converted.normalizedPhone;
    } else {
      authEmail = params.rawContactValue.trim().toLowerCase();
      finalContactValue = authEmail;
      emailField = authEmail;
    }

    try {
      // 2. Authenticate and create user in Firebase Auth
      const cred = await createUserWithEmailAndPassword(
        auth,
        authEmail,
        params.password
      );
      const uid = cred.user.uid;

      // 3. Build full PlayerProfile with uid and phone/email
      const accounts = this.loadAllSavedAccounts();
      const existingIds = [
        ...accounts.map((a) => a.playerId),
        ...SIMULATED_COMPETITORS.map((c) => c.playerId),
      ];

      const newProfile: PlayerProfile = {
        uid,
        playerId: generateUnique10DigitId(existingIds),
        username: cleanName,
        usernameNormalized: normalizedName,
        country: params.country,
        contactType: params.contactType,
        contactValue: finalContactValue,
        email: emailField,
        phone: phoneField,
        createdAt: new Date().toISOString(),
        lastProfileEditAt: 0,
        monthlyPoints: 0,
        monthlyRoundPoints: 0,
        currentMonthKey: getCurrentMonthKey(),
        coins: 50,
        xp: 0,
        vipTier: 'none',
        adsRemoved: false,
        vipReceipts: [],
        fairPlayScore: 100,
        activePlaySeconds: 0,
        lastInterstitialHourShown: 0,
        lifelines: {
          fiftyFifty: 1,
          freezeTime: 1,
          instantSolve: 1,
        },
        settings: {
          soundEnabled: true,
          vibrationEnabled: true,
          language: params.lang || detectInitialLanguage(),
        },
        stats: {
          matchesPlayed: 0,
          totalQuestionsAnswered: 0,
          totalCorrectAnswers: 0,
          perfectRoundsCount: 0,
          perfectMatchesCount: 0,
          maxComboEver: 0,
          dailyBossWins: 0,
          categoryPlays: {},
        },
        unlockedBadges: [],
        recentlyPlayedQuestionIds: [],
        matchHistory: [],
        daily: createFreshDailyState(),
        supportTickets: [],
        friends: [],
        chatThreads: {},
      };

      // 4. Immediately write to Firestore `players/{uid}` and `usernames/{usernameNormalized}` (throwOnError = true)
      await this.syncProfileToFirestore(newProfile, undefined, true);

      // 5. Save locally and set active
      const saved = this.saveProfile(newProfile, { skipCloudSync: true });
      this.setCloudStatus(true, null);
      return { ok: true, profile: saved };
    } catch (error) {
      const { userMessage } = globalErrorHandler.recordAndFormat({
        error,
        category: 'auth',
        operation: 'register_account',
        path: 'auth/register',
        lang: params.lang,
      });
      this.setCloudStatus(false, userMessage, isNetworkConnectivityError(error));
      return { ok: false, error: userMessage };
    }
  }

  /**
   * Logs in an existing player using real Firebase Authentication (`signInWithEmailAndPassword`)
   * with either Email + Password OR Phone (converted internally to `phone_<digits>@neurox.app`) + Password,
   * and fetches/restores their player document from `players/{uid}` in Firestore.
   */
  public async loginAccountWithFirebaseAuth(params: {
    contactType: 'phone' | 'email';
    country: CountryInfo;
    rawIdentifier: string;
    password: string;
    lang: AppLanguage;
    validatedSyntheticEmail?: string;
    validatedNormalizedPhone?: string;
  }): Promise<{ ok: true; profile: PlayerProfile } | { ok: false; error: string }> {
    let authEmail = '';
    let normalizedPhone = '';
    if (params.contactType === 'phone') {
      const converted =
        params.validatedSyntheticEmail && params.validatedNormalizedPhone
          ? {
              syntheticEmail: params.validatedSyntheticEmail,
              normalizedPhone: params.validatedNormalizedPhone,
            }
          : phoneToSyntheticEmail(params.country.dialCode, params.rawIdentifier);

      if (
        !/^\+[1-9][0-9]{7,14}$/.test(converted.normalizedPhone) ||
        !/^phone_[1-9][0-9]{7,14}@neurox\.app$/.test(converted.syntheticEmail)
      ) {
        return {
          ok: false,
          error:
            params.lang === 'en'
              ? 'Invalid phone number format. Please check your country code and mobile number.'
              : 'صيغة رقم الجوال غير صحيحة. يرجى التأكد من مفتاح الدولة ورقم الجوال.',
        };
      }

      authEmail = converted.syntheticEmail;
      normalizedPhone = converted.normalizedPhone;
    } else {
      authEmail = params.rawIdentifier.trim().toLowerCase();
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, authEmail, params.password);
      const uid = cred.user.uid;

      const playerRef = doc(db, 'players', uid);
      const snap = await getDoc(playerRef);

      const localAccounts = this.loadAllSavedAccounts();
      const localMatch = localAccounts.find(
        (a) =>
          a.uid === uid ||
          (params.contactType === 'email' &&
            (a.email?.toLowerCase() === authEmail ||
              a.contactValue?.toLowerCase() === authEmail)) ||
          (params.contactType === 'phone' &&
            (a.phone === normalizedPhone || a.contactValue === normalizedPhone))
      );

      if (snap.exists()) {
        const cloudData = snap.data();
        const resolvedCountry = resolveCountryByCode(
          cloudData.countryCode,
          (cloudData.country as CountryInfo | undefined) || params.country
        );
        const cloudPts =
          typeof cloudData.monthlyRoundPoints === 'number'
            ? cloudData.monthlyRoundPoints
            : typeof cloudData.monthlyPoints === 'number'
            ? cloudData.monthlyPoints
            : localMatch?.monthlyPoints || 0;

        const baseProfile: PlayerProfile = localMatch
          ? this.ensureProfileFields(localMatch)
          : this.createNewProfile(
              cloudData.username || 'بطل_التحدي',
              resolvedCountry,
              params.contactType,
              params.contactType === 'phone' ? normalizedPhone : authEmail,
              params.lang,
              true
            );

        const mergedProfile: PlayerProfile = {
          ...baseProfile,
          uid,
          playerId: cloudData.playerId || baseProfile.playerId,
          username: cloudData.username || baseProfile.username,
          usernameNormalized:
            cloudData.usernameNormalized ||
            normalizeUsernameKey(cloudData.username || baseProfile.username),
          country: resolvedCountry,
          contactType:
            (cloudData.contactType as 'phone' | 'email' | undefined) ||
            params.contactType,
          contactValue:
            cloudData.contactValue ||
            (params.contactType === 'phone' ? normalizedPhone : authEmail),
          email:
            cloudData.email ||
            (params.contactType === 'email' ? authEmail : baseProfile.email),
          phone:
            cloudData.phone ||
            (params.contactType === 'phone' ? normalizedPhone : baseProfile.phone),
          role:
            cloudData.role === 'admin' || baseProfile.role === 'admin'
              ? 'admin'
              : 'player',
          isAdmin: Boolean(cloudData.isAdmin || cloudData.role === 'admin' || baseProfile.isAdmin),
          monthlyPoints: Math.max(baseProfile.monthlyPoints, cloudPts),
          monthlyRoundPoints: Math.max(baseProfile.monthlyPoints, cloudPts),
          coins:
            typeof cloudData.coins === 'number'
              ? Math.max(baseProfile.coins, cloudData.coins)
              : baseProfile.coins,
          xp:
            typeof cloudData.xp === 'number'
              ? Math.max(baseProfile.xp, cloudData.xp)
              : baseProfile.xp,
          vipTier: (cloudData.vipTier as VipTier) || baseProfile.vipTier || 'none',
          adsRemoved: Boolean(cloudData.adsRemoved || baseProfile.adsRemoved),
          fairPlayScore:
            typeof cloudData.fairPlayScore === 'number'
              ? cloudData.fairPlayScore
              : 100,
          lastProfileEditAt:
            typeof cloudData.lastProfileEditAt === 'number'
              ? cloudData.lastProfileEditAt
              : 0,
          settings: {
            ...baseProfile.settings,
            language: params.lang,
          },
        };

        const saved = this.saveProfile(mergedProfile, { skipCloudSync: true });
        this.setCloudStatus(true, null);
        return { ok: true, profile: saved };
      }

      // If Auth succeeded but `players/{uid}` didn't exist yet in Firestore, create it immediately now
      const fallbackProfile: PlayerProfile = localMatch
        ? {
            ...this.ensureProfileFields(localMatch),
            uid,
            contactType: params.contactType,
            contactValue:
              params.contactType === 'phone' ? normalizedPhone : authEmail,
            email: params.contactType === 'email' ? authEmail : localMatch.email,
            phone: params.contactType === 'phone' ? normalizedPhone : localMatch.phone,
          }
        : this.createNewProfile(
            params.contactType === 'email'
              ? authEmail.split('@')[0].slice(0, 18)
              : `بطل_${normalizedPhone.slice(-4)}`,
            params.country,
            params.contactType,
            params.contactType === 'phone' ? normalizedPhone : authEmail,
            params.lang,
            true
          );

      fallbackProfile.uid = uid;
      await this.syncProfileToFirestore(fallbackProfile, undefined, true);
      const saved = this.saveProfile(fallbackProfile, { skipCloudSync: true });
      this.setCloudStatus(true, null);
      return { ok: true, profile: saved };
    } catch (error) {
      const { userMessage } = globalErrorHandler.recordAndFormat({
        error,
        category: 'auth',
        operation: 'login_account',
        path: 'auth/login',
        lang: params.lang,
      });
      this.setCloudStatus(false, userMessage, isNetworkConnectivityError(error));
      return { ok: false, error: userMessage };
    }
  }

  /**
   * Sends a Firebase password reset email (`sendPasswordResetEmail`) for email accounts.
   */
  public async resetPasswordByEmail(
    rawEmail: string,
    lang: AppLanguage
  ): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
    const cleanEmail = rawEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return {
        ok: false,
        error:
          lang === 'en'
            ? 'Please enter a valid email address first to receive the password reset link.'
            : 'يرجى إدخال بريدك الإلكتروني الصحيح أولاً لإرسال رابط استعادة كلمة المرور.',
      };
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return {
        ok: true,
        message:
          lang === 'en'
            ? `A password reset link has been sent to ${cleanEmail}. Please check your inbox or spam folder.`
            : `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${cleanEmail} بنجاح. يرجى تفقد صندوق الوارد أو الرسائل غير المرغوب فيها (Spam).`,
      };
    } catch (error) {
      const { userMessage } = globalErrorHandler.recordAndFormat({
        error,
        category: 'auth',
        operation: 'reset_password',
        path: 'auth/reset_password',
        lang,
      });
      return {
        ok: false,
        error: userMessage,
      };
    }
  }

  /**
   * Checks both local cache and Cloud Firestore `usernames/{nameNormalized}` to prevent duplicate names globally.
   */
  public async isUsernameTakenCloud(
    username: string,
    excludePlayerId?: string
  ): Promise<boolean> {
    if (this.isUsernameTaken(username, excludePlayerId)) {
      return true;
    }

    const normalized = normalizeUsernameKey(username);
    if (!normalized || normalized.length < 3) return false;

    try {
      const snap = await getDoc(doc(db, 'usernames', normalized));
      if (!snap.exists()) return false;
      const data = snap.data();
      if (excludePlayerId && data.playerId === excludePlayerId) {
        return false;
      }
      if (auth.currentUser && data.uid === auth.currentUser.uid) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  public logoutCurrentProfile(): void {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, '__LOGGED_OUT__');
      void signOut(auth);
    } catch {
      // ignore
    }
  }

  public loginByIdentifier(identifier: string): PlayerProfile | null {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return null;

    const accounts = this.loadAllSavedAccounts();
    const matched = accounts.find(
      (a) =>
        a.playerId.toLowerCase() === clean ||
        a.username.trim().toLowerCase() === clean ||
        (a.contactValue && a.contactValue.trim().toLowerCase() === clean)
    );

    if (!matched) return null;

    const ready = this.ensureProfileFields(matched);
    return this.saveProfile(ready);
  }

  public isUsernameTaken(username: string, excludePlayerId?: string): boolean {
    const normalized = username.trim().toLowerCase();
    const normKey = normalizeUsernameKey(username);
    if (!normalized) return false;

    const inCompetitors = SIMULATED_COMPETITORS.some(
      (c) =>
        c.username.toLowerCase() === normalized ||
        normalizeUsernameKey(c.username) === normKey
    );
    if (inCompetitors) return true;

    const accounts = this.loadAllSavedAccounts();
    return accounts.some(
      (a) =>
        a.playerId !== excludePlayerId &&
        (a.username.trim().toLowerCase() === normalized ||
          normalizeUsernameKey(a.username) === normKey)
    );
  }

  public createNewProfile(
    username: string,
    country: CountryInfo,
    contactType?: 'phone' | 'email',
    contactValue?: string,
    language?: AppLanguage,
    skipCloudSync = false
  ): PlayerProfile {
    const accounts = this.loadAllSavedAccounts();
    const existingIds = [
      ...accounts.map((a) => a.playerId),
      ...SIMULATED_COMPETITORS.map((c) => c.playerId),
    ];

    const cleanName = username.trim().slice(0, 24);
    const trimmedContact = contactValue?.trim();
    const newProfile: PlayerProfile = {
      uid: auth.currentUser?.uid,
      playerId: generateUnique10DigitId(existingIds),
      username: cleanName,
      usernameNormalized: normalizeUsernameKey(cleanName),
      country,
      contactType,
      contactValue: trimmedContact,
      email: contactType === 'email' ? trimmedContact : undefined,
      phone: contactType === 'phone' ? trimmedContact : undefined,
      createdAt: new Date().toISOString(),
      lastProfileEditAt: 0,
      monthlyPoints: 0,
      monthlyRoundPoints: 0,
      currentMonthKey: getCurrentMonthKey(),
      coins: 50, // Silent Starter Grant: 50 Gold Coins
      xp: 0,
      vipTier: 'none',
      adsRemoved: false,
      vipReceipts: [],
      fairPlayScore: 100,
      activePlaySeconds: 0,
      lastInterstitialHourShown: 0,
      lifelines: {
        fiftyFifty: 1, // Silent Starter Grant: 1 of each lifeline
        freezeTime: 1,
        instantSolve: 1,
      },
      settings: {
        soundEnabled: true,
        vibrationEnabled: true,
        language: language || detectInitialLanguage(),
      },
      stats: {
        matchesPlayed: 0,
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0,
        perfectRoundsCount: 0,
        perfectMatchesCount: 0,
        maxComboEver: 0,
        dailyBossWins: 0,
        categoryPlays: {},
      },
      unlockedBadges: [],
      recentlyPlayedQuestionIds: [],
      matchHistory: [],
      daily: createFreshDailyState(),
      supportTickets: [],
      friends: [],
      chatThreads: {},
    };

    return this.saveProfile(newProfile, { skipCloudSync });
  }

  /**
   * Searches Cloud Firestore (`players` collection) by 10-digit `playerId` or `usernameNormalized`
   * so players can add real friends from any device, with Offline-First fallback.
   */
  /**
   * Looks up a real registered player in Cloud Firestore (`leaderboard_public` / `usernames`)
   * by 10-digit `playerId`, `usernameNormalized`, or exact `username`.
   */
  private async findCloudPlayerByIdentifier(
    rawIdentifier: string
  ): Promise<{
    uid: string;
    playerId: string;
    username: string;
    country: CountryInfo;
    level: number;
    rankTitle: string;
    rankTitleEn: string;
    vipTier: VipTier;
  } | null> {
    const clean = rawIdentifier.trim();
    const normKey = normalizeUsernameKey(clean);
    const publicPlayersRef = collection(db, 'leaderboard_public');
    const isTenDigitCode = /^\d{10}$/.test(clean);

    const mapDoc = (uid: string, docData: Record<string, unknown>) => {
      const resolvedCountry = resolveCountryByCode(
        typeof docData.countryCode === 'string' ? docData.countryCode : undefined,
        docData.country as CountryInfo | undefined
      );
      return {
        uid: (typeof docData.uid === 'string' && docData.uid) || uid,
        playerId: String(docData.playerId || ''),
        username: String(docData.username || 'بطل'),
        country: resolvedCountry,
        level: Number(docData.level || 1),
        rankTitle: String(docData.rankTitle || 'مبتدئ واعد'),
        rankTitleEn: String(docData.rankTitleEn || 'Rising Challenger'),
        vipTier: (docData.vipTier as VipTier) || 'none',
      };
    };

    // 1. Query by 10-digit playerId or usernameNormalized in leaderboard_public
    const primaryQuery = isTenDigitCode
      ? query(publicPlayersRef, where('playerId', '==', clean), limit(1))
      : query(publicPlayersRef, where('usernameNormalized', '==', normKey), limit(1));

    const snap = await getDocs(primaryQuery);
    if (!snap.empty) {
      const d = snap.docs[0];
      return mapDoc(d.id, d.data());
    }

    if (!isTenDigitCode) {
      // 2. Fallback: look up exact username in leaderboard_public
      const exactNameSnap = await getDocs(
        query(publicPlayersRef, where('username', '==', clean), limit(1))
      );
      if (!exactNameSnap.empty) {
        const d = exactNameSnap.docs[0];
        return mapDoc(d.id, d.data());
      }

      // 3. Fallback: check global `usernames/{normKey}` reservation to retrieve UID
      try {
        const unameSnap = await getDoc(doc(db, 'usernames', normKey));
        if (unameSnap.exists()) {
          const unameData = unameSnap.data();
          const targetUid = typeof unameData.uid === 'string' ? unameData.uid : '';
          if (targetUid) {
            const lbSnap = await getDoc(doc(db, 'leaderboard_public', targetUid));
            if (lbSnap.exists()) {
              return mapDoc(lbSnap.id, lbSnap.data());
            }
            return {
              uid: targetUid,
              playerId: String(unameData.playerId || '0000000000'),
              username: String(unameData.username || clean),
              country: COUNTRIES_LIST[0],
              level: 1,
              rankTitle: 'مبتدئ واعد',
              rankTitleEn: 'Rising Challenger',
              vipTier: 'none',
            };
          }
        }
      } catch {
        // Ignore fallback error
      }
    }

    return null;
  }

  /**
   * Fetches real active players from `leaderboard_public` for quick friend request suggestions.
   */
  public async fetchDiscoverableCloudPlayers(
    myUid: string,
    limitCount = 12
  ): Promise<LeaderboardEntry[]> {
    try {
      const uid = myUid || (await ensureFirebaseAuthSession());
      if (!uid) return [];
      const snap = await getDocs(
        query(collection(db, 'leaderboard_public'), limit(limitCount))
      );
      const list: LeaderboardEntry[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const docUid = (typeof data.uid === 'string' && data.uid) || docSnap.id;
        if (!docUid || docUid === uid) return;
        const country = resolveCountryByCode(
          data.countryCode,
          data.country as CountryInfo | undefined
        );
        list.push({
          uid: docUid,
          playerId: String(data.playerId || ''),
          username: String(data.username || 'لاعب'),
          country,
          monthlyPoints: Number(data.monthlyRoundPoints || 0),
          level: Number(data.level || 1),
          rankTitle: String(data.rankTitle || 'مبتدئ واعد'),
          rankTitleEn: String(data.rankTitleEn || 'Rising Challenger'),
          vipTier: (data.vipTier as VipTier) || 'none',
        });
      });
      list.sort((a, b) => b.monthlyPoints - a.monthlyPoints);
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'leaderboard_public/discover');
      return [];
    }
  }

  /**
   * Sends a real-time Cloud Firestore Friend Request to another registered player.
   * If the target player already sent a pending request to the current user,
   * automatically accepts it so both players immediately become friends.
   */
  public async sendFriendRequestAsync(
    profile: PlayerProfile,
    rawIdentifier: string,
    lang: AppLanguage
  ): Promise<
    | { ok: true; status: 'sent'; targetUsername: string }
    | { ok: true; status: 'auto_accepted'; friend: FriendContact }
    | { ok: false; error: string }
  > {
    const clean = rawIdentifier.trim();
    const lower = clean.toLowerCase();
    const normKey = normalizeUsernameKey(clean);

    if (!clean || clean.length < 2) {
      return {
        ok: false,
        error:
          lang === 'en'
            ? 'Please enter a valid 10-digit Player ID or username.'
            : 'يرجى إدخال كود لاعب صحيح (10 أرقام) أو اسم المستخدم.',
      };
    }

    if (
      clean === profile.playerId ||
      lower === profile.username.trim().toLowerCase() ||
      normKey === normalizeUsernameKey(profile.username)
    ) {
      return {
        ok: false,
        error:
          lang === 'en'
            ? 'You cannot send a friend request to yourself.'
            : 'لا يمكنك إرسال طلب صداقة إلى حسابك الشخصي.',
      };
    }

    const myUid = auth.currentUser?.uid || (await ensureFirebaseAuthSession());
    if (!myUid) {
      return {
        ok: false,
        error:
          lang === 'en'
            ? 'Please sign in first to send friend requests.'
            : 'يرجى تسجيل الدخول أولاً لإرسال طلبات الصداقة.',
      };
    }

    try {
      const target = await this.findCloudPlayerByIdentifier(clean);
      if (!target) {
        return {
          ok: false,
          error:
            lang === 'en'
              ? 'No registered player found with this Player ID or username. Please verify and try again.'
              : 'لم يتم العثور على لاعب مسجّل بهذا الكود أو اسم المستخدم. تأكد من كتابته بشكل صحيح.',
        };
      }

      if (target.uid === myUid || target.playerId === profile.playerId) {
        return {
          ok: false,
          error:
            lang === 'en'
              ? 'You cannot send a friend request to yourself.'
              : 'لا يمكنك إرسال طلب صداقة إلى حسابك الشخصي.',
        };
      }

      const sortedParticipants = buildSortedUidPair(myUid, target.uid);
      const pairId = sortedParticipants.join('_');

      // 1. Check if already mutual friends in Firestore
      const friendshipSnap = await getDoc(doc(db, 'friendships', pairId));
      if (friendshipSnap.exists()) {
        return {
          ok: false,
          error:
            lang === 'en'
              ? `You and "${target.username}" are already friends!`
              : `أنت و«${target.username}» أصدقاء بالفعل!`,
        };
      }

      // 2. Check if the target player already sent us a pending friend request -> auto-accept!
      const reverseReqId = `${target.uid}_${myUid}`;
      const reverseSnap = await getDoc(doc(db, 'friend_requests', reverseReqId));
      if (reverseSnap.exists()) {
        const reverseData = reverseSnap.data() as FriendRequest;
        if (reverseData.status === 'pending') {
          const accepted = await this.acceptFriendRequestAsync(profile, reverseData, lang);
          if (accepted.ok) {
            return { ok: true, status: 'auto_accepted', friend: accepted.friend };
          }
        }
      }

      // 3. Check if we already sent a pending request
      const myReqId = `${myUid}_${target.uid}`;
      const myReqRef = doc(db, 'friend_requests', myReqId);
      const myReqSnap = await getDoc(myReqRef);
      const nowMs = Date.now();

      if (myReqSnap.exists()) {
        const existingData = myReqSnap.data() as FriendRequest;
        if (existingData.status === 'pending') {
          return {
            ok: false,
            error:
              lang === 'en'
                ? `A friend request to "${target.username}" is already pending.`
                : `لقد أرسلت طلب صداقة إلى «${target.username}» بالفعل وبانتظار قبوله.`,
          };
        }
        if (existingData.status === 'rejected') {
          await updateDoc(myReqRef, {
            status: 'pending',
            updatedAtMs: nowMs,
          });
          return { ok: true, status: 'sent', targetUsername: target.username };
        }
        // If previously accepted (e.g. unfriended then re-adding), remove old record first
        await deleteDoc(myReqRef);
      }

      const myLevel = calculateLevelAndRank(profile.xp);
      const newRequest: FriendRequest = {
        id: myReqId,
        fromUid: myUid,
        fromPlayerId: profile.playerId,
        fromUsername: profile.username.slice(0, 30),
        fromCountryCode: profile.country.code || 'SA',
        fromCountryName: (profile.country.name || 'السعودية').slice(0, 50),
        fromCountryFlag: profile.country.flag || '🌍',
        fromLevel: Math.max(1, Math.floor(myLevel.level)),
        fromRankTitle: myLevel.rankTitle.slice(0, 40),
        fromRankTitleEn: myLevel.rankTitleEn.slice(0, 40),
        fromVipTier: profile.vipTier || 'none',
        toUid: target.uid,
        toPlayerId: target.playerId,
        toUsername: target.username.slice(0, 30),
        toCountryCode: target.country.code || 'SA',
        toCountryName: (target.country.name || 'السعودية').slice(0, 50),
        toCountryFlag: target.country.flag || '🌍',
        toLevel: Math.max(1, Math.floor(target.level || 1)),
        toRankTitle: (target.rankTitle || 'مبتدئ واعد').slice(0, 40),
        toRankTitleEn: (target.rankTitleEn || 'Rising Challenger').slice(0, 40),
        toVipTier: target.vipTier || 'none',
        participants: sortedParticipants,
        status: 'pending',
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      };

      await setDoc(myReqRef, newRequest);
      return { ok: true, status: 'sent', targetUsername: target.username };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'friend_requests', false, 'friends');
      return {
        ok: false,
        error: formatFirebaseAuthOrFirestoreError(err, lang, 'friends'),
      };
    }
  }

  /**
   * Accepts an incoming friend request atomically:
   * 1. Marks `/friend_requests/{request.id}` as `'accepted'`
   * 2. Creates `/friendships/{sortedUids}` so BOTH players immediately see each other as friends
   * 3. Ensures `/chats/{sortedUids}` exists for instant private chat
   */
  public async acceptFriendRequestAsync(
    profile: PlayerProfile,
    request: FriendRequest,
    lang: AppLanguage
  ): Promise<{ ok: true; friend: FriendContact } | { ok: false; error: string }> {
    const myUid = auth.currentUser?.uid || (await ensureFirebaseAuthSession());
    if (!myUid) {
      return {
        ok: false,
        error: lang === 'en' ? 'Not signed in.' : 'يرجى تسجيل الدخول أولاً.',
      };
    }

    try {
      const otherUid = request.fromUid === myUid ? request.toUid : request.fromUid;
      const sortedParticipants = buildSortedUidPair(myUid, otherUid);
      const friendshipId = sortedParticipants.join('_');
      const nowMs = Date.now();
      const myLevel = calculateLevelAndRank(profile.xp);

      const otherIsFrom = request.fromUid === otherUid;
      const otherSnapshot = {
        uid: otherUid,
        playerId: otherIsFrom ? request.fromPlayerId : request.toPlayerId,
        username: otherIsFrom ? request.fromUsername : request.toUsername,
        countryCode: otherIsFrom ? request.fromCountryCode : request.toCountryCode,
        countryName: otherIsFrom ? request.fromCountryName : request.toCountryName,
        countryFlag: otherIsFrom ? request.fromCountryFlag : request.toCountryFlag,
        level: Math.max(1, Math.floor(otherIsFrom ? request.fromLevel : request.toLevel)),
        rankTitle: otherIsFrom ? request.fromRankTitle : request.toRankTitle,
        rankTitleEn:
          (otherIsFrom ? request.fromRankTitleEn : request.toRankTitleEn) || 'Arena Challenger',
        vipTier: (otherIsFrom ? request.fromVipTier : request.toVipTier) || 'none',
      };

      const mySnapshot = {
        uid: myUid,
        playerId: profile.playerId,
        username: profile.username.slice(0, 30),
        countryCode: profile.country.code || 'SA',
        countryName: (profile.country.name || 'السعودية').slice(0, 50),
        countryFlag: profile.country.flag || '🌍',
        level: Math.max(1, Math.floor(myLevel.level)),
        rankTitle: myLevel.rankTitle.slice(0, 40),
        rankTitleEn: myLevel.rankTitleEn.slice(0, 40),
        vipTier: profile.vipTier || 'none',
      };

      const sortedPlayerIds = [mySnapshot.playerId, otherSnapshot.playerId].sort() as [
        string,
        string,
      ];

      const batch = writeBatch(db);
      const reqRef = doc(db, 'friend_requests', request.id);
      batch.update(reqRef, {
        status: 'accepted',
        updatedAtMs: nowMs,
      });

      const friendshipRef = doc(db, 'friendships', friendshipId);
      batch.set(friendshipRef, {
        id: friendshipId,
        chatId: friendshipId,
        participants: sortedParticipants,
        participantPlayerIds: sortedPlayerIds,
        memberProfiles: {
          [myUid]: mySnapshot,
          [otherUid]: otherSnapshot,
        },
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      });

      await batch.commit();

      // Ensure chat thread document exists cleanly (outside batch to safely check existence)
      const chatRef = doc(db, 'chats', friendshipId);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          chatId: friendshipId,
          participants: sortedParticipants,
          participantPlayerIds: sortedPlayerIds,
          lastMessageText: '',
          lastMessageSenderUid: '',
          lastMessageSenderName: '',
          lastMessageAtMs: 0,
          unreadByUid: { [myUid]: 0, [otherUid]: 0 },
          lastReadAtMs: { [myUid]: nowMs, [otherUid]: nowMs },
          updatedAtMs: nowMs,
        });
      }

      const otherCountry = resolveCountryByCode(otherSnapshot.countryCode, {
        code: otherSnapshot.countryCode,
        name: otherSnapshot.countryName,
        nameEn: otherSnapshot.countryName,
        flag: otherSnapshot.countryFlag,
        dialCode: '+966',
      });

      const newFriend: FriendContact = {
        uid: otherUid,
        chatId: friendshipId,
        playerId: otherSnapshot.playerId,
        username: otherSnapshot.username,
        country: otherCountry,
        level: otherSnapshot.level,
        rankTitle: otherSnapshot.rankTitle,
        rankTitleEn: otherSnapshot.rankTitleEn,
        vipTier: otherSnapshot.vipTier as VipTier,
        addedAtIso: new Date(nowMs).toISOString(),
        isOnline: false,
        unreadCount: 0,
      };

      return { ok: true, friend: newFriend };
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `friend_requests/${request.id}/accept`,
        false,
        'friends'
      );
      return {
        ok: false,
        error: formatFirebaseAuthOrFirestoreError(err, lang, 'friends'),
      };
    }
  }

  /**
   * Rejects an incoming friend request (or cancels an outgoing pending request)
   * by deleting the request document cleanly from Firestore.
   */
  public async rejectOrCancelFriendRequestAsync(
    requestId: string,
    lang: AppLanguage
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await ensureFirebaseAuthSession();
      await deleteDoc(doc(db, 'friend_requests', requestId));
      return { ok: true };
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `friend_requests/${requestId}`,
        false,
        'friends'
      );
      return {
        ok: false,
        error: formatFirebaseAuthOrFirestoreError(err, lang, 'friends'),
      };
    }
  }

  /**
   * Real-time listener (`onSnapshot`) for ALL friend requests involving `myUid`
   * (both incoming pending requests and outgoing pending requests).
   */
  public subscribeToFriendRequests(
    myUid: string,
    onUpdate: (data: { incoming: FriendRequest[]; outgoing: FriendRequest[] }) => void
  ): Unsubscribe {
    if (!myUid) return () => {};
    const q = query(
      collection(db, 'friend_requests'),
      where('participants', 'array-contains', myUid)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const incoming: FriendRequest[] = [];
        const outgoing: FriendRequest[] = [];

        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as FriendRequest;
          if (d.status !== 'pending') return;
          const normalized: FriendRequest = {
            ...d,
            id: d.id || docSnap.id,
          };
          if (normalized.toUid === myUid) {
            incoming.push(normalized);
          } else if (normalized.fromUid === myUid) {
            outgoing.push(normalized);
          }
        });

        incoming.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        outgoing.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        onUpdate({ incoming, outgoing });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'friend_requests');
      }
    );
  }

  /**
   * Publishes this player's genuine real-time online/offline heartbeat to `/presence/{uid}`.
   * Uses Firestore `serverTimestamp()` so friends can evaluate online freshness accurately
   * regardless of clock skew between two devices.
   */
  public async updateMyPresenceAsync(uid: string, online: boolean): Promise<void> {
    if (!uid) return;
    try {
      const presenceRef = doc(db, 'presence', uid);
      const nowMs = Math.floor(Date.now());
      await setDoc(presenceRef, {
        uid,
        online,
        lastSeenMs: nowMs,
        heartbeatAt: serverTimestamp(),
        updatedAtMs: nowMs,
      });
    } catch {
      // Non-fatal: ignore transient offline or pre-published-rules errors so gameplay is never interrupted
    }
  }

  /**
   * Listens to this player's own `/presence/{uid}` doc to estimate Firestore server clock offset
   * (`serverTimeMs - localClockMs`) so multi-device online/offline evaluation is immune to clock skew.
   */
  public subscribeToMyPresenceClockOffset(
    uid: string,
    onOffset: (offsetMs: number) => void
  ): Unsubscribe {
    if (!uid) return () => {};
    const presenceRef = doc(db, 'presence', uid);
    return onSnapshot(
      presenceRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        const hb = data.heartbeatAt as { toMillis?: () => number } | undefined;
        if (hb && typeof hb.toMillis === 'function') {
          const serverMs = hb.toMillis();
          if (serverMs > 0) {
            onOffset(serverMs - Date.now());
          }
        }
      },
      () => {
        // Silently ignore if presence rules aren't published yet
      }
    );
  }

  /**
   * Opens per-friend `onSnapshot` document listeners on `/presence/{friendUid}` (using `allow get`,
   * zero `list` queries) so both devices see exact, real-time online/offline status for every friend.
   */
  public subscribeToFriendsPresence(
    friendUids: string[],
    onUpdate: (presenceByUid: Record<string, UserPresence>) => void
  ): Unsubscribe {
    const uniqueUids = Array.from(new Set(friendUids.filter(Boolean)));
    if (uniqueUids.length === 0) {
      onUpdate({});
      return () => {};
    }

    const state: Record<string, UserPresence> = {};
    const unsubs: Unsubscribe[] = [];

    const emit = () => {
      onUpdate({ ...state });
    };

    uniqueUids.forEach((friendUid) => {
      const ref = doc(db, 'presence', friendUid);
      const unsub = onSnapshot(
        ref,
        (snap) => {
          if (!snap.exists()) {
            state[friendUid] = {
              uid: friendUid,
              online: false,
              lastSeenMs: 0,
              updatedAtMs: 0,
            };
          } else {
            const data = snap.data({ serverTimestamps: 'estimate' }) as Record<string, unknown>;
            const hb = data.heartbeatAt as { toMillis?: () => number } | undefined;
            const heartbeatServerMs =
              hb && typeof hb.toMillis === 'function' ? hb.toMillis() : undefined;
            state[friendUid] = {
              uid: friendUid,
              online: Boolean(data.online),
              lastSeenMs: Number(data.lastSeenMs || 0),
              heartbeatServerMs,
              updatedAtMs: Number(data.updatedAtMs || 0),
            };
          }
          emit();
        },
        () => {
          // Graceful fallback to offline if doc cannot be read
          state[friendUid] = {
            uid: friendUid,
            online: false,
            lastSeenMs: 0,
            updatedAtMs: 0,
          };
          emit();
        }
      );
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }

  /**
   * Real-time listener (`onSnapshot`) for confirmed mutual friendships (`/friendships`)
   * so both users immediately see each other identically in their Friends List with canonical chatId.
   */
  public subscribeToFriendships(
    myUid: string,
    onUpdate: (friends: FriendContact[]) => void
  ): Unsubscribe {
    if (!myUid) return () => {};
    const q = query(
      collection(db, 'friendships'),
      where('participants', 'array-contains', myUid)
    );

    const publicProfileCache = new Map<string, Record<string, unknown>>();
    let isDisposed = false;
    let latestRawFriends: FriendContact[] = [];

    const mergeCachedProfiles = (list: FriendContact[]): FriendContact[] =>
      list.map((friend) => {
        if (!friend.uid) return friend;
        const cached = publicProfileCache.get(friend.uid);
        if (!cached) return friend;
        const resolvedCountry = resolveCountryByCode(
          typeof cached.countryCode === 'string' ? cached.countryCode : friend.country.code,
          {
            code: String(cached.countryCode || friend.country.code || 'SA'),
            name: String(cached.countryName || friend.country.name || 'السعودية'),
            nameEn: String(cached.countryName || friend.country.nameEn || 'Saudi Arabia'),
            flag: String(cached.countryFlag || friend.country.flag || '🌍'),
            dialCode: friend.country.dialCode || '+966',
          }
        );
        return {
          ...friend,
          playerId: friend.playerId || String(cached.playerId || ''),
          username:
            friend.username && friend.username !== 'صديق'
              ? friend.username
              : String(cached.username || friend.username || 'صديق'),
          country: resolvedCountry,
          level: Number(cached.level || friend.level || 1),
          rankTitle: String(cached.rankTitle || friend.rankTitle || 'مبتدئ واعد'),
          rankTitleEn: String(cached.rankTitleEn || friend.rankTitleEn || 'Arena Challenger'),
          vipTier: ((cached.vipTier as VipTier) || friend.vipTier || 'none') as VipTier,
        };
      });

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const friendsByOtherUid = new Map<string, FriendContact>();
        const uidsNeedingBackfill: string[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const participants = Array.isArray(data.participants)
            ? (data.participants as string[])
            : [];
          const otherUid = participants.find((p) => p !== myUid);
          if (!otherUid) return;

          // Always derive canonical sorted chat room ID so both devices open the exact same room
          const canonicalChatId = buildSortedUidPair(myUid, otherUid).join('_');

          const memberProfiles = (data.memberProfiles || {}) as Record<
            string,
            Record<string, unknown>
          >;
          const other = memberProfiles[otherUid] || {};
          const otherUsername = typeof other.username === 'string' ? other.username.trim() : '';
          const otherPlayerId = typeof other.playerId === 'string' ? other.playerId.trim() : '';

          if ((!otherUsername || !otherPlayerId) && !publicProfileCache.has(otherUid)) {
            uidsNeedingBackfill.push(otherUid);
          }

          const resolvedCountry = resolveCountryByCode(
            typeof other.countryCode === 'string' ? other.countryCode : undefined,
            {
              code: String(other.countryCode || 'SA'),
              name: String(other.countryName || 'السعودية'),
              nameEn: String(other.countryName || 'Saudi Arabia'),
              flag: String(other.countryFlag || '🌍'),
              dialCode: '+966',
            }
          );

          const contact: FriendContact = {
            uid: otherUid,
            chatId: canonicalChatId,
            playerId: otherPlayerId,
            username: otherUsername || 'صديق',
            country: resolvedCountry,
            level: Number(other.level || 1),
            rankTitle: String(other.rankTitle || 'مبتدئ واعد'),
            rankTitleEn: String(other.rankTitleEn || 'Arena Challenger'),
            vipTier: (other.vipTier as VipTier) || 'none',
            addedAtIso: new Date(Number(data.createdAtMs || Date.now())).toISOString(),
            isOnline: false,
            unreadCount: 0,
          };

          // Deduplicate by otherUid (keeping the most recently created/updated entry)
          const existing = friendsByOtherUid.get(otherUid);
          if (
            !existing ||
            new Date(contact.addedAtIso).getTime() >= new Date(existing.addedAtIso).getTime()
          ) {
            friendsByOtherUid.set(otherUid, contact);
          }
        });

        const sorted = Array.from(friendsByOtherUid.values()).sort(
          (a, b) => new Date(b.addedAtIso).getTime() - new Date(a.addedAtIso).getTime()
        );
        latestRawFriends = sorted;
        onUpdate(mergeCachedProfiles(sorted));

        // Backfill any incomplete friend profile snapshot from `leaderboard_public/{otherUid}`
        if (uidsNeedingBackfill.length > 0) {
          void Promise.all(
            uidsNeedingBackfill.map(async (uidToFetch) => {
              try {
                const snap = await getDoc(doc(db, 'leaderboard_public', uidToFetch));
                if (snap.exists()) {
                  publicProfileCache.set(uidToFetch, snap.data() as Record<string, unknown>);
                }
              } catch {
                // Ignore individual backfill failures
              }
            })
          ).then(() => {
            if (!isDisposed) {
              onUpdate(mergeCachedProfiles(latestRawFriends));
            }
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'friendships');
      }
    );

    return () => {
      isDisposed = true;
      unsub();
    };
  }

  /**
   * Real-time listener (`onSnapshot`) on `/chats` for all conversations involving `myUid`.
   * Powers live unread counters, red notification dots next to friends, and instant top message alerts.
   */
  public subscribeToUserChatsMetadata(
    myUid: string,
    onUpdate: (chatsById: Record<string, ChatThreadMeta>) => void
  ): Unsubscribe {
    if (!myUid) return () => {};
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', myUid)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const chatsById: Record<string, ChatThreadMeta> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const participants = Array.isArray(data.participants)
            ? ([String(data.participants[0] || ''), String(data.participants[1] || '')] as [
                string,
                string,
              ])
            : (['', ''] as [string, string]);
          const canonicalChatId =
            participants[0] && participants[1]
              ? buildSortedUidPair(participants[0], participants[1]).join('_')
              : String(data.chatId || docSnap.id);

          chatsById[canonicalChatId] = {
            chatId: canonicalChatId,
            participants,
            participantPlayerIds: Array.isArray(data.participantPlayerIds)
              ? ([
                  String(data.participantPlayerIds[0] || ''),
                  String(data.participantPlayerIds[1] || ''),
                ] as [string, string])
              : undefined,
            lastMessageText: String(data.lastMessageText || ''),
            lastMessageSenderUid: String(data.lastMessageSenderUid || ''),
            lastMessageSenderName:
              typeof data.lastMessageSenderName === 'string'
                ? data.lastMessageSenderName
                : undefined,
            lastMessageAtMs: Number(data.lastMessageAtMs || 0),
            unreadByUid:
              data.unreadByUid && typeof data.unreadByUid === 'object'
                ? (data.unreadByUid as Record<string, number>)
                : {},
            lastReadAtMs:
              data.lastReadAtMs && typeof data.lastReadAtMs === 'object'
                ? (data.lastReadAtMs as Record<string, number>)
                : {},
            updatedAtMs: Number(data.updatedAtMs || 0),
          };
        });
        onUpdate(chatsById);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chats');
      }
    );
  }

  /**
   * Resolves the canonical Firestore chatId (`[uidA, uidB].sort().join('_')`) and sorted participants pair.
   * Always computed deterministically from the two UIDs so both devices open the exact same room.
   */
  public getCloudChatKey(myUid: string, friend: FriendContact): {
    chatId: string;
    participants: [string, string];
    friendUid: string;
  } | null {
    if (!myUid || !friend.uid || friend.uid === myUid) return null;
    const participants = buildSortedUidPair(myUid, friend.uid);
    const chatId = participants.join('_');
    return { chatId, participants, friendUid: friend.uid };
  }

  /**
   * Sends a real-time private chat message to Cloud Firestore (`/chats/{canonicalChatId}/messages/{msgId}`)
   * with an authoritative `createdAtServer: serverTimestamp()`, and atomically updates thread metadata.
   */
  public async sendPrivateChatMessageAsync(
    profile: PlayerProfile,
    friend: FriendContact,
    text: string,
    lang: AppLanguage
  ): Promise<{ ok: true; message: ChatMessage } | { ok: false; error: string }> {
    const cleanText = text.trim().slice(0, 500);
    if (!cleanText) {
      return {
        ok: false,
        error: lang === 'en' ? 'Message cannot be empty.' : 'لا يمكن إرسال رسالة فارغة.',
      };
    }

    const myUid = auth.currentUser?.uid || (await ensureFirebaseAuthSession());
    if (!myUid) {
      return {
        ok: false,
        error:
          lang === 'en'
            ? 'Please sign in first to send messages.'
            : 'يرجى تسجيل الدخول أولاً لإرسال الرسائل.',
      };
    }

    let resolvedFriendUid = friend.uid;
    if (!resolvedFriendUid) {
      const lookup = await this.findCloudPlayerByIdentifier(friend.playerId || friend.username);
      if (lookup?.uid) {
        resolvedFriendUid = lookup.uid;
      }
    }

    if (!resolvedFriendUid || resolvedFriendUid === myUid) {
      return {
        ok: false,
        error:
          lang === 'en'
            ? 'Could not resolve this friend’s cloud account.'
            : 'تعذر العثور على الحساب السحابي لهذا الصديق.',
      };
    }

    // Always use canonical sorted room ID so both devices are guaranteed to share the exact same room
    const sortedParticipants = buildSortedUidPair(myUid, resolvedFriendUid);
    const chatId = sortedParticipants.join('_');
    const nowMs = Math.floor(Date.now());
    const nowIso = new Date(nowMs).toISOString();
    const msgId = `msg_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;

    const localMessage: ChatMessage = {
      id: msgId,
      threadId: chatId,
      senderUid: myUid,
      senderId: profile.playerId,
      receiverUid: resolvedFriendUid,
      receiverId: friend.playerId || '0000000000',
      text: cleanText,
      createdAtIso: nowIso,
      createdAtMs: nowMs,
      status: 'delivered',
    };

    const firestoreMessagePayload = {
      ...localMessage,
      participants: sortedParticipants,
      createdAtServer: serverTimestamp(),
    };

    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      const sortedPlayerIds = [
        profile.playerId,
        friend.playerId || profile.playerId,
      ].sort() as [string, string];

      if (chatSnap.exists()) {
        await updateDoc(chatRef, {
          participantPlayerIds: sortedPlayerIds,
          lastMessageText: cleanText.slice(0, 140),
          lastMessageSenderUid: myUid,
          lastMessageSenderName: profile.username.slice(0, 40),
          lastMessageAtMs: nowMs,
          [`unreadByUid.${myUid}`]: 0,
          [`unreadByUid.${resolvedFriendUid}`]: increment(1),
          [`lastReadAtMs.${myUid}`]: nowMs,
          updatedAtMs: nowMs,
        });
      } else {
        await setDoc(chatRef, {
          chatId,
          participants: sortedParticipants,
          participantPlayerIds: sortedPlayerIds,
          lastMessageText: cleanText.slice(0, 140),
          lastMessageSenderUid: myUid,
          lastMessageSenderName: profile.username.slice(0, 40),
          lastMessageAtMs: nowMs,
          unreadByUid: { [myUid]: 0, [resolvedFriendUid]: 1 },
          lastReadAtMs: { [myUid]: nowMs, [resolvedFriendUid]: 0 },
          updatedAtMs: nowMs,
        });
      }

      const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
      await setDoc(msgRef, firestoreMessagePayload);

      return { ok: true, message: localMessage };
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `chats/${chatId}/messages/${msgId}`,
        false,
        'chat'
      );
      return {
        ok: false,
        error: formatFirebaseAuthOrFirestoreError(err, lang, 'chat'),
      };
    }
  }

  /**
   * Marks a cloud private chat as read for `myUid` (clears the red unread badge immediately).
   */
  public async markCloudChatAsReadAsync(myUid: string, chatId: string): Promise<void> {
    if (!myUid || !chatId) return;
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) return;
      const data = chatSnap.data();
      const currentUnread = Number(data?.unreadByUid?.[myUid] || 0);
      if (currentUnread <= 0) return;

      const nowMs = Math.floor(Date.now());
      await updateDoc(chatRef, {
        [`unreadByUid.${myUid}`]: 0,
        [`lastReadAtMs.${myUid}`]: nowMs,
        updatedAtMs: nowMs,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/read`);
    }
  }

  /**
   * Real-time listener (`onSnapshot`) for private chat messages (`chats/{canonicalChatId}/messages`).
   * Uses Firestore server timestamps (`createdAtServer`) with `serverTimestamps: 'estimate'` so messages
   * always appear in exact identical chronological order on both devices regardless of local clock skew.
   */
  public subscribeToPrivateChatMessages(
    myUid: string,
    friendUid: string,
    _chatIdOverride: string | undefined,
    onUpdateMessages: (messages: ChatMessage[]) => void,
    onError?: (errorMessage: string) => void,
    lang: AppLanguage = 'ar'
  ): Unsubscribe {
    if (!myUid || !friendUid || myUid === friendUid) {
      onUpdateMessages([]);
      return () => {};
    }

    // Always use canonical sorted room ID so sender and receiver open the exact same room
    const sortedParticipants = buildSortedUidPair(myUid, friendUid);
    const chatId = sortedParticipants.join('_');
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', myUid),
      limit(300)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const cloudMsgs: ChatMessage[] = snapshot.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' }) as Record<string, unknown>;
          const rawServerTs = data.createdAtServer as { toMillis?: () => number } | undefined;
          const serverMs =
            rawServerTs && typeof rawServerTs.toMillis === 'function'
              ? rawServerTs.toMillis()
              : 0;
          const clientMs = Number(data.createdAtMs || 0);
          const effectiveMs = serverMs > 0 ? serverMs : clientMs;

          return {
            id: String(data.id || d.id),
            threadId: String(data.threadId || chatId),
            senderUid: typeof data.senderUid === 'string' ? data.senderUid : undefined,
            senderId: String(data.senderId || ''),
            receiverUid: typeof data.receiverUid === 'string' ? data.receiverUid : undefined,
            receiverId: String(data.receiverId || ''),
            text: String(data.text || ''),
            createdAtIso:
              effectiveMs > 0
                ? new Date(effectiveMs).toISOString()
                : String(data.createdAtIso || new Date().toISOString()),
            createdAtMs: effectiveMs,
            createdAtServerMs: serverMs > 0 ? serverMs : undefined,
            status: (data.status as ChatMessage['status']) || 'delivered',
          };
        });

        cloudMsgs.sort((a, b) => {
          const aTime = a.createdAtServerMs || a.createdAtMs || 0;
          const bTime = b.createdAtServerMs || b.createdAtMs || 0;
          if (aTime !== bTime) return aTime - bTime;
          return a.id.localeCompare(b.id);
        });
        onUpdateMessages(cloudMsgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`, false, 'chat');
        onError?.(formatFirebaseAuthOrFirestoreError(error, lang, 'chat'));
      }
    );
  }

  public markThreadAsRead(profile: PlayerProfile, friendId: string): PlayerProfile {
    const nextProfile: PlayerProfile = {
      ...profile,
      friends: profile.friends.map((f) =>
        f.playerId === friendId ? { ...f, unreadCount: 0 } : f
      ),
    };
    return this.saveProfile(nextProfile, { skipCloudSync: true });
  }

  public claimStoreRewardedAd(profile: PlayerProfile): PlayerProfile {
    const watchedToday = profile.daily.rewardedAdsWatchedToday || 0;
    if (watchedToday >= 3) return profile;

    const nextProfile: PlayerProfile = {
      ...profile,
      coins: profile.coins + 20,
      daily: {
        ...profile.daily,
        rewardedAdsWatchedToday: watchedToday + 1,
      },
    };
    return this.saveProfile(nextProfile);
  }

  public purchaseVipPackageIap(
    profile: PlayerProfile,
    params: {
      tier: Exclude<VipTier, 'none'>;
      productId: string;
      priceDisplay: string;
      storeProvider: 'google_play' | 'app_store';
      bonusCoins: number;
      bonusLifelinesEach: number;
      verifiedReceipt?: VipPurchaseReceipt;
    }
  ): PlayerProfile {
    const receipt: VipPurchaseReceipt = params.verifiedReceipt || {
      transactionId: `GPA.${Date.now().toString().slice(-8)}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      productId: params.productId,
      tier: params.tier,
      priceDisplay: params.priceDisplay,
      storeProvider: params.storeProvider,
      purchasedAtIso: new Date().toISOString(),
    };

    const safeBonusCoins = antiCheatGuard.clampCoinsDelta(params.bonusCoins, true);

    const currentExpiryMs = profile.vipExpiryDate ? new Date(profile.vipExpiryDate).getTime() : 0;
    const baseTimeMs = Math.max(Date.now(), currentExpiryMs);
    const newExpiryIso = new Date(baseTimeMs + 30 * 24 * 3600 * 1000).toISOString();

    const nextProfile: PlayerProfile = {
      ...profile,
      vipTier: params.tier,
      vipExpiryDate: newExpiryIso,
      adsRemoved: true,
      coins: profile.coins + safeBonusCoins,
      lifelines: {
        fiftyFifty: profile.lifelines.fiftyFifty + params.bonusLifelinesEach,
        freezeTime: profile.lifelines.freezeTime + params.bonusLifelinesEach,
        instantSolve: profile.lifelines.instantSolve + params.bonusLifelinesEach,
      },
      vipReceipts: [receipt, ...(profile.vipReceipts || [])],
    };

    return this.saveProfile(nextProfile, { skipCloudSync: true });
  }

  public purchaseCoinPack(
    profile: PlayerProfile,
    coinAmount: number
  ): PlayerProfile {
    const safeCoins = antiCheatGuard.clampCoinsDelta(coinAmount, true);
    const nextProfile: PlayerProfile = {
      ...profile,
      coins: profile.coins + safeCoins,
    };
    return this.saveProfile(nextProfile);
  }

  public createSupportTicket(
    profile: PlayerProfile,
    category: SupportTicketCategory,
    categoryLabel: string,
    subject: string,
    message: string
  ): PlayerProfile {
    const ticketNum = `TK-${String(Date.now()).slice(-6)}`;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const cleanSubject = (subject.trim() || categoryLabel).slice(0, 100);
    const cleanMessage = message.trim().slice(0, 2000);
    const autoReply = buildAutomatedSupportReply(
      profile.username,
      profile.playerId,
      category,
      cleanSubject
    );

    const newTicket: SupportTicket = {
      id: `ticket_${nowMs}`,
      ticketNumber: ticketNum,
      uid: auth.currentUser?.uid || profile.uid,
      playerId: profile.playerId,
      username: profile.username,
      category,
      categoryLabel,
      subject: cleanSubject,
      message: cleanMessage,
      createdAt: nowIso,
      createdAtMs: nowMs,
      status: 'replied',
      replyText: autoReply,
      repliedAt: nowIso,
    };

    const nextProfile: PlayerProfile = {
      ...profile,
      supportTickets: [newTicket, ...(profile.supportTickets || [])].slice(0, 50),
    };

    // Persist ticket to Cloud Firestore `support_tickets/{ticketId}`
    void this.pushSupportTicketToFirestore(newTicket);

    return this.saveProfile(nextProfile, { skipCloudSync: true });
  }

  private async pushSupportTicketToFirestore(ticket: SupportTicket): Promise<void> {
    try {
      const uid = await ensureFirebaseAuthSession();
      if (!uid) return;
      const ticketRef = doc(db, 'support_tickets', ticket.id);
      await setDoc(ticketRef, {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        uid,
        playerId: ticket.playerId || '0000000000',
        username: (ticket.username || 'Player').slice(0, 24),
        category: ticket.category,
        categoryLabel: ticket.categoryLabel.slice(0, 64),
        subject: ticket.subject.slice(0, 100),
        message: ticket.message.slice(0, 2000),
        status: ticket.status,
        replyText: ticket.replyText || '',
        createdAt: ticket.createdAt,
        createdAtMs: ticket.createdAtMs || Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `support_tickets/${ticket.id}`);
    }
  }

  /**
   * Real-time listener (`onSnapshot`) for the authenticated player's customer support tickets in `support_tickets`.
   */
  public subscribeToSupportTickets(
    onTicketsUpdated: (cloudTickets: SupportTicket[]) => void
  ): Unsubscribe {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};

    const ticketsRef = collection(db, 'support_tickets');
    const q = query(ticketsRef, where('uid', '==', uid), limit(50));

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) return;
        const list: SupportTicket[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: data.id || d.id,
            ticketNumber: data.ticketNumber || 'TK-000',
            uid: data.uid,
            playerId: data.playerId,
            username: data.username,
            category: data.category || 'technical',
            categoryLabel: data.categoryLabel || '',
            subject: data.subject || '',
            message: data.message || '',
            createdAt: data.createdAt || new Date().toISOString(),
            createdAtMs: data.createdAtMs || 0,
            status: data.status || 'pending',
            replyText: data.replyText || '',
            repliedAt: data.repliedAt,
          };
        });
        list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        onTicketsUpdated(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'support_tickets');
      }
    );
  }

  private checkBadgeCondition(profile: PlayerProfile, badgeId: string): boolean {
    switch (badgeId) {
      case 'first_match':
        return profile.stats.matchesPlayed >= 1;
      case 'perfect_round':
        return profile.stats.perfectRoundsCount >= 1;
      case 'combo_master':
        return profile.stats.maxComboEver >= 6;
      case 'quran_scholar':
        return (profile.stats.categoryPlays.quran || 0) >= 3;
      case 'perfect_match':
        return profile.stats.perfectMatchesCount >= 1;
      case 'boss_slayer':
        return profile.stats.dailyBossWins >= 1;
      case 'veteran_10':
        return profile.stats.matchesPlayed >= 10;
      case 'points_50':
        return profile.monthlyPoints >= 50;
      default:
        return false;
    }
  }

  public loadCompetitors(): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COMPETITORS);
      if (!raw) {
        localStorage.setItem(
          STORAGE_KEY_COMPETITORS,
          JSON.stringify(SIMULATED_COMPETITORS)
        );
        return SIMULATED_COMPETITORS;
      }
      return JSON.parse(raw) as LeaderboardEntry[];
    } catch {
      return SIMULATED_COMPETITORS;
    }
  }

  /**
   * Syncs a single completed round immediately (`+0`, `+1`, or `+2` official points)
   * so that every cloud update strictly obeys `incoming().monthlyRoundPoints - existing().monthlyRoundPoints <= 2`.
   */
  public recordSingleRoundProgress(
    profile: PlayerProfile,
    rawRoundPoints: number,
    rawRoundCoins: number,
    rawRoundXp: number,
    fairPlayPenalty = 0
  ): PlayerProfile {
    const clampedPoints = antiCheatGuard.clampRoundOfficialPoints(rawRoundPoints);
    const clampedCoins = antiCheatGuard.clampCoinsDelta(rawRoundCoins, false);
    const currentFairPlay =
      typeof profile.fairPlayScore === 'number' ? profile.fairPlayScore : 100;
    const nextFairPlay = Math.max(0, currentFairPlay - Math.max(0, fairPlayPenalty));

    const nextPoints = profile.monthlyPoints + clampedPoints;
    const nextProfile: PlayerProfile = {
      ...profile,
      monthlyPoints: nextPoints,
      monthlyRoundPoints: nextPoints,
      coins: profile.coins + clampedCoins,
      xp: profile.xp + Math.max(0, Math.floor(rawRoundXp)),
      fairPlayScore: nextFairPlay,
    };

    return this.saveProfile(nextProfile);
  }

  public recordMatchCompletion(
    profile: PlayerProfile,
    params: {
      categoryId: CategoryId;
      categoryName: string;
      roundScores: [number, number, number];
      officialPointsEarned: number;
      coinsEarnedInMatch: number;
      xpEarnedInMatch: number;
      maxComboInMatch: number;
      combosTriggeredCount: number;
      playedQuestionIds: string[];
      alreadySyncedRoundsInMatch?: boolean;
    }
  ): PlayerProfile {
    const totalCorrectInMatch =
      params.roundScores[0] + params.roundScores[1] + params.roundScores[2];
    const perfectRoundsInMatch = params.roundScores.filter((s) => s === 6).length;
    const isPerfectMatch = totalCorrectInMatch === 18;

    const newRecord: MatchHistoryRecord = {
      id: `match_${Date.now()}`,
      dateIso: new Date().toISOString(),
      categoryId: params.categoryId,
      categoryName: params.categoryName,
      roundScores: params.roundScores,
      officialPointsEarned: params.officialPointsEarned,
      coinsEarned: params.coinsEarnedInMatch,
      xpEarned: params.xpEarnedInMatch,
      maxCombo: params.maxComboInMatch,
    };

    const updatedRecentIds = [
      ...params.playedQuestionIds,
      ...profile.recentlyPlayedQuestionIds,
    ].slice(0, 140);

    const updatedMissions = profile.daily.missions.map((m) => {
      if (m.claimed) return m;
      let add = 0;
      if (m.type === 'play_matches') add = 1;
      if (m.type === 'correct_answers') add = totalCorrectInMatch;
      if (m.type === 'perfect_round') add = perfectRoundsInMatch;
      if (m.type === 'combo_streak') add = params.combosTriggeredCount;
      return {
        ...m,
        progress: Math.min(m.target, m.progress + add),
      };
    });

    const prevCatCount = profile.stats.categoryPlays[params.categoryId] || 0;

    const addPoints = params.alreadySyncedRoundsInMatch
      ? 0
      : params.officialPointsEarned;
    const addCoins = params.alreadySyncedRoundsInMatch
      ? 0
      : params.coinsEarnedInMatch;

    const nextMonthly = profile.monthlyPoints + addPoints;

    const nextProfile: PlayerProfile = {
      ...profile,
      monthlyPoints: nextMonthly,
      monthlyRoundPoints: nextMonthly,
      coins: profile.coins + addCoins,
      xp: profile.xp + params.xpEarnedInMatch,
      stats: {
        ...profile.stats,
        matchesPlayed: profile.stats.matchesPlayed + 1,
        totalQuestionsAnswered: profile.stats.totalQuestionsAnswered + 18,
        totalCorrectAnswers: profile.stats.totalCorrectAnswers + totalCorrectInMatch,
        perfectRoundsCount: profile.stats.perfectRoundsCount + perfectRoundsInMatch,
        perfectMatchesCount:
          profile.stats.perfectMatchesCount + (isPerfectMatch ? 1 : 0),
        maxComboEver: Math.max(profile.stats.maxComboEver, params.maxComboInMatch),
        categoryPlays: {
          ...profile.stats.categoryPlays,
          [params.categoryId]: prevCatCount + 1,
        },
      },
      recentlyPlayedQuestionIds: updatedRecentIds,
      matchHistory: [newRecord, ...profile.matchHistory].slice(0, 30),
      daily: {
        ...profile.daily,
        missions: updatedMissions,
      },
    };

    return this.saveProfile(nextProfile);
  }

  /**
   * Real-time listener (`onSnapshot`) for the Live Monthly Leaderboard from `leaderboard_public` collection
   * (containing only non-sensitive public fields) ordered descending by `monthlyRoundPoints`.
   */
  public subscribeToLiveLeaderboard(
    currentProfile: PlayerProfile,
    onUpdate: (entries: LeaderboardEntry[], isLiveCloud: boolean) => void
  ): Unsubscribe {
    const publicLeaderboardRef = collection(db, 'leaderboard_public');
    const q = query(
      publicLeaderboardRef,
      orderBy('monthlyRoundPoints', 'desc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const cloudEntries: LeaderboardEntry[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const pts =
            typeof d.monthlyRoundPoints === 'number'
              ? d.monthlyRoundPoints
              : typeof d.monthlyPoints === 'number'
              ? d.monthlyPoints
              : 0;
          const cInfo = resolveCountryByCode(
            d.countryCode,
            d.country as CountryInfo | undefined
          );

          return {
            uid: d.uid || docSnap.id,
            playerId: d.playerId || '0000000000',
            username: d.username || 'Player',
            country: cInfo,
            monthlyPoints: pts,
            level: typeof d.level === 'number' ? d.level : 1,
            rankTitle: d.rankTitle || 'مبتدئ واعد',
            rankTitleEn: d.rankTitleEn || 'Rising Challenger',
            vipTier: (d.vipTier as VipTier) || 'none',
            isCurrentUser:
              d.playerId === currentProfile.playerId ||
              (Boolean(currentProfile.uid) && d.uid === currentProfile.uid),
          };
        });

        this.cloudLeaderboardCache = cloudEntries;
        const merged = this.mergeLeaderboardEntries(currentProfile, cloudEntries);
        onUpdate(merged, true);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'leaderboard_public');
        onUpdate(this.getLeaderboardWithUser(currentProfile), false);
      }
    );
  }

  private mergeLeaderboardEntries(
    profile: PlayerProfile,
    cloudEntries: LeaderboardEntry[]
  ): LeaderboardEntry[] {
    const { level, rankTitle, rankTitleEn } = calculateLevelAndRank(profile.xp);
    const byPlayerId = new Map<string, LeaderboardEntry>();

    // Seed with fallback competitors so the Top 10 table is always populated
    for (const comp of this.loadCompetitors()) {
      byPlayerId.set(comp.playerId, { ...comp, isCurrentUser: false });
    }

    // Overlay real Cloud Firestore players
    for (const entry of cloudEntries) {
      byPlayerId.set(entry.playerId, {
        ...entry,
        isCurrentUser: entry.playerId === profile.playerId,
      });
    }

    // Ensure current user reflects latest local + cloud state
    byPlayerId.set(profile.playerId, {
      uid: profile.uid,
      playerId: profile.playerId,
      username: profile.username,
      country: profile.country,
      monthlyPoints: profile.monthlyPoints,
      level,
      rankTitle,
      rankTitleEn,
      vipTier: profile.vipTier,
      isCurrentUser: true,
    });

    const all = Array.from(byPlayerId.values());
    all.sort((a, b) => {
      if (b.monthlyPoints !== a.monthlyPoints) {
        return b.monthlyPoints - a.monthlyPoints;
      }
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      return b.level - a.level;
    });

    return all;
  }

  public getLeaderboardWithUser(profile: PlayerProfile): LeaderboardEntry[] {
    return this.mergeLeaderboardEntries(profile, this.cloudLeaderboardCache);
  }
}

export const storageRepo = new StorageRepository();
