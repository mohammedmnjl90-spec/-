import React, { useState, useEffect, useMemo } from 'react';
import { AppLanguage, LeaderboardEntry, PlayerProfile } from '../types/game';
import { storageRepo } from '../services/storageRepository';
import { soundEngine } from '../utils/sound';
import { getCountryDisplayName, tr } from '../utils/i18n';
import { Trophy, Crown, Gift, Clock } from 'lucide-react';

interface LeaderboardAndPrizesViewProps {
  profile: PlayerProfile;
  lang: AppLanguage;
}

interface TopPrizeItem {
  rank: number;
  medal: string;
  rankLabelAr: string;
  rankLabelEn: string;
  prizeNameAr: string;
  prizeNameEn: string;
  accentClass: string;
}

// Ordered from highest to lowest with ONLY the exact prize names (no prices, models, or specific types)
const TOP_5_MONTHLY_PRIZES: TopPrizeItem[] = [
  {
    rank: 1,
    medal: '🥇',
    rankLabelAr: 'المركز الأول 🥇',
    rankLabelEn: '1st Place 🥇',
    prizeNameAr: 'لابتوب',
    prizeNameEn: 'Laptop',
    accentClass: 'border-amber-400/70 bg-gradient-to-l from-amber-500/20 to-[#0B1120]',
  },
  {
    rank: 2,
    medal: '🥈',
    rankLabelAr: 'المركز الثاني 🥈',
    rankLabelEn: '2nd Place 🥈',
    prizeNameAr: 'آيفون',
    prizeNameEn: 'iPhone',
    accentClass: 'border-slate-300/60 bg-gradient-to-l from-slate-400/15 to-[#0B1120]',
  },
  {
    rank: 3,
    medal: '🥉',
    rankLabelAr: 'المركز الثالث 🥉',
    rankLabelEn: '3rd Place 🥉',
    prizeNameAr: 'بلايستيشن 5',
    prizeNameEn: 'PlayStation 5',
    accentClass: 'border-amber-700/70 bg-gradient-to-l from-amber-700/20 to-[#0B1120]',
  },
  {
    rank: 4,
    medal: '🏅',
    rankLabelAr: 'المركز الرابع 🏅',
    rankLabelEn: '4th Place 🏅',
    prizeNameAr: 'آيباد',
    prizeNameEn: 'iPad',
    accentClass: 'border-cyan-500/50 bg-[#0B1120]',
  },
  {
    rank: 5,
    medal: '🎖️',
    rankLabelAr: 'المركز الخامس 🎖️',
    rankLabelEn: '5th Place 🎖️',
    prizeNameAr: 'شاشة تلفزيون',
    prizeNameEn: 'TV Screen',
    accentClass: 'border-purple-500/50 bg-[#0B1120]',
  },
];

function getRemainingMonthTime(): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  const diffMs = Math.max(0, endOfMonth.getTime() - now.getTime());

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}

