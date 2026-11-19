import React, { useState } from 'react';
import { AppLanguage, CountryInfo, PlayerProfile } from '../types/game';
import { filterCountriesByQuery } from '../data/countries';
import {
  BADGES_CATALOG,
  calculateLevelAndRank,
  getIdentityChangeCooldownDays,
  storageRepo,
} from '../services/storageRepository';
import { soundEngine } from '../utils/sound';
import { getCountryDisplayName, tr } from '../utils/i18n';
import {
  Copy,
  Share2,
  Check,
  Volume2,
  VolumeX,
  Smartphone,
  Award,
  History,
  Settings,
  Save,
  AlertCircle,
  Search,
  Headphones,
  LogOut,
  Lock,
  Globe,
  Crown,
  ShieldCheck,
} from 'lucide-react';

interface ProfileAndSettingsViewProps {
  profile: PlayerProfile;
  lang: AppLanguage;
  onUpdateIdentity: (newUsername: string, newCountry: CountryInfo) => void;
  onUpdateSettings: (
    soundEnabled: boolean,
    vibrationEnabled: boolean,
    language: AppLanguage
  ) => void;
  onOpenCustomerSupport: () => void;
  onOpenFirebaseSecurity?: () => void;
  onRequestLogoutAccount: () => void;
}

