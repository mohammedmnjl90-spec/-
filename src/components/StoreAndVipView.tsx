import React, { useState } from 'react';
import {
  AppLanguage,
  LifelinesInventory,
  PlayerProfile,
  VipPurchaseReceipt,
  VipTier,
} from '../types/game';
import { soundEngine } from '../utils/sound';
import { tr } from '../utils/i18n';
import { RewardedAdModal } from './AdModals';
import { verifyVipPurchaseOnServer } from '../services/vipServerVerification';
import {
  Coins,
  Scissors,
  Snowflake,
  Sparkles,
  Crown,
  CheckCircle2,
  ShoppingBag,
  ShieldCheck,
  Tv,
  CreditCard,
  Smartphone,
  Receipt,
  X,
  Lock,
} from 'lucide-react';

interface StoreAndVipViewProps {
  profile: PlayerProfile;
  lang: AppLanguage;
  onBuyLifeline: (
    type: keyof LifelinesInventory | 'bundle_all',
    costCoins: number,
    quantity: number
  ) => void;
  onClaimRewardedAd: () => void;
  onPurchaseCoinPack: (coinAmount: number, priceDisplay: string) => void;
  onPurchaseVipIap: (params: {
    tier: Exclude<VipTier, 'none'>;
    productId: string;
    priceDisplay: string;
    storeProvider: 'google_play' | 'app_store';
    bonusCoins: number;
    bonusLifelinesEach: number;
    verifiedReceipt?: VipPurchaseReceipt;
  }) => void;
}

interface CoinRechargeProduct {
  id: string;
  coinAmount: number;
  priceDisplay: string;
  titleAr: string;
  titleEn: string;
  popular?: boolean;
}

const COIN_RECHARGE_PACKS: CoinRechargeProduct[] = [
  {
    id: 'pack_coins_250',
    coinAmount: 250,
    priceDisplay: '$0.99',
    titleAr: 'حزمة 250 عملة ذهبية',
    titleEn: '250 Gold Coins Pack',
  },
  {
    id: 'pack_coins_700',
    coinAmount: 700,
    priceDisplay: '$2.49',
    titleAr: 'حزمة 700 عملة (الأكثر طلباً)',
    titleEn: '700 Coins Pack (Most Popular)',
    popular: true,
  },
  {
    id: 'pack_coins_1800',
    coinAmount: 1800,
    priceDisplay: '$4.99',
    titleAr: 'حزمة 1800 عملة (قوة ملكية)',
    titleEn: '1800 Coins Pack (Royal Power)',
  },
];

interface LifelineProduct {
  id: string;
  type: keyof LifelinesInventory | 'bundle_all';
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  quantity: number;
  costCoins: number;
  accentColor: string;
}

const LIFELINE_PRODUCTS: LifelineProduct[] = [
  {
    id: 'item_5050',
    type: 'fiftyFifty',
    titleAr: 'حذف إجابتين (50:50)',
    titleEn: 'Remove Two Options (50:50)',
    descAr: 'يستبعد إجابتين خاطئتين فوراً ليترك لك خيارين فقط.',
    descEn: 'Eliminates two wrong choices immediately, leaving only two options.',
    quantity: 1,
    costCoins: 15,
    accentColor: 'text-cyan-400',
  },
  {
    id: 'item_freeze',
    type: 'freezeTime',
    titleAr: 'تجميد الوقت (+5 ثوانٍ)',
    titleEn: 'Freeze Time (+5 Seconds)',
    descAr: 'يمنحك 5 ثوانٍ إضافية للتفكير الهادئ في السؤال الحالي.',
    descEn: 'Grants 5 extra seconds on the current question timer.',
    quantity: 1,
    costCoins: 15,
    accentColor: 'text-purple-400',
  },
  {
    id: 'item_solve',
    type: 'instantSolve',
    titleAr: 'الحل الفوري المؤكد',
    titleEn: 'Instant Correct Solve',
    descAr: 'يختار الإجابة الصحيحة تلقائياً ويحافظ على سلسلة الانتصارات 🔥.',
    descEn: 'Automatically selects the right answer and preserves your combo streak 🔥.',
    quantity: 1,
    costCoins: 25,
    accentColor: 'text-amber-400',
  },
  {
    id: 'item_bundle',
    type: 'bundle_all',
    titleAr: 'حزمة التوفير الشاملة (3× من كل مساعدة)',
    titleEn: 'All-in-One Bundle (3× Each Lifeline)',
    descAr: 'احصل على 3 حذف إجابتين + 3 تجميد وقت + 3 حل فوري بخصم خاص.',
    descEn: 'Get 3× 50:50 + 3× Freeze Time + 3× Instant Solve at a special discount.',
    quantity: 3,
    costCoins: 120,
    accentColor: 'text-emerald-400',
  },
];

