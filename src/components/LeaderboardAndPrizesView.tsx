import React, { useState, useEffect } from 'react';
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
  const [entries, setEntries] = useState<LeaderboardEntry[]>(() =>
    storageRepo.getLeaderboardWithUser(profile)
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCountdown(getRemainingMonthTime());
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setEntries(storageRepo.getLeaderboardWithUser(profile));
    const unsubscribe = storageRepo.subscribeToLiveLeaderboard(
      profile,
      (liveEntries) => {
        setEntries(liveEntries);
      }
    );
    return () => unsubscribe();
  }, [profile]);

  const currentUserRank = Math.max(1, entries.findIndex((e) => e.isCurrentUser) + 1);

  return (
    <div className="space-y-6">
      {/* Header & Monthly Season Countdown */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs text-cyan-400 font-semibold">
            {tr(lang, 'التصنيف التنافسي الشهري', 'Monthly Competitive Season')} ·{' '}
            {profile.currentMonthKey}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white">
            {tr(lang, 'قائمة المتصدرين وجوائز الشهر', 'Monthly Leaderboard & Prizes')}
          </h2>
          <p className="text-sm text-slate-400">
            {tr(
              lang,
              'اجمع النقاط الرسمية من الجولات لتتصدر الترتيب الشهري وتنافس على جوائز المراكز الخمسة الأولى.',
              'Collect official points across rounds to top the monthly ranking and compete for the Top 5 prizes.'
            )}
          </p>
        </div>

        {/* Countdown Box */}
        <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center gap-4 shrink-0">
          <Clock className="w-8 h-8 text-amber-400 shrink-0" />
          <div>
            <div className="text-xs text-slate-400">
              {tr(lang, 'الوقت المتبقي لنهاية الموسم الشهري:', 'Time remaining in monthly season:')}
            </div>
            <div className="flex items-center gap-3 pt-1 font-mono-num">
              <div>
                <span className="text-xl font-black text-white">{countdown.days}</span>
                <span className="text-xs text-slate-400 mx-1">
                  {tr(lang, 'يوم', 'd')}
                </span>
              </div>
              <span className="text-slate-600">:</span>
              <div>
                <span className="text-xl font-black text-cyan-400">{countdown.hours}</span>
                <span className="text-xs text-slate-400 mx-1">
                  {tr(lang, 'ساعة', 'h')}
                </span>
              </div>
              <span className="text-slate-600">:</span>
              <div>
                <span className="text-xl font-black text-amber-400">{countdown.minutes}</span>
                <span className="text-xs text-slate-400 mx-1">
                  {tr(lang, 'دقيقة', 'm')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-navigation between Leaderboard and Top 5 Prizes */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="inline-flex p-1 rounded-xl bg-[#111827] border border-slate-800">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setSubTab('ranking');
            }}
            className={`px-5 py-2.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              subTab === 'ranking'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>{tr(lang, 'ترتيب المتصدرين الشهري', 'Monthly Leaderboard')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setSubTab('prizes');
            }}
            className={`px-5 py-2.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              subTab === 'prizes'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>{tr(lang, 'جوائز المراكز الخمسة الأولى', 'Top 5 Monthly Prizes')}</span>
          </button>
        </div>

        <div className="text-xs text-slate-300 bg-[#111827] border border-slate-800 px-4 py-2.5 rounded-xl font-mono-num">
          {tr(lang, 'مركزك الحالي:', 'Your Rank:')}{' '}
          <span className="text-cyan-400 font-black">#{currentUserRank}</span> ·{' '}
          {tr(lang, 'نقاطك الشهرية:', 'Monthly Points:')}{' '}
          <span className="text-amber-400 font-black">
            {profile.monthlyPoints} {tr(lang, 'نقطة', 'pts')}
          </span>
        </div>
      </div>

      {subTab === 'ranking' ? (
        <div className="space-y-6">
          {/* Top 5 Prizes Quick Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {TOP_5_MONTHLY_PRIZES.map((p) => (
              <div
                key={p.rank}
                className={`p-3.5 rounded-xl border text-center space-y-1 ${p.accentClass}`}
              >
                <div className="text-xs font-bold text-slate-300">
                  {tr(lang, p.rankLabelAr, p.rankLabelEn)}
                </div>
                <div className="text-base font-black text-white">
                  {tr(lang, p.prizeNameAr, p.prizeNameEn)}
                </div>
              </div>
            ))}
          </div>

          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {entries.slice(0, 3).map((item, idx) => {
              const rank = idx + 1;
              const isGold = rank === 1;
              const isSilver = rank === 2;
              const prizeObj = TOP_5_MONTHLY_PRIZES[idx];
              return (
                <div
                  key={item.playerId}
                  className={`p-5 rounded-2xl border relative flex flex-col justify-between gap-4 ${
                    isGold
                      ? 'bg-gradient-to-b from-amber-500/15 to-[#111827] border-amber-400/50'
                      : isSilver
                      ? 'bg-gradient-to-b from-slate-400/10 to-[#111827] border-slate-400/40'
                      : 'bg-gradient-to-b from-amber-700/15 to-[#111827] border-amber-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
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
                    <span className="px-2.5 py-1 rounded-lg bg-[#0B1120] border border-slate-700 text-xs font-extrabold text-amber-300">
                      🎁 {tr(lang, prizeObj.prizeNameAr, prizeObj.prizeNameEn)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.country.flag}</span>
                    <div className="min-w-0">
                      <div className="text-base font-extrabold text-white truncate flex items-center gap-1.5">
                        <span>{item.username}</span>
                        {item.vipTier !== 'none' && (
                          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        {item.isCurrentUser && (
                          <span className="text-xs text-cyan-400">
                            ({tr(lang, 'أنت', 'You')})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
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

          {/* Full Ranking Table */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-[#0B1120] border-b border-slate-800 text-xs text-slate-400">
                  <tr>
                    <th className="py-3.5 px-4 font-bold text-start">
                      {tr(lang, 'المركز', 'Rank')}
                    </th>
                    <th className="py-3.5 px-4 font-bold text-start">
                      {tr(lang, 'اللاعب', 'Player')}
                    </th>
                    <th className="py-3.5 px-4 font-bold text-start">
                      {tr(lang, 'الدولة', 'Country')}
                    </th>
                    <th className="py-3.5 px-4 font-bold text-start">
                      {tr(lang, 'الجائزة', 'Prize')}
                    </th>
                    <th className="py-3.5 px-4 font-bold text-end">
                      {tr(lang, 'النقاط الشهرية', 'Monthly Points')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {entries.map((entry, idx) => {
                    const rank = idx + 1;
                    const prizeItem = TOP_5_MONTHLY_PRIZES.find((p) => p.rank === rank);
                    return (
                      <tr
                        key={entry.playerId}
                        className={`transition-colors ${
                          entry.isCurrentUser
                            ? 'bg-cyan-500/10 hover:bg-cyan-500/15'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono-num font-black">
                          <span
                            className={
                              rank === 1
                                ? 'text-amber-400'
                                : rank === 2
                                ? 'text-slate-300'
                                : rank === 3
                                ? 'text-amber-600'
                                : rank <= 5
                                ? 'text-cyan-400'
                                : 'text-slate-400'
                            }
                          >
                            #{rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{entry.username}</span>
                            {entry.vipTier !== 'none' && (
                              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                            )}
                            {entry.isCurrentUser && (
                              <span className="text-xs text-cyan-400 font-extrabold">
                                · {tr(lang, 'حسابك', 'You')}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono-num">
                            ID: {entry.playerId}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-300 whitespace-nowrap">
                          <span className="mx-1 text-base">{entry.country.flag}</span>
                          <span>{getCountryDisplayName(entry.country, lang)}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-extrabold">
                          {prizeItem ? (
                            <span className="text-amber-300">
                              {prizeItem.medal} {tr(lang, prizeItem.prizeNameAr, prizeItem.prizeNameEn)}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono-num font-black text-base text-amber-400">
                          {entry.monthlyPoints}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Top 5 Monthly Prizes View — Ordered from Highest to Lowest (Exact Names Only) */
        <div className="space-y-4">
          {TOP_5_MONTHLY_PRIZES.map((prize) => (
            <div
              key={prize.rank}
              className={`p-6 rounded-2xl border flex items-center justify-between gap-4 ${prize.accentClass}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#111827] border border-slate-700 flex items-center justify-center text-3xl shrink-0">
                  {prize.medal}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-amber-400">
                    {tr(lang, prize.rankLabelAr, prize.rankLabelEn)}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-white mt-0.5">
                    {tr(lang, prize.prizeNameAr, prize.prizeNameEn)}
                  </h3>
                </div>
              </div>

              <div className="px-4 py-2 rounded-xl bg-[#111827] border border-slate-800 text-xs font-mono-num font-extrabold text-cyan-400">
                #{prize.rank}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
