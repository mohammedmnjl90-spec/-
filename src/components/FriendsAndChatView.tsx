import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  AppLanguage,
  ChatMessage,
  ChatThreadMeta,
  FriendContact,
  FriendRequest,
  LeaderboardEntry,
  PlayerProfile,
} from '../types/game';
import { storageRepo } from '../services/storageRepository';
import { soundEngine } from '../utils/sound';
import { getCountryDisplayName, tr } from '../utils/i18n';
import {
  UserPlus,
  MessageCircle,
  Crown,
  CheckCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Bell,
  Check,
  X,
  Clock,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface FriendsAndChatViewProps {
  profile: PlayerProfile;
  authUid: string | null;
  lang: AppLanguage;
  friends: FriendContact[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  chatsMetaByChatId: Record<string, ChatThreadMeta>;
  initialSelectedFriendUid?: string | null;
  onActiveFriendUidChange?: (friendUid: string | null) => void;
  onSendFriendRequest: (
    identifier: string
  ) => Promise<
    | { ok: true; status: 'sent'; targetUsername: string }
    | { ok: true; status: 'auto_accepted'; friend: FriendContact }
    | { ok: false; error: string }
  >;
  onAcceptFriendRequest: (
    request: FriendRequest
  ) => Promise<{ ok: true; friend: FriendContact } | { ok: false; error: string }>;
  onRejectOrCancelFriendRequest: (
    requestId: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onSendMessage: (
    friend: FriendContact,
    text: string
  ) => Promise<{ ok: true; message: ChatMessage } | { ok: false; error: string }>;
  onMarkChatAsRead: (friend: FriendContact) => void;
}

function formatLastSeenLabel(lastSeenMs: number | undefined, lang: AppLanguage): string {
  if (!lastSeenMs || lastSeenMs <= 0) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - lastSeenMs) / 1000));
  if (diffSec < 60) {
    return lang === 'en' ? 'Last seen just now' : 'آخر ظهور منذ لحظات';
  }
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) {
    return lang === 'en' ? `Last seen ${mins}m ago` : `آخر ظهور منذ ${mins} د`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return lang === 'en' ? `Last seen ${hrs}h ago` : `آخر ظهور منذ ${hrs} س`;
  }
  const dateText = new Date(lastSeenMs).toLocaleDateString(
    lang === 'ar' ? 'ar-SA' : 'en-US',
    { day: 'numeric', month: 'short' }
  );
  return lang === 'en' ? `Last seen ${dateText}` : `آخر ظهور ${dateText}`;
}

