import React, { useState, useRef, useEffect } from 'react';
import { AppLanguage, ChatMessage, FriendContact, PlayerProfile } from '../types/game';
import { SIMULATED_COMPETITORS, storageRepo } from '../services/storageRepository';
import { soundEngine } from '../utils/sound';
import { getCountryDisplayName, tr } from '../utils/i18n';
import {
  UserPlus,
  MessageCircle,
  Send,
  Crown,
  CheckCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

interface FriendsAndChatViewProps {
  profile: PlayerProfile;
  lang: AppLanguage;
  onAddFriend: (
    identifier: string
  ) => Promise<
    { ok: true; friend: FriendContact } | { ok: false; error: string }
  >;
  onSendMessage: (friend: FriendContact, text: string) => void;
  onSelectFriendThread: (friendId: string) => void;
  onCloudMessagesReceived?: (friendId: string, messages: ChatMessage[]) => void;
}

export const FriendsAndChatView: React.FC<FriendsAndChatViewProps> = ({
  profile,
  lang,
  onAddFriend,
  onSendMessage,
  onSelectFriendThread,
  onCloudMessagesReceived,
}) => {
  const [friendQuery, setFriendQuery] = useState('');
  const [isSearchingCloud, setIsSearchingCloud] = useState(false);
  const [addFeedback, setAddFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [activeFriendId, setActiveFriendId] = useState<string | null>(
    () => profile.friends[0]?.playerId || null
  );
  const [messageInput, setMessageInput] = useState('');
  const [isFriendTyping, setIsFriendTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeFriend =
    profile.friends.find((f) => f.playerId === activeFriendId) || null;
  const activeMessages: ChatMessage[] = activeFriend
    ? profile.chatThreads[activeFriend.playerId] || []
    : [];

  // Subscribe to real-time Firestore chat messages (chats/{chatId}/messages) when a friend is active
  useEffect(() => {
    if (!activeFriend) return;
    const unsubscribe = storageRepo.subscribeToPrivateChatMessages(
      profile.playerId,
      activeFriend.playerId,
      (cloudMsgs) => {
        onCloudMessagesReceived?.(activeFriend.playerId, cloudMsgs);
      }
    );
    return () => unsubscribe();
  }, [profile.playerId, activeFriend?.playerId, onCloudMessagesReceived]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, isFriendTyping, activeFriendId]);

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSearchingCloud) return;
    setIsSearchingCloud(true);
    try {
      const res = await onAddFriend(friendQuery);
      if (!res.ok) {
        soundEngine.playWrong();
        setAddFeedback({ type: 'err', text: res.error });
        return;
      }

      soundEngine.playReward();
      setFriendQuery('');
      setActiveFriendId(res.friend.playerId);
      onSelectFriendThread(res.friend.playerId);
      setAddFeedback({
        type: 'ok',
        text: tr(
          lang,
          `تمت إضافة «${res.friend.username}» إلى قائمة الأصدقاء وفتح الدردشة الخاصة!`,
          `Added "${res.friend.username}" to your friends list and opened Private Chat!`
        ),
      });
      window.setTimeout(() => setAddFeedback(null), 3000);
    } finally {
      setIsSearchingCloud(false);
    }
  };

  const handleQuickAddSuggested = async (identifier: string) => {
    if (isSearchingCloud) return;
    setIsSearchingCloud(true);
    try {
      const res = await onAddFriend(identifier);
      if (!res.ok) {
        soundEngine.playWrong();
        setAddFeedback({ type: 'err', text: res.error });
        return;
      }
      soundEngine.playReward();
      setActiveFriendId(res.friend.playerId);
      onSelectFriendThread(res.friend.playerId);
      setAddFeedback({
        type: 'ok',
        text: tr(
          lang,
          `تمت إضافة «${res.friend.username}» بنجاح!`,
          `Added "${res.friend.username}" successfully!`
        ),
      });
      window.setTimeout(() => setAddFeedback(null), 2500);
    } finally {
      setIsSearchingCloud(false);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFriend || !messageInput.trim()) return;
    const textToSend = messageInput.trim();
    setMessageInput('');
    soundEngine.playClick();
    setIsFriendTyping(true);
    onSendMessage(activeFriend, textToSend);
    window.setTimeout(() => {
      setIsFriendTyping(false);
    }, 1100);
  };

  // Suggested arena players not yet in friends list
  const suggestedPlayers = SIMULATED_COMPETITORS.filter(
    (c) =>
      c.playerId !== profile.playerId &&
      !profile.friends.some((f) => f.playerId === c.playerId)
  ).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Header & Add Friend by Player ID or Username */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-cyan-400 font-bold flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              <span>
                {tr(
                  lang,
                  'التواصل الفوري بين الأبطال · جاهز للمزامنة السحابية',
                  'Instant Arena Messaging · Cloud Sync Ready'
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

        {/* Add Friend Form */}
        <form onSubmit={handleAddFriendSubmit} className="space-y-3">
          <label className="block text-xs font-bold text-slate-300">
            {tr(
              lang,
              'إضافة صديق جديد عبر كود التعريف الفريد (Player ID) أو اسم المستخدم:',
              'Add a friend via unique 10-digit Player ID or Username:'
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
                'أدخل كود اللاعب (مثال: 9841205731) أو اسم المستخدم...',
                'Enter 10-digit Player ID (e.g., 9841205731) or Username...'
              )}
              className="flex-1 px-4 py-3 rounded-xl bg-[#0B1120] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>{tr(lang, 'إضافة صديق', 'Add Friend')}</span>
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

        {/* Quick-Add Suggested Arena Players */}
        {suggestedPlayers.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
            <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {tr(
                  lang,
                  'لاعبون نشطون في قمة التحدي (إضافة سريعة):',
                  'Active Arena Players (Quick Add):'
                )}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {suggestedPlayers.map((sp) => (
                <div
                  key={sp.playerId}
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
                    onClick={() => handleQuickAddSuggested(sp.playerId)}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 text-[11px] font-extrabold transition-colors cursor-pointer shrink-0"
                  >
                    + {tr(lang, 'إضافة', 'Add')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Split View: Friends List + Private Chat Window */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Friends Sidebar List */}
        <div className="lg:col-span-4 bg-[#111827] border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col max-h-[560px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 px-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-extrabold text-white">
                {tr(lang, 'قائمة الأصدقاء', 'Friends List')} ({profile.friends.length})
              </h3>
            </div>
          </div>

          {profile.friends.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
              <Users className="w-10 h-10 text-slate-600" />
              <div className="text-sm font-bold text-slate-300">
                {tr(lang, 'لا يوجد أصدقاء مضافون بعد', 'No friends added yet')}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {tr(
                  lang,
                  'أضف أصدقاءك عبر كود اللاعب (Player ID) أو الاسم لبدء الدردشة الخاصة.',
                  'Add friends using their 10-digit Player ID or Username to start chatting.'
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {profile.friends.map((friend) => {
                const isSelected = activeFriend?.playerId === friend.playerId;
                const thread = profile.chatThreads[friend.playerId] || [];
                const lastMsg = thread[thread.length - 1];

                return (
                  <button
                    key={friend.playerId}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveFriendId(friend.playerId);
                      onSelectFriendThread(friend.playerId);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-start transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400 text-white'
                        : 'bg-[#0B1120] border-slate-800/90 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-xl bg-[#111827] border border-slate-700 flex items-center justify-center text-2xl">
                          {friend.country.flag}
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0B1120] absolute -bottom-0.5 -right-0.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-extrabold text-white truncate">
                            {friend.username}
                          </span>
                          {friend.vipTier !== 'none' && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {lastMsg
                            ? lastMsg.text
                            : `ID: ${friend.playerId}`}
                        </div>
                      </div>
                    </div>

                    {friend.unreadCount > 0 && !isSelected && (
                      <span className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0">
                        {friend.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Private Chat Area */}
        <div className="lg:col-span-8 bg-[#111827] border border-slate-800 rounded-2xl flex flex-col h-[560px] overflow-hidden">
          {!activeFriend ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#0B1120] border border-slate-800 flex items-center justify-center text-cyan-400">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-white">
                {tr(lang, 'اختر صديقاً لبدء الدردشة الخاصة', 'Select a friend to start Private Chat')}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                {tr(
                  lang,
                  'اضغط على أي صديق من القائمة الجانبية أو أضف صديقاً جديداً بكود اللاعب لفتح المحادثة الفورية.',
                  'Click on any friend in the list or add a new friend by Player ID to open instant messaging.'
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-[#0B1120] border-b border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#111827] border border-cyan-500/40 flex items-center justify-center text-2xl">
                    {activeFriend.country.flag}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-white">
                        {activeFriend.username}
                      </h4>
                      {activeFriend.vipTier !== 'none' && (
                        <span className="text-[11px] font-extrabold text-amber-400 flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" />
                          <span>VIP</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono-num">
                      <span>ID: {activeFriend.playerId}</span>
                      <span>·</span>
                      <span>{getCountryDisplayName(activeFriend.country, lang)}</span>
                      <span>·</span>
                      <span className="text-emerald-400 font-bold">
                        {tr(lang, 'متصل الآن', 'Online')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#080C16]/60">
                {activeMessages.map((msg) => {
                  const isMe = msg.senderId === profile.playerId;
                  const timeStr = new Date(msg.createdAtIso).toLocaleTimeString(
                    lang === 'ar' ? 'ar-SA' : 'en-US',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  );

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-l from-cyan-500 to-blue-600 text-slate-950 font-bold rounded-ee-sm'
                            : 'bg-[#1E293B] border border-slate-700/80 text-slate-100 rounded-es-sm'
                        }`}
                      >
                        <p>{msg.text}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-500 font-mono-num">
                        <span>{timeStr}</span>
                        {isMe && <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                    </div>
                  );
                })}

                {isFriendTyping && (
                  <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold px-2">
                    <span>
                      {tr(
                        lang,
                        `${activeFriend.username} يكتب الآن...`,
                        `${activeFriend.username} is typing...`
                      )}
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendChat}
                className="p-3.5 bg-[#0B1120] border-t border-slate-800 flex items-center gap-2.5"
              >
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={tr(
                    lang,
                    `اكتب رسالة خاصة إلى ${activeFriend.username}...`,
                    `Write a private message to ${activeFriend.username}...`
                  )}
                  maxLength={300}
                  className="flex-1 px-4 py-3 rounded-xl bg-[#111827] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                >
                  <span>{tr(lang, 'إرسال', 'Send')}</span>
                  {lang === 'ar' ? (
                    <ArrowLeft className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
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