export const LeaderboardAndPrizesView: React.FC<LeaderboardAndPrizesViewProps> = ({
  profile,
  lang,
}) => {
  const [subTab, setSubTab] = useState<'ranking' | 'prizes'>('ranking');
  const [countdown, setCountdown] = useState(() => getRemainingMonthTime());
  const [cloudEntries, setCloudEntries] = useState<LeaderboardEntry[]>([]);

  // Update month-end countdown calmly every 60 seconds
  useEffect(() => {
    const interval = window.setInterval(() => {
      setCountdown(getRemainingMonthTime());
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  // Subscribe ONCE to live Cloud Firestore leaderboard — NEVER re-subscribe on volatile profile renders!
  useEffect(() => {
    const unsubscribe = storageRepo.subscribeToLiveLeaderboardRaw((liveCloud) => {
      setCloudEntries(liveCloud);
    });
    return () => unsubscribe();
  }, []);

  // Deterministically merge live cloud entries with the current player's up-to-date profile
  const entries = useMemo(() => {
    return storageRepo.mergeLeaderboardEntries(profile, cloudEntries);
  }, [
    cloudEntries,
    profile.uid,
    profile.playerId,
    profile.username,
    profile.country.code,
    profile.monthlyPoints,
    profile.xp,
    profile.vipTier,
  ]);

  const currentUserRank = Math.max(1, entries.findIndex((e) => e.isCurrentUser) + 1);

  return (
    <div className="space-y-5 pb-4">
      {/* 1. Compact Header & Monthly Season Countdown */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-1.5">
          <div className="text-xs text-cyan-400 font-semibold">
            {tr(lang, 'التصنيف التنافسي الشهري', 'Monthly Competitive Season')} ·{' '}
            {profile.currentMonthKey}
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white">
            {tr(lang, 'قائمة المتصدرين وجوائز الشهر', 'Monthly Leaderboard & Prizes')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {tr(
              lang,
              'اجمع النقاط الرسمية من الجولات لتتصدر الترتيب الشهري وتنافس على جوائز المراكز الخمسة الأولى.',
              'Collect official points across rounds to top the monthly ranking and compete for the Top 5 prizes.'
            )}
          </p>
        </div>

        {/* Countdown Box */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center gap-3.5 shrink-0">
          <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 shrink-0" />
          <div>
            <div className="text-[11px] sm:text-xs text-slate-400">
              {tr(lang, 'الوقت المتبقي لنهاية الموسم الشهري:', 'Time remaining in monthly season:')}
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 pt-1 font-mono-num">
              <div>
                <span className="text-lg sm:text-xl font-black text-white">{countdown.days}</span>
                <span className="text-[11px] sm:text-xs text-slate-400 mx-1">
                  {tr(lang, 'يوم', 'd')}
                </span>
              </div>
              <span className="text-slate-600">:</span>
              <div>
                <span className="text-lg sm:text-xl font-black text-cyan-400">{countdown.hours}</span>
                <span className="text-[11px] sm:text-xs text-slate-400 mx-1">
                  {tr(lang, 'ساعة', 'h')}
                </span>
              </div>
              <span className="text-slate-600">:</span>
              <div>
                <span className="text-lg sm:text-xl font-black text-amber-400">{countdown.minutes}</span>
                <span className="text-[11px] sm:text-xs text-slate-400 mx-1">
                  {tr(lang, 'دقيقة', 'm')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sticky Native-App Sub-Navigation & Current Rank Summary */}
      <div className="sticky top-[62px] z-20 -mx-1 px-1 py-2 bg-[#080C16]/92 backdrop-blur-md border-b border-slate-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="grid grid-cols-2 sm:inline-flex p-1 rounded-xl bg-[#111827] border border-slate-800 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('ranking');
              }}
              className={`px-3 sm:px-5 py-2.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                subTab === 'ranking'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>{tr(lang, 'ترتيب المتصدرين', 'Leaderboard')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setSubTab('prizes');
              }}
              className={`px-3 sm:px-5 py-2.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                subTab === 'prizes'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Gift className="w-4 h-4 shrink-0" />
              <span>{tr(lang, 'جوائز الشهر', 'Top 5 Prizes')}</span>
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-300 bg-[#111827] border border-slate-800 px-3.5 py-2 rounded-xl font-mono-num">
            <span>
              {tr(lang, 'مركزك:', 'Rank:')}{' '}
              <span className="text-cyan-400 font-black">#{currentUserRank}</span>
            </span>
            <span className="text-slate-700">|</span>
            <span>
              {tr(lang, 'نقاطك:', 'Points:')}{' '}
              <span className="text-amber-400 font-black">
                {profile.monthlyPoints} {tr(lang, 'نقطة', 'pts')}
              </span>
            </span>
          </div>
        </div>
      </div>

      {subTab === 'ranking' ? (
        <div className="space-y-5">
          {/* Top 5 Prizes Quick Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
            {TOP_5_MONTHLY_PRIZES.map((p, i) => (
              <div
                key={p.rank}
                className={`p-3 rounded-xl border text-center space-y-0.5 ${p.accentClass} ${
                  i === 4 ? 'col-span-2 sm:col-span-1' : ''
                }`}
              >
                <div className="text-[11px] font-bold text-slate-300">
                  {tr(lang, p.rankLabelAr, p.rankLabelEn)}
                </div>
                <div className="text-sm sm:text-base font-black text-white">
                  {tr(lang, p.prizeNameAr, p.prizeNameEn)}
                </div>
              </div>
            ))}
          </div>

          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
            {entries.slice(0, 3).map((item, idx) => {
              const rank = idx + 1;
              const isGold = rank === 1;
              const isSilver = rank === 2;
              const prizeObj = TOP_5_MONTHLY_PRIZES[idx];
              return (
                <div
                  key={item.playerId}
                  className={`p-4 sm:p-5 rounded-2xl border relative flex flex-col justify-between gap-3.5 ${
                    isGold
                      ? 'bg-gradient-to-b from-amber-500/15 to-[#111827] border-amber-400/50'
                      : isSilver
                      ? 'bg-gradient-to-b from-slate-400/10 to-[#111827] border-slate-400/40'
                      : 'bg-gradient-to-b from-amber-700/15 to-[#111827] border-amber-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-black font-mono-num ${
                        isGold
                          ? 'text-amber-400'
                          : isSilver
                          ? 'text-slate-300'
                          : 'text-amber-600'
                      }`}
                    >
                      {tr(lang, prizeObj.rankLabelAr, prizeObj.rankLabelEn)}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#0B1120] border border-slate-700 text-xs font-extrabold text-amber-300 whitespace-nowrap">
                      🎁 {tr(lang, prizeObj.prizeNameAr, prizeObj.prizeNameEn)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-3xl shrink-0">{item.country.flag}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-extrabold text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{item.username}</span>
                        {item.vipTier !== 'none' && (
                          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        {item.isCurrentUser && (
                          <span className="text-xs text-cyan-400 shrink-0">
                            ({tr(lang, 'أنت', 'You')})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {getCountryDisplayName(item.country, lang)} ·{' '}
                        {lang === 'en' ? item.rankTitleEn || item.rankTitle : item.rankTitle}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono-num">ID: {item.playerId}</span>
                    <span className="text-base font-black text-amber-400 font-mono-num">
                      {item.monthlyPoints} {tr(lang, 'نقطة', 'pts')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Native-App Full Ranking List (Zero Horizontal Scrollbar / Zero Nested Scroll Trap) */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
            {/* List Header */}
            <div className="bg-[#0B1120] border-b border-slate-800 px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-400">
              <div className="flex items-center gap-3">
                <span className="w-9 text-center">{tr(lang, 'المركز', 'Rank')}</span>
                <span>{tr(lang, 'اللاعب', 'Player')}</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="hidden md:inline-block w-28 text-center">
                  {tr(lang, 'الجائزة', 'Prize')}
                </span>
                <span className="min-w-[64px] text-end">
                  {tr(lang, 'النقاط', 'Points')}
                </span>
              </div>
            </div>

            {/* Smooth Native Ranked Rows */}
            <div className="divide-y divide-slate-800/70">
              {entries.map((entry, idx) => {
                const rank = idx + 1;
                const prizeItem = TOP_5_MONTHLY_PRIZES.find((p) => p.rank === rank);
                const rankBadgeClass =
                  rank === 1
                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-300'
                    : rank === 2
                    ? 'bg-slate-300/15 border-slate-300/40 text-slate-200'
                    : rank === 3
                    ? 'bg-amber-700/20 border-amber-600/50 text-amber-400'
                    : rank <= 5
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-[#0B1120] border-slate-800 text-slate-400';

                return (
                  <div
                    key={entry.playerId}
                    className={`px-3.5 sm:px-4 py-3 flex items-center justify-between gap-2.5 transition-colors ${
                      entry.isCurrentUser
                        ? 'bg-cyan-500/12 border-s-2 border-cyan-400'
                        : 'hover:bg-slate-800/35'
                    }`}
                  >
                    {/* Left/Start: Rank + Flag + Player Details */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl border font-mono-num text-xs font-black flex items-center justify-center shrink-0 ${rankBadgeClass}`}
                      >
                        #{rank}
                      </div>

                      <div className="w-9 h-9 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center justify-center text-xl shrink-0">
                        {entry.country.flag}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-extrabold text-white truncate">
                            {entry.username}
                          </span>
                          {entry.vipTier !== 'none' && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          {entry.isCurrentUser && (
                            <span className="text-[11px] font-extrabold text-cyan-400 shrink-0">
                              ({tr(lang, 'حسابك', 'You')})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mt-0.5">
                          <span className="truncate">
                            {getCountryDisplayName(entry.country, lang)}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="font-mono-num text-slate-500 shrink-0">
                            {entry.playerId}
                          </span>
                        </div>
                        {prizeItem && (
                          <div className="md:hidden mt-1 text-[11px] font-extrabold text-amber-300 truncate">
                            {prizeItem.medal}{' '}
                            {tr(lang, prizeItem.prizeNameAr, prizeItem.prizeNameEn)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right/End: Desktop Prize + Points */}
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                      <div className="hidden md:block w-28 text-center text-xs font-extrabold">
                        {prizeItem ? (
                          <span className="text-amber-300">
                            {prizeItem.medal}{' '}
                            {tr(lang, prizeItem.prizeNameAr, prizeItem.prizeNameEn)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>

                      <div className="min-w-[60px] text-end">
                        <div className="font-mono-num font-black text-base sm:text-lg text-amber-400 leading-none">
                          {entry.monthlyPoints}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                          {tr(lang, 'نقطة', 'pts')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Top 5 Monthly Prizes View — Ordered from Highest to Lowest (Exact Names Only) */
        <div className="space-y-3.5">
          {TOP_5_MONTHLY_PRIZES.map((prize) => (
            <div
              key={prize.rank}
              className={`p-5 sm:p-6 rounded-2xl border flex items-center justify-between gap-4 ${prize.accentClass}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#111827] border border-slate-700 flex items-center justify-center text-3xl shrink-0">
                  {prize.medal}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-amber-400">
                    {tr(lang, prize.rankLabelAr, prize.rankLabelEn)}
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white mt-0.5">
                    {tr(lang, prize.prizeNameAr, prize.prizeNameEn)}
                  </h3>
                </div>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-[#111827] border border-slate-800 text-xs font-mono-num font-extrabold text-cyan-400 shrink-0">
                #{prize.rank}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
