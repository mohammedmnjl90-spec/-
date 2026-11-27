/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  AppLanguage,
  CategoryInfo,
  ChatThreadMeta,
  CountryInfo,
  FriendContact,
  FriendRequest,
  LifelinesInventory,
  PlayerProfile,
  SupportTicketCategory,
  UserPresence,
  VipTier,
} from './types/game';
import { CATEGORIES, getDifficultyTierForPoints } from './data/questions';
import {
  calculateLevelAndRank,
  CloudSyncStatus,
  getVipMultiplier,
  isAdminProfile,
  normalizeUsernameKey,
  storageRepo,
} from './services/storageRepository';
import { soundEngine } from './utils/sound';
import {
  applyDocumentLanguageDirection,
  detectInitialLanguage,
  getCategoryName,
  getCategorySubtitle,
  saveLanguagePreference,
  tr,
} from './utils/i18n';
import { SplashAndOnboarding } from './components/SplashAndOnboarding';
import { AuthModal } from './components/AuthModal';
import { ArenaMatchView } from './components/ArenaMatchView';
import {
  DailyBossModal,
  DailyMissionsModal,
  SpinSegment,
  SpinWheelModal,
} from './components/DailyFeaturesModals';
import { LeaderboardAndPrizesView } from './components/LeaderboardAndPrizesView';
import { StoreAndVipView } from './components/StoreAndVipView';
import { ProfileAndSettingsView } from './components/ProfileAndSettingsView';
import { FriendsAndChatView } from './components/FriendsAndChatView';
import { CustomerSupportModal } from './components/CustomerSupportModal';
import { FirebaseSecurityModal } from './components/FirebaseSecurityModal';
import { ConnectionIndicator } from './components/ConnectionIndicator';
import { OfflineBlockingOverlay } from './components/OfflineBlockingOverlay';
import { InterstitialAdModal } from './components/AdModals';
import {
  AppClosedScreen,
  ExitGameConfirmModal,
  LogoutConfirmModal,
  triggerNativeAppExit,
} from './components/ActionConfirmModals';
import { auth, ensureFirebaseAuthSession, testFirestoreConnection } from './firebaseConfig';
import {
  BookOpen,
  Moon,
  HeartPulse,
  Cpu,
  Trophy,
  Feather,
  FlaskConical,
  Landmark,
  Compass,
  Globe2,
  Calculator,
  Atom,
  Sparkles,
  Gift,
  Flame,
  Target,
  Coins,
  Play,
  Crown,
  Zap,
  MessageCircle,
  Users,
  Cloud,
  CloudOff,
  AlertCircle,
  Bell,
  UserPlus,
  UserCheck,
  X,
} from 'lucide-react';

type MainTab = 'arena' | 'friends' | 'leaderboard' | 'store' | 'profile';

