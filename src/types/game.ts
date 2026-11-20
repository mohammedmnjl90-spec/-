export type AppLanguage = 'ar' | 'en';

export type CategoryId =
  | 'quran'
  | 'islamic'
  | 'medicine'
  | 'engineering'
  | 'sports'
  | 'arabic'
  | 'science'
  | 'history'
  | 'geography'
  | 'countries'
  | 'math'
  | 'physics'
  | 'cocktail';

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  nameEn: string;
  subtitle: string;
  subtitleEn: string;
  iconName: string;
  accentColor: string;
  isSpecialGold?: boolean;
  isCocktail?: boolean;
}

export interface QuestionItem {
  id: string;
  categoryId: Exclude<CategoryId, 'cocktail'>;
  question: string;
  options: [string, string, string, string];
  correctAnswer: string;
}

export interface CountryInfo {
  code: string;
  name: string; // Arabic name
  nameEn: string; // English name
  flag: string;
  dialCode: string;
  capitalAr?: string;
  continentAr?: string;
}

export type VipTier = 'none' | 'bronze' | 'silver' | 'gold';

export interface LifelinesInventory {
  fiftyFifty: number;
  freezeTime: number;
  instantSolve: number;
}

export interface PlayerSettings {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  language: AppLanguage;
}

export interface MatchHistoryRecord {
  id: string;
  dateIso: string;
  categoryId: CategoryId;
  categoryName: string;
  roundScores: [number, number, number];
  officialPointsEarned: number;
  coinsEarned: number;
  xpEarned: number;
  maxCombo: number;
}

export interface DailyMission {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  claimed: boolean;
  type: 'play_matches' | 'correct_answers' | 'perfect_round' | 'combo_streak';
}

export interface DailyState {
  dateKey: string; // YYYY-MM-DD
  spinUsed: boolean;
  extraSpinsToday: number;
  dailyBossAttempted: boolean;
  dailyBossWon: boolean;
  rewardedAdsWatchedToday: number; // Max 3 per day
  missions: DailyMission[];
}

export type SupportTicketCategory = 'prizes' | 'technical' | 'suggestion' | 'complaint';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  uid?: string;
  playerId?: string;
  username?: string;
  category: SupportTicketCategory;
  categoryLabel: string;
  subject: string;
  message: string;
  createdAt: string;
  createdAtMs?: number;
  status: 'replied' | 'pending';
  replyText: string;
  repliedAt?: string;
}

export interface FriendContact {
  uid?: string;
  chatId?: string;
  playerId: string;
  username: string;
  country: CountryInfo;
  level: number;
  rankTitle: string;
  rankTitleEn: string;
  vipTier: VipTier;
  addedAtIso: string;
  isOnline: boolean;
  lastSeenMs?: number;
  unreadCount: number;
  lastMessageText?: string;
  lastMessageAtMs?: number;
}

export interface UserPresence {
  uid: string;
  online: boolean;
  lastSeenMs: number;
  heartbeatServerMs?: number;
  updatedAtMs: number;
}

export interface FriendRequest {
  id: string; // `${fromUid}_${toUid}`
  fromUid: string;
  fromPlayerId: string;
  fromUsername: string;
  fromCountryCode: string;
  fromCountryName: string;
  fromCountryFlag: string;
  fromLevel: number;
  fromRankTitle: string;
  fromRankTitleEn?: string;
  fromVipTier: VipTier;
  toUid: string;
  toPlayerId: string;
  toUsername: string;
  toCountryCode: string;
  toCountryName: string;
  toCountryFlag: string;
  toLevel: number;
  toRankTitle: string;
  toRankTitleEn?: string;
  toVipTier: VipTier;
  participants: [string, string]; // Sorted UIDs [uidA, uidB]
  status: 'pending' | 'accepted' | 'rejected';
  createdAtMs: number;
  updatedAtMs: number;
}

export interface ChatThreadMeta {
  chatId: string;
  participants: [string, string]; // Sorted UIDs
  participantPlayerIds?: [string, string];
  lastMessageText: string;
  lastMessageSenderUid: string;
  lastMessageSenderName?: string;
  lastMessageAtMs: number;
  unreadByUid?: Record<string, number>;
  lastReadAtMs?: Record<string, number>;
  updatedAtMs: number;
}

export interface ChatMessage {
  id: string;
  threadId: string; // chats/{chatId}/messages/{messageId}
  senderUid?: string;
  senderId: string;
  receiverUid?: string;
  receiverId: string;
  text: string;
  createdAtIso: string;
  createdAtMs?: number;
  createdAtServerMs?: number;
  status: 'sent' | 'delivered' | 'read';
}

export interface VipPurchaseReceipt {
  transactionId: string;
  productId: string;
  tier: Exclude<VipTier, 'none'>;
  priceDisplay: string;
  storeProvider: 'google_play' | 'app_store';
  purchasedAtIso: string;
}

export interface PlayerProfile {
  uid?: string; // Firebase Auth request.auth.uid
  playerId: string; // 10-digit unique ID
  username: string;
  usernameNormalized?: string;
  country: CountryInfo;
  contactType?: 'phone' | 'email';
  contactValue?: string;
  email?: string;
  phone?: string;
  role?: 'admin' | 'player';
  isAdmin?: boolean;
  createdAt: string;
  lastIdentityChangeAt?: string; // ISO timestamp for 50-day identity edit cooldown
  lastProfileEditAt?: number; // Epoch ms for 50-day Firestore rule enforcement (50 * 24 * 60 * 60 * 1000)
  monthlyPoints: number;
  monthlyRoundPoints?: number; // Synced with Firestore players/{uid}.monthlyRoundPoints
  currentMonthKey: string; // YYYY-MM
  coins: number;
  xp: number;
  vipTier: VipTier;
  vipExpiryDate?: string; // ISO expiry date for 30-day VIP subscription
  adsRemoved: boolean; // True when subscribed to VIP
  vipReceipts: VipPurchaseReceipt[];
  fairPlayScore?: number; // Anti-Cheat integrity score (0..100, starts at 100)
  activePlaySeconds: number; // Tracks active playtime for hourly interstitial ad (3600s)
  lastInterstitialHourShown: number;
  lifelines: LifelinesInventory;
  settings: PlayerSettings;
  stats: {
    matchesPlayed: number;
    totalQuestionsAnswered: number;
    totalCorrectAnswers: number;
    perfectRoundsCount: number;
    perfectMatchesCount: number;
    maxComboEver: number;
    dailyBossWins: number;
    categoryPlays: Partial<Record<CategoryId, number>>;
  };
  unlockedBadges: string[];
  recentlyPlayedQuestionIds: string[];
  matchHistory: MatchHistoryRecord[];
  daily: DailyState;
  supportTickets: SupportTicket[];
  friends: FriendContact[];
  chatThreads: Record<string, ChatMessage[]>;
}

export interface LeaderboardEntry {
  uid?: string;
  playerId: string;
  username: string;
  country: CountryInfo;
  monthlyPoints: number;
  level: number;
  rankTitle: string;
  rankTitleEn?: string;
  vipTier: VipTier;
  isCurrentUser?: boolean;
}

export interface BadgeDefinition {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  iconName: string;
  conditionText: string;
  rewardCoins: number;
}