export const ProfileAndSettingsView: React.FC<ProfileAndSettingsViewProps> = ({
  profile,
  lang,
  onUpdateIdentity,
  onUpdateSettings,
  onOpenCustomerSupport,
  onOpenFirebaseSecurity,
  onRequestLogoutAccount,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [sharedStatus, setSharedStatus] = useState<string | null>(null);

  const [editUsername, setEditUsername] = useState(profile.username);
  const [editCountry, setEditCountry] = useState<CountryInfo>(profile.country);
  const [countrySearch, setCountrySearch] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const levelInfo = calculateLevelAndRank(profile.xp);
  const remainingCooldownDays = getIdentityChangeCooldownDays(profile.lastIdentityChangeAt);
  const isIdentityLocked = remainingCooldownDays > 0;

  const accuracyPercent =
    profile.stats.totalQuestionsAnswered > 0
      ? Math.round(
          (profile.stats.totalCorrectAnswers / profile.stats.totalQuestionsAnswered) * 100
        )
      : 0;

  const filteredCountries = filterCountriesByQuery(countrySearch);

  const handleCopyPlayerId = async () => {
    soundEngine.playClick();
    try {
      await navigator.clipboard.writeText(profile.playerId);
      setCopiedId(true);
      window.setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setCopiedId(true);
      window.setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSharePlayerId = async () => {
    soundEngine.playClick();
    const shareText = tr(
      lang,
      `انضم إليّ في تطبيق «قمة التحدي»! اسم اللاعب: ${profile.username} (${profile.country.flag}) — كود التعريف (Player ID): ${profile.playerId}`,
      `Join me in "Peak of Challenge"! Player: ${profile.username} (${profile.country.flag}) — Player ID: ${profile.playerId}`
    );
    if (navigator.share) {
      try {
        await navigator.share({
          title: tr(lang, 'قمة التحدي - كود اللاعب', 'Peak of Challenge - Player ID'),
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setSharedStatus(
        tr(lang, 'تم نسخ بطاقة التعريف للمشاركة!', 'Player card copied for sharing!')
      );
      window.setTimeout(() => setSharedStatus(null), 2500);
    } catch {
      setSharedStatus(tr(lang, 'تم تجهيز بطاقة التعريف!', 'Player card ready!'));
      window.setTimeout(() => setSharedStatus(null), 2500);
    }
  };

  const showCooldownBlockedMessage = () => {
    soundEngine.playWrong();
    setSaveMessage({
      type: 'err',
      text: tr(
        lang,
        `يمكنك تغيير الاسم والدولة مرة واحدة كل 50 يوماً. متبقي لك ${remainingCooldownDays} يوم`,
        `You can only change your username and country once every 50 days. ${remainingCooldownDays} days remaining.`
      ),
    });
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isIdentityLocked) {
      showCooldownBlockedMessage();
      return;
    }

    const trimmed = editUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setSaveMessage({
        type: 'err',
        text: tr(
          lang,
          'يجب أن يتراوح اسم المستخدم بين 3 و 20 حرفاً.',
          'Username must be between 3 and 20 characters.'
        ),
      });
      soundEngine.playWrong();
      return;
    }

    if (
      trimmed === profile.username &&
      editCountry.code === profile.country.code
    ) {
      setSaveMessage({
        type: 'err',
        text: tr(
          lang,
          'لم تقم بإجراء أي تغيير على الاسم أو الدولة الحالية.',
          'No changes were made to your current username or country.'
        ),
      });
      soundEngine.playWrong();
      return;
    }

    const isTaken = await storageRepo.isUsernameTakenCloud(trimmed, profile.playerId);
    if (isTaken) {
      setSaveMessage({
        type: 'err',
        text: tr(
          lang,
          'اسم المستخدم هذا مستخدم بالفعل، يرجى اختيار اسم آخر.',
          'This username is already taken, please choose another.'
        ),
      });
      soundEngine.playWrong();
      return;
    }

    onUpdateIdentity(trimmed, editCountry);
    soundEngine.playReward();
    setSaveMessage({
      type: 'ok',
      text: tr(
        lang,
        'تم حفظ تعديلات الاسم والدولة بنجاح! تم قفل التعديل لمدة 50 يوماً.',
        'Username and country updated! Editing is now locked for 50 days.'
      ),
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Identity Card & 10-Digit Player ID */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0B1120] border border-cyan-500/40 flex items-center justify-center text-4xl shrink-0">
            {profile.country.flag}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black text-white">{profile.username}</h2>
              {profile.vipTier !== 'none' && (
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                  <Crown className="w-4 h-4" />
                  <span>VIP {profile.vipTier.toUpperCase()}</span>
                </span>
              )}
              <span className="text-xs text-cyan-400 font-semibold">
                · {lang === 'en' ? levelInfo.rankTitleEn : levelInfo.rankTitle} (
                {tr(lang, `المستوى ${levelInfo.level}`, `Level ${levelInfo.level}`)})
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {getCountryDisplayName(profile.country, lang)}
            </div>

            {/* Level XP Bar */}
            <div className="pt-2 max-w-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-num">
                <span>
                  {tr(
                    lang,
                    `التقدم للمستوى ${levelInfo.level + 1}`,
                    `Progress to Level ${levelInfo.level + 1}`
                  )}
                </span>
                <span>
                  {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP
                </span>
              </div>
              <div className="w-56 sm:w-64 h-2 bg-[#0B1120] rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-l from-cyan-400 to-purple-500"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 10-Digit Unique Player ID Box with Copy & Share */}
        <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-3 shrink-0">
          <div className="text-xs text-slate-400">
            {tr(lang, 'كود التعريف الفريد (Player ID):', 'Unique Player ID:')}
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xl font-mono-num font-black tracking-wider text-amber-400">
              {profile.playerId}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPlayerId}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">
                      {tr(lang, 'تم النسخ', 'Copied')}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{tr(lang, 'نسخ الكود', 'Copy ID')}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSharePlayerId}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{tr(lang, 'مشاركة', 'Share')}</span>
              </button>
            </div>
          </div>
          {sharedStatus && (
            <div className="text-[11px] text-emerald-400 font-semibold">{sharedStatus}</div>
          )}
        </div>
      </div>

      {/* Key Career Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 text-center">
          <div className="text-2xl font-black text-white font-mono-num">
            {profile.stats.matchesPlayed}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {tr(lang, 'المباريات المكتملة', 'Matches Completed')}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 text-center">
          <div className="text-2xl font-black text-amber-400 font-mono-num">
            {profile.stats.perfectRoundsCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {tr(lang, 'جولات العلامة الكاملة', 'Perfect Rounds')}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 text-center">
          <div className="text-2xl font-black text-cyan-400 font-mono-num">
            {accuracyPercent}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {tr(lang, 'نسبة دقة الإجابات', 'Answer Accuracy')}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 text-center">
          <div className="text-2xl font-black text-purple-400 font-mono-num">
            {profile.stats.maxComboEver}🔥
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {tr(lang, 'أعلى سلسلة انتصارات', 'Best Winning Streak')}
          </div>
        </div>
      </div>

      {/* Settings & Account Customization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Name & Country (Restricted to Once Every 50 Days) */}
        <form
          onSubmit={handleSaveIdentity}
          className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-extrabold text-white">
                {tr(lang, 'تعديل الاسم والدولة', 'Edit Username & Country')}
              </h3>
            </div>
            {isIdentityLocked && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-extrabold text-amber-300 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {tr(
                    lang,
                    `مقفل (${remainingCooldownDays} يوم)`,
                    `Locked (${remainingCooldownDays}d)`
                  )}
                </span>
              </span>
            )}
          </div>

          {isIdentityLocked && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center gap-2 leading-relaxed">
              <Lock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {tr(
                  lang,
                  `يمكنك تغيير الاسم والدولة مرة واحدة كل 50 يوماً. متبقي لك ${remainingCooldownDays} يوم`,
                  `You can only change your username and country once every 50 days. ${remainingCooldownDays} days remaining.`
                )}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              {tr(lang, 'اسم المستخدم', 'Username')}
            </label>
            <input
              type="text"
              value={editUsername}
              readOnly={isIdentityLocked}
              onClick={() => {
                if (isIdentityLocked) showCooldownBlockedMessage();
              }}
              onChange={(e) => {
                if (isIdentityLocked) {
                  showCooldownBlockedMessage();
                  return;
                }
                setEditUsername(e.target.value);
                if (saveMessage) setSaveMessage(null);
              }}
              maxLength={20}
              className={`w-full px-4 py-2.5 rounded-xl bg-[#0B1120] border text-sm text-white focus:outline-none ${
                isIdentityLocked
                  ? 'border-slate-800 opacity-60 cursor-not-allowed'
                  : 'border-slate-700 focus:border-cyan-400'
              }`}
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="block text-xs font-bold text-slate-300">
                {tr(lang, 'اختيار الدولة', 'Select Country')}
              </label>
              <span className="text-xs text-cyan-400 font-bold">
                {editCountry.flag} {getCountryDisplayName(editCountry, lang)}
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={countrySearch}
                readOnly={isIdentityLocked}
                onClick={() => {
                  if (isIdentityLocked) showCooldownBlockedMessage();
                }}
                onChange={(e) => {
                  if (isIdentityLocked) {
                    showCooldownBlockedMessage();
                    return;
                  }
                  setCountrySearch(e.target.value);
                }}
                placeholder={tr(lang, 'ابحث عن الدولة بالاسم...', 'Search country by name...')}
                className={`w-full pr-10 pl-3 py-2 rounded-xl bg-[#0B1120] border text-xs text-white placeholder-slate-500 focus:outline-none ${
                  isIdentityLocked
                    ? 'border-slate-800 opacity-60 cursor-not-allowed'
                    : 'border-slate-700 focus:border-cyan-400'
                }`}
              />
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 bg-[#0B1120]/50 rounded-xl border border-slate-800/80 ${
                isIdentityLocked ? 'opacity-60' : ''
              }`}
            >
              {filteredCountries.map((c) => {
                const isSelected = c.code === editCountry.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      if (isIdentityLocked) {
                        showCooldownBlockedMessage();
                        return;
                      }
                      soundEngine.playClick();
                      setEditCountry(c);
                      if (saveMessage) setSaveMessage(null);
                    }}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-start transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{c.flag}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {getCountryDisplayName(c, lang)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {saveMessage && (
            <div
              className={`flex items-center gap-2 text-xs font-bold p-3 rounded-xl border ${
                saveMessage.type === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveMessage.text}</span>
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3 px-5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              isIdentityLocked
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            }`}
          >
            {isIdentityLocked ? (
              <>
                <Lock className="w-4 h-4" />
                <span>
                  {tr(
                    lang,
                    `تعديل الاسم والدولة مقفل (${remainingCooldownDays} يوم متبقي)`,
                    `Identity Edit Locked (${remainingCooldownDays} days left)`
                  )}
                </span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{tr(lang, 'حفظ تعديلات الاسم والدولة', 'Save Username & Country')}</span>
              </>
            )}
          </button>
        </form>

        {/* Language, Audio, Vibration, Customer Support (🎧 خدمة العملاء) & Account Logout (🚪 تسجيل الخروج من الحساب) */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Volume2 className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-extrabold text-white">
                {tr(lang, 'اللغة والإعدادات والدعم والحساب', 'Language, Settings, Support & Account')}
              </h3>
            </div>

            {/* App Language Switcher (العربية / English) */}
            <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-white">
                    {tr(lang, 'لغة التطبيق والأسئلة', 'App & Questions Language')}
                  </div>
                  <div className="text-xs text-slate-400">
                    {tr(
                      lang,
                      'التبديل الفوري بين العربية (RTL) والإنجليزية (LTR)',
                      'Instant switch between Arabic (RTL) and English (LTR)'
                    )}
                  </div>
                </div>
              </div>

              <div className="inline-flex p-1 rounded-xl bg-[#111827] border border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings(
                      profile.settings.soundEnabled,
                      profile.settings.vibrationEnabled,
                      'ar'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
                    lang === 'ar'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  العربية
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings(
                      profile.settings.soundEnabled,
                      profile.settings.vibrationEnabled,
                      'en'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
                    lang === 'en'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Sound Toggle */}
            <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {profile.settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-cyan-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-500" />
                )}
                <div>
                  <div className="text-sm font-bold text-white">
                    {tr(lang, 'المؤثرات الصوتية التفاعلية', 'Interactive Sound Effects')}
                  </div>
                  <div className="text-xs text-slate-400">
                    {tr(
                      lang,
                      'أصوات العد التنازلي والإجابات والكومبو',
                      'Countdown ticks, answers, and combo sounds'
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextSound = !profile.settings.soundEnabled;
                  onUpdateSettings(nextSound, profile.settings.vibrationEnabled, lang);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold cursor-pointer transition-colors whitespace-nowrap ${
                  profile.settings.soundEnabled
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {profile.settings.soundEnabled
                  ? tr(lang, 'مفعّل', 'On')
                  : tr(lang, 'مكتوم', 'Muted')}
              </button>
            </div>

            {/* Vibration Toggle */}
            <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone
                  className={`w-5 h-5 ${
                    profile.settings.vibrationEnabled ? 'text-purple-400' : 'text-slate-500'
                  }`}
                />
                <div>
                  <div className="text-sm font-bold text-white">
                    {tr(lang, 'الاهتزاز اللمسي', 'Haptic Vibration')}
                  </div>
                  <div className="text-xs text-slate-400">
                    {tr(
                      lang,
                      'اهتزاز خفيف عند الإجابات والتنبيهات السريعة',
                      'Light haptic feedback on answers and alerts'
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextVib = !profile.settings.vibrationEnabled;
                  onUpdateSettings(profile.settings.soundEnabled, nextVib, lang);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold cursor-pointer transition-colors whitespace-nowrap ${
                  profile.settings.vibrationEnabled
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {profile.settings.vibrationEnabled
                  ? tr(lang, 'مفعّل', 'On')
                  : tr(lang, 'متوقف', 'Off')}
              </button>
            </div>
          </div>

          {/* Dedicated Firebase Rules/Config Copy, Customer Support & Account Logout Section inside Settings Only */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            {/* 🛡️ إعدادات Firebase وقواعد الحماية (firestore.rules & firebaseConfig.js) */}
            {onOpenFirebaseSecurity && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onOpenFirebaseSecurity();
                }}
                className="w-full p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-emerald-300 font-extrabold text-sm flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>
                    {tr(
                      lang,
                      '🛡️ قواعد الحماية والربط السحابي (Firebase Rules)',
                      '🛡️ Firebase Config & Security Rules'
                    )}
                  </span>
                </div>
                <span className="text-xs bg-emerald-500 text-slate-950 px-3 py-1 rounded-lg font-black">
                  {tr(lang, 'عرض ونسخ الكود', 'View & Copy')}
                </span>
              </button>
            )}

            {/* 🎧 خدمة العملاء */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onOpenCustomerSupport();
              }}
              className="w-full p-4 rounded-xl bg-cyan-500/15 border border-cyan-500/40 hover:bg-cyan-500/25 text-cyan-300 font-extrabold text-sm flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Headphones className="w-5 h-5 text-cyan-400" />
                <span>{tr(lang, '🎧 خدمة العملاء', '🎧 Customer Support')}</span>
              </div>
              <span className="text-xs bg-cyan-500 text-slate-950 px-3 py-1 rounded-lg font-black">
                {tr(lang, 'تواصل مع الدعم الفني', 'Contact Support')}
              </span>
            </button>

            {/* 🚪 تسجيل الخروج من الحساب */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onRequestLogoutAccount();
              }}
              className="w-full p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 font-extrabold text-sm flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="w-5 h-5 text-amber-400" />
                <span>{tr(lang, '🚪 تسجيل الخروج من الحساب', '🚪 Log Out of Account')}</span>
              </div>
              <span className="text-xs bg-amber-500/20 border border-amber-400/40 text-amber-200 px-3 py-1 rounded-lg font-bold">
                {tr(lang, 'تبديل الحساب', 'Switch Account')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Badges & Achievements */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-extrabold text-white">
              {tr(lang, 'الأوسمة والإنجازات', 'Badges & Achievements')}
            </h3>
          </div>
          <span className="text-xs font-mono-num text-amber-400 font-bold">
            {tr(lang, 'مفتوح:', 'Unlocked:')} {profile.unlockedBadges.length} /{' '}
            {BADGES_CATALOG.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {BADGES_CATALOG.map((badge) => {
            const isUnlocked = profile.unlockedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-xl border space-y-2 transition-all ${
                  isUnlocked
                    ? 'bg-amber-500/10 border-amber-400/50'
                    : 'bg-[#0B1120]/70 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white">
                    {tr(lang, badge.title, badge.titleEn)}
                  </span>
                  <span
                    className={`text-[11px] font-bold font-mono-num ${
                      isUnlocked ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {isUnlocked
                      ? tr(lang, 'مكتمل ✓', 'Unlocked ✓')
                      : `+${badge.rewardCoins} ${tr(lang, 'عملة', 'Coins')}`}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {tr(lang, badge.description, badge.descriptionEn)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Match History */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-extrabold text-white">
            {tr(lang, 'سجل المباريات الأخيرة', 'Recent Match History')}
          </h3>
        </div>

        {profile.matchHistory.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0B1120] border border-slate-800 text-center text-sm text-slate-400">
            {tr(
              lang,
              'لم تخض أي مباراة كاملة بعد. اختر قسماً من ساحة التحدي وابدأ أولى جولاتك!',
              'No matches completed yet. Pick a category from the Arena and start your first match!'
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {profile.matchHistory.map((rec) => {
              const dateFormatted = new Date(rec.dateIso).toLocaleDateString(
                lang === 'ar' ? 'ar-SA' : 'en-US',
                {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );
              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-bold text-white">{rec.categoryName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{dateFormatted}</div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono-num">
                    <span className="text-slate-300">
                      {tr(lang, 'الجولات:', 'Rounds:')} [{rec.roundScores[0]}/6 ·{' '}
                      {rec.roundScores[1]}/6 · {rec.roundScores[2]}/6]
                    </span>
                    <span className="text-cyan-400 font-bold">
                      +{rec.officialPointsEarned} {tr(lang, 'نقطة', 'pts')}
                    </span>
                    <span className="text-amber-400 font-bold">
                      +{rec.coinsEarned} {tr(lang, 'عملة', 'coins')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