interface VipIapPackageCard {
  tier: Exclude<VipTier, 'none'>;
  productId: string;
  nameAr: string;
  nameEn: string;
  subtitleAr: string;
  subtitleEn: string;
  priceDisplay: string;
  bonusCoins: number;
  bonusLifelinesEach: number;
  perksAr: string[];
  perksEn: string[];
  borderClass: string;
  badgeColor: string;
}

const VIP_IAP_PACKAGES: VipIapPackageCard[] = [
  {
    tier: 'bronze',
    productId: 'com.qimataltahadi.vip.bronze',
    nameAr: 'باقة VIP البرونزية',
    nameEn: 'Bronze VIP Package',
    subtitleAr: 'انطلاقة احترافية بدون أي إعلانات',
    subtitleEn: 'Pro ad-free arena starter package',
    priceDisplay: '$2.99',
    bonusCoins: 150,
    bonusLifelinesEach: 2,
    perksAr: [
      'إزالة جميع الإعلانات نهائياً لتجربة لعب متواصلة',
      '+150 عملة ذهبية فورية + 2 من كل وسيلة مساعدة',
      'شارة التاج 👑 بجانب اسمك في التطبيق وقائمة المتصدرين',
      '+1 عملة إضافية لكل نقطة رسمية ومضاعفة عجلة الحظ 1.2×',
    ],
    perksEn: [
      'Remove all ads permanently for uninterrupted play',
      '+150 instant Gold Coins + 2 of each lifeline',
      'Crown badge 👑 next to your name across the app & leaderboard',
      '+1 bonus coin per official point & 1.2× Daily Spin multiplier',
    ],
    borderClass: 'border-amber-700/60 bg-gradient-to-b from-amber-800/15 to-[#111827]',
    badgeColor: 'text-amber-500',
  },
  {
    tier: 'silver',
    productId: 'com.qimataltahadi.vip.silver',
    nameAr: 'باقة VIP الفضية',
    nameEn: 'Silver VIP Package',
    subtitleAr: 'الخيار المفضل للمنافسين على صدارة الشهر',
    subtitleEn: 'Best value for top monthly contenders',
    priceDisplay: '$5.99',
    bonusCoins: 350,
    bonusLifelinesEach: 4,
    perksAr: [
      'إزالة جميع الإعلانات نهائياً لتجربة لعب متواصلة',
      '+350 عملة ذهبية فورية + 4 من كل وسيلة مساعدة',
      'شارة التاج الفضي 👑 بجانب اسمك في التطبيق وقائمة المتصدرين',
      '+2 عملة إضافية لكل نقطة رسمية ومضاعفة عجلة الحظ 1.5×',
    ],
    perksEn: [
      'Remove all ads permanently for uninterrupted play',
      '+350 instant Gold Coins + 4 of each lifeline',
      'Silver Crown badge 👑 next to your name across the app',
      '+2 bonus coins per official point & 1.5× Daily Spin multiplier',
    ],
    borderClass: 'border-slate-300/50 bg-gradient-to-b from-slate-300/10 to-[#111827]',
    badgeColor: 'text-slate-200',
  },
  {
    tier: 'gold',
    productId: 'com.qimataltahadi.vip.gold',
    nameAr: 'باقة VIP الذهبية الملكية',
    nameEn: 'Royal Gold VIP Package',
    subtitleAr: 'أقصى قوة ومكافآت مضاعفة لنخبة الأبطال',
    subtitleEn: 'Maximum rewards & multipliers for elite champions',
    priceDisplay: '$9.99',
    bonusCoins: 750,
    bonusLifelinesEach: 7,
    perksAr: [
      'إزالة جميع الإعلانات نهائياً لتجربة لعب متواصلة',
      '+750 عملة ذهبية فورية + 7 من كل وسيلة مساعدة',
      'شارة التاج الذهبي الملكي 👑 بجانب اسمك في كل مكان',
      '+4 عملات إضافية لكل نقطة رسمية ومضاعفة عجلة الحظ 2×',
    ],
    perksEn: [
      'Remove all ads permanently for uninterrupted play',
      '+750 instant Gold Coins + 7 of each lifeline',
      'Royal Gold Crown badge 👑 next to your name everywhere',
      '+4 bonus coins per official point & 2× Daily Spin multiplier',
    ],
    borderClass: 'border-amber-400/70 bg-gradient-to-b from-amber-500/20 to-[#111827]',
    badgeColor: 'text-amber-400',
  },
];

