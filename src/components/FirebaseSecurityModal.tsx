import React, { useState } from 'react';
import { AppLanguage, PlayerProfile } from '../types/game';
import {
  auth,
  FIREBASE_CONFIG_JS_SOURCE,
  FIRESTORE_RULES_SOURCE,
} from '../firebaseConfig';
import { CLOUD_FUNCTION_VIP_VERIFICATION_SOURCE } from '../services/vipServerVerification';
import { soundEngine } from '../utils/sound';
import { tr } from '../utils/i18n';
import {
  ShieldCheck,
  Copy,
  Check,
  X,
  FileCode2,
  Lock,
  Database,
  CheckCircle2,
  Server,
} from 'lucide-react';

interface FirebaseSecurityModalProps {
  profile: PlayerProfile;
  lang: AppLanguage;
  onClose: () => void;
}

export const FirebaseSecurityModal: React.FC<FirebaseSecurityModalProps> = ({
  profile,
  lang,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'config' | 'functions'>('rules');
  const [copiedKey, setCopiedKey] = useState<'rules' | 'config' | 'functions' | null>(null);

  const activeUid = auth.currentUser?.uid || profile.uid || 'offline-local-uid';
  const fairPlay =
    typeof profile.fairPlayScore === 'number' ? profile.fairPlayScore : 100;

  const getTabContent = (type: 'rules' | 'config' | 'functions'): string => {
    if (type === 'rules') return FIRESTORE_RULES_SOURCE;
    if (type === 'config') return FIREBASE_CONFIG_JS_SOURCE;
    return CLOUD_FUNCTION_VIP_VERIFICATION_SOURCE;
  };

  const handleCopyCode = async (type: 'rules' | 'config' | 'functions') => {
    soundEngine.playClick();
    const content = getTabContent(type);
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(type);
      window.setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      setCopiedKey(type);
      window.setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-cyan-500/40 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">
                {tr(
                  lang,
                  'الربط السحابي وقواعد الحماية المشددة (Firebase Zero-Trust Rules)',
                  'Firebase Cloud & Zero-Trust Anti-Cheat Security Rules'
                )}
              </h3>
              <p className="text-xs text-slate-400 font-mono-num">
                Project: waled-alsh · UID: {activeUid.slice(0, 12)}... · FairPlay:{' '}
                {fairPlay}/100
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center gap-2.5">
            <Database className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">
                {tr(lang, 'عزل البيانات والخصوصية', 'PII Isolation & Privacy')}
              </div>
              <div className="text-xs font-extrabold text-white font-mono-num truncate">
                players (Owner) + leaderboard_public
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">
                {tr(lang, 'حماية النقاط و Rate Limit', 'Points & Rate Limiting')}
              </div>
              <div className="text-xs font-extrabold text-amber-300 truncate">
                {tr(lang, '+2 نقطة / فاصل ≥ 25 ثانية', 'Max +2 pts / ≥ 25s interval')}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">
                {tr(lang, 'قفل VIP والمحادثات الخاصة', 'VIP Lock & Private Chats')}
              </div>
              <div className="text-xs font-extrabold text-emerald-300 font-mono-num truncate">
                {tr(lang, 'تحقق خادمي + participants', 'Server Verify + participants')}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-[#0B1120] border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('rules');
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>firestore.rules</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('config');
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>firebaseConfig.js</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('functions');
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'functions'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Cloud Function (VIP)</span>
          </button>
        </div>

        {/* Code Viewer & Copy Action */}
        <div className="flex-1 min-h-0 flex flex-col space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs text-slate-300">
              {activeTab === 'rules'
                ? tr(
                    lang,
                    'انسخ هذا الكود المحدّث 100% والصقه في تبويب Rules داخل Firestore Database في لوحة تحكم Firebase:',
                    'Copy and paste this 100% synchronized ruleset into Firestore Database > Rules in your Firebase Console:'
                  )
                : activeTab === 'config'
                ? tr(
                    lang,
                    'ملف إعدادات الربط السحابي المدمج في المشروع (firebaseConfig.js):',
                    'Cloud connection configuration file integrated into the project (firebaseConfig.js):'
                  )
                : tr(
                    lang,
                    'دالة التحقق الخادمي (Firebase Cloud Function) لترقية VIP وإضافة عملات الشراء بعد فحص الإيصال:',
                    'Server-side Firebase Cloud Function for verifying VIP IAP receipts and upgrading vipTier:'
                  )}
            </p>

            <button
              type="button"
              onClick={() => handleCopyCode(activeTab)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              {copiedKey === activeTab ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{tr(lang, 'تم النسخ بنجاح!', 'Copied to Clipboard!')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>
                    {activeTab === 'rules'
                      ? tr(lang, 'نسخ firestore.rules بالكامل', 'Copy firestore.rules')
                      : activeTab === 'config'
                      ? tr(lang, 'نسخ firebaseConfig.js بالكامل', 'Copy firebaseConfig.js')
                      : tr(lang, 'نسخ Cloud Function بالكامل', 'Copy Cloud Function')}
                  </span>
                </>
              )}
            </button>
          </div>

          <pre
            dir="ltr"
            className="flex-1 overflow-y-auto p-4 rounded-xl bg-[#080C16] border border-slate-800 text-xs text-cyan-200 font-mono-num leading-relaxed select-all"
          >
            {getTabContent(activeTab)}
          </pre>
        </div>
      </div>
    </div>
  );
};
