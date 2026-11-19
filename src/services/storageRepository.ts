import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import {
  AppLanguage,
  BadgeDefinition,
  CategoryId,
  ChatMessage,
  CountryInfo,
  DailyMission,
  DailyState,
  FriendContact,
  LeaderboardEntry,
  MatchHistoryRecord,
  PlayerProfile,
  SupportTicket,
  SupportTicketCategory,
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
  OperationType,
  phoneToSyntheticEmail,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from '../firebaseConfig';
import { antiCheatGuard } from '../utils/antiCheatGuard';

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

export function buildCanonicalChatId(playerIdA: string, playerIdB: string): string {
  return [playerIdA.trim(), playerIdB.trim()].sort().join('_');
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
 * Hybrid Cloud Firestore + Offline-First LocalStorage Repository
 * - Automatically authenticates via Firebase Auth (signInAnonymously) and binds players/{uid}
 * - Reserves unique usernames globally in usernames/{nameNormalized}
 * - Enforces +2 max round points per cloud update, 50-day identity cooldown, and fairPlayScore integrity
 * - Provides real-time onSnapshot listeners for Leaderboard, Friends Private Chat, and Support Tickets
 */
export interface CloudSyncStatus {
  connected: boolean;
  lastSyncedAtMs?: number;
  lastError: string | null;
}

export class StorageRepository {
  private cloudLeaderboardCache: LeaderboardEntry[] = [];
  private rateLimitRetryTimer: number | null = null;
  private cloudStatus: CloudSyncStatus = {
    connected: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
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

  public setCloudStatus(connected: boolean, lastError: string | null = null): void {
    this.cloudStatus = {
      connected,
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
      void this.syncProfileToFirestore(updated, options?.oldUsernameNormalized);
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
  }) {
    return {
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
  }

  /**
   * Synchronizes the player profile to:
   * 1. Private document `/players/{uid}` (readable strictly by `isOwner(uid)`)
   * 2. Public leaderboard document `/leaderboard_public/{uid}` (non-sensitive fields only)
   * 3. Global username reservation `/usernames/{nameNormalized}`
   *
   * Strictly obeys `firestore.rules`:
   * - Client updates keep `vipTier == existing().vipTier` and `adsRemoved == existing().adsRemoved`
   * - Client coin increases are capped at `coinDiff <= 120`
   * - Point increases obey `+2` max delta and `>= 25000ms` (25 seconds) rate limit between round updates.
   */
  public async syncProfileToFirestore(
    profile: PlayerProfile,
    oldUsernameNormalized?: string,
    throwOnError = false
  ): Promise<void> {
    try {
      const uid = auth.currentUser?.uid || profile.uid || (await ensureFirebaseAuthSession());
      if (!uid) {
        if (throwOnError) {
          throw new Error('Auth session missing (uid is null)');
        }
        return;
      }

      const playerRef = doc(db, 'players', uid);
      const publicRef = doc(db, 'leaderboard_public', uid);
      const normalizedName = normalizeUsernameKey(profile.username);
      const levelInfo = calculateLevelAndRank(profile.xp);
      const contactFields = this.buildContactFieldsForFirestore(profile);

      let existingSnap;
      try {
        existingSnap = await getDoc(playerRef);
      } catch (err) {
        const formatted = formatFirebaseAuthOrFirestoreError(
          err,
          profile.settings?.language || 'ar'
        );
        this.setCloudStatus(false, formatted);
        handleFirestoreError(err, OperationType.GET, `players/${uid}`);
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
      const lastEditMs = Math.max(0, Math.floor(profile.lastProfileEditAt ?? 0));
      const nowMs = Date.now();

      if (!existingSnap.exists()) {
        // Initial create: firestore.rules requires vipTier == 'none', adsRemoved == false, coins <= 100, monthlyRoundPoints <= 2
        const initialPoints = Math.min(2, targetPoints);
        const initialCoins = Math.min(100, targetCoins);
        const cleanUsername = profile.username.trim().slice(0, 24);
        const cleanNormName = normalizedName.slice(0, 24);

        const initialDocData = {
          uid,
          playerId: profile.playerId,
          username: cleanUsername,
          usernameNormalized: cleanNormName,
          countryCode: profile.country.code,
          countryName: profile.country.name,
          countryFlag: profile.country.flag,
          country: profile.country,
          ...contactFields,
          monthlyRoundPoints: initialPoints,
          monthlyPoints: initialPoints,
          currentMonthKey: profile.currentMonthKey,
          coins: initialCoins,
          xp: targetXp,
          level: levelInfo.level,
          rankTitle: levelInfo.rankTitle,
          rankTitleEn: levelInfo.rankTitleEn,
          vipTier: 'none' as VipTier,
          adsRemoved: false,
          fairPlayScore: 100,
          lastProfileEditAt: lastEditMs,
          createdAt: profile.createdAt || new Date().toISOString(),
          updatedAtMs: nowMs,
        };

        await setDoc(playerRef, initialDocData);

        // Mirror public non-sensitive fields to `/leaderboard_public/{uid}`
        await setDoc(
          publicRef,
          this.buildPublicLeaderboardPayload({
            uid,
            playerId: profile.playerId,
            username: cleanUsername,
            usernameNormalized: cleanNormName,
            countryCode: profile.country.code,
            countryName: profile.country.name,
            countryFlag: profile.country.flag,
            monthlyRoundPoints: initialPoints,
            level: levelInfo.level,
            rankTitle: levelInfo.rankTitle,
            rankTitleEn: levelInfo.rankTitleEn,
            vipTier: 'none',
            updatedAtMs: nowMs,
          })
        );

        // Reserve username globally in usernames/{nameNormalized}
        const usernameRef = doc(db, 'usernames', cleanNormName);
        await setDoc(usernameRef, {
          uid,
          username: cleanUsername,
          playerId: profile.playerId,
          createdAt: nowMs,
          reservedAtMs: nowMs,
        });

        this.setCloudStatus(true, null);
        return;
      }

      // Existing cloud document update — respect:
      // 1) incoming().vipTier == existing().vipTier & incoming().adsRemoved == existing().adsRemoved
      // 2) coinDiff <= 120
      // 3) monthlyRoundPoints delta <= 2 AND >= 25000ms interval since existing().updatedAtMs
      const cloudData = existingSnap.data();
      const currentCloudPts =
        typeof cloudData.monthlyRoundPoints === 'number'
          ? cloudData.monthlyRoundPoints
          : 0;
      const currentCloudCoins =
        typeof cloudData.coins === 'number' ? cloudData.coins : 50;
      const currentCloudFairPlay =
        typeof cloudData.fairPlayScore === 'number' ? cloudData.fairPlayScore : 100;
      const lastCloudUpdatedAtMs =
        typeof cloudData.updatedAtMs === 'number' ? cloudData.updatedAtMs : 0;

      // Never increase fairPlayScore above cloud value
      const safeFairPlay = Math.min(currentCloudFairPlay, targetFairPlay);

      // Keep server-authoritative vipTier and adsRemoved on client updates
      const lockedVipTier: VipTier = (cloudData.vipTier as VipTier) || 'none';
      const lockedAdsRemoved = Boolean(cloudData.adsRemoved);

      // Cap client coin increase at <= 120 per update
      const nextCoins =
        targetCoins >= currentCloudCoins
          ? Math.min(targetCoins, currentCloudCoins + 120)
          : targetCoins;

      // Check 25-second rate limit before increasing monthlyRoundPoints
      const elapsedSinceLastUpdateMs = nowMs - lastCloudUpdatedAtMs;
      const canIncreasePointsNow =
        targetPoints > currentCloudPts &&
        (lastCloudUpdatedAtMs === 0 || elapsedSinceLastUpdateMs >= 25000);

      const nextPts = canIncreasePointsNow
        ? Math.min(targetPoints, currentCloudPts + 2)
        : currentCloudPts;

      const nextUpdatedAtMs = canIncreasePointsNow
        ? nowMs
        : lastCloudUpdatedAtMs || nowMs;

      const cleanUsername = profile.username.trim().slice(0, 24);
      const cleanNormName = normalizedName.slice(0, 24);

      const payload = {
        uid,
        playerId: cloudData.playerId || profile.playerId,
        username: cleanUsername,
        usernameNormalized: cleanNormName,
        countryCode: profile.country.code,
        countryName: profile.country.name,
        countryFlag: profile.country.flag,
        country: profile.country,
        ...contactFields,
        monthlyRoundPoints: nextPts,
        monthlyPoints: nextPts,
        currentMonthKey: profile.currentMonthKey,
        coins: nextCoins,
        xp: targetXp,
        level: levelInfo.level,
        rankTitle: levelInfo.rankTitle,
        rankTitleEn: levelInfo.rankTitleEn,
        vipTier: lockedVipTier,
        adsRemoved: lockedAdsRemoved,
        fairPlayScore: safeFairPlay,
        lastProfileEditAt: lastEditMs,
        createdAt: cloudData.createdAt || profile.createdAt || new Date().toISOString(),
        updatedAtMs: nextUpdatedAtMs,
      };

      await setDoc(playerRef, payload);

      // Mirror public non-sensitive fields to `/leaderboard_public/{uid}`
      await setDoc(
        publicRef,
        this.buildPublicLeaderboardPayload({
          uid,
          playerId: cloudData.playerId || profile.playerId,
          username: cleanUsername,
          usernameNormalized: cleanNormName,
          countryCode: profile.country.code,
          countryName: profile.country.name,
          countryFlag: profile.country.flag,
          monthlyRoundPoints: nextPts,
          level: levelInfo.level,
          rankTitle: levelInfo.rankTitle,
          rankTitleEn: levelInfo.rankTitleEn,
          vipTier: lockedVipTier,
          updatedAtMs: nextUpdatedAtMs,
        })
      );

      // If more points remain queued due to the 25-second rate limit, schedule automatic follow-up sync
      if (targetPoints > nextPts && typeof window !== 'undefined') {
        const waitMs = Math.max(
          25100,
          25100 - Math.max(0, elapsedSinceLastUpdateMs)
        );
        if (this.rateLimitRetryTimer) {
          window.clearTimeout(this.rateLimitRetryTimer);
        }
        this.rateLimitRetryTimer = window.setTimeout(() => {
          const latestLocal = this.loadProfile();
          if (latestLocal) {
            void this.syncProfileToFirestore(latestLocal);
          }
        }, waitMs);
      }

      // Update username reservation if changed
      if (oldUsernameNormalized && oldUsernameNormalized !== cleanNormName) {
        try {
          await deleteDoc(doc(db, 'usernames', oldUsernameNormalized));
        } catch {
          // ignore if old reservation didn't exist
        }
      }
      await setDoc(doc(db, 'usernames', cleanNormName), {
        uid,
        username: cleanUsername,
        playerId: cloudData.playerId || profile.playerId,
        createdAt: nowMs,
        reservedAtMs: nowMs,
      });

      this.setCloudStatus(true, null);
    } catch (error) {
      const formatted = formatFirebaseAuthOrFirestoreError(
        error,
        profile.settings?.language || 'ar'
      );
      this.setCloudStatus(false, formatted);
      handleFirestoreError(error, OperationType.WRITE, 'players/sync');
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
              ? 'This username is already taken in the cloud. Please choose another username.'
              : 'اسم المستخدم هذا محجوز بالفعل في قاعدة البيانات السحابية. يرجى اختيار اسم آخر.',
        };
      }
    } catch (err) {
      // If reading usernames fails due to network or rules, surface if permission-denied or offline
      const errMsg = err instanceof Error ? err.message.toLowerCase() : '';
      if (
        errMsg.includes('offline') ||
        errMsg.includes('unavailable') ||
        errMsg.includes('network')
      ) {
        const formatted = formatFirebaseAuthOrFirestoreError(err, params.lang);
        this.setCloudStatus(false, formatted);
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
              ? 'Invalid international phone format. Must adhere to E.164 (+CountryCode + SubscriberNumber) to transform to phone_xxx@neurox.app.'
              : 'صيغة رقم الجوال الدولية غير صحيحة. يجب أن يطابق المعيار الدولي (+مفتاح الدولة متبوعاً برقم الجوال) للتحويل إلى phone_xxx@neurox.app.',
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
      const formatted = formatFirebaseAuthOrFirestoreError(error, params.lang);
      this.setCloudStatus(false, formatted);
      return { ok: false, error: formatted };
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
              ? 'Invalid international phone format. Must adhere to E.164 (+CountryCode + SubscriberNumber) to transform to phone_xxx@neurox.app.'
              : 'صيغة رقم الجوال الدولية غير صحيحة. يجب أن يطابق المعيار الدولي (+مفتاح الدولة متبوعاً برقم الجوال) للتحويل إلى phone_xxx@neurox.app.',
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
      const formatted = formatFirebaseAuthOrFirestoreError(error, params.lang);
      this.setCloudStatus(false, formatted);
      return { ok: false, error: formatted };
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
      return {
        ok: false,
        error: formatFirebaseAuthOrFirestoreError(error, lang),
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
  public async addFriendByIdentifierAsync(
    profile: PlayerProfile,
    rawIdentifier: string,
    lang: AppLanguage
  ): Promise<
    { ok: true; profile: PlayerProfile; friend: FriendContact } | { ok: false; error: string }
  > {
    const clean = rawIdentifier.trim();
    const lower = clean.toLowerCase();
    const normKey = normalizeUsernameKey(clean);

    if (!clean || clean.length < 3) {
      return {
        ok: false,
        error:
          lang === 'en'
            ? 'Please enter a valid 10-digit Player ID or username (at least 3 characters).'
            : 'يرجى إدخال كود لاعب صحيح (10 أرقام) أو اسم مستخدم (3 أحرف على الأقل).',
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
            ? 'You cannot add yourself as a friend.'
            : 'لا يمكنك إضافة حسابك الشخصي إلى قائمة الأصدقاء.',
      };
    }

    const alreadyExists = profile.friends.some(
      (f) =>
        f.playerId.toLowerCase() === lower ||
        f.username.trim().toLowerCase() === lower ||
        normalizeUsernameKey(f.username) === normKey
    );
    if (alreadyExists) {
      return {
        ok: false,
        error:
          lang === 'en'
            ? 'This player is already in your friends list.'
            : 'هذا اللاعب مضاف بالفعل في قائمة أصدقائك.',
      };
    }

    // 1. Try searching Cloud Firestore `leaderboard_public` collection first (since `players` is owner-only)
    try {
      await ensureFirebaseAuthSession();
      const publicPlayersRef = collection(db, 'leaderboard_public');
      const isTenDigitCode = /^\d{10}$/.test(clean);
      const q = isTenDigitCode
        ? query(publicPlayersRef, where('playerId', '==', clean), limit(1))
        : query(publicPlayersRef, where('usernameNormalized', '==', normKey), limit(1));

      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0].data();
        const resolvedCountry = resolveCountryByCode(
          docData.countryCode,
          docData.country as CountryInfo | undefined
        );

        const cloudFriend: FriendContact = {
          uid: docData.uid || snap.docs[0].id,
          playerId: docData.playerId,
          username: docData.username,
          country: resolvedCountry,
          level: docData.level || 1,
          rankTitle: docData.rankTitle || 'مبتدئ واعد',
          rankTitleEn: docData.rankTitleEn || 'Rising Challenger',
          vipTier: (docData.vipTier as VipTier) || 'none',
          addedAtIso: new Date().toISOString(),
          isOnline: true,
          unreadCount: 1,
        };

        return this.finalizeAddFriend(profile, cloudFriend, lang);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'leaderboard_public/searchFriend');
    }

    // 2. Fallback to local & leaderboard competitors
    return this.addFriendByIdentifier(profile, rawIdentifier, lang);
  }

  public addFriendByIdentifier(
    profile: PlayerProfile,
    rawIdentifier: string,
    lang: AppLanguage
  ): { ok: true; profile: PlayerProfile; friend: FriendContact } | { ok: false; error: string } {
    const clean = rawIdentifier.trim();
    const lower = clean.toLowerCase();

    if (!clean || clean.length < 3) {
      return {
        ok: false,
        error:
          lang === 'en'
            ? 'Please enter a valid 10-digit Player ID or username (at least 3 characters).'
            : 'يرجى إدخال كود لاعب صحيح (10 أرقام) أو اسم مستخدم (3 أحرف على الأقل).',
      };
    }

    if (
      clean === profile.playerId ||
      lower === profile.username.trim().toLowerCase()
    ) {
      return {
        ok: false,
        error:
          lang === 'en'
            ? 'You cannot add yourself as a friend.'
            : 'لا يمكنك إضافة حسابك الشخصي إلى قائمة الأصدقاء.',
      };
    }

    const alreadyExists = profile.friends.some(
      (f) =>
        f.playerId.toLowerCase() === lower ||
        f.username.trim().toLowerCase() === lower
    );
    if (alreadyExists) {
      return {
        ok: false,
        error:
          lang === 'en'
            ? 'This player is already in your friends list.'
            : 'هذا اللاعب مضاف بالفعل في قائمة أصدقائك.',
      };
    }

    const allSaved = this.loadAllSavedAccounts();
    const savedMatch = allSaved.find(
      (a) =>
        a.playerId !== profile.playerId &&
        (a.playerId.toLowerCase() === lower || a.username.trim().toLowerCase() === lower)
    );

    const competitorMatch = [
      ...this.cloudLeaderboardCache,
      ...this.loadCompetitors(),
    ].find(
      (c) =>
        c.playerId !== profile.playerId &&
        (c.playerId.toLowerCase() === lower || c.username.trim().toLowerCase() === lower)
    );

    let newFriend: FriendContact;
    if (savedMatch) {
      const lvl = calculateLevelAndRank(savedMatch.xp);
      newFriend = {
        uid: savedMatch.uid,
        playerId: savedMatch.playerId,
        username: savedMatch.username,
        country: savedMatch.country,
        level: lvl.level,
        rankTitle: lvl.rankTitle,
        rankTitleEn: lvl.rankTitleEn,
        vipTier: savedMatch.vipTier,
        addedAtIso: new Date().toISOString(),
        isOnline: true,
        unreadCount: 1,
      };
    } else if (competitorMatch) {
      newFriend = {
        uid: competitorMatch.uid,
        playerId: competitorMatch.playerId,
        username: competitorMatch.username,
        country: competitorMatch.country,
        level: competitorMatch.level,
        rankTitle: competitorMatch.rankTitle,
        rankTitleEn: competitorMatch.rankTitleEn || 'Arena Challenger',
        vipTier: competitorMatch.vipTier,
        addedAtIso: new Date().toISOString(),
        isOnline: true,
        unreadCount: 1,
      };
    } else {
      const isTenDigits = /^\d{10}$/.test(clean);
      const generatedId = isTenDigits
        ? clean
        : generateUnique10DigitId(profile.friends.map((f) => f.playerId));
      const generatedName = isTenDigits ? `بطل_${clean.slice(0, 4)}` : clean.slice(0, 20);
      const randomCountry =
        COUNTRIES_LIST[clean.charCodeAt(0) % Math.min(20, COUNTRIES_LIST.length)];

      newFriend = {
        playerId: generatedId,
        username: generatedName,
        country: randomCountry,
        level: 5,
        rankTitle: 'باحث طموح',
        rankTitleEn: 'Ambitious Seeker',
        vipTier: 'none',
        addedAtIso: new Date().toISOString(),
        isOnline: true,
        unreadCount: 1,
      };
    }

    return this.finalizeAddFriend(profile, newFriend, lang);
  }

  private finalizeAddFriend(
    profile: PlayerProfile,
    newFriend: FriendContact,
    lang: AppLanguage
  ): { ok: true; profile: PlayerProfile; friend: FriendContact } {
    const threadId = buildCanonicalChatId(profile.playerId, newFriend.playerId);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const welcomeMsg: ChatMessage = {
      id: `msg_${nowMs}`,
      threadId,
      senderUid: auth.currentUser?.uid || profile.uid || 'system',
      senderId: newFriend.playerId,
      receiverId: profile.playerId,
      text:
        lang === 'en'
          ? `Hello ${profile.username}! Glad we're friends now in Peak of Challenge ${newFriend.country.flag}. Let's compete!`
          : `أهلاً بك يا ${profile.username}! يسعدني إضافتك في قائمة الأصدقاء بقمة التحدي ${newFriend.country.flag}. جاهز للتنافس؟`,
      createdAtIso: nowIso,
      createdAtMs: nowMs,
      status: 'delivered',
    };

    const existingThread = profile.chatThreads[newFriend.playerId] || [];
    const updatedProfile: PlayerProfile = {
      ...profile,
      friends: [newFriend, ...profile.friends],
      chatThreads: {
        ...profile.chatThreads,
        [newFriend.playerId]:
          existingThread.length > 0 ? existingThread : [welcomeMsg],
      },
    };

    // Initialize chat thread document in Cloud Firestore with participants array [senderUid, receiverUid]
    void this.ensureCloudChatThread(
      profile.playerId,
      newFriend.playerId,
      newFriend.uid
    );

    return {
      ok: true,
      profile: this.saveProfile(updatedProfile),
      friend: newFriend,
    };
  }

  private buildChatParticipantsUids(
    myUid: string,
    friendPlayerId: string,
    friendUid?: string
  ): [string, string] {
    const resolvedFriendUid =
      friendUid && friendUid !== myUid ? friendUid : `uid_${friendPlayerId}`;
    return [myUid, resolvedFriendUid];
  }

  private async ensureCloudChatThread(
    playerIdA: string,
    playerIdB: string,
    friendUid?: string
  ): Promise<void> {
    try {
      const uid = await ensureFirebaseAuthSession();
      if (!uid) return;
      const chatId = buildCanonicalChatId(playerIdA, playerIdB);
      const chatRef = doc(db, 'chats', chatId);
      const participants = this.buildChatParticipantsUids(
        uid,
        playerIdB,
        friendUid
      );
      await setDoc(
        chatRef,
        {
          chatId,
          participants,
          participantPlayerIds: [playerIdA, playerIdB].sort(),
          updatedAtMs: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'chats/init');
    }
  }

  public sendPrivateChatMessage(
    profile: PlayerProfile,
    friendId: string,
    text: string
  ): { profile: PlayerProfile; sentMessage: ChatMessage } {
    const threadId = buildCanonicalChatId(profile.playerId, friendId);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const msgId = `msg_${nowMs}_${Math.random().toString(36).slice(2, 6)}`;
    const cleanText = text.trim().slice(0, 500);
    const matchedFriend = profile.friends.find((f) => f.playerId === friendId);

    const msg: ChatMessage = {
      id: msgId,
      threadId,
      senderUid: auth.currentUser?.uid || profile.uid || 'local',
      senderId: profile.playerId,
      receiverId: friendId,
      text: cleanText,
      createdAtIso: nowIso,
      createdAtMs: nowMs,
      status: 'read',
    };

    const prevList = profile.chatThreads[friendId] || [];
    const nextProfile: PlayerProfile = {
      ...profile,
      friends: profile.friends.map((f) =>
        f.playerId === friendId ? { ...f, unreadCount: 0 } : f
      ),
      chatThreads: {
        ...profile.chatThreads,
        [friendId]: [...prevList, msg],
      },
    };

    // Push message to Firestore chats/{chatId}/messages/{msgId} with participants array
    void this.pushMessageToFirestore(
      threadId,
      msg,
      [profile.playerId, friendId],
      matchedFriend?.uid
    );

    return {
      profile: this.saveProfile(nextProfile, { skipCloudSync: true }),
      sentMessage: msg,
    };
  }

  private async pushMessageToFirestore(
    chatId: string,
    msg: ChatMessage,
    participantPlayerIds: [string, string],
    friendUid?: string
  ): Promise<void> {
    try {
      const uid = await ensureFirebaseAuthSession();
      if (!uid) return;

      const otherPlayerId =
        participantPlayerIds[0] === msg.senderId
          ? participantPlayerIds[1]
          : participantPlayerIds[0];
      const participants = this.buildChatParticipantsUids(
        uid,
        otherPlayerId,
        friendUid
      );

      const chatRef = doc(db, 'chats', chatId);
      await setDoc(
        chatRef,
        {
          chatId,
          participants,
          participantPlayerIds: [...participantPlayerIds].sort(),
          updatedAtMs: Date.now(),
        },
        { merge: true }
      );

      const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
      await setDoc(msgRef, {
        id: msg.id,
        threadId: chatId,
        participants,
        senderUid: uid,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        text: msg.text.slice(0, 500),
        createdAtIso: msg.createdAtIso,
        createdAtMs: msg.createdAtMs || Date.now(),
        status: msg.status,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages/${msg.id}`);
    }
  }

  /**
   * Real-time listener (`onSnapshot`) for private chat messages (`chats/{chatId}/messages`),
   * filtered by `participants` array-contains `request.auth.uid` to satisfy `firestore.rules`.
   */
  public subscribeToPrivateChatMessages(
    myPlayerId: string,
    friendPlayerId: string,
    onUpdateMessages: (messages: ChatMessage[]) => void
  ): Unsubscribe {
    const uid = auth.currentUser?.uid;
    if (!uid) return () => {};

    const chatId = buildCanonicalChatId(myPlayerId, friendPlayerId);
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', uid),
      limit(100)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) return;
        const cloudMsgs: ChatMessage[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: data.id || d.id,
            threadId: data.threadId || chatId,
            senderUid: data.senderUid,
            senderId: data.senderId,
            receiverId: data.receiverId,
            text: data.text,
            createdAtIso: data.createdAtIso || new Date().toISOString(),
            createdAtMs: data.createdAtMs || Date.now(),
            status: data.status || 'delivered',
          };
        });
        cloudMsgs.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
        onUpdateMessages(cloudMsgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
      }
    );
  }

  public receiveFriendAutoReply(
    profile: PlayerProfile,
    friend: FriendContact,
    userText: string,
    lang: AppLanguage
  ): PlayerProfile {
    const threadId = buildCanonicalChatId(profile.playerId, friend.playerId);
    const replyText = buildFriendSmartReply(friend, userText, lang);
    const nowMs = Date.now();
    const replyMsg: ChatMessage = {
      id: `msg_${nowMs}_reply`,
      threadId,
      senderUid: auth.currentUser?.uid || profile.uid || 'friend',
      senderId: friend.playerId,
      receiverId: profile.playerId,
      text: replyText,
      createdAtIso: new Date(nowMs).toISOString(),
      createdAtMs: nowMs,
      status: 'read',
    };

    const prevList = profile.chatThreads[friend.playerId] || [];
    // If real friend already replied via Firestore, avoid duplicate auto-reply
    const recentCloudReply = prevList.some(
      (m) => m.senderId === friend.playerId && nowMs - (m.createdAtMs || 0) < 2500
    );
    if (recentCloudReply) return profile;

    const nextProfile: PlayerProfile = {
      ...profile,
      chatThreads: {
        ...profile.chatThreads,
        [friend.playerId]: [...prevList, replyMsg],
      },
    };

    void this.pushMessageToFirestore(
      threadId,
      replyMsg,
      [profile.playerId, friend.playerId],
      friend.uid
    );

    return this.saveProfile(nextProfile, { skipCloudSync: true });
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

    const nextProfile: PlayerProfile = {
      ...profile,
      vipTier: params.tier,
      adsRemoved: true, // Permanently removes all ads including hourly ads
      coins: profile.coins + safeBonusCoins,
      lifelines: {
        fiftyFifty: profile.lifelines.fiftyFifty + params.bonusLifelinesEach,
        freezeTime: profile.lifelines.freezeTime + params.bonusLifelinesEach,
        instantSolve: profile.lifelines.instantSolve + params.bonusLifelinesEach,
      },
      vipReceipts: [receipt, ...(profile.vipReceipts || [])],
    };

    // Note: Cloud Firestore upgrade of vipTier/adsRemoved/coins is performed by the Server / Cloud Function
    // (`verifyVipPurchaseReceipt` on `/vip_verifications/{receiptId}`), so we skip direct client overwrite here.
    return this.saveProfile(nextProfile, { skipCloudSync: true });
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
