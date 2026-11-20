import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  initializeFirestore,
  memoryLocalCache,
  Firestore,
} from 'firebase/firestore';

/**
 * مفاتيح الربط الحقيقية لمشروع Firebase: waled-alsh
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyDisDgIW4wAYFlkjic10mwdOVo-FB99yFs',
  authDomain: 'waled-alsh.firebaseapp.com',
  projectId: 'waled-alsh',
  storageBucket: 'waled-alsh.firebasestorage.app',
  messagingSenderId: '739687298867',
  appId: '1:739687298867:web:11bf6c308d8f8e4aca3046',
  measurementId: 'G-223YJZ915R',
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore in strict Online-Only mode (in-memory session cache only, no offline IndexedDB persistence)
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
} catch {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Converts a phone number + dialCode into a deterministic internal email
 * format `phone_967770000000@neurox.app` so Firebase Email/Password Auth
 * works with phone numbers from any device for free without SMS.
 */
export function phoneToSyntheticEmail(
  dialCode: string,
  rawPhone: string
): { syntheticEmail: string; normalizedPhone: string } {
  const cleanDialDigits = dialCode.replace(/\D/g, '');
  let cleanLocalDigits = rawPhone.replace(/\D/g, '');

  // If the user typed the country code again inside rawPhone, strip the duplicate prefix
  if (
    cleanDialDigits &&
    cleanLocalDigits.startsWith(cleanDialDigits) &&
    cleanLocalDigits.length > cleanDialDigits.length + 5
  ) {
    cleanLocalDigits = cleanLocalDigits.slice(cleanDialDigits.length);
  }

  // Strip a single leading trunk zero (e.g., 077... -> 77...) for consistent matching
  if (cleanLocalDigits.startsWith('0') && cleanLocalDigits.length > 7) {
    cleanLocalDigits = cleanLocalDigits.replace(/^0+/, '');
  }

  const fullDigits = `${cleanDialDigits}${cleanLocalDigits}`;
  return {
    syntheticEmail: `phone_${fullDigits}@neurox.app`,
    normalizedPhone: `+${fullDigits}`,
  };
}

/**
 * Translates Firebase Auth & Cloud Firestore error codes into clear, actionable
 * user-facing messages in Arabic or English explaining the exact cause.
 */
export function formatFirebaseAuthOrFirestoreError(
  error: unknown,
  lang: 'ar' | 'en'
): string {
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const combined = `${code} ${rawMessage}`.toLowerCase();

  if (combined.includes('auth/email-already-in-use')) {
    return lang === 'en'
      ? 'This email or mobile number is already registered in the cloud. Please switch to "Login" and sign in with your password.'
      : 'البريد الإلكتروني أو رقم الجوال مسجل بالفعل في السحابة. يرجى الانتقال إلى تبويب "تسجيل الدخول" والدخول بكلمة المرور.';
  }

  if (
    combined.includes('auth/invalid-credential') ||
    combined.includes('auth/wrong-password') ||
    combined.includes('auth/user-not-found')
  ) {
    return lang === 'en'
      ? 'Incorrect email/phone number or password. Please verify your credentials and try again.'
      : 'البريد الإلكتروني / رقم الجوال أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات والمحاولة مرة أخرى.';
  }

  if (combined.includes('auth/weak-password')) {
    return lang === 'en'
      ? 'Password is too weak. Please enter at least 6 characters.'
      : 'كلمة المرور ضعيفة؛ يرجى إدخال 6 أحرف أو أرقام على الأقل.';
  }

  if (combined.includes('auth/invalid-email')) {
    return lang === 'en'
      ? 'Invalid email format. Please enter a valid email address.'
      : 'صيغة البريد الإلكتروني غير صحيحة، يرجى التحقق منها.';
  }

  if (
    combined.includes('auth/operation-not-allowed') ||
    combined.includes('configuration-not-found')
  ) {
    return lang === 'en'
      ? 'Email/Password Sign-In is not enabled yet in your Firebase project (waled-alsh). Please enable "Email/Password" in Firebase Console > Authentication > Sign-in method.'
      : 'طريقة الدخول بالبريد وكلمة المرور (Email/Password) غير مفعلة بعد في مشروع Firebase (waled-alsh). يرجى تفعيل خيار Email/Password من Firebase Console > Authentication > Sign-in method.';
  }

  if (combined.includes('auth/too-many-requests')) {
    return lang === 'en'
      ? 'Too many failed attempts. Please wait a moment before trying again.'
      : 'تم تجاوز عدد المحاولات المسموحة مؤقتاً. يرجى الانتظار قليلاً ثم المحاولة مجدداً.';
  }

  if (
    combined.includes('permission-denied') ||
    combined.includes('missing or insufficient permissions')
  ) {
    return lang === 'en'
      ? 'Cloud Firestore rejected the write (permission-denied). Please copy the updated firestore.rules from Settings and publish them in Firebase Console > Firestore Database > Rules.'
      : 'رفضت قاعدة البيانات السحابية العملية بسبب صلاحيات الحماية (permission-denied). يرجى نسخ كود firestore.rules المحدّث ولصقه ثم الضغط على Publish في Firebase Console > Firestore Database > Rules.';
  }

  if (
    combined.includes('network-request-failed') ||
    combined.includes('client is offline') ||
    combined.includes('unavailable') ||
    combined.includes('failed to get document because the client is offline')
  ) {
    return lang === 'en'
      ? 'Unable to reach Firebase Cloud servers. Please check your internet connection.'
      : 'تعذر الاتصال بخوادم السحابة (Firebase). يرجى التحقق من اتصالك بالإنترنت.';
  }

  return lang === 'en'
    ? `Cloud error: ${rawMessage || 'Unknown Firebase error'}`
    : `خطأ في الاتصال بالسحابة: ${rawMessage || 'حدث خطأ غير متوقع في Firebase'}`;
}