function getCalendarDayKey(timestampMs: number): string {
  const d = new Date(timestampMs);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function formatDayDividerLabel(timestampMs: number, lang: AppLanguage): string {
  const now = new Date();
  const todayKey = getCalendarDayKey(now.getTime());
  const yesterday = new Date(now.getTime() - 86_400_000);
  const yesterdayKey = getCalendarDayKey(yesterday.getTime());
  const msgKey = getCalendarDayKey(timestampMs);

  if (msgKey === todayKey) {
    return lang === 'en' ? 'Today' : 'اليوم';
  }
  if (msgKey === yesterdayKey) {
    return lang === 'en' ? 'Yesterday' : 'أمس';
  }
  return new Date(timestampMs).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const FriendsAndChatView: React.FC<FriendsAndChatViewProps> = ({
  profile,
  authUid,
  lang,
  friends,
  incomingRequests,
  outgoingRequests,
  chatsMetaByChatId,
  initialSelectedFriendUid,
  onActiveFriendUidChange,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRejectOrCancelFriendRequest,
  onSendMessage,
  onMarkChatAsRead,
}) => {
  const [friendQuery, setFriendQuery] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [addFeedback, setAddFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [activeFriendUid, setActiveFriendUid] = useState<string | null>(
    () => initialSelectedFriendUid || friends[0]?.uid || null
  );
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(Boolean(initialSelectedFriendUid));
  const [messagesByChatId, setMessagesByChatId] = useState<Record<string, ChatMessage[]>>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [discoverPlayers, setDiscoverPlayers] = useState<LeaderboardEntry[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const prevMsgCountRef = useRef<number>(0);

  // Sync external jump-to-friend request (e.g. clicking a top toast notification)
  useEffect(() => {
    if (initialSelectedFriendUid) {
      setActiveFriendUid(initialSelectedFriendUid);
      setMobileShowChat(true);
    }
  }, [initialSelectedFriendUid]);

  // Auto-select first friend on desktop if none selected yet and friends list becomes non-empty
  useEffect(() => {
    if (!activeFriendUid && friends.length > 0 && friends[0].uid) {
      setActiveFriendUid(friends[0].uid);
    } else if (
      activeFriendUid &&
      friends.length > 0 &&
      !friends.some((f) => f.uid === activeFriendUid)
    ) {
      setActiveFriendUid(friends[0].uid || null);
    }
  }, [friends, activeFriendUid]);

  // Notify parent App.tsx of which friend chat is currently open (to suppress duplicate toast alerts)
  useEffect(() => {
    onActiveFriendUidChange?.(activeFriendUid);
    return () => onActiveFriendUidChange?.(null);
  }, [activeFriendUid, onActiveFriendUidChange]);

  // Fetch real registered players from Firestore for quick friend request suggestions
  useEffect(() => {
    if (!authUid) return;
    let cancelled = false;
    void storageRepo.fetchDiscoverableCloudPlayers(authUid, 16).then((list) => {
      if (!cancelled) {
        setDiscoverPlayers(list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authUid]);

  // Merge real-time chat metadata (unread count & last message preview) into friends list and sort by latest activity
  const enrichedFriends = useMemo(() => {
    return friends
      .map((friend) => {
        const chatKey = authUid ? storageRepo.getCloudChatKey(authUid, friend) : null;
        const chatId = chatKey?.chatId || friend.chatId;
        const meta = chatId ? chatsMetaByChatId[chatId] : undefined;
        const unreadCount =
          authUid && meta?.unreadByUid ? Number(meta.unreadByUid[authUid] || 0) : 0;
        return {
          ...friend,
          chatId,
          unreadCount,
          lastMessageText: meta?.lastMessageText || friend.lastMessageText || '',
          lastMessageAtMs: meta?.lastMessageAtMs || friend.lastMessageAtMs || 0,
        };
      })
      .sort((a, b) => {
        const aTime = a.lastMessageAtMs || new Date(a.addedAtIso).getTime();
        const bTime = b.lastMessageAtMs || new Date(b.addedAtIso).getTime();
        return bTime - aTime;
      });
  }, [friends, chatsMetaByChatId, authUid]);

  const activeFriend =
    enrichedFriends.find((f) => f.uid === activeFriendUid) || null;
  const activeChatId =
    authUid && activeFriend?.uid
      ? [authUid, activeFriend.uid].sort().join('_')
      : activeFriend?.chatId || '';
  const activeMessages: ChatMessage[] = activeChatId
    ? messagesByChatId[activeChatId] || []
    : [];

  // Subscribe to real-time Firestore private chat messages for the active friend
  useEffect(() => {
    if (!authUid || !activeFriend?.uid) {
      setIsLoadingMessages(false);
      return;
    }

    const friendUid = activeFriend.uid;
    const chatId = [authUid, friendUid].sort().join('_');

    setChatError(null);
    setIsLoadingMessages(true);
    prevMsgCountRef.current = 0;

    // Immediately clear unread badge when opening this conversation
    if (activeFriend.unreadCount > 0) {
      onMarkChatAsRead(activeFriend);
    }

    const unsubscribe = storageRepo.subscribeToPrivateChatMessages(
      authUid,
      friendUid,
      chatId,
      (cloudMsgs) => {
        setIsLoadingMessages(false);
        setChatError(null);

        // Play soft chime if a brand new incoming message arrived while viewing this chat
        if (
          prevMsgCountRef.current > 0 &&
          cloudMsgs.length > prevMsgCountRef.current
        ) {
          const newest = cloudMsgs[cloudMsgs.length - 1];
          if (newest && newest.senderUid && newest.senderUid !== authUid) {
            soundEngine.playClick();
          }
        }
        prevMsgCountRef.current = cloudMsgs.length;

        setMessagesByChatId((prev) => ({
          ...prev,
          [chatId]: cloudMsgs,
        }));

        // Keep read status synced if a new incoming message arrives while open
        const latest = cloudMsgs[cloudMsgs.length - 1];
        if (latest && latest.senderUid && latest.senderUid !== authUid) {
          void storageRepo.markCloudChatAsReadAsync(authUid, chatId);
        }
      },
      (errText) => {
        setIsLoadingMessages(false);
        setChatError(errText);
      },
      lang
    );

    return () => unsubscribe();
  }, [authUid, activeFriend?.uid, lang]);

  // Also clear unread count immediately if metadata updates while chat is open
  useEffect(() => {
    if (activeFriend && activeFriend.unreadCount > 0) {
      onMarkChatAsRead(activeFriend);
    }
  }, [activeFriend?.uid, activeFriend?.unreadCount, onMarkChatAsRead]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeFriendUid]);

  const showTempFeedback = (type: 'ok' | 'err', text: string, durationMs = 4000) => {
    setAddFeedback({ type, text });
    window.setTimeout(() => {
      setAddFeedback((curr) => (curr?.text === text ? null : curr));
    }, durationMs);
  };

  const handleSendFriendRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendingRequest || !friendQuery.trim()) return;
    setIsSendingRequest(true);
    setAddFeedback(null);
    try {
      const res = await onSendFriendRequest(friendQuery);
      if (!res.ok) {
        soundEngine.playWrong();
        showTempFeedback('err', res.error, 5000);
        return;
      }

      soundEngine.playReward();
      setFriendQuery('');
      if (res.status === 'auto_accepted') {
        if (res.friend.uid) {
          setActiveFriendUid(res.friend.uid);
          setMobileShowChat(true);
        }
        showTempFeedback(
          'ok',
          tr(
            lang,
            `أنت و«${res.friend.username}» أصبحتما أصدقاء الآن! يمكنك مراسلته فوراً.`,
            `You and "${res.friend.username}" are now friends! Start chatting right away.`
          )
        );
      } else {
        showTempFeedback(
          'ok',
          tr(
            lang,
            `تم إرسال طلب صداقة إلى «${res.targetUsername}» بنجاح! سيظهر لديه إشعار فوري.`,
            `Friend request sent to "${res.targetUsername}"! They will receive an instant notification.`
          )
        );
      }
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleQuickSendSuggested = async (identifier: string) => {
    if (isSendingRequest) return;
    setIsSendingRequest(true);
    setAddFeedback(null);
    try {
      const res = await onSendFriendRequest(identifier);
      if (!res.ok) {
        soundEngine.playWrong();
        showTempFeedback('err', res.error, 5000);
        return;
      }
      soundEngine.playReward();
      if (res.status === 'auto_accepted') {
        if (res.friend.uid) {
          setActiveFriendUid(res.friend.uid);
          setMobileShowChat(true);
        }
        showTempFeedback(
          'ok',
          tr(
            lang,
            `تمت إضافة «${res.friend.username}» كصديق بنجاح!`,
            `"${res.friend.username}" is now your friend!`
          )
        );
      } else {
        showTempFeedback(
          'ok',
          tr(
            lang,
            `تم إرسال طلب صداقة إلى «${res.targetUsername}» بنجاح!`,
            `Friend request sent to "${res.targetUsername}"!`
          )
        );
      }
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    if (processingRequestId) return;
    setProcessingRequestId(req.id);
    try {
      const res = await onAcceptFriendRequest(req);
      if (!res.ok) {
        soundEngine.playWrong();
        showTempFeedback('err', res.error, 5000);
        return;
      }
      soundEngine.playReward();
      if (res.friend.uid) {
        setActiveFriendUid(res.friend.uid);
        setMobileShowChat(true);
      }
      showTempFeedback(
        'ok',
        tr(
          lang,
          `تم قبول طلب الصداقة! أصبحت أنت و«${res.friend.username}» أصدقاء الآن ويمكنكما الدردشة فوراً.`,
          `Friend request accepted! You and "${res.friend.username}" are now friends.`
        )
      );
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectOrCancelRequest = async (req: FriendRequest, isOutgoing: boolean) => {
    if (processingRequestId) return;
    setProcessingRequestId(req.id);
    try {
      const res = await onRejectOrCancelFriendRequest(req.id);
      if (!res.ok) {
        soundEngine.playWrong();
        showTempFeedback('err', res.error, 5000);
        return;
      }
      soundEngine.playClick();
      showTempFeedback(
        'ok',
        isOutgoing
          ? tr(lang, `تم إلغاء طلب الصداقة إلى «${req.toUsername}».`, `Canceled request to "${req.toUsername}".`)
          : tr(lang, `تم رفض طلب الصداقة من «${req.fromUsername}».`, `Declined request from "${req.fromUsername}".`),
        3000
      );
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFriend || !messageInput.trim() || isSendingMessage) return;

    const textToSend = messageInput.trim();
    setMessageInput('');
    setChatError(null);
    setIsSendingMessage(true);
    soundEngine.playClick();

    try {
      const res = await onSendMessage(activeFriend, textToSend);
      if (!res.ok) {
        soundEngine.playWrong();
        setMessageInput(textToSend);
        setChatError(res.error);
        return;
      }

      // Optimistically ensure the sent message is visible immediately (deduped with onSnapshot)
      if (activeChatId) {
        setMessagesByChatId((prev) => {
          const current = prev[activeChatId] || [];
          if (current.some((m) => m.id === res.message.id)) return prev;
          return {
            ...prev,
            [activeChatId]: [...current, res.message],
          };
        });
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Filter discoverable real players: exclude self, current friends, incoming/outgoing pending requests
  const suggestedCloudPlayers = useMemo(() => {
    const friendUids = new Set(friends.map((f) => f.uid).filter(Boolean));
    const friendPlayerIds = new Set(friends.map((f) => f.playerId));
    const pendingUids = new Set([
      ...incomingRequests.map((r) => r.fromUid),
      ...outgoingRequests.map((r) => r.toUid),
    ]);

    return discoverPlayers
      .filter(
        (p) =>
          p.uid &&
          p.uid !== authUid &&
          p.playerId !== profile.playerId &&
          !friendUids.has(p.uid) &&
          !friendPlayerIds.has(p.playerId) &&
          !pendingUids.has(p.uid)
      )
      .slice(0, 4);
  }, [discoverPlayers, friends, incomingRequests, outgoingRequests, authUid, profile.playerId]);

  const totalUnreadMessages = enrichedFriends.reduce(
    (sum, f) => sum + (f.unreadCount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* 1. PROMINENT INCOMING FRIEND REQUESTS PANEL */}
      {incomingRequests.length > 0 && (
        <div className="bg-gradient-to-l from-rose-950/60 via-[#111827] to-[#111827] border-2 border-rose-500/50 rounded-2xl p-5 space-y-4 shadow-lg shadow-rose-500/10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-400 relative">
                <Bell className="w-5 h-5" />
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5" />
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>
                    {tr(lang, 'طلبات الصداقة الواردة', 'Incoming Friend Requests')}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white text-xs font-mono-num font-black">
                    {incomingRequests.length}
                  </span>
                </h3>
                <p className="text-xs text-rose-200/80">
                  {tr(
                    lang,
                    'بمجرد القبول سيصبح الطرفان أصدقاء فوراً وتُفتح الدردشة المباشرة بينكما.',
                    'Once accepted, both of you instantly become friends with real-time private chat.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incomingRequests.map((req) => {
              const isBusy = processingRequestId === req.id;
              return (
                <div
                  key={req.id}
                  className="p-4 rounded-xl bg-[#0B1120] border border-slate-700/80 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#111827] border border-slate-700 flex items-center justify-center text-2xl shrink-0">
                      {req.fromCountryFlag || '🌍'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-white truncate">
                          {req.fromUsername}
                        </span>
                        {req.fromVipTier !== 'none' && (
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono-num truncate">
                        ID: {req.fromPlayerId} ·{' '}
                        {tr(lang, `المستوى ${req.fromLevel}`, `Lvl ${req.fromLevel}`)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleAcceptRequest(req)}
                      className="px-3.5 py-2.5 min-h-[40px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>{tr(lang, 'قبول', 'Accept')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleRejectOrCancelRequest(req, false)}
                      className="px-3 py-2.5 min-h-[40px] rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 disabled:opacity-50 border border-slate-700 text-slate-300 font-extrabold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>{tr(lang, 'رفض', 'Decline')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. TOP HEADER & SEND FRIEND REQUEST CARD */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-cyan-400 font-bold flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              <span>
                {tr(
                  lang,
                  'إشعارات صداقة فورية · دردشة مباشرة ولحظية مع أصدقائك',
                  'Real-Time Friend Requests · Instant Messaging With Friends'
                )}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              {tr(lang, '💬 الأصدقاء والدردشة الخاصة', '💬 Friends & Private Chat')}
            </h2>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-[#0B1120] border border-slate-800 text-xs text-slate-300 font-mono-num">
            {tr(lang, 'كود التعريف الخاص بك:', 'Your Player ID:')}{' '}
            <span className="text-amber-400 font-black">{profile.playerId}</span>
          </div>
        </div>

        {/* Send Friend Request Form */}
        <form onSubmit={handleSendFriendRequestSubmit} className="space-y-3">
          <label className="block text-xs font-bold text-slate-300">
            {tr(
              lang,
              'أرسل طلب صداقة عبر كود التعريف (Player ID) أو اسم المستخدم:',
              'Send a friend request via 10-digit Player ID or Username:'
            )}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={friendQuery}
              onChange={(e) => {
                setFriendQuery(e.target.value);
                if (addFeedback) setAddFeedback(null);
              }}
              placeholder={tr(
                lang,
                'أدخل كود اللاعب (10 أرقام) أو اسم المستخدم...',
                'Enter 10-digit Player ID or Username...'
              )}
              className="flex-1 px-4 py-3 rounded-xl bg-[#0B1120] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={isSendingRequest || !friendQuery.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap transition-all"
            >
              {isSendingRequest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>
                {isSendingRequest
                  ? tr(lang, 'جارٍ الإرسال...', 'Sending...')
                  : tr(lang, 'إرسال طلب صداقة', 'Send Request')}
              </span>
            </button>
          </div>

          {addFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                addFeedback.type === 'ok'
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}
            >
              {addFeedback.type === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{addFeedback.text}</span>
            </div>
          )}
        </form>

        {/* Outgoing Pending Friend Requests */}
        {outgoingRequests.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {tr(
                  lang,
                  `طلبات صداقة مرسلة بانتظار القبول (${outgoingRequests.length}):`,
                  `Sent Friend Requests Pending Approval (${outgoingRequests.length}):`
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {outgoingRequests.map((req) => (
                <div
                  key={req.id}
                  className="px-3 py-2 rounded-xl bg-[#0B1120] border border-amber-500/30 flex items-center gap-2.5 text-xs"
                >
                  <span>{req.toCountryFlag || '🌍'}</span>
                  <span className="font-extrabold text-white">{req.toUsername}</span>
                  <span className="text-[10px] text-amber-300/90 font-semibold">
                    ({tr(lang, 'بانتظار القبول', 'Pending')})
                  </span>
                  <button
                    type="button"
                    disabled={processingRequestId === req.id}
                    onClick={() => void handleRejectOrCancelRequest(req, true)}
                    className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title={tr(lang, 'إلغاء الطلب', 'Cancel request')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discover Real Active Cloud Players */}
        {suggestedCloudPlayers.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
            <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {tr(
                  lang,
                  'لاعبون مسجلون في قمة التحدي (إرسال طلب صداقة سريع):',
                  'Registered Arena Players (Quick Friend Request):'
                )}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {suggestedCloudPlayers.map((sp) => (
                <div
                  key={sp.uid || sp.playerId}
                  className="p-3 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{sp.country.flag}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">
                        {sp.username}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono-num">
                        ID: {sp.playerId}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSendingRequest}
                    onClick={() => void handleQuickSendSuggested(sp.playerId)}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 text-[11px] font-extrabold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    + {tr(lang, 'طلب', 'Add')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. MAIN SPLIT VIEW: FRIENDS LIST + INSTANT PRIVATE CHAT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Friends Sidebar List */}
        <div
          className={`lg:col-span-4 bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3 flex-col h-[560px] ${
            mobileShowChat && activeFriend ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 px-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-extrabold text-white">
                {tr(lang, 'قائمة الأصدقاء', 'Friends List')} ({enrichedFriends.length})
              </h3>
            </div>
            {totalUnreadMessages > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[11px] font-mono-num font-black">
                {totalUnreadMessages} {tr(lang, 'جديدة', 'new')}
              </span>
            )}
          </div>

          {enrichedFriends.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
              <Users className="w-10 h-10 text-slate-600" />
              <div className="text-sm font-bold text-slate-300">
                {tr(lang, 'لا يوجد أصدقاء مؤكدون بعد', 'No confirmed friends yet')}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {tr(
                  lang,
                  'أرسل طلب صداقة عبر كود اللاعب أو اقبل الطلبات الواردة لتبدأ الدردشة المباشرة.',
                  'Send a friend request via Player ID or accept incoming requests to start live chatting.'
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {enrichedFriends.map((friend) => {
                const isSelected = activeFriend?.uid === friend.uid;
                const hasUnread = (friend.unreadCount || 0) > 0 && !isSelected;

                return (
                  <button
                    key={friend.uid || friend.playerId}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveFriendUid(friend.uid || null);
                      setMobileShowChat(true);
                      onMarkChatAsRead(friend);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-start transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400 text-white'
                        : hasUnread
                        ? 'bg-rose-500/10 border-rose-500/50 hover:border-rose-400 text-white'
                        : 'bg-[#0B1120] border-slate-800/90 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-xl bg-[#111827] border border-slate-700 flex items-center justify-center text-2xl">
                          {friend.country.flag}
                        </div>
                        <span
                          className={`w-3 h-3 rounded-full ring-2 ring-[#0B1120] absolute -bottom-0.5 -right-0.5 ${
                            friend.isOnline
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]'
                              : 'bg-slate-500'
                          }`}
                          title={
                            friend.isOnline
                              ? tr(lang, 'متصل الآن', 'Online now')
                              : tr(lang, 'غير متصل', 'Offline')
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-extrabold text-white truncate">
                              {friend.username}
                            </span>
                            {hasUnread && (
                              <span
                                className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0"
                                title={tr(lang, 'رسالة جديدة', 'New message')}
                              />
                            )}
                            {friend.vipTier !== 'none' && (
                              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-bold shrink-0 ${
                              friend.isOnline ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          >
                            {friend.isOnline
                              ? tr(lang, 'متصل الآن', 'Online')
                              : tr(lang, 'غير متصل', 'Offline')}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            hasUnread ? 'text-rose-200 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {friend.lastMessageText
                            ? friend.lastMessageText
                            : `ID: ${friend.playerId}`}
                        </div>
                      </div>
                    </div>

                    {hasUnread && (
                      <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white font-black text-[11px] font-mono-num flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/40">
                        {friend.unreadCount > 9 ? '9+' : friend.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Instant Private Chat Area */}
        <div
          className={`lg:col-span-8 bg-[#111827] border border-slate-800 rounded-2xl flex-col h-[560px] overflow-hidden ${
            mobileShowChat && activeFriend ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {!activeFriend ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#0B1120] border border-slate-800 flex items-center justify-center text-cyan-400">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-white">
                {tr(
                  lang,
                  'اختر صديقاً لبدء الدردشة المباشرة',
                  'Select a friend to start Live Chat'
                )}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                {tr(
                  lang,
                  'اضغط على أي صديق من القائمة الجانبية لإرسال واستقبال الرسائل الفورية مباشرة.',
                  'Click on any friend in the list to exchange instant real-time messages.'
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-[#0B1120] border-b border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back to Friends List */}
                  <button
                    type="button"
                    onClick={() => setMobileShowChat(false)}
                    className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer shrink-0"
                    aria-label={tr(lang, 'العودة لقائمة الأصدقاء', 'Back to friends')}
                  >
                    {lang === 'ar' ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronLeft className="w-4 h-4" />
                    )}
                  </button>

                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 rounded-xl bg-[#111827] border flex items-center justify-center text-2xl ${
                        activeFriend.isOnline
                          ? 'border-emerald-500/50'
                          : 'border-slate-700'
                      }`}
                    >
                      {activeFriend.country.flag}
                    </div>
                    <span
                      className={`w-3 h-3 rounded-full ring-2 ring-[#0B1120] absolute -bottom-0.5 -right-0.5 ${
                        activeFriend.isOnline
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.75)]'
                          : 'bg-slate-500'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-white truncate">
                        {activeFriend.username}
                      </h4>
                      {activeFriend.vipTier !== 'none' && (
                        <span className="text-[11px] font-extrabold text-amber-400 flex items-center gap-1 shrink-0">
                          <Crown className="w-3.5 h-3.5" />
                          <span>VIP</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                      {activeFriend.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-extrabold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{tr(lang, 'متصل الآن', 'Online now')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-400 font-bold">
                          <span className="w-2 h-2 rounded-full bg-slate-500" />
                          <span>
                            {tr(lang, 'غير متصل', 'Offline')}
                            {formatLastSeenLabel(activeFriend.lastSeenMs, lang)
                              ? ` · ${formatLastSeenLabel(activeFriend.lastSeenMs, lang)}`
                              : ''}
                          </span>
                        </span>
                      )}
                      <span className="text-slate-600">·</span>
                      <span className="font-mono-num">ID: {activeFriend.playerId}</span>
                      <span className="text-slate-600 hidden sm:inline">·</span>
                      <span className="hidden sm:inline">
                        {getCountryDisplayName(activeFriend.country, lang)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Error Banner (e.g. if Firestore rules haven't been published yet) */}
              {chatError && (
                <div className="px-4 py-2.5 bg-rose-950/80 border-b border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{chatError}</span>
                </div>
              )}

              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 bg-[#080C16]/70">
                {isLoadingMessages && activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    <span>
                      {tr(lang, 'جارٍ تحميل المحادثة...', 'Loading conversation...')}
                    </span>
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                    <MessageCircle className="w-10 h-10 text-slate-700" />
                    <div className="text-sm font-bold text-slate-300">
                      {tr(
                        lang,
                        `ابدأ المحادثة مع ${activeFriend.username}!`,
                        `Start chatting with ${activeFriend.username}!`
                      )}
                    </div>
                    <p className="text-xs text-slate-500 max-w-xs">
                      {tr(
                        lang,
                        'رسائلك تصل لصديقك فوراً وفي نفس اللحظة بدون الحاجة لتحديث الصفحة.',
                        'Your messages arrive instantly in real time with no refresh needed.'
                      )}
                    </p>
                  </div>
                ) : (
                  activeMessages.map((msg, idx) => {
                    // Authoritative sender check: strictly compare Firebase UIDs when present
                    const isMe =
                      authUid && msg.senderUid
                        ? msg.senderUid === authUid
                        : Boolean(profile.playerId && msg.senderId === profile.playerId);

                    const msgTimestampMs =
                      msg.createdAtServerMs ||
                      msg.createdAtMs ||
                      new Date(msg.createdAtIso).getTime() ||
                      Date.now();

                    const prevMsg = idx > 0 ? activeMessages[idx - 1] : null;
                    const prevTimestampMs = prevMsg
                      ? prevMsg.createdAtServerMs ||
                        prevMsg.createdAtMs ||
                        new Date(prevMsg.createdAtIso).getTime() ||
                        0
                      : 0;
                    const prevIsMe = prevMsg
                      ? authUid && prevMsg.senderUid
                        ? prevMsg.senderUid === authUid
                        : Boolean(profile.playerId && prevMsg.senderId === profile.playerId)
                      : null;

                    const showDayDivider =
                      !prevMsg ||
                      getCalendarDayKey(msgTimestampMs) !== getCalendarDayKey(prevTimestampMs);
                    const isFirstInSenderGroup = showDayDivider || prevIsMe !== isMe;

                    const timeStr = new Date(msgTimestampMs).toLocaleTimeString(
                      lang === 'ar' ? 'ar-SA' : 'en-US',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    );

                    return (
                      <React.Fragment key={msg.id}>
                        {showDayDivider && (
                          <div className="flex items-center justify-center my-3">
                            <span className="px-3 py-1 rounded-full bg-[#111827] border border-slate-800 text-[11px] font-bold text-slate-400">
                              {formatDayDividerLabel(msgTimestampMs, lang)}
                            </span>
                          </div>
                        )}

                        {/* Force dir="ltr" on row flex container so My messages are ALWAYS on the RIGHT and Friend's messages ALWAYS on the LEFT on both devices */}
                        <div
                          dir="ltr"
                          className={`flex items-end gap-2 w-full ${
                            isMe ? 'justify-end' : 'justify-start'
                          } ${isFirstInSenderGroup && !showDayDivider ? 'mt-3' : ''}`}
                        >
                          {!isMe && (
                            isFirstInSenderGroup ? (
                              <div className="w-7 h-7 rounded-lg bg-[#111827] border border-slate-700/80 flex items-center justify-center text-base shrink-0 mb-5">
                                {activeFriend.country.flag}
                              </div>
                            ) : (
                              <div className="w-7 shrink-0" aria-hidden="true" />
                            )
                          )}

                          <div
                            className={`flex flex-col max-w-[78%] sm:max-w-[72%] ${
                              isMe ? 'items-end' : 'items-start'
                            }`}
                          >
                            {!isMe && isFirstInSenderGroup && (
                              <span className="text-[11px] font-bold text-slate-400 px-1.5 mb-1">
                                {activeFriend.username}
                              </span>
                            )}

                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                isMe
                                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-semibold rounded-br-sm shadow-md shadow-cyan-500/15'
                                  : 'bg-[#1B263B] border border-slate-700/90 text-slate-100 font-medium rounded-bl-sm'
                              }`}
                            >
                              <p
                                dir="auto"
                                className="text-start whitespace-pre-wrap break-words leading-relaxed"
                              >
                                {msg.text}
                              </p>
                            </div>

                            <div
                              className={`flex items-center gap-1 mt-1 px-1 text-[11px] text-slate-400 font-mono-num ${
                                isMe ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <span>{timeStr}</span>
                              {isMe && <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => void handleSendChat(e)}
                className="p-3.5 bg-[#0B1120] border-t border-slate-800 flex items-center gap-2.5"
              >
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={tr(
                    lang,
                    `اكتب رسالة فورية إلى ${activeFriend.username}...`,
                    `Write a live message to ${activeFriend.username}...`
                  )}
                  maxLength={500}
                  className="flex-1 px-4 py-3 rounded-xl bg-[#111827] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || isSendingMessage}
                  className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                >
                  {isSendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{tr(lang, 'إرسال', 'Send')}</span>
                      {lang === 'ar' ? (
                        <ArrowLeft className="w-4 h-4" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