/**
 * Triggers native In-App Purchase bridge if running inside Google Play / App Store WebView wrapper.
 */
function triggerNativeIapBridge(productId: string, storeProvider: 'google_play' | 'app_store') {
  try {
    const win = window as unknown as {
      ReactNativeWebView?: { postMessage?: (msg: string) => void };
      BillingClient?: { launchBillingFlow?: (sku: string) => void };
      webkit?: { messageHandlers?: { iapHandler?: { postMessage?: (msg: unknown) => void } } };
    };
    if (win.BillingClient && typeof win.BillingClient.launchBillingFlow === 'function') {
      win.BillingClient.launchBillingFlow(productId);
    }
    if (win.ReactNativeWebView && typeof win.ReactNativeWebView.postMessage === 'function') {
      win.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'IAP_PURCHASE_REQUEST', productId, storeProvider })
      );
    }
    if (win.webkit?.messageHandlers?.iapHandler?.postMessage) {
      win.webkit.messageHandlers.iapHandler.postMessage({ productId, storeProvider });
    }
  } catch {
    // Standard web fallback handled by the interactive checkout sheet
  }
}

export const StoreAndVipView: React.FC<StoreAndVipViewProps> = ({
  profile,
  lang,
  onBuyLifeline,
  onClaimRewardedAd,
  onPurchaseCoinPack,
  onPurchaseVipIap,
}) => {
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [isRewardedAdModalOpen, setIsRewardedAdModalOpen] = useState(false);

  const getVipRemainingDays = (expiryDateIso?: string): number => {
    if (!expiryDateIso) return 0;
    const diffMs = new Date(expiryDateIso).getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (24 * 3600 * 1000));
  };

  const handleBuyCoinPack = (pack: CoinRechargeProduct) => {
    soundEngine.playReward();
    onPurchaseCoinPack(pack.coinAmount, pack.priceDisplay);
    showToast(
      tr(
        lang,
        `تم شحن حزمة ${pack.coinAmount} عملة ذهبية بنجاح إلى رصيدك!`,
        `Successfully recharged ${pack.coinAmount} gold coins pack to your balance!`
      )
    );
  };

  // Real IAP Checkout Modal State
  const [selectedVipPkg, setSelectedVipPkg] = useState<VipIapPackageCard | null>(null);
  const [storeProvider, setStoreProvider] = useState<'google_play' | 'app_store'>('google_play');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const showToast = (msg: string) => {
    setFeedbackBanner(msg);
    window.setTimeout(() => setFeedbackBanner(null), 3500);
  };

  const tierRank: Record<VipTier, number> = {
    none: 0,
    bronze: 1,
    silver: 2,
    gold: 3,
  };

  const adsWatchedToday = profile.daily.rewardedAdsWatchedToday || 0;
  const maxDailyAds = 3;
  const remainingDailyAds = Math.max(0, maxDailyAds - adsWatchedToday);

  const handleConfirmIapCheckout = async () => {
    if (!selectedVipPkg || isProcessingPayment) return;
    soundEngine.playClick();
    setIsProcessingPayment(true);
    triggerNativeIapBridge(selectedVipPkg.productId, storeProvider);

    try {
      const verificationResult = await verifyVipPurchaseOnServer({
        uid: profile.uid || '',
        playerId: profile.playerId,
        tier: selectedVipPkg.tier,
        productId: selectedVipPkg.productId,
        priceDisplay: selectedVipPkg.priceDisplay,
        storeProvider,
        bonusCoins: selectedVipPkg.bonusCoins,
        bonusLifelinesEach: selectedVipPkg.bonusLifelinesEach,
      });

      setIsProcessingPayment(false);
      soundEngine.playReward();
      onPurchaseVipIap({
        tier: selectedVipPkg.tier,
        productId: selectedVipPkg.productId,
        priceDisplay: selectedVipPkg.priceDisplay,
        storeProvider,
        bonusCoins: selectedVipPkg.bonusCoins,
        bonusLifelinesEach: selectedVipPkg.bonusLifelinesEach,
        verifiedReceipt: verificationResult.receipt,
      });

      setSelectedVipPkg(null);
      showToast(
        lang === 'en' ? verificationResult.messageEn : verificationResult.messageAr
      );
    } catch {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Current Inventory */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs text-amber-400 font-semibold">
            {tr(lang, 'متجر قمة التحدي · مساعدات وباقات VIP', 'Arena Store · Lifelines & VIP Packages')}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white">
            {tr(lang, 'المتجر وعضويات VIP', 'Store & VIP Memberships')}
          </h2>
          <p className="text-sm text-slate-400">
            {tr(
              lang,
              'عزز رصيدك من وسائل المساعدة، احصل على عملات مجانية، أو اشترك في باقات VIP لإزالة الإعلانات نهائياً.',
              'Stock up on lifelines, earn free coins, or subscribe to VIP packages to remove all ads permanently.'
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-amber-500/30 text-center">
            <div className="text-lg font-black text-amber-400 font-mono-num">
              {profile.coins}
            </div>
            <div className="text-[11px] text-slate-400">
              {tr(lang, 'عملة ذهبية', 'Gold Coins')}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 text-center">
            <div className="text-lg font-black text-cyan-400 font-mono-num">
              {profile.lifelines.fiftyFifty}
            </div>
            <div className="text-[11px] text-slate-400">50:50</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 text-center">
            <div className="text-lg font-black text-purple-400 font-mono-num">
              {profile.lifelines.freezeTime}
            </div>
            <div className="text-[11px] text-slate-400">
              {tr(lang, 'تجميد +5ث', 'Freeze +5s')}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 text-center">
            <div className="text-lg font-black text-emerald-400 font-mono-num">
              {profile.lifelines.instantSolve}
            </div>
            <div className="text-[11px] text-slate-400">
              {tr(lang, 'حل فوري', 'Instant Solve')}
            </div>
          </div>
        </div>
      </div>

      {feedbackBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 text-sm font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{feedbackBanner}</span>
        </div>
      )}

      {/* Rewarded Ad Card in Store: 📺 شاهد إعلان واحصل على عملات (+20 coins, max 3/day) */}
      <div className="p-6 rounded-2xl bg-gradient-to-l from-amber-500/15 via-[#111827] to-[#111827] border-2 border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0">
            <Tv className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg md:text-xl font-black text-white">
              {tr(
                lang,
                '📺 شاهد إعلان واحصل على عملات',
                '📺 Watch Ad & Get Coins'
              )}
            </h3>
            <p className="text-xs text-slate-300">
              {tr(
                lang,
                `احصل على مكافأة فورية +20 عملة ذهبية عند مشاهدة إعلان قصير (متبقي لك اليوم: ${remainingDailyAds} من ${maxDailyAds}).`,
                `Earn an instant +20 Gold Coins reward by watching a short video ad (Remaining today: ${remainingDailyAds} of ${maxDailyAds}).`
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={remainingDailyAds <= 0}
          onClick={() => {
            soundEngine.playClick();
            setIsRewardedAdModalOpen(true);
          }}
          className="px-6 py-3.5 rounded-xl bg-gradient-to-l from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black text-xs cursor-pointer whitespace-nowrap shrink-0 shadow-lg shadow-amber-500/15"
        >
          {remainingDailyAds > 0
            ? tr(
                lang,
                `📺 شاهد إعلان واحصل على +20 عملة (${remainingDailyAds}/${maxDailyAds})`,
                `📺 Watch Ad for +20 Coins (${remainingDailyAds}/${maxDailyAds})`
              )
            : tr(
                lang,
                'تم استنفاد إعلانات اليوم (3/3) ✓',
                'Daily Ad Limit Reached (3/3) ✓'
              )}
        </button>
      </div>

      {/* Section 1: Lifelines Store */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-cyan-400" />
          <h3 className="text-xl font-extrabold text-white">
            {tr(lang, 'شراء وسائل المساعدة بالعملات', 'Buy Lifelines with Coins')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LIFELINE_PRODUCTS.map((prod) => {
            const canAfford = profile.coins >= prod.costCoins;
            const pTitle = tr(lang, prod.titleAr, prod.titleEn);
            const pDesc = tr(lang, prod.descAr, prod.descEn);

            return (
              <div
                key={prod.id}
                className="p-5 rounded-2xl bg-[#111827] border border-slate-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-base font-extrabold ${prod.accentColor}`}>
                      {pTitle}
                    </h4>
                    {prod.type === 'fiftyFifty' && <Scissors className="w-5 h-5 text-cyan-400" />}
                    {prod.type === 'freezeTime' && (
                      <Snowflake className="w-5 h-5 text-purple-400" />
                    )}
                    {prod.type === 'instantSolve' && (
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    )}
                    {prod.type === 'bundle_all' && (
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{pDesc}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-sm font-black text-amber-400 font-mono-num">
                    <Coins className="w-4 h-4" />
                    <span>
                      {prod.costCoins} {tr(lang, 'عملة', 'Coins')}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => {
                      soundEngine.playReward();
                      onBuyLifeline(prod.type, prod.costCoins, prod.quantity);
                      showToast(
                        tr(
                          lang,
                          `تم شراء «${pTitle}» وإضافتها لمخزونك بنجاح!`,
                          `Purchased "${pTitle}" and added to your inventory!`
                        )
                      );
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-extrabold text-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {canAfford
                      ? tr(lang, 'شراء الآن', 'Buy Now')
                      : tr(lang, 'الرصيد غير كافٍ', 'Not Enough Coins')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Independent Gold Coin Recharge Packs (Unlimited Purchases) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-extrabold text-white">
            {tr(lang, 'شحن العملات الذهبية (بلا حدود)', 'Gold Coin Recharge Packs (Unlimited)')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COIN_RECHARGE_PACKS.map((pack) => {
            const packTitle = tr(lang, pack.titleAr, pack.titleEn);
            return (
              <div
                key={pack.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
                  pack.popular
                    ? 'border-amber-400/60 bg-gradient-to-b from-amber-500/15 to-[#111827]'
                    : 'border-slate-800 bg-[#111827]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-amber-400 flex items-center gap-1.5 font-mono-num">
                      <Coins className="w-4 h-4" />
                      <span>+{pack.coinAmount} {tr(lang, 'عملة', 'Coins')}</span>
                    </span>
                    {pack.popular && (
                      <span className="text-[10px] font-extrabold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                        {tr(lang, 'الأكثر طلباً', 'Most Popular')}
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-extrabold text-white">{packTitle}</h4>
                  <p className="text-xs text-slate-400">
                    {tr(lang, 'إضافة فورية لرصيدك بدون أي قيود على عدد مرات الشراء.', 'Instant add to your balance with no purchase limits.')}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <span className="text-lg font-black text-amber-400 font-mono-num">
                    {pack.priceDisplay}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBuyCoinPack(pack)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-l from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-extrabold text-xs transition-colors cursor-pointer whitespace-nowrap shadow-md shadow-amber-500/15"
                  >
                    {tr(lang, `شراء (${pack.priceDisplay})`, `Buy (${pack.priceDisplay})`)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: VIP Monthly Subscriptions (30 Days + Renewal & Upgrade) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h3 className="text-xl font-extrabold text-white">
              {tr(
                lang,
                'اشتراكات VIP الشهرية (30 يوماً + إزالة الإعلانات)',
                'Monthly VIP Subscriptions (30 Days + Remove All Ads)'
              )}
            </h3>
          </div>
          <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 bg-[#111827] border border-slate-800 px-3 py-1.5 rounded-xl">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Google Play Billing · Apple App Store IAP</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {VIP_IAP_PACKAGES.map((pkg) => {
            const isExactCurrent = profile.vipTier === pkg.tier;
            const remainingDays = isExactCurrent ? getVipRemainingDays(profile.vipExpiryDate) : 0;
            const pkgName = tr(lang, pkg.nameAr, pkg.nameEn);
            const pkgSub = tr(lang, pkg.subtitleAr, pkg.subtitleEn);
            const perks = lang === 'en' ? pkg.perksEn : pkg.perksAr;

            return (
              <div
                key={pkg.tier}
                className={`p-6 rounded-2xl border flex flex-col justify-between gap-6 ${pkg.borderClass}`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold ${pkg.badgeColor}`}>
                      {tr(lang, 'اشتراك شهري (30 يوماً)', 'Monthly Subscription (30 Days)')}
                    </span>
                    <Crown className={`w-6 h-6 ${pkg.badgeColor}`} />
                  </div>

                  <div>
                    <h4 className="text-xl font-black text-white">{pkgName}</h4>
                    <p className="text-xs text-slate-400 mt-1">{pkgSub}</p>
                    {isExactCurrent && remainingDays > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold">
                        <span>⏳ {tr(lang, `متبقي على الاشتراك: ${remainingDays} يوماً`, `${remainingDays} days remaining`)}</span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-200 pt-2">
                    {perks.map((perk, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {tr(lang, 'سعر الاشتراك/التجديد:', 'Subscription Price:')}
                    </span>
                    <span className="text-xl font-black text-amber-400 font-mono-num">
                      {pkg.priceDisplay}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedVipPkg(pkg);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-l from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs cursor-pointer transition-all whitespace-nowrap flex items-center justify-center gap-2 shadow-md shadow-amber-500/15"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>
                      {isExactCurrent
                        ? tr(
                            lang,
                            `تجديد وتمديد 30 يوماً إضافية (${pkg.priceDisplay})`,
                            `Renew & Extend +30 Days (${pkg.priceDisplay})`
                          )
                        : tierRank[profile.vipTier] > tierRank[pkg.tier]
                        ? tr(
                            lang,
                            `التحويل إلى الباقة (${pkg.priceDisplay})`,
                            `Switch to Package (${pkg.priceDisplay})`
                          )
                        : tr(
                            lang,
                            `شراء وتفعيل الاشتراك (${pkg.priceDisplay})`,
                            `Subscribe & Activate (${pkg.priceDisplay})`
                          )}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rewarded Video Ad Modal */}
      {isRewardedAdModalOpen && (
        <RewardedAdModal
          lang={lang}
          onCompleteReward={() => {
            setIsRewardedAdModalOpen(false);
            onClaimRewardedAd();
            showToast(
              tr(
                lang,
                'تمت إضافة +20 عملة ذهبية إلى رصيدك من إعلان المكافأة!',
                '+20 Gold Coins added to your balance from the rewarded ad!'
              )
            );
          }}
          onCancel={() => setIsRewardedAdModalOpen(false)}
        />
      )}

      {/* Official In-App Purchase (Google Play Billing / Apple App Store IAP) Checkout Modal */}
      {selectedVipPkg && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border-2 border-amber-400/50 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-extrabold text-white">
                  {tr(
                    lang,
                    'بوابة الدفع الرسمي داخل التطبيق (IAP)',
                    'Official In-App Purchase Checkout (IAP)'
                  )}
                </span>
              </div>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={() => setSelectedVipPkg(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Store Provider Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400">
                {tr(lang, 'اختر متجر الدفع:', 'Select Store Billing Provider:')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStoreProvider('google_play')}
                  className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer ${
                    storeProvider === 'google_play'
                      ? 'bg-cyan-500/15 border-cyan-400 text-white'
                      : 'bg-[#0B1120] border-slate-800 text-slate-400'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Google Play Billing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStoreProvider('app_store')}
                  className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer ${
                    storeProvider === 'app_store'
                      ? 'bg-cyan-500/15 border-cyan-400 text-white'
                      : 'bg-[#0B1120] border-slate-800 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Apple App Store IAP</span>
                </button>
              </div>
            </div>

            {/* Invoice Details Box */}
            <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>{tr(lang, 'تفاصيل الفاتورة والمنتج:', 'Invoice & Product Details:')}</span>
                </span>
                <span className="text-[11px] font-mono-num text-slate-500">
                  SKU: {selectedVipPkg.productId}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <div className="text-base font-black text-white">
                    {tr(lang, selectedVipPkg.nameAr, selectedVipPkg.nameEn)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {tr(lang, 'حساب اللاعب:', 'Player Account:')} {profile.username} (ID:{' '}
                    {profile.playerId})
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono-num">
                  {selectedVipPkg.priceDisplay}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs text-emerald-300">
                <div>
                  ✓ {tr(lang, 'إزالة جميع الإعلانات نهائياً', 'Permanent removal of all ads')}
                </div>
                <div>
                  ✓ {tr(
                    lang,
                    `+${selectedVipPkg.bonusCoins} عملة ذهبية فورية و +${selectedVipPkg.bonusLifelinesEach} من كل وسيلة مساعدة`,
                    `+${selectedVipPkg.bonusCoins} instant Gold Coins & +${selectedVipPkg.bonusLifelinesEach} of each lifeline`
                  )}
                </div>
                <div>
                  ✓ {tr(lang, 'تفعيل شارة التاج 👑 بجانب اسمك فوراً', 'Instant Crown badge 👑 next to your username')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleConfirmIapCheckout}
                className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-l from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Crown className="w-4 h-4" />
                <span>
                  {isProcessingPayment
                    ? tr(lang, 'جارٍ تأكيد عملية الشراء...', 'Verifying Store Purchase...')
                    : tr(
                        lang,
                        `تأكيد الدفع وتفعيل VIP (${selectedVipPkg.priceDisplay})`,
                        `Confirm Payment & Activate VIP (${selectedVipPkg.priceDisplay})`
                      )}
                </span>
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={() => setSelectedVipPkg(null)}
                className="py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                {tr(lang, 'إلغاء', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