/**
 * Structured error handler for Firestore operations.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  shouldThrow = false
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Sync Notice:', JSON.stringify(errInfo));
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
  return errInfo;
}

let authInitPromise: Promise<User | null> | null = null;

/**
 * Ensures an authenticated Firebase Auth session.
 * If the user is already signed in with Email/Password (or Phone synthetic email),
 * returns their UID directly.
 */
export async function ensureFirebaseAuthSession(
  allowAnonymousFallback = false
): Promise<string | null> {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  if (!authInitPromise) {
    authInitPromise = new Promise<User | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (existingUser) => {
          unsubscribe();
          if (existingUser) {
            resolve(existingUser);
            return;
          }
          if (!allowAnonymousFallback) {
            resolve(null);
            return;
          }
          try {
            const cred = await signInAnonymously(auth);
            resolve(cred.user);
          } catch (err) {
            console.warn('Firebase Auth session check:', err);
            resolve(null);
          }
        },
        () => {
          unsubscribe();
          resolve(null);
        }
      );
    });
  }

  const user = await authInitPromise;
  authInitPromise = null;
  return user ? user.uid : null;
}

/**
 * Determines whether a Firebase Auth or Firestore error was caused by
 * genuine network / internet loss (as opposed to security rules or validation).
 */
export function isNetworkConnectivityError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const combined = `${code} ${rawMessage}`.toLowerCase();

  return (
    combined.includes('the client is offline') ||
    combined.includes('client is offline') ||
    combined.includes('network-request-failed') ||
    combined.includes('failed to fetch') ||
    combined.includes('networkerror') ||
    combined.includes('unavailable') ||
    combined.includes('connection_timeout') ||
    combined.includes('err_internet_disconnected')
  );
}

/**
 * Real-time connectivity probe against Cloud Firestore server (`test/connection`)
 * with a strict timeout so offline/stalled networks are caught immediately.
 */
export async function testFirestoreConnection(timeoutMs = 6000): Promise<{
  connected: boolean;
  isNetworkError?: boolean;
  errorDetail?: string;
}> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      connected: false,
      isNetworkError: true,
      errorDetail: 'لا يوجد اتصال بالإنترنت (Device is offline)',
    };
  }

  let timeoutHandle: number | undefined;
  try {
    const serverCheckPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = window.setTimeout(() => {
        reject(new Error('connection_timeout'));
      }, timeoutMs);
    });

    await Promise.race([serverCheckPromise, timeoutPromise]);
    return { connected: true, isNetworkError: false };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isNetworkConnectivityError(error)) {
      return {
        connected: false,
        isNetworkError: true,
        errorDetail: msg,
      };
    }
    // If Firestore responded with permission-denied, the server IS reachable over the internet
    return { connected: true, isNetworkError: false };
  } finally {
    if (timeoutHandle !== undefined) {
      window.clearTimeout(timeoutHandle);
    }
  }
}