function renderCategoryIcon(iconName: string, className: string) {
  switch (iconName) {
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Moon':
      return <Moon className={className} />;
    case 'HeartPulse':
      return <HeartPulse className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'Trophy':
      return <Trophy className={className} />;
    case 'Feather':
      return <Feather className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'Landmark':
      return <Landmark className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'Globe2':
      return <Globe2 className={className} />;
    case 'Calculator':
      return <Calculator className={className} />;
    case 'Atom':
      return <Atom className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile | null>(() =>
    storageRepo.loadProfile()
  );
  const [lang, setLang] = useState<AppLanguage>(
    () => storageRepo.loadProfile()?.settings.language || detectInitialLanguage()
  );
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [authInitialMode, setAuthInitialMode] = useState<'splash' | 'auth'>('splash');
  const [activeTab, setActiveTab] = useState<MainTab>('arena');
  const [activeMatchCategory, setActiveMatchCategory] = useState<CategoryInfo | null>(null);
  const [pressedCategoryId, setPressedCategoryId] = useState<string | null>(null);

  // Modals: Daily features, Customer Support, Firebase Security Rules, Auth Modal, Logout Confirmation, Exit Game Confirmation
  const [openModal, setOpenModal] = useState<
    | 'spin'
    | 'boss'
    | 'missions'
    | 'support'
    | 'firebase_security'
    | 'auth_modal'
    | 'logout_confirm'
    | 'exit_confirm'
    | null
  >(null);
  const [showHourlyInterstitialAd, setShowHourlyInterstitialAd] = useState<boolean>(false);
  const [interstitialAdPending, setInterstitialAdPending] = useState<boolean>(false);
  const [isAppClosed, setIsAppClosed] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(() =>
    storageRepo.getCloudStatus()
  );
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true
  );
  const [isCheckingNetwork, setIsCheckingNetwork] = useState<boolean>(false);
  const [retryFailedCount, setRetryFailedCount] = useState<number>(0);

  // Reactive Firebase Auth UID & Global Real-Time Social State (Friend Requests, Mutual Friendships, Instant Chat Metadata)
  const [authUid, setAuthUid] = useState<string | null>(() => auth.currentUser?.uid ?? null);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<FriendRequest[]>([]);
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState<FriendRequest[]>([]);
  const [cloudFriends, setCloudFriends] = useState<FriendContact[]>([]);
  const [presenceByUid, setPresenceByUid] = useState<Record<string, UserPresence>>({});
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState<number>(0);
  const [presenceNowMs, setPresenceNowMs] = useState<number>(() => Date.now());
  const [chatsMetaByChatId, setChatsMetaByChatId] = useState<Record<string, ChatThreadMeta>>({});
  const [requestedChatFriendUid, setRequestedChatFriendUid] = useState<string | null>(null);
  const [socialToast, setSocialToast] = useState<{
    id: string;
    kind: 'friend_request' | 'new_message' | 'friend_accepted';
    title: string;
    body: string;
    targetFriendUid?: string;
  } | null>(null);

  const activeChatFriendUidRef = useRef<string | null>(null);
  const activeTabRef = useRef<MainTab>(activeTab);
  const openModalRef = useRef(openModal);
  const profileRef = useRef<PlayerProfile | null>(profile);
  const activePlaySecondsRef = useRef<number>(profile?.activePlaySeconds || 0);
  const lastVerifiedOnlineAtRef = useRef<number>(0);
  const wasOfflineRef = useRef<boolean>(false);
  const [isVerifyingMatchConnection, setIsVerifyingMatchConnection] = useState<boolean>(false);

  const seenIncomingReqIdsRef = useRef<Set<string>>(new Set());
  const initializedReqsRef = useRef<boolean>(false);
  const seenFriendUidsRef = useRef<Set<string>>(new Set());
  const initializedFriendsRef = useRef<boolean>(false);
  const lastNotifiedChatMsgAtRef = useRef<Record<string, number>>({});
  const initializedChatsRef = useRef<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    openModalRef.current = openModal;
  }, [openModal]);

  useEffect(() => {
    profileRef.current = profile;
    if (profile && typeof profile.activePlaySeconds === 'number') {
      activePlaySecondsRef.current = Math.max(
        activePlaySecondsRef.current,
        profile.activePlaySeconds
      );
    }
  }, [profile]);

  // Keep authUid synchronized AND immediately hydrate authoritative cloud profile (username, points, country)
  // whenever Firebase Auth signs in or restores a session — unified single source of truth across all views!
  useEffect(() => {
    let active = true;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      const nextUid = user?.uid ?? null;
      setAuthUid(nextUid);

      if (!nextUid) return;

      const currentLocal = profileRef.current;
      const needsHydration =
        !currentLocal ||
        currentLocal.uid !== nextUid ||
        !currentLocal.username ||
        currentLocal.username.trim().length < 2;

      void storageRepo
        .hydrateProfileFromCloud(nextUid, currentLocal)
        .then((hydrated) => {
          if (!active || !hydrated) return;
          if (
            needsHydration ||
            !currentLocal ||
            hydrated.username !== currentLocal.username ||
            hydrated.monthlyPoints !== currentLocal.monthlyPoints ||
            hydrated.coins !== currentLocal.coins
          ) {
            setProfile(hydrated);
          }
        });
    });
    return () => {
      active = false;
      unsubAuth();
    };
  }, []);

  const showSocialToast = useCallback(
    (payload: {
      id: string;
      kind: 'friend_request' | 'new_message' | 'friend_accepted';
      title: string;
      body: string;
      targetFriendUid?: string;
    }) => {
      setSocialToast(payload);
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setSocialToast((curr) => (curr?.id === payload.id ? null : curr));
      }, 7500);
    },
    []
  );

  const verifyOnlineConnectivity = useCallback(
    async (isManualRetry = false) => {
      const browserNowOnline =
        typeof navigator !== 'undefined' ? navigator.onLine !== false : true;

      if (!browserNowOnline) {
        wasOfflineRef.current = true;
        setIsOnline(false);
        if (isManualRetry) {
          setRetryFailedCount((prev) => prev + 1);
        }
        storageRepo.setCloudStatus(
          false,
          lang === 'en' ? 'No internet connection' : 'لا يوجد اتصال بالإنترنت',
          true
        );
        return false;
      }

      if (isManualRetry) {
        setIsCheckingNetwork(true);
      }

      try {
        let check = await testFirestoreConnection(6000);

        // 2-strike resilience on background probes: avoid false offline drops from a single slow mobile packet
        if (!check.connected && !isManualRetry) {
          await new Promise((resolve) => window.setTimeout(resolve, 1500));
          const stillBrowserOnline =
            typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
          if (stillBrowserOnline) {
            check = await testFirestoreConnection(6000);
          }
        }

        if (check.connected) {
          const recoveredFromOffline = wasOfflineRef.current;
          wasOfflineRef.current = false;
          lastVerifiedOnlineAtRef.current = Date.now();
          setIsOnline(true);
          setRetryFailedCount(0);
          storageRepo.setCloudStatus(true, null, false);
          const sessionUid = await ensureFirebaseAuthSession();

          // On reconnection after weak/dropped internet, flush pending points & refresh cloud truth
          if (recoveredFromOffline && profileRef.current) {
            void storageRepo.flushPendingCloudSync(profileRef.current).then(() => {
              if (sessionUid) {
                void storageRepo
                  .hydrateProfileFromCloud(sessionUid, profileRef.current)
                  .then((hydrated) => {
                    if (hydrated) setProfile(hydrated);
                  });
              }
            });
          }
          return true;
        }

        wasOfflineRef.current = true;
        setIsOnline(false);
        if (isManualRetry) {
          setRetryFailedCount((prev) => prev + 1);
        }
        storageRepo.setCloudStatus(
          false,
          check.errorDetail ||
            (lang === 'en' ? 'No internet connection' : 'لا يوجد اتصال بالإنترنت'),
          true
        );
        return false;
      } finally {
        if (isManualRetry) {
          setIsCheckingNetwork(false);
        }
      }
    },
    [lang]
  );

  // Real-time network & Firebase cloud monitoring (instant events + 15-second heartbeat)
  useEffect(() => {
    const unsubCloud = storageRepo.subscribeToCloudStatus((nextStatus) => {
      setCloudStatus(nextStatus);
      if (nextStatus.isNetworkOffline) {
        setIsOnline(false);
      }
    });

    // Immediate connectivity check on app launch
    void verifyOnlineConnectivity(false);

    const handleOnline = () => {
      void verifyOnlineConnectivity(false);
    };

    const handleOffline = () => {
      wasOfflineRef.current = true;
      setIsOnline(false);
      storageRepo.setCloudStatus(
        false,
        lang === 'en' ? 'No internet connection' : 'لا يوجد اتصال بالإنترنت',
        true
      );
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void verifyOnlineConnectivity(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const navWithConnection = navigator as Navigator & {
      connection?: EventTarget;
    };
    const netConn = navWithConnection.connection;
    if (netConn && typeof netConn.addEventListener === 'function') {
      netConn.addEventListener('change', handleOnline);
    }

    // Periodic 15-second cloud reachability heartbeat
    const heartbeatTimer = window.setInterval(() => {
      if (!document.hidden) {
        void verifyOnlineConnectivity(false);
      }
    }, 15000);

    return () => {
      unsubCloud();
      window.clearInterval(heartbeatTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (netConn && typeof netConn.removeEventListener === 'function') {
        netConn.removeEventListener('change', handleOnline);
      }
    };
  }, [lang, verifyOnlineConnectivity]);

  // Subscribe to real-time support tickets from Firestore for the current player
  useEffect(() => {
    if (!profile || !authUid) return;
    void storageRepo.syncProfileToFirestore(profile);
    const unsubTickets = storageRepo.subscribeToSupportTickets((cloudTickets) => {
      if (cloudTickets.length === 0) return;
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          supportTickets: cloudTickets,
        };
      });
    });
    return () => unsubTickets();
  }, [profile?.playerId, authUid]);

  // Global real-time subscriptions for Friend Requests, Mutual Friendships, and Instant Chat Unread Alerts
  useEffect(() => {
    if (!authUid || !profile) {
      setIncomingFriendRequests([]);
      setOutgoingFriendRequests([]);
      setCloudFriends([]);
      setPresenceByUid({});
      setChatsMetaByChatId({});
      seenIncomingReqIdsRef.current = new Set();
      initializedReqsRef.current = false;
      seenFriendUidsRef.current = new Set();
      initializedFriendsRef.current = false;
      lastNotifiedChatMsgAtRef.current = {};
      initializedChatsRef.current = false;
      return;
    }

    const unsubRequests = storageRepo.subscribeToFriendRequests(
      authUid,
      ({ incoming, outgoing }) => {
        setIncomingFriendRequests(incoming);
        setOutgoingFriendRequests(outgoing);

        if (!initializedReqsRef.current) {
          initializedReqsRef.current = true;
          incoming.forEach((req) => seenIncomingReqIdsRef.current.add(req.id));
          if (incoming.length > 0) {
            const latest = incoming[0];
            showSocialToast({
              id: `req_init_${latest.id}_${Date.now()}`,
              kind: 'friend_request',
              title: tr(lang, 'لديك طلب صداقة جديد!', 'New Friend Request!'),
              body:
                incoming.length === 1
                  ? tr(
                      lang,
                      `أرسل لك «${latest.fromUsername}» طلب صداقة. اضغط للقبول أو الرفض.`,
                      `"${latest.fromUsername}" sent you a friend request.`
                    )
                  : tr(
                      lang,
                      `لديك ${incoming.length} طلبات صداقة جديدة بانتظار ردّك.`,
                      `You have ${incoming.length} pending friend requests.`
                    ),
            });
          }
          return;
        }

        // Detect newly arrived incoming friend requests in real time
        const brandNew = incoming.filter((req) => !seenIncomingReqIdsRef.current.has(req.id));
        incoming.forEach((req) => seenIncomingReqIdsRef.current.add(req.id));

        if (brandNew.length > 0) {
          const newest = brandNew[0];
          soundEngine.playReward();
          showSocialToast({
            id: `req_${newest.id}_${Date.now()}`,
            kind: 'friend_request',
            title: tr(lang, 'طلب صداقة جديد!', 'New Friend Request!'),
            body: tr(
              lang,
              `أرسل لك «${newest.fromUsername}» ${newest.fromCountryFlag || ''} طلب صداقة جديد.`,
              `"${newest.fromUsername}" ${newest.fromCountryFlag || ''} sent you a friend request.`
            ),
          });
        }
      }
    );

    const unsubFriendships = storageRepo.subscribeToFriendships(authUid, (nextFriends) => {
      setCloudFriends(nextFriends);

      if (!initializedFriendsRef.current) {
        initializedFriendsRef.current = true;
        nextFriends.forEach((f) => {
          if (f.uid) seenFriendUidsRef.current.add(f.uid);
        });
        return;
      }

      const newlyAdded = nextFriends.filter(
        (f) => f.uid && !seenFriendUidsRef.current.has(f.uid)
      );
      nextFriends.forEach((f) => {
        if (f.uid) seenFriendUidsRef.current.add(f.uid);
      });

      if (newlyAdded.length > 0) {
        const newestFriend = newlyAdded[0];
        soundEngine.playReward();
        showSocialToast({
          id: `friend_acc_${newestFriend.uid}_${Date.now()}`,
          kind: 'friend_accepted',
          title: tr(lang, 'تمت إضافة صديق جديد!', 'New Friend Added!'),
          body: tr(
            lang,
            `أصبحت أنت و«${newestFriend.username}» أصدقاء الآن! يمكنك بدء الدردشة فوراً.`,
            `You and "${newestFriend.username}" are now friends! Start chatting now.`
          ),
          targetFriendUid: newestFriend.uid,
        });
      }
    });

    const unsubChats = storageRepo.subscribeToUserChatsMetadata(authUid, (nextChats) => {
      setChatsMetaByChatId(nextChats);

      if (!initializedChatsRef.current) {
        initializedChatsRef.current = true;
        Object.values(nextChats).forEach((meta) => {
          lastNotifiedChatMsgAtRef.current[meta.chatId] = meta.lastMessageAtMs || 0;
        });
        return;
      }

      Object.values(nextChats).forEach((meta) => {
        const prevAt = lastNotifiedChatMsgAtRef.current[meta.chatId] || 0;
        const currAt = meta.lastMessageAtMs || 0;
        if (currAt > prevAt) {
          lastNotifiedChatMsgAtRef.current[meta.chatId] = currAt;

          const senderUid = meta.lastMessageSenderUid;
          const unreadForMe = Number(meta.unreadByUid?.[authUid] || 0);
          const isViewingThisChat =
            activeTabRef.current === 'friends' &&
            activeChatFriendUidRef.current === senderUid;

          if (senderUid && senderUid !== authUid && unreadForMe > 0 && !isViewingThisChat) {
            soundEngine.playClick();
            const senderLabel =
              meta.lastMessageSenderName || tr(lang, 'صديقك', 'Your friend');
            showSocialToast({
              id: `msg_${meta.chatId}_${currAt}`,
              kind: 'new_message',
              title: tr(lang, `رسالة جديدة من ${senderLabel}`, `New message from ${senderLabel}`),
              body: meta.lastMessageText || tr(lang, 'أرسل لك رسالة جديدة', 'Sent you a message'),
              targetFriendUid: senderUid,
            });
          }
        }
      });
    });

    return () => {
      unsubRequests();
      unsubFriendships();
      unsubChats();
    };
  }, [authUid, profile?.playerId, lang, showSocialToast]);

  // Publish genuine real-time presence heartbeat (`/presence/{authUid}`) & track Firestore server clock offset
  useEffect(() => {
    if (!authUid || !profile) return;

    const publishNow = (onlineState: boolean) => {
      void storageRepo.updateMyPresenceAsync(authUid, onlineState);
    };

    if (!isOnline) {
      publishNow(false);
      return;
    }

    const isVisible = typeof document === 'undefined' || document.visibilityState === 'visible';
    publishNow(isVisible);

    const unsubClockOffset = storageRepo.subscribeToMyPresenceClockOffset(
      authUid,
      (offsetMs) => {
        setServerClockOffsetMs(offsetMs);
      }
    );

    const heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        publishNow(true);
      }
    }, 25000);

    const handleVisibilityChange = () => {
      publishNow(document.visibilityState === 'visible');
    };

    const handlePageExit = () => {
      publishNow(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('beforeunload', handlePageExit);

    return () => {
      unsubClockOffset();
      window.clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('beforeunload', handlePageExit);
    };
  }, [authUid, profile?.playerId, isOnline]);

  // Local 15-second freshness ticker ONLY when Friends tab is active (prevents unnecessary global re-renders)
  useEffect(() => {
    const ticker = window.setInterval(() => {
      if (activeTabRef.current === 'friends') {
        setPresenceNowMs(Date.now());
      }
    }, 15000);
    return () => window.clearInterval(ticker);
  }, []);

  const friendUidsKey = useMemo(
    () =>
      cloudFriends
        .map((f) => f.uid || '')
        .filter(Boolean)
        .sort()
        .join(','),
    [cloudFriends]
  );

  // Subscribe to real-time `/presence/{friendUid}` docs for every confirmed friend
  useEffect(() => {
    if (!authUid || !friendUidsKey) {
      setPresenceByUid({});
      return;
    }
    const uids = friendUidsKey.split(',').filter(Boolean);
    const unsubPresence = storageRepo.subscribeToFriendsPresence(uids, (nextPresence) => {
      setPresenceByUid(nextPresence);
      setPresenceNowMs(Date.now());
    });
    return () => unsubPresence();
  }, [authUid, friendUidsKey]);

  // Combine confirmed mutual friendships with live clock-skew-adjusted online/offline presence
  const friendsWithLivePresence = useMemo(() => {
    const ONLINE_FRESHNESS_MS = 70_000;
    return cloudFriends.map((friend) => {
      const p = friend.uid ? presenceByUid[friend.uid] : undefined;
      if (!p) {
        return { ...friend, isOnline: false, lastSeenMs: undefined };
      }
      const adjustedNowMs = presenceNowMs + serverClockOffsetMs;
      const isTrulyOnline = Boolean(
        p.online &&
          (p.heartbeatServerMs
            ? adjustedNowMs - p.heartbeatServerMs < ONLINE_FRESHNESS_MS
            : p.lastSeenMs > 0 && presenceNowMs - p.lastSeenMs < ONLINE_FRESHNESS_MS)
      );
      return {
        ...friend,
        isOnline: isTrulyOnline,
        lastSeenMs: p.heartbeatServerMs || p.lastSeenMs || undefined,
      };
    });
  }, [cloudFriends, presenceByUid, presenceNowMs, serverClockOffsetMs]);

  // Apply RTL/LTR document direction whenever language changes
  useEffect(() => {
    applyDocumentLanguageDirection(lang);
    saveLanguagePreference(lang);
  }, [lang]);

  const soundEnabled = profile?.settings.soundEnabled;
  const vibrationEnabled = profile?.settings.vibrationEnabled;
  const profileLangSetting = profile?.settings.language;
  const hasProfile = Boolean(profile);
  const hasActiveMatch = Boolean(activeMatchCategory);

  useEffect(() => {
    if (soundEnabled !== undefined && vibrationEnabled !== undefined) {
      soundEngine.configure(soundEnabled, vibrationEnabled);
    }
    if (profileLangSetting && profileLangSetting !== lang) {
      setLang(profileLangSetting);
    }
  }, [soundEnabled, vibrationEnabled, profileLangSetting, lang]);

  // Track active playtime via a Ref (ZERO 1-second React state churn / ZERO input disruption!)
  useEffect(() => {
    if (showSplash || !hasProfile || isAppClosed || !isOnline) return;

    const timer = window.setInterval(() => {
      const current = profileRef.current;
      if (!current) return;
      const nextSeconds = (activePlaySecondsRef.current || current.activePlaySeconds || 0) + 1;
      activePlaySecondsRef.current = nextSeconds;

      const completedHours = Math.floor(nextSeconds / 3600);
      const isVipOrAdsRemoved = current.adsRemoved || current.vipTier !== 'none';

      if (!isVipOrAdsRemoved && completedHours > (current.lastInterstitialHourShown || 0)) {
        setInterstitialAdPending(true);
      }

      if (nextSeconds % 30 === 0) {
        storageRepo.saveProfile(
          { ...current, activePlaySeconds: nextSeconds },
          { skipCloudSync: true }
        );
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showSplash, hasProfile, isAppClosed, isOnline]);

  // Intercept Hardware Back Button ONCE on Home Screen (never re-push on profile/tab/modal updates!)
  useEffect(() => {
    if (showSplash || !hasProfile || isAppClosed || hasActiveMatch) return;

    window.history.pushState({ midanHomeGuard: true }, '');

    const handlePopState = () => {
      if (openModalRef.current !== null) {
        setOpenModal(null);
        window.history.pushState({ midanHomeGuard: true }, '');
      } else if (activeTabRef.current !== 'arena') {
        setActiveTab('arena');
        window.history.pushState({ midanHomeGuard: true }, '');
      } else {
        setOpenModal('exit_confirm');
        window.history.pushState({ midanHomeGuard: true }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showSplash, hasProfile, isAppClosed, hasActiveMatch]);

  const handleToggleLanguage = (nextLang: AppLanguage) => {
    setLang(nextLang);
    saveLanguagePreference(nextLang);
    applyDocumentLanguageDirection(nextLang);
    if (profile) {
      const updated: PlayerProfile = {
        ...profile,
        settings: {
          ...profile.settings,
          language: nextLang,
        },
      };
      setProfile(storageRepo.saveProfile(updated));
    }
  };

  const handleAuthSuccess = (authenticatedProfile: PlayerProfile) => {
    const resolvedUid = auth.currentUser?.uid || authenticatedProfile.uid || null;
    const updatedWithCurrentLang: PlayerProfile = {
      ...authenticatedProfile,
      uid: resolvedUid || authenticatedProfile.uid,
      settings: {
        ...authenticatedProfile.settings,
        language: lang,
      },
    };
    const saved = storageRepo.saveProfile(updatedWithCurrentLang, { skipCloudSync: true });
    activePlaySecondsRef.current = saved.activePlaySeconds || 0;
    profileRef.current = saved;
    setAuthUid(resolvedUid);
    setProfile(saved);
    setShowSplash(false);
  };

  // Verify live connection readiness BEFORE starting any match
  const handleSelectCategoryCard = async (category: CategoryInfo) => {
    if (isVerifyingMatchConnection) return;

    const nowMs = Date.now();
    const isFreshlyVerified =
      isOnline && nowMs - lastVerifiedOnlineAtRef.current < 12000;

    if (!isFreshlyVerified) {
      setIsVerifyingMatchConnection(true);
      setPressedCategoryId(category.id);
      const ready = await verifyOnlineConnectivity(true);
      setIsVerifyingMatchConnection(false);
      if (!ready) {
        setPressedCategoryId(null);
        return;
      }
    }

    soundEngine.playClick();
    setPressedCategoryId(category.id);
    window.setTimeout(() => {
      setPressedCategoryId(null);
      setActiveMatchCategory(category);
    }, 140);
  };

  const handleConfirmLogoutAccount = async () => {
    const closingUid = authUid;
    if (closingUid) {
      try {
        await storageRepo.updateMyPresenceAsync(closingUid, false);
      } catch {
        // Non-blocking on logout
      }
    }
    await storageRepo.logoutCurrentProfileAsync();
    activePlaySecondsRef.current = 0;
    profileRef.current = null;
    setAuthUid(null);
    setOpenModal(null);
    setActiveMatchCategory(null);
    setActiveTab('arena');
    setIncomingFriendRequests([]);
    setOutgoingFriendRequests([]);
    setCloudFriends([]);
    setPresenceByUid({});
    setChatsMetaByChatId({});
    setSocialToast(null);
    setRequestedChatFriendUid(null);
    setProfile(null);
    setAuthInitialMode('auth');
    setShowSplash(true);
  };

  const handleConfirmExitGame = () => {
    setOpenModal(null);
    triggerNativeAppExit();
    setIsAppClosed(true);
  };

  const handleConsumeLifeline = (type: keyof LifelinesInventory): boolean => {
    if (!profile || profile.lifelines[type] <= 0) return false;
    const updated: PlayerProfile = {
      ...profile,
      lifelines: {
        ...profile.lifelines,
        [type]: profile.lifelines[type] - 1,
      },
    };
    setProfile(storageRepo.saveProfile(updated));
    return true;
  };

  const handleAwardInstantComboBonus = (coins: number, xp: number) => {
    if (!profile) return;
    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + coins,
      xp: profile.xp + xp,
    };
    setProfile(storageRepo.saveProfile(updated));
  };

  const handleRoundCompleteAdCheck = useCallback(() => {
    const current = profileRef.current;
    if (!current) return;
    const isVipOrAdsRemoved = current.adsRemoved || current.vipTier !== 'none';
    const currentPlaySecs = Math.max(
      activePlaySecondsRef.current || 0,
      current.activePlaySeconds || 0
    );
    const completedHours = Math.floor(currentPlaySecs / 3600);
    if (
      !isVipOrAdsRemoved &&
      (interstitialAdPending || completedHours > (current.lastInterstitialHourShown || 0))
    ) {
      setInterstitialAdPending(false);
      setShowHourlyInterstitialAd(true);
      const updated: PlayerProfile = {
        ...current,
        activePlaySeconds: currentPlaySecs,
        lastInterstitialHourShown: Math.max(
          completedHours,
          (current.lastInterstitialHourShown || 0) + 1
        ),
      };
      setProfile(storageRepo.saveProfile(updated));
    }
  }, [interstitialAdPending]);

  const handleRoundCompleteSync = useCallback(
    (
      roundPoints: number,
      roundCoins: number,
      roundXp: number,
      fairPlayPenalty: number,
      eventKey?: string
    ) => {
      setProfile((prev) => {
        if (!prev) return prev;
        return storageRepo.recordSingleRoundProgress(
          prev,
          roundPoints,
          roundCoins,
          roundXp,
          fairPlayPenalty,
          eventKey
        );
      });
    },
    []
  );

  const handleCompleteMatch = (result: {
    matchId?: string;
    roundScores: [number, number, number];
    officialPointsEarned: number;
    coinsEarnedInMatch: number;
    xpEarnedInMatch: number;
    maxComboInMatch: number;
    combosTriggeredCount: number;
    playedQuestionIds: string[];
    alreadySyncedRoundsInMatch?: boolean;
  }) => {
    if (!activeMatchCategory) return;
    const categoryId = activeMatchCategory.id;
    const categoryName = getCategoryName(activeMatchCategory, lang);
    setProfile((prev) => {
      if (!prev) return prev;
      return storageRepo.recordMatchCompletion(prev, {
        categoryId,
        categoryName,
        ...result,
      });
    });
  };

  const handleClaimSpinReward = (segment: SpinSegment, isPaidExtraSpin: boolean) => {
    if (!profile) return;
    const vipInfo = getVipMultiplier(profile.vipTier);
    const cost = isPaidExtraSpin ? 25 : 0;

    let addCoins = 0;
    let addXp = 0;
    const nextLifelines = { ...profile.lifelines };

    if (segment.rewardType === 'coins') {
      addCoins = Math.round(segment.amount * vipInfo.dailySpinMultiplier);
    } else if (segment.rewardType === 'xp') {
      addXp = segment.amount;
    } else if (segment.rewardType === 'lifeline' && segment.lifelineKey) {
      nextLifelines[segment.lifelineKey] += segment.amount;
    }

    const updated: PlayerProfile = {
      ...profile,
      coins: Math.max(0, profile.coins - cost + addCoins),
      xp: profile.xp + addXp,
      lifelines: nextLifelines,
      daily: {
        ...profile.daily,
        spinUsed: true,
        extraSpinsToday: isPaidExtraSpin
          ? profile.daily.extraSpinsToday + 1
          : profile.daily.extraSpinsToday,
      },
    };

    setProfile(storageRepo.saveProfile(updated));
  };

  const handleFinishDailyBoss = (won: boolean) => {
    if (!profile) return;
    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + (won ? 35 : 0),
      xp: profile.xp + (won ? 50 : 10),
      stats: {
        ...profile.stats,
        dailyBossWins: profile.stats.dailyBossWins + (won ? 1 : 0),
      },
      daily: {
        ...profile.daily,
        dailyBossAttempted: true,
        dailyBossWon: won,
      },
    };
    setProfile(storageRepo.saveProfile(updated));
  };

  const handleClaimMission = (missionId: string) => {
    if (!profile) return;
    const targetMission = profile.daily.missions.find((m) => m.id === missionId);
    if (!targetMission || targetMission.claimed || targetMission.progress < targetMission.target) {
      return;
    }

    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + targetMission.rewardCoins,
      xp: profile.xp + targetMission.rewardXp,
      daily: {
        ...profile.daily,
        missions: profile.daily.missions.map((m) =>
          m.id === missionId ? { ...m, claimed: true } : m
        ),
      },
    };
    setProfile(storageRepo.saveProfile(updated));
  };

  const handleBuyLifeline = (
    type: keyof LifelinesInventory | 'bundle_all',
    costCoins: number,
    quantity: number
  ) => {
    if (!profile || profile.coins < costCoins) return;
    const nextLifelines = { ...profile.lifelines };
    if (type === 'bundle_all') {
      nextLifelines.fiftyFifty += quantity;
      nextLifelines.freezeTime += quantity;
      nextLifelines.instantSolve += quantity;
    } else {
      nextLifelines[type] += quantity;
    }

    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins - costCoins,
      lifelines: nextLifelines,
    };
    setProfile(storageRepo.saveProfile(updated));
  };

  const handleClaimRewardedAd = () => {
    if (!profile) return;
    const updated = storageRepo.claimStoreRewardedAd(profile);
    setProfile(updated);
  };

  const handlePurchaseCoinPack = (coinAmount: number) => {
    if (!profile) return;
    const updated = storageRepo.purchaseCoinPack(profile, coinAmount);
    setProfile(updated);
  };

  const handlePurchaseVipIap = (params: {
    tier: Exclude<VipTier, 'none'>;
    productId: string;
    priceDisplay: string;
    storeProvider: 'google_play' | 'app_store';
    bonusCoins: number;
    bonusLifelinesEach: number;
  }) => {
    if (!profile) return;
    const updated = storageRepo.purchaseVipPackageIap(profile, params);
    setProfile(updated);
    setInterstitialAdPending(false);
    setShowHourlyInterstitialAd(false);
  };

  const handleSendFriendRequest = async (identifier: string) => {
    if (!profile) {
      return { ok: false as const, error: tr(lang, 'غير مسجل', 'Not logged in') };
    }
    return storageRepo.sendFriendRequestAsync(profile, identifier, lang);
  };

  const handleAcceptFriendRequest = async (request: FriendRequest) => {
    if (!profile) {
      return { ok: false as const, error: tr(lang, 'غير مسجل', 'Not logged in') };
    }
    return storageRepo.acceptFriendRequestAsync(profile, request, lang);
  };

  const handleRejectOrCancelFriendRequest = async (requestId: string) => {
    return storageRepo.rejectOrCancelFriendRequestAsync(requestId, lang);
  };

  const handleSendPrivateMessage = async (friend: FriendContact, text: string) => {
    if (!profile) {
      return { ok: false as const, error: tr(lang, 'غير مسجل', 'Not logged in') };
    }
    return storageRepo.sendPrivateChatMessageAsync(profile, friend, text, lang);
  };

  const handleMarkCloudChatAsRead = useCallback(
    (friend: FriendContact) => {
      if (!authUid) return;
      const key = storageRepo.getCloudChatKey(authUid, friend);
      if (key?.chatId) {
        void storageRepo.markCloudChatAsReadAsync(authUid, key.chatId);
      }
    },
    [authUid]
  );

  const handleActiveFriendUidChange = useCallback((friendUid: string | null) => {
    activeChatFriendUidRef.current = friendUid;
  }, []);

  const handleConnectionStatusChange = useCallback((online: boolean) => {
    if (online && profileRef.current) {
      void storageRepo.syncProfileToFirestore(profileRef.current);
    }
  }, []);

  const handleUpdateIdentity = (newUsername: string, newCountry: CountryInfo) => {
    if (!profile) return;
    const oldNorm = normalizeUsernameKey(profile.username);
    const nowIso = new Date().toISOString();
    const updated: PlayerProfile = {
      ...profile,
      username: newUsername,
      usernameNormalized: normalizeUsernameKey(newUsername),
      country: newCountry,
      lastIdentityChangeAt: nowIso,
      lastProfileEditAt: Date.now(),
    };
    setProfile(
      storageRepo.saveProfile(updated, {
        oldUsernameNormalized: oldNorm,
        isIdentityEdit: true,
      })
    );
  };

  const handleUpdateSettings = (
    soundEnabled: boolean,
    vibrationEnabled: boolean,
    language: AppLanguage
  ) => {
    if (!profile) return;
    soundEngine.configure(soundEnabled, vibrationEnabled);
    if (soundEnabled) soundEngine.playClick();
    setLang(language);
    saveLanguagePreference(language);
    applyDocumentLanguageDirection(language);
    const updated: PlayerProfile = {
      ...profile,
      settings: {
        soundEnabled,
        vibrationEnabled,
        language,
      },
    };
    setProfile(storageRepo.saveProfile(updated));
  };

  const handleCreateSupportTicket = (
    category: SupportTicketCategory,
    categoryLabel: string,
    subject: string,
    message: string
  ) => {
    if (!profile) return;
    const nextProfile = storageRepo.createSupportTicket(
      profile,
      category,
      categoryLabel,
      subject,
      message
    );
    setProfile(nextProfile);
  };

  const isImmersiveGameplay = Boolean(activeMatchCategory) || openModal === 'boss';

  const offlineOverlayNode = !isOnline ? (
    <OfflineBlockingOverlay
      lang={lang}
      isChecking={isCheckingNetwork}
      isMidMatch={isImmersiveGameplay}
      retryFailedCount={retryFailedCount}
      onRetry={() => {
        void verifyOnlineConnectivity(true).then((connected) => {
          if (connected && profile) {
            void storageRepo.syncProfileToFirestore(profile);
          }
        });
      }}
    />
  ) : null;

  if (isAppClosed) {
    return (
      <>
        <AppClosedScreen lang={lang} onRelaunch={() => setIsAppClosed(false)} />
        {offlineOverlayNode}
      </>
    );
  }

  if (showSplash || !profile) {
    return (
      <>
        <SplashAndOnboarding
          hasExistingProfile={Boolean(profile)}
          initialMode={authInitialMode}
          lang={lang}
          cloudStatus={cloudStatus}
          onToggleLanguage={handleToggleLanguage}
          onSplashComplete={() => setShowSplash(false)}
          onAuthSuccess={handleAuthSuccess}
        />
        {offlineOverlayNode}
      </>
    );
  }

  const levelInfo = calculateLevelAndRank(profile.xp);
  const isAdmin = isAdminProfile(profile);
  const quranCategory = CATEGORIES.find((c) => c.id === 'quran')!;
  const cocktailCategory = CATEGORIES.find((c) => c.id === 'cocktail')!;
  const standardCategories = CATEGORIES.filter(
    (c) => c.id !== 'quran' && c.id !== 'cocktail'
  );

  const unclaimedMissionsCount = profile.daily.missions.filter(
    (m) => m.progress >= m.target && !m.claimed
  ).length;

  const pendingFriendRequestsCount = incomingFriendRequests.length;
  const totalUnreadFriendMessages = authUid
    ? Object.values(chatsMetaByChatId).reduce(
        (sum, meta) => sum + Number(meta.unreadByUid?.[authUid] || 0),
        0
      )
    : 0;
  const totalFriendsNotifications = pendingFriendRequestsCount + totalUnreadFriendMessages;

  const leaderboardList = storageRepo.getLeaderboardWithUser(profile);
  const userIdx = leaderboardList.findIndex((entry) => entry.isCurrentUser);
  const currentMonthlyRank = userIdx >= 0 ? userIdx + 1 : 1;

  // FULL-SCREEN IMMERSIVE GAMEPLAY MODE: Hide header, tabs, banners, and footer completely
  if (isImmersiveGameplay) {
    return (
      <div className="min-h-[100dvh] bg-[#080C16] text-slate-100">
        {activeMatchCategory ? (
          <ArenaMatchView
            category={activeMatchCategory}
            profile={profile}
            lang={lang}
            isPausedByNetwork={!isOnline}
            onConsumeLifeline={handleConsumeLifeline}
            onAwardInstantComboBonus={handleAwardInstantComboBonus}
            onRoundCompleteSync={handleRoundCompleteSync}
            onCompleteMatch={handleCompleteMatch}
            onRoundCompleteAdCheck={handleRoundCompleteAdCheck}
            onExitArena={() => setActiveMatchCategory(null)}
          />
        ) : openModal === 'boss' ? (
          <DailyBossModal
            profile={profile}
            lang={lang}
            isPausedByNetwork={!isOnline}
            onClose={() => setOpenModal(null)}
            onFinishDailyBoss={handleFinishDailyBoss}
          />
        ) : null}

        {showHourlyInterstitialAd && (
          <InterstitialAdModal
            lang={lang}
            onCloseAd={() => setShowHourlyInterstitialAd(false)}
            onUpgradeVipClick={() => {
              setShowHourlyInterstitialAd(false);
              setActiveMatchCategory(null);
              setOpenModal(null);
              setActiveTab('store');
            }}
          />
        )}

        {offlineOverlayNode}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C16] text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-6 px-6 py-4 border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#arena"
          onClick={(e) => {
            e.preventDefault();
            soundEngine.playClick();
            setActiveMatchCategory(null);
            setActiveTab('arena');
          }}
          className="text-xl font-black tracking-tight text-white whitespace-nowrap shrink-0"
        >
          {tr(lang, 'قمة التحدي', 'Peak of Challenge')}
        </a>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-bold text-slate-300">
          <a
            href="#arena"
            onClick={(e) => {
              e.preventDefault();
              soundEngine.playClick();
              setActiveMatchCategory(null);
              setActiveTab('arena');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-1 ${
              activeTab === 'arena' && !activeMatchCategory
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'hover:text-white'
            }`}
          >
            {tr(lang, 'ساحة التحدي', 'Challenge Arena')}
          </a>
          <a
            href="#friends"
            onClick={(e) => {
              e.preventDefault();
              soundEngine.playClick();
              setActiveMatchCategory(null);
              setActiveTab('friends');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-1 flex items-center gap-1.5 ${
              activeTab === 'friends'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'hover:text-white'
            }`}
          >
            <span>{tr(lang, '💬 الأصدقاء', '💬 Friends')}</span>
            {totalFriendsNotifications > 0 && (
              <span className="relative flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-mono-num font-black shadow-sm shadow-rose-500/50">
                {totalFriendsNotifications > 9 ? '9+' : totalFriendsNotifications}
              </span>
            )}
          </a>
          <a
            href="#leaderboard"
            onClick={(e) => {
              e.preventDefault();
              soundEngine.playClick();
              setActiveMatchCategory(null);
              setActiveTab('leaderboard');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-1 ${
              activeTab === 'leaderboard'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'hover:text-white'
            }`}
          >
            {tr(lang, 'المتصدرون والجوائز', 'Leaderboard & Prizes')}
          </a>
          <a
            href="#store"
            onClick={(e) => {
              e.preventDefault();
              soundEngine.playClick();
              setActiveMatchCategory(null);
              setActiveTab('store');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-1 ${
              activeTab === 'store'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'hover:text-white'
            }`}
          >
            {tr(lang, 'المتجر و VIP', 'Store & VIP')}
          </a>
          <a
            href="#profile"
            onClick={(e) => {
              e.preventDefault();
              soundEngine.playClick();
              setActiveMatchCategory(null);
              setActiveTab('profile');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-1 ${
              activeTab === 'profile'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'hover:text-white'
            }`}
          >
            {tr(lang, 'حسابي والإعدادات', 'Profile & Settings')}
          </a>
        </nav>

        {/* Zone 3: Real-time ConnectionIndicator + Admin-Only Cloud Control Button + Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <ConnectionIndicator
            lang={lang}
            cloudStatus={cloudStatus}
            onStatusChange={handleConnectionStatusChange}
          />

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setOpenModal('firebase_security');
              }}
              title={
                cloudStatus.lastError ||
                tr(
                  lang,
                  'لوحة بيانات وقواعد السحابة (للمسؤولين فقط)',
                  'Cloud Data & Rules Panel (Admins Only)'
                )
              }
              className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
                cloudStatus.connected && !cloudStatus.lastError
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:border-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-400 hover:border-rose-400'
              }`}
            >
              {cloudStatus.connected && !cloudStatus.lastError ? (
                <>
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">
                    {tr(lang, 'لوحة السحابة', 'Cloud Panel')}
                  </span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">
                    {tr(lang, 'لوحة السحابة', 'Cloud Panel')}
                  </span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!isOnline) {
                void verifyOnlineConnectivity(true);
                return;
              }
              soundEngine.playClick();
              setActiveMatchCategory(cocktailCategory);
            }}
            title={tr(lang, 'تحدي سريع', 'Quick Challenge')}
            aria-label={tr(lang, 'تحدي سريع', 'Quick Challenge')}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-sky-400 to-amber-400 text-slate-950 shadow-md shadow-cyan-500/25 hover:brightness-110 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
          </button>
        </div>
      </header>

      {/* Calm, non-technical sync notice (never displays technical error codes or scary red alerts to players) */}
      {cloudStatus.lastError && !cloudStatus.isNetworkOffline && (
        <div className="bg-amber-950/50 border-b border-amber-500/30 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-100">
            <div className="flex items-start sm:items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                {tr(
                  lang,
                  'جارٍ حفظ ومزامنة تقدمك تلقائياً... يمكنك متابعة اللعب بأمان.',
                  'Saving and syncing your progress automatically... You can keep playing safely.'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setOpenModal('firebase_security');
                  }}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 font-bold cursor-pointer whitespace-nowrap"
                >
                  {tr(lang, 'لوحة الإدارة', 'Admin Panel')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  if (profile) {
                    void storageRepo.syncProfileToFirestore(profile);
                  }
                }}
                className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold cursor-pointer whitespace-nowrap"
              >
                {tr(lang, 'إعادة المحاولة', 'Retry')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation Bar */}
      <div className="md:hidden grid grid-cols-5 gap-1 px-2 py-2 bg-[#0B1120] border-b border-slate-800 text-center text-[11px] font-bold">
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveMatchCategory(null);
            setActiveTab('arena');
          }}
          className={`py-2 rounded-lg whitespace-nowrap truncate cursor-pointer ${
            activeTab === 'arena' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
          }`}
        >
          {tr(lang, 'التحدي', 'Arena')}
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveMatchCategory(null);
            setActiveTab('friends');
          }}
          className={`relative py-2 rounded-lg whitespace-nowrap truncate cursor-pointer ${
            activeTab === 'friends' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
          }`}
        >
          <span>{tr(lang, '💬 الأصدقاء', '💬 Friends')}</span>
          {totalFriendsNotifications > 0 && (
            <span className="absolute top-0.5 end-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-mono-num font-black flex items-center justify-center shadow-sm shadow-rose-500/50">
              {totalFriendsNotifications > 9 ? '9+' : totalFriendsNotifications}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveMatchCategory(null);
            setActiveTab('leaderboard');
          }}
          className={`py-2 rounded-lg whitespace-nowrap truncate cursor-pointer ${
            activeTab === 'leaderboard' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
          }`}
        >
          {tr(lang, 'المتصدرون', 'Leaders')}
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveMatchCategory(null);
            setActiveTab('store');
          }}
          className={`py-2 rounded-lg whitespace-nowrap truncate cursor-pointer ${
            activeTab === 'store' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
          }`}
        >
          {tr(lang, 'المتجر', 'Store')}
        </button>
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            setActiveMatchCategory(null);
            setActiveTab('profile');
          }}
          className={`py-2 rounded-lg whitespace-nowrap truncate cursor-pointer ${
            activeTab === 'profile' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
          }`}
        >
          {tr(lang, 'حسابي', 'Profile')}
        </button>
      </div>

      {/* Real-Time Top Notification Toast (Friend Requests, Accepted Friends & Instant Messages) */}
      {socialToast && (
        <div className="fixed top-16 inset-x-0 z-40 px-4 pointer-events-none flex justify-center">
          <div
            className={`pointer-events-auto max-w-md w-full rounded-2xl border p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 ${
              socialToast.kind === 'friend_request'
                ? 'bg-[#180E16]/95 border-rose-500/60 shadow-rose-500/20'
                : socialToast.kind === 'friend_accepted'
                ? 'bg-[#091D16]/95 border-emerald-500/60 shadow-emerald-500/20'
                : 'bg-[#0B172A]/95 border-cyan-400/60 shadow-cyan-500/20'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  socialToast.kind === 'friend_request'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : socialToast.kind === 'friend_accepted'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                }`}
              >
                {socialToast.kind === 'friend_request' ? (
                  <UserPlus className="w-5 h-5" />
                ) : socialToast.kind === 'friend_accepted' ? (
                  <UserCheck className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-white truncate">
                  {socialToast.title}
                </div>
                <div className="text-[11px] text-slate-300 truncate mt-0.5">
                  {socialToast.body}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  if (socialToast.targetFriendUid) {
                    setRequestedChatFriendUid(socialToast.targetFriendUid);
                  }
                  setActiveMatchCategory(null);
                  setActiveTab('friends');
                  setSocialToast(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer whitespace-nowrap transition-colors ${
                  socialToast.kind === 'friend_request'
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : socialToast.kind === 'friend_accepted'
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                }`}
              >
                {socialToast.kind === 'friend_request'
                  ? tr(lang, 'عرض الطلب', 'View')
                  : tr(lang, 'فتح الدردشة', 'Open')}
              </button>
              <button
                type="button"
                onClick={() => setSocialToast(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label={tr(lang, 'إغلاق الإشعار', 'Dismiss')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {activeTab === 'friends' ? (
          <FriendsAndChatView
            profile={profile}
            authUid={authUid}
            lang={lang}
            friends={friendsWithLivePresence}
            incomingRequests={incomingFriendRequests}
            outgoingRequests={outgoingFriendRequests}
            chatsMetaByChatId={chatsMetaByChatId}
            initialSelectedFriendUid={requestedChatFriendUid}
            onActiveFriendUidChange={handleActiveFriendUidChange}
            onSendFriendRequest={handleSendFriendRequest}
            onAcceptFriendRequest={handleAcceptFriendRequest}
            onRejectOrCancelFriendRequest={handleRejectOrCancelFriendRequest}
            onSendMessage={handleSendPrivateMessage}
            onMarkChatAsRead={handleMarkCloudChatAsRead}
          />
        ) : activeTab === 'leaderboard' ? (
          <LeaderboardAndPrizesView profile={profile} lang={lang} />
        ) : activeTab === 'store' ? (
          <StoreAndVipView
            profile={profile}
            lang={lang}
            onBuyLifeline={handleBuyLifeline}
            onClaimRewardedAd={handleClaimRewardedAd}
            onPurchaseCoinPack={handlePurchaseCoinPack}
            onPurchaseVipIap={handlePurchaseVipIap}
          />
        ) : activeTab === 'profile' ? (
          <ProfileAndSettingsView
            profile={profile}
            lang={lang}
            onUpdateIdentity={handleUpdateIdentity}
            onUpdateSettings={handleUpdateSettings}
            onOpenCustomerSupport={() => setOpenModal('support')}
            onOpenFirebaseSecurity={
              isAdmin ? () => setOpenModal('firebase_security') : undefined
            }
            onRequestLogoutAccount={() => setOpenModal('logout_confirm')}
          />
        ) : (
          /* ARENA HUB (HOME VIEW) */
          <div className="space-y-8">
            {/* Player Status, 4 Interactive Challenge & Friends Cards, & Daily Engagement */}
            <section className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#0B1120] border border-cyan-500/40 flex items-center justify-center text-3xl shrink-0">
                    {profile.country.flag}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl md:text-2xl font-black text-white">
                        {tr(lang, `أهلاً بك، ${profile.username}`, `Welcome, ${profile.username}`)}
                      </h1>
                      {profile.vipTier !== 'none' && (
                        <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" />
                          <span>👑 VIP {profile.vipTier.toUpperCase()}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono-num">
                      ID: {profile.playerId} · ⚡{' '}
                      {lang === 'en' ? levelInfo.rankTitleEn : levelInfo.rankTitle} (
                      {tr(lang, `المستوى ${levelInfo.level}`, `Level ${levelInfo.level}`)})
                    </div>
                  </div>
                </div>

                {/* Economy & Monthly Score Summary */}
                <div className="grid grid-cols-3 gap-3 sm:w-auto w-full">
                  <div className="px-4 py-3 rounded-xl bg-[#0B1120] border border-slate-800 text-center">
                    <div className="text-lg font-black text-cyan-400 font-mono-num">
                      {profile.monthlyPoints}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {tr(lang, 'نقاط الشهر', 'Monthly Pts')}
                    </div>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-[#0B1120] border border-amber-500/30 text-center">
                    <div className="text-lg font-black text-amber-400 font-mono-num flex items-center justify-center gap-1">
                      <Coins className="w-4 h-4" />
                      <span>{profile.coins}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {tr(lang, 'عملة ذهبية', 'Gold Coins')}
                    </div>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-[#0B1120] border border-purple-500/30 text-center">
                    <div className="text-lg font-black text-purple-400 font-mono-num">
                      {profile.xp}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {tr(lang, 'نقاط XP', 'XP Points')}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Interactive Hub Cards: Monthly Challenge, Friends & Private Chat, Win Streak, Quick Play */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800/80">
                {/* Card 1: 🏆 تحدي الشهر */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('leaderboard');
                  }}
                  className="p-4 rounded-xl bg-[#0B1120] border border-amber-500/30 hover:border-amber-400 transition-all text-start flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-extrabold text-amber-400 flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {tr(lang, '🏆 تحدي الشهر', '🏆 Monthly Challenge')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-semibold truncate">
                      {tr(
                        lang,
                        `المركز #${currentMonthlyRank} · الأول 🥇: لابتوب`,
                        `Rank #${currentMonthlyRank} · 1st 🥇: Laptop`
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-slate-950 bg-amber-400 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
                    {tr(lang, 'الجوائز', 'Prizes')}
                  </span>
                </button>

                {/* Card 2: 💬 الأصدقاء والدردشة الخاصة */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('friends');
                  }}
                  className={`p-4 rounded-xl bg-[#0B1120] border transition-all text-start flex items-center justify-between gap-3 cursor-pointer ${
                    totalFriendsNotifications > 0
                      ? 'border-rose-500/60 hover:border-rose-400'
                      : 'border-cyan-500/30 hover:border-cyan-400'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-extrabold text-cyan-400 flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {tr(lang, '💬 الأصدقاء', '💬 Friends')}
                      </span>
                      {totalFriendsNotifications > 0 && (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-slate-300 font-semibold truncate flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {pendingFriendRequestsCount > 0
                          ? tr(
                              lang,
                              `${pendingFriendRequestsCount} طلب صداقة جديد!`,
                              `${pendingFriendRequestsCount} new friend request(s)!`
                            )
                          : tr(
                              lang,
                              `${cloudFriends.length} أصدقاء · دردشة فورية`,
                              `${cloudFriends.length} Friends · Live Chat`
                            )}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-extrabold px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 ${
                      totalFriendsNotifications > 0
                        ? 'text-white bg-rose-500'
                        : 'text-slate-950 bg-cyan-400'
                    }`}
                  >
                    {pendingFriendRequestsCount > 0
                      ? tr(lang, `طلبات (${pendingFriendRequestsCount})`, `Requests (${pendingFriendRequestsCount})`)
                      : totalUnreadFriendMessages > 0
                      ? tr(lang, `رسائل (${totalUnreadFriendMessages})`, `Chat (${totalUnreadFriendMessages})`)
                      : tr(lang, 'دردشة', 'Open')}
                  </span>
                </button>

                {/* Card 3: 🔥 سلسلة الانتصارات */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab('profile');
                  }}
                  className="p-4 rounded-xl bg-[#0B1120] border border-purple-500/30 hover:border-purple-400 transition-all text-start flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-extrabold text-purple-400 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 shrink-0" />
                      <span className="truncate">
                        {tr(lang, '🔥 سلسلة الانتصارات', '🔥 Win Streak')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-semibold truncate">
                      {tr(
                        lang,
                        `أفضل سلسلة: ${profile.stats.maxComboEver} · جولات كاملة: ${profile.stats.perfectRoundsCount}`,
                        `Best Streak: ${profile.stats.maxComboEver} · Perfect: ${profile.stats.perfectRoundsCount}`
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-white bg-purple-600 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
                    {tr(lang, 'إنجازاتي', 'Stats')}
                  </span>
                </button>

                {/* Card 4: ⚡ جاهز للتحدي */}
                <button
                  type="button"
                  onClick={() => {
                    void handleSelectCategoryCard(cocktailCategory);
                  }}
                  className="p-4 rounded-xl bg-gradient-to-l from-cyan-500/20 to-blue-600/20 border border-cyan-400/50 hover:border-cyan-300 transition-all text-start flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-sm font-extrabold text-cyan-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate">
                        {tr(lang, '⚡ جاهز للتحدي', '⚡ Ready for Action')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-200 font-semibold truncate">
                      {tr(
                        lang,
                        'انطلق في مواجهة ثقافية فورية',
                        'Jump into an instant trivia match'
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-slate-950 bg-cyan-400 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
                    {tr(lang, 'ابدأ 🚀', 'Play 🚀')}
                  </span>
                </button>
              </div>

              {/* 3 Daily Engagement Cards: Spin Wheel, Daily Boss, Daily Missions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setOpenModal('spin');
                  }}
                  className="p-4 rounded-xl bg-[#0B1120] border border-amber-500/20 hover:border-amber-400 transition-all text-start flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-extrabold text-amber-400 flex items-center gap-1.5">
                      <Gift className="w-4 h-4" />
                      <span>{tr(lang, 'عجلة الحظ اليومية', 'Daily Lucky Spin')}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {!profile.daily.spinUsed
                        ? tr(
                            lang,
                            'لفتك المجانية لليوم جاهزة الآن!',
                            'Your free daily spin is ready now!'
                          )
                        : tr(
                            lang,
                            'تم استخدام اللفة المجانية · متاح لفة إضافية',
                            'Free spin used · Extra spin available'
                          )}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-slate-950 bg-amber-400 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
                    {!profile.daily.spinUsed
                      ? tr(lang, 'العب مجاناً', 'Free Spin')
                      : tr(lang, 'افتح', 'Open')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setOpenModal('boss');
                  }}
                  className="p-4 rounded-xl bg-[#0B1120] border border-purple-500/20 hover:border-purple-400 transition-all text-start flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-extrabold text-purple-400 flex items-center gap-1.5">
                      <Flame className="w-4 h-4" />
                      <span>{tr(lang, 'سؤال اليوم النادر', 'Daily Boss Question')}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {!profile.daily.dailyBossAttempted
                        ? tr(
                            lang,
                            'تحدٍ خاص بمكافأة +35 عملة ذهبية',
                            'Special 5s challenge for +35 Gold Coins'
                          )
                        : profile.daily.dailyBossWon
                        ? tr(
                            lang,
                            'تم الفوز بتحدي اليوم بنجاح ✓',
                            'Today’s Daily Boss conquered ✓'
                          )
                        : tr(lang, 'تمت محاولة سؤال اليوم', 'Daily Boss attempted today')}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-white bg-purple-600 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
                    {!profile.daily.dailyBossAttempted
                      ? tr(lang, 'تحدَّ الآن', 'Challenge')
                      : tr(lang, 'عرض', 'View')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setOpenModal('missions');
                  }}
                  className="p-4 rounded-xl bg-[#0B1120] border border-cyan-500/20 hover:border-cyan-400 transition-all text-start flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-extrabold text-cyan-400 flex items-center gap-1.5">
                      <Target className="w-4 h-4" />
                      <span>{tr(lang, 'المهام اليومية', 'Daily Missions')}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {unclaimedMissionsCount > 0
                        ? tr(
                            lang,
                            `لديك ${unclaimedMissionsCount} مكافأة جاهزة للاستلام!`,
                            `You have ${unclaimedMissionsCount} reward(s) ready to claim!`
                          )
                        : tr(
                            lang,
                            'أكمل مهام اليوم لحصد العملات والخبرة',
                            'Complete daily tasks for coins & XP'
                          )}
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-slate-950 bg-cyan-400 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
                    {unclaimedMissionsCount > 0
                      ? tr(
                          lang,
                          `استلم (${unclaimedMissionsCount})`,
                          `Claim (${unclaimedMissionsCount})`
                        )
                      : tr(lang, 'المهام', 'Missions')}
                  </span>
                </button>
              </div>
            </section>

            {/* Section 1: Featured Special Golden Category (القرآن الكريم) + Cocktail Arena */}
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white">
                  {tr(lang, 'اختر القسم وابدأ التحدي', 'Choose a Category & Start Playing')}
                </h2>
                {(() => {
                  const tier = getDifficultyTierForPoints(profile.monthlyPoints);
                  return (
                    <p className="text-xs sm:text-sm font-bold text-slate-400">
                      <span className={tier.accentClass}>
                        {lang === 'en' ? tier.labelEn : tier.labelAr}
                      </span>
                      {' · '}
                      {tr(
                        lang,
                        'تزداد صعوبة الأسئلة تلقائياً مع ارتفاع نقاطك',
                        'Question difficulty scales up automatically with your points'
                      )}
                    </p>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Special Royal Gold Card: القرآن الكريم */}
                <div
                  onClick={() => handleSelectCategoryCard(quranCategory)}
                  className={`p-6 rounded-2xl bg-gradient-to-br from-[#231B07] via-[#171206] to-[#111827] border-2 border-amber-400/70 shadow-xl shadow-amber-500/10 flex flex-col justify-between gap-5 cursor-pointer group transition-all duration-200 ease-out hover:scale-[1.015] hover:-translate-y-0.5 hover:shadow-amber-500/20 active:scale-[0.97] active:opacity-85 ${
                    pressedCategoryId === quranCategory.id
                      ? 'scale-[0.97] opacity-85 ring-2 ring-amber-400'
                      : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-300">
                        {tr(lang, 'القسم الذهبي المميز', 'Featured Golden Category')}
                      </span>
                      <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 transition-transform duration-200 group-hover:scale-110">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-amber-300">
                      {getCategoryName(quranCategory, lang)}
                    </h3>
                    <p className="text-sm text-amber-100/80 leading-relaxed">
                      {getCategorySubtitle(quranCategory, lang)}
                    </p>
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-amber-500/20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCategoryCard(quranCategory);
                      }}
                      className="px-6 py-3 rounded-xl bg-gradient-to-l from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 whitespace-nowrap transition-transform duration-150 group-hover:scale-105 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{tr(lang, 'ابدأ التحدي الآن 🚀', 'Start Challenge 🚀')}</span>
                    </button>
                  </div>
                </div>

                {/* Special Cocktail Card: كوكتيل شامل */}
                <div
                  onClick={() => handleSelectCategoryCard(cocktailCategory)}
                  className={`p-6 rounded-2xl bg-gradient-to-br from-[#1B1035] via-[#13132B] to-[#111827] border-2 border-purple-500/60 shadow-xl shadow-purple-500/10 flex flex-col justify-between gap-5 cursor-pointer group transition-all duration-200 ease-out hover:scale-[1.015] hover:-translate-y-0.5 hover:shadow-purple-500/20 active:scale-[0.97] active:opacity-85 ${
                    pressedCategoryId === cocktailCategory.id
                      ? 'scale-[0.97] opacity-85 ring-2 ring-purple-400'
                      : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-purple-300">
                        {tr(lang, 'تحدي الثقافة الشاملة', 'All-Around Trivia Mix')}
                      </span>
                      <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300 transition-transform duration-200 group-hover:scale-110">
                        <Sparkles className="w-6 h-6" />
                      </div>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-white">
                      {getCategoryName(cocktailCategory, lang)}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {getCategorySubtitle(cocktailCategory, lang)}
                    </p>
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-purple-500/20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCategoryCard(cocktailCategory);
                      }}
                      className="px-6 py-3 rounded-xl bg-gradient-to-l from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-slate-950 font-black text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-purple-500/20 whitespace-nowrap transition-transform duration-150 group-hover:scale-105 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{tr(lang, 'ابدأ التحدي الآن 🚀', 'Start Challenge 🚀')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Specialized Categories Grid — Clean Icon + Category Name Only */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                {standardCategories.map((cat) => {
                  const isPressed = pressedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategoryCard(cat)}
                      className={`p-5 rounded-2xl bg-[#111827] border border-slate-800 hover:border-cyan-400/60 hover:bg-[#131C2E] transition-all duration-200 ease-out hover:scale-[1.025] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.96] active:opacity-80 flex items-center justify-between gap-4 text-start cursor-pointer group ${
                        isPressed
                          ? 'scale-[0.96] opacity-80 border-cyan-400 ring-2 ring-cyan-400/50 bg-[#131C2E]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-12 h-12 rounded-xl bg-[#0B1120] border border-slate-700 group-hover:border-cyan-500/40 group-hover:scale-110 flex items-center justify-center shrink-0 transition-all duration-200"
                          style={{ color: cat.accentColor }}
                        >
                          {renderCategoryIcon(cat.iconName, 'w-6 h-6')}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-extrabold text-white truncate">
                            {getCategoryName(cat, lang)}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {getCategorySubtitle(cat, lang)}
                          </p>
                        </div>
                      </div>

                      <span className="px-3 py-2 rounded-xl bg-[#0B1120] group-hover:bg-cyan-500 text-cyan-400 group-hover:text-slate-950 border border-cyan-500/30 font-extrabold text-xs transition-all duration-200 group-active:scale-95 shrink-0">
                        {tr(lang, 'العب', 'Play')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Motivational Footer */}
      <footer className="border-t border-slate-800/70 bg-[#0B1120] py-4 px-6 text-center text-xs font-bold text-slate-400">
        {tr(
          lang,
          'اختبر سرعة بديهتك، اجمع النقاط، وتصدّر قائمة الأوائل',
          'Test your quick wit, collect points, and top the leaderboard'
        )}
      </footer>

      {/* Active Modals */}
      {openModal === 'spin' && (
        <SpinWheelModal
          profile={profile}
          lang={lang}
          onClose={() => setOpenModal(null)}
          onClaimSpinReward={handleClaimSpinReward}
        />
      )}
      {openModal === 'missions' && (
        <DailyMissionsModal
          profile={profile}
          lang={lang}
          onClose={() => setOpenModal(null)}
          onClaimMission={handleClaimMission}
        />
      )}
      {openModal === 'support' && (
        <CustomerSupportModal
          profile={profile}
          lang={lang}
          onClose={() => setOpenModal(null)}
          onSubmitTicket={handleCreateSupportTicket}
        />
      )}
      {openModal === 'firebase_security' && isAdmin && (
        <FirebaseSecurityModal
          profile={profile}
          lang={lang}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'auth_modal' && (
        <AuthModal
          lang={lang}
          cloudStatus={cloudStatus}
          isModalOverlay={true}
          onClose={() => setOpenModal(null)}
          onAuthSuccess={(nextProfile) => {
            setOpenModal(null);
            handleAuthSuccess(nextProfile);
          }}
        />
      )}
      {openModal === 'logout_confirm' && (
        <LogoutConfirmModal
          lang={lang}
          onConfirmLogout={handleConfirmLogoutAccount}
          onCancel={() => setOpenModal(null)}
        />
      )}
      {openModal === 'exit_confirm' && (
        <ExitGameConfirmModal
          lang={lang}
          onConfirmExit={handleConfirmExitGame}
          onCancel={() => setOpenModal(null)}
        />
      )}
      {showHourlyInterstitialAd && (
        <InterstitialAdModal
          lang={lang}
          onCloseAd={() => setShowHourlyInterstitialAd(false)}
          onUpgradeVipClick={() => {
            setShowHourlyInterstitialAd(false);
            setActiveMatchCategory(null);
            setActiveTab('store');
          }}
        />
      )}

      {offlineOverlayNode}
    </div>
  );
}