/**
 * Source code of firebaseConfig.js for the in-app copy modal in Settings.
 */
export const FIREBASE_CONFIG_JS_SOURCE = `// firebaseConfig.js — إعدادات الربط السحابي لمشروع waled-alsh
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDisDgIW4wAYFlkjic10mwdOVo-FB99yFs",
  authDomain: "waled-alsh.firebaseapp.com",
  projectId: "waled-alsh",
  storageBucket: "waled-alsh.firebasestorage.app",
  messagingSenderId: "739687298867",
  appId: "1:739687298867:web:11bf6c308d8f8e4aca3046",
  measurementId: "G-223YJZ915R"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);`;

/**
 * Source code of firestore.rules (Synchronized 100% with /firestore.rules)
 */
export const FIRESTORE_RULES_SOURCE = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // =========================================================================
    // 0. القاعدة الافتراضية الشاملة (Default Deny Catch-All)
    // =========================================================================
    match /{document=**} {
      allow read, write: if false;
    }

    // =========================================================================
    // دوال التحقق والأمان الأساسية (Security & Anti-Cheat Helpers)
    // =========================================================================
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    function incoming() {
      return request.resource.data;
    }

    function existing() {
      return resource.data;
    }

    function isValidId(id) {
      return id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_.\\\\-]+$');
    }

    function isValidParticipantsPair(listData) {
      return listData is list
        && listData.size() == 2
        && listData[0] is string
        && listData[1] is string
        && listData[0].size() >= 1
        && listData[0].size() <= 128
        && listData[1].size() >= 1
        && listData[1].size() <= 128
        && listData[0] != listData[1];
    }

    function isValidFriendRequest(data) {
      return data.keys().hasAll([
          'id',
          'fromUid',
          'fromPlayerId',
          'fromUsername',
          'fromCountryCode',
          'fromCountryName',
          'fromCountryFlag',
          'fromLevel',
          'fromRankTitle',
          'fromVipTier',
          'toUid',
          'toPlayerId',
          'toUsername',
          'toCountryCode',
          'toCountryName',
          'toCountryFlag',
          'toLevel',
          'toRankTitle',
          'toVipTier',
          'participants',
          'status',
          'createdAtMs',
          'updatedAtMs'
        ])
        && data.keys().hasOnly([
          'id',
          'fromUid',
          'fromPlayerId',
          'fromUsername',
          'fromCountryCode',
          'fromCountryName',
          'fromCountryFlag',
          'fromLevel',
          'fromRankTitle',
          'fromRankTitleEn',
          'fromVipTier',
          'toUid',
          'toPlayerId',
          'toUsername',
          'toCountryCode',
          'toCountryName',
          'toCountryFlag',
          'toLevel',
          'toRankTitle',
          'toRankTitleEn',
          'toVipTier',
          'participants',
          'status',
          'createdAtMs',
          'updatedAtMs'
        ])
        && isValidId(data.id)
        && isValidId(data.fromUid)
        && isValidId(data.toUid)
        && data.fromUid != data.toUid
        && isValidParticipantsPair(data.participants)
        && data.fromUid in data.participants
        && data.toUid in data.participants
        && data.fromPlayerId is string && data.fromPlayerId.size() == 10
        && data.toPlayerId is string && data.toPlayerId.size() == 10
        && data.fromUsername is string && data.fromUsername.size() >= 2 && data.fromUsername.size() <= 30
        && data.toUsername is string && data.toUsername.size() >= 2 && data.toUsername.size() <= 30
        && data.fromCountryCode is string && data.fromCountryCode.size() >= 2 && data.fromCountryCode.size() <= 4
        && data.toCountryCode is string && data.toCountryCode.size() >= 2 && data.toCountryCode.size() <= 4
        && data.fromCountryName is string && data.fromCountryName.size() >= 1 && data.fromCountryName.size() <= 50
        && data.toCountryName is string && data.toCountryName.size() >= 1 && data.toCountryName.size() <= 50
        && data.fromCountryFlag is string && data.fromCountryFlag.size() >= 1 && data.fromCountryFlag.size() <= 16
        && data.toCountryFlag is string && data.toCountryFlag.size() >= 1 && data.toCountryFlag.size() <= 16
        && data.fromLevel is int && data.fromLevel >= 1
        && data.toLevel is int && data.toLevel >= 1
        && data.fromRankTitle is string && data.fromRankTitle.size() >= 1 && data.fromRankTitle.size() <= 40
        && data.toRankTitle is string && data.toRankTitle.size() >= 1 && data.toRankTitle.size() <= 40
        && (!('fromRankTitleEn' in data) || (data.fromRankTitleEn is string && data.fromRankTitleEn.size() <= 40))
        && (!('toRankTitleEn' in data) || (data.toRankTitleEn is string && data.toRankTitleEn.size() <= 40))
        && data.fromVipTier in ['none', 'bronze', 'silver', 'gold', 'legend']
        && data.toVipTier in ['none', 'bronze', 'silver', 'gold', 'legend']
        && data.status in ['pending', 'accepted', 'rejected']
        && data.createdAtMs is int && data.createdAtMs >= 0
        && data.updatedAtMs is int && data.updatedAtMs >= 0;
    }

    function isValidFriendship(data) {
      return data.keys().hasAll([
          'id',
          'chatId',
          'participants',
          'participantPlayerIds',
          'memberProfiles',
          'createdAtMs',
          'updatedAtMs'
        ])
        && data.keys().hasOnly([
          'id',
          'chatId',
          'participants',
          'participantPlayerIds',
          'memberProfiles',
          'createdAtMs',
          'updatedAtMs'
        ])
        && isValidId(data.id)
        && isValidId(data.chatId)
        && isValidParticipantsPair(data.participants)
        && data.participantPlayerIds is list
        && data.participantPlayerIds.size() == 2
        && data.participantPlayerIds[0] is string && data.participantPlayerIds[0].size() == 10
        && data.participantPlayerIds[1] is string && data.participantPlayerIds[1].size() == 10
        && data.memberProfiles is map
        && data.createdAtMs is int && data.createdAtMs >= 0
        && data.updatedAtMs is int && data.updatedAtMs >= 0;
    }

    function isValidChatThread(data) {
      return data.keys().hasAll([
          'chatId',
          'participants',
          'updatedAtMs'
        ])
        && data.keys().hasOnly([
          'chatId',
          'participants',
          'participantPlayerIds',
          'lastMessageText',
          'lastMessageSenderUid',
          'lastMessageSenderName',
          'lastMessageAtMs',
          'unreadByUid',
          'lastReadAtMs',
          'updatedAtMs'
        ])
        && isValidId(data.chatId)
        && isValidParticipantsPair(data.participants)
        && data.updatedAtMs is int && data.updatedAtMs >= 0
        && (!('participantPlayerIds' in data) || (data.participantPlayerIds is list && data.participantPlayerIds.size() == 2))
        && (!('lastMessageText' in data) || (data.lastMessageText is string && data.lastMessageText.size() <= 500))
        && (!('lastMessageSenderUid' in data) || (data.lastMessageSenderUid is string && data.lastMessageSenderUid.size() <= 128))
        && (!('lastMessageSenderName' in data) || (data.lastMessageSenderName is string && data.lastMessageSenderName.size() <= 40))
        && (!('lastMessageAtMs' in data) || (data.lastMessageAtMs is int && data.lastMessageAtMs >= 0))
        && (!('unreadByUid' in data) || data.unreadByUid is map)
        && (!('lastReadAtMs' in data) || data.lastReadAtMs is map);
    }

    function isValidChatMessage(data) {
      return data.keys().hasAll([
          'id',
          'threadId',
          'participants',
          'senderUid',
          'senderId',
          'receiverId',
          'text',
          'createdAtIso',
          'createdAtMs',
          'status'
        ])
        && data.keys().hasOnly([
          'id',
          'threadId',
          'participants',
          'senderUid',
          'senderId',
          'receiverUid',
          'receiverId',
          'text',
          'createdAtIso',
          'createdAtMs',
          'createdAtServer',
          'status'
        ])
        && isValidId(data.id)
        && isValidId(data.threadId)
        && isValidParticipantsPair(data.participants)
        && data.senderUid == request.auth.uid
        && request.auth.uid in data.participants
        && data.senderId is string && data.senderId.size() >= 1 && data.senderId.size() <= 32
        && data.receiverId is string && data.receiverId.size() >= 1 && data.receiverId.size() <= 32
        && (!('receiverUid' in data) || (data.receiverUid is string && data.receiverUid.size() <= 128))
        && data.text is string && data.text.size() >= 1 && data.text.size() <= 500
        && data.createdAtIso is string && data.createdAtIso.size() >= 1 && data.createdAtIso.size() <= 64
        && data.createdAtMs is int && data.createdAtMs >= 0
        && (!('createdAtServer' in data) || data.createdAtServer is timestamp)
        && data.status in ['sent', 'delivered', 'read'];
    }

    function isValidPresence(data, uid) {
      return data.keys().hasAll(['uid', 'online', 'lastSeenMs', 'updatedAtMs'])
        && data.keys().hasOnly(['uid', 'online', 'lastSeenMs', 'heartbeatAt', 'updatedAtMs'])
        && data.uid == uid
        && data.online is bool
        && data.lastSeenMs is int && data.lastSeenMs >= 0
        && (!('heartbeatAt' in data) || data.heartbeatAt is timestamp)
        && data.updatedAtMs is int && data.updatedAtMs >= 0;
    }

    // 50 يوماً بالمللي ثانية = 50 * 24 * 60 * 60 * 1000 = 4,320,000,000 مللي ثانية
    function fiftyDaysMs() {
      return 4320000000;
    }

    // التحقق من الحقول الاختيارية للبريد الإلكتروني ورقم الجوال في players/{uid}
    function hasValidOptionalContact(data) {
      let validEmail = !('email' in data) || (data.email is string && data.email.size() <= 120);
      let validPhone = !('phone' in data) || (data.phone is string && data.phone.size() <= 30);
      let validContactType = !('contactType' in data) || (data.contactType in ['phone', 'email']);
      let validContactValue = !('contactValue' in data) || (data.contactValue is string && data.contactValue.size() <= 120);
      return validEmail && validPhone && validContactType && validContactValue;
    }

    // التحقق من هيكل وصحة بيانات اللاعب الخاصة (Private Player Profile Schema)
    function isValidPlayerShape(data, uid) {
      return data.keys().hasAll([
          'uid',
          'playerId',
          'username',
          'usernameNormalized',
          'countryCode',
          'countryName',
          'countryFlag',
          'monthlyRoundPoints',
          'coins',
          'xp',
          'level',
          'rankTitle',
          'vipTier',
          'adsRemoved',
          'fairPlayScore',
          'lastProfileEditAt',
          'updatedAtMs'
        ])
        && data.uid == uid
        && data.playerId is string
        && data.playerId.size() == 10
        && data.username is string
        && data.username.size() >= 2
        && data.username.size() <= 24
        && data.usernameNormalized is string
        && data.usernameNormalized.size() >= 2
        && data.usernameNormalized.size() <= 24
        && data.countryCode is string
        && data.countryCode.size() >= 2
        && data.countryCode.size() <= 4
        && data.countryName is string
        && data.countryName.size() >= 2
        && data.countryName.size() <= 50
        && data.countryFlag is string
        && data.countryFlag.size() >= 1
        && data.countryFlag.size() <= 16
        && data.monthlyRoundPoints is int
        && data.monthlyRoundPoints >= 0
        && data.coins is int
        && data.coins >= 0
        && data.xp is int
        && data.xp >= 0
        && data.level is int
        && data.level >= 1
        && data.rankTitle is string
        && data.rankTitle.size() >= 1
        && data.rankTitle.size() <= 40
        && data.vipTier in ['none', 'bronze', 'silver', 'gold', 'legend']
        && data.adsRemoved is bool
        && data.fairPlayScore is int
        && data.fairPlayScore >= 0
        && data.fairPlayScore <= 100
        && data.lastProfileEditAt is int
        && data.lastProfileEditAt >= 0
        && data.updatedAtMs is int
        && data.updatedAtMs >= 0
        && hasValidOptionalContact(data);
    }

    // التحقق من هيكل البيانات العامة فقط في قائمة المتصدرين (بدون إيميل أو جوال أو عملات أو سجل نزاهة)
    function isValidPublicLeaderboardShape(data, uid) {
      let hasNoSensitiveFields = !('email' in data)
        && !('phone' in data)
        && !('contactType' in data)
        && !('contactValue' in data)
        && !('coins' in data)
        && !('fairPlayScore' in data);

      return hasNoSensitiveFields
        && data.keys().hasAll([
          'uid',
          'playerId',
          'username',
          'countryCode',
          'countryName',
          'countryFlag',
          'monthlyRoundPoints',
          'level',
          'rankTitle',
          'vipTier',
          'updatedAtMs'
        ])
        && data.uid == uid
        && data.playerId is string
        && data.playerId.size() == 10
        && data.username is string
        && data.username.size() >= 2
        && data.username.size() <= 24
        && data.countryCode is string
        && data.countryCode.size() >= 2
        && data.countryCode.size() <= 4
        && data.countryName is string
        && data.countryName.size() >= 2
        && data.countryName.size() <= 50
        && data.countryFlag is string
        && data.countryFlag.size() >= 1
        && data.countryFlag.size() <= 16
        && data.monthlyRoundPoints is int
        && data.monthlyRoundPoints >= 0
        && data.level is int
        && data.level >= 1
        && data.rankTitle is string
        && data.rankTitle.size() >= 1
        && data.rankTitle.size() <= 40
        && data.vipTier in ['none', 'bronze', 'silver', 'gold', 'legend']
        && data.updatedAtMs is int
        && data.updatedAtMs >= 0;
    }

    // التحقق من عدم تجاوز الحد الأقصى لزيادة النقاط (+2 نقطة فقط في التحديث الواحد للجولة)
    function isValidPointsDelta() {
      return incoming().monthlyRoundPoints >= existing().monthlyRoundPoints
        && (incoming().monthlyRoundPoints - existing().monthlyRoundPoints) <= 2;
    }

    // منع تكرار إرسال تحديثات النقاط الوهمية (Rate Limiting: فاصل 25 ثانية على الأقل بين كل تحديث جولة وآخر)
    function isValidPointsRateLimit() {
      let pointsIncreased = incoming().monthlyRoundPoints > existing().monthlyRoundPoints;
      return !pointsIncreased || (
        incoming().updatedAtMs == request.time.toMillis()
        && (request.time.toMillis() - existing().updatedAtMs) >= 25000
      );
    }

    // قصر الزيادة المسموحة للعملات من العميل على مكافآت اللعب اليومية فقط (coinDiff <= 120)
    function isValidCoinsDelta() {
      let coinDiff = incoming().coins - existing().coins;
      return coinDiff <= 120;
    }

    // التحقق من مرور 50 يوماً (4,320,000,000 مللي ثانية) عند تغيير الاسم أو الدولة
    function isValidIdentityChangeCooldown() {
      let identityUnchanged = incoming().username == existing().username
        && incoming().usernameNormalized == existing().usernameNormalized
        && incoming().countryCode == existing().countryCode
        && incoming().lastProfileEditAt == existing().lastProfileEditAt;

      let cooldownElapsed = (existing().lastProfileEditAt == 0
          || (request.time.toMillis() - existing().lastProfileEditAt) >= fiftyDaysMs())
        && incoming().lastProfileEditAt >= existing().lastProfileEditAt;

      return identityUnchanged || cooldownElapsed;
    }

    // منع التلاعب بسجل النزاهة (لا يمكن للاعب رفع fairPlayScore أبداً)
    function isValidFairPlayScoreUpdate() {
      return incoming().fairPlayScore <= existing().fairPlayScore
        && incoming().fairPlayScore >= 0;
    }

    // =========================================================================
    // 1. مجموعة اللاعبين الخاصة (محمية لصاحب الحساب فقط): /players/{uid}
    // =========================================================================
    match /players/{uid} {
      allow read: if isOwner(uid);

      allow create: if isOwner(uid)
        && isValidId(uid)
        && isValidPlayerShape(incoming(), uid)
        && incoming().vipTier == 'none'
        && incoming().adsRemoved == false
        && incoming().monthlyRoundPoints <= 2
        && incoming().coins <= 100
        && incoming().fairPlayScore == 100;

      allow update: if isOwner(uid)
        && isValidId(uid)
        && isValidPlayerShape(incoming(), uid)
        && incoming().uid == existing().uid
        && incoming().playerId == existing().playerId
        && incoming().vipTier == existing().vipTier
        && incoming().adsRemoved == existing().adsRemoved
        && isValidPointsDelta()
        && isValidPointsRateLimit()
        && isValidCoinsDelta()
        && isValidIdentityChangeCooldown()
        && isValidFairPlayScoreUpdate();

      allow delete: if false;
    }

    // =========================================================================
    // 2. مجموعة قائمة المتصدرين العامة (للقراءة العامة بدون بيانات حساسة): /leaderboard_public/{uid}
    // =========================================================================
    match /leaderboard_public/{uid} {
      allow read: if isSignedIn();

      allow create: if isOwner(uid)
        && isValidId(uid)
        && isValidPublicLeaderboardShape(incoming(), uid)
        && incoming().vipTier == 'none'
        && incoming().monthlyRoundPoints <= 2;

      allow update: if isOwner(uid)
        && isValidId(uid)
        && isValidPublicLeaderboardShape(incoming(), uid)
        && incoming().uid == existing().uid
        && incoming().playerId == existing().playerId
        && incoming().vipTier == existing().vipTier
        && isValidPointsDelta()
        && isValidPointsRateLimit();

      allow delete: if false;
    }

    // =========================================================================
    // 3. مجموعة حجز الأسماء ومنع التكرار عالمياً: /usernames/{nameNormalized}
    // =========================================================================
    match /usernames/{nameNormalized} {
      allow read: if true;

      allow create: if isSignedIn()
        && incoming().keys().hasAll(['uid', 'playerId', 'username', 'createdAt'])
        && incoming().uid == request.auth.uid
        && incoming().playerId is string
        && incoming().playerId.size() == 10
        && incoming().username is string
        && incoming().username.size() >= 2
        && incoming().username.size() <= 24;

      allow update: if isSignedIn()
        && existing().uid == request.auth.uid
        && incoming().uid == request.auth.uid;

      allow delete: if isSignedIn()
        && existing().uid == request.auth.uid;
    }

    // =========================================================================
    // 4. مجموعة طلبات الصداقة الفورية: /friend_requests/{requestId}
    // =========================================================================
    match /friend_requests/{requestId} {
      allow get: if isSignedIn()
        && isValidId(requestId)
        && (resource == null || request.auth.uid in existing().participants);

      allow list: if isSignedIn()
        && request.auth.uid in existing().participants;

      allow create: if isSignedIn()
        && isValidId(requestId)
        && isValidFriendRequest(incoming())
        && incoming().fromUid == request.auth.uid
        && incoming().status == 'pending';

      allow update: if isSignedIn()
        && isValidId(requestId)
        && isValidFriendRequest(incoming())
        && incoming().id == existing().id
        && incoming().fromUid == existing().fromUid
        && incoming().toUid == existing().toUid
        && incoming().participants == existing().participants
        && incoming().createdAtMs == existing().createdAtMs
        && (
          (existing().toUid == request.auth.uid
            && existing().status == 'pending'
            && incoming().status in ['accepted', 'rejected']
            && incoming().diff(existing()).affectedKeys().hasOnly(['status', 'updatedAtMs']))
          || (existing().fromUid == request.auth.uid
            && existing().status == 'rejected'
            && incoming().status == 'pending'
            && incoming().diff(existing()).affectedKeys().hasOnly(['status', 'updatedAtMs']))
        );

      allow delete: if isSignedIn()
        && isValidId(requestId)
        && (existing().fromUid == request.auth.uid || existing().toUid == request.auth.uid);
    }

    // =========================================================================
    // 5. مجموعة الصداقات المتبادلة المؤكدة: /friendships/{friendshipId}
    // =========================================================================
    match /friendships/{friendshipId} {
      allow get: if isSignedIn()
        && isValidId(friendshipId)
        && (resource == null || request.auth.uid in existing().participants);

      allow list: if isSignedIn()
        && request.auth.uid in existing().participants;

      allow create: if isSignedIn()
        && isValidId(friendshipId)
        && isValidFriendship(incoming())
        && request.auth.uid in incoming().participants;

      allow update: if isSignedIn()
        && isValidId(friendshipId)
        && isValidFriendship(incoming())
        && request.auth.uid in existing().participants
        && incoming().id == existing().id
        && incoming().chatId == existing().chatId
        && incoming().participants == existing().participants
        && incoming().createdAtMs == existing().createdAtMs
        && incoming().diff(existing()).affectedKeys().hasOnly(['memberProfiles', 'updatedAtMs']);

      allow delete: if isSignedIn()
        && isValidId(friendshipId)
        && request.auth.uid in existing().participants;
    }

    // =========================================================================
    // 6. مجموعة الدردشة الخاصة المحمية بالمشاركين فقط: /chats/{chatId} و /messages/{messageId}
    // =========================================================================
    match /chats/{chatId} {
      allow get: if isSignedIn()
        && isValidId(chatId)
        && (resource == null || request.auth.uid in existing().participants);

      allow list: if isSignedIn()
        && request.auth.uid in existing().participants;

      allow create: if isSignedIn()
        && isValidId(chatId)
        && isValidChatThread(incoming())
        && request.auth.uid in incoming().participants;

      allow update: if isSignedIn()
        && isValidId(chatId)
        && isValidChatThread(incoming())
        && request.auth.uid in existing().participants
        && incoming().chatId == existing().chatId
        && incoming().participants == existing().participants
        && incoming().diff(existing()).affectedKeys().hasOnly([
          'participantPlayerIds',
          'lastMessageText',
          'lastMessageSenderUid',
          'lastMessageSenderName',
          'lastMessageAtMs',
          'unreadByUid',
          'lastReadAtMs',
          'updatedAtMs'
        ]);

      allow delete: if false;

      match /messages/{messageId} {
        allow get: if isSignedIn()
          && isValidId(chatId)
          && isValidId(messageId)
          && (resource == null || request.auth.uid in existing().participants);

        allow list: if isSignedIn()
          && request.auth.uid in existing().participants;

        allow create: if isSignedIn()
          && isValidId(chatId)
          && isValidId(messageId)
          && isValidChatMessage(incoming())
          && exists(/databases/$(database)/documents/chats/$(chatId))
          && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;

        allow update: if isSignedIn()
          && isValidId(chatId)
          && isValidId(messageId)
          && request.auth.uid in existing().participants
          && incoming().id == existing().id
          && incoming().threadId == existing().threadId
          && incoming().participants == existing().participants
          && incoming().senderUid == existing().senderUid
          && incoming().senderId == existing().senderId
          && incoming().receiverId == existing().receiverId
          && incoming().text == existing().text
          && incoming().createdAtIso == existing().createdAtIso
          && incoming().createdAtMs == existing().createdAtMs
          && incoming().status in ['sent', 'delivered', 'read']
          && incoming().diff(existing()).affectedKeys().hasOnly(['status']);

        allow delete: if false;
      }
    }

    // =========================================================================
    // 7. مجموعة طلبات التحقق الخادمي من إيصالات شراء VIP: /vip_verifications/{receiptId}
    // =========================================================================
    match /vip_verifications/{receiptId} {
      allow read: if isSignedIn() && existing().uid == request.auth.uid;

      allow create: if isSignedIn()
        && isValidId(receiptId)
        && incoming().uid == request.auth.uid
        && incoming().playerId is string
        && incoming().playerId.size() == 10
        && incoming().tier in ['bronze', 'silver', 'gold', 'legend']
        && incoming().storeProvider in ['google_play', 'app_store']
        && incoming().status == 'pending_server_verification';

      allow update, delete: if false;
    }

    // =========================================================================
    // 8. مجموعة تذاكر خدمة العملاء والدعم الفني: /support_tickets/{ticketId}
    // =========================================================================
    match /support_tickets/{ticketId} {
      allow read: if isSignedIn() && existing().uid == request.auth.uid;

      allow create: if isSignedIn()
        && isValidId(ticketId)
        && incoming().uid == request.auth.uid
        && incoming().playerId is string
        && incoming().playerId.size() == 10
        && incoming().username is string
        && incoming().username.size() >= 2
        && incoming().username.size() <= 30
        && incoming().subject is string
        && incoming().subject.size() >= 1
        && incoming().subject.size() <= 120
        && incoming().message is string
        && incoming().message.size() >= 2
        && incoming().message.size() <= 2000;

      allow update, delete: if false;
    }

    // =========================================================================
    // 9. مجموعة حالة الاتصال الفورية للأصدقاء: /presence/{uid}
    // =========================================================================
    match /presence/{uid} {
      allow get: if isSignedIn() && isValidId(uid);
      allow list: if false;

      allow create: if isOwner(uid)
        && isValidId(uid)
        && isValidPresence(incoming(), uid);

      allow update: if isOwner(uid)
        && isValidId(uid)
        && isValidPresence(incoming(), uid)
        && incoming().uid == existing().uid
        && incoming().diff(existing()).affectedKeys().hasOnly([
          'online',
          'lastSeenMs',
          'heartbeatAt',
          'updatedAtMs'
        ]);

      allow delete: if false;
    }

    // =========================================================================
    // 10. وثيقة فحص الاتصال السحابي: /test/connection
    // =========================================================================
    match /test/connection {
      allow read: if true;
      allow write: if false;
    }
  }
}`;

