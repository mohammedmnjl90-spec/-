import React, { useState } from 'react';
import { AppLanguage, PlayerProfile, SupportTicketCategory } from '../types/game';
import { soundEngine } from '../utils/sound';
import { tr } from '../utils/i18n';
import {
  Headphones,
  X,
  Send,
  MessageSquare,
  PhoneCall,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Mail,
  MessageCircle,
  Globe,
} from 'lucide-react';

interface CustomerSupportModalProps {
  profile: PlayerProfile;
  lang: AppLanguage;
  onClose: () => void;
  onSubmitTicket: (
    category: SupportTicketCategory,
    categoryLabel: string,
    subject: string,
    message: string
  ) => void;
}

const TICKET_CATEGORIES: {
  id: SupportTicketCategory;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
}[] = [
  {
    id: 'prizes',
    labelAr: 'استفسار عن الجوائز',
    labelEn: 'Prizes Inquiry',
    descAr: 'استفسارات جوائز المتصدرين الشهرية والمراكز الخمسة الأولى',
    descEn: 'Inquiries regarding monthly leaderboard prizes and Top 5 winners',
  },
  {
    id: 'technical',
    labelAr: 'مشكلة تقنية',
    labelEn: 'Technical Issue',
    descAr: 'ملاحظات حول الحساب، النقاط، الصوت، أو عمل الواجهة',
    descEn: 'Feedback regarding account, points, sound, or interface behavior',
  },
  {
    id: 'suggestion',
    labelAr: 'اقتراح تطوير',
    labelEn: 'Feature Suggestion',
    descAr: 'أفكار لإضافة مميزات جديدة أو تطوير الأسئلة والأقسام',
    descEn: 'Ideas for adding new features or improving questions and categories',
  },
  {
    id: 'complaint',
    labelAr: 'شكوى أو بلاغ',
    labelEn: 'Complaint or Report',
    descAr: 'تقديم شكوى رسمية ليتم مراجعتها من إدارة الميدان',
    descEn: 'Submit an official report to be reviewed by Peak of Challenge management',
  },
];

export const CustomerSupportModal: React.FC<CustomerSupportModalProps> = ({
  profile,
  lang,
  onClose,
  onSubmitTicket,
}) => {
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'direct'>('new');
  const [selectedCat, setSelectedCat] = useState<SupportTicketCategory>('prizes');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submittedNotice, setSubmittedNotice] = useState<string | null>(null);
  const [copiedContact, setCopiedContact] = useState<string | null>(null);

  const tickets = profile.supportTickets || [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) return;

    const catObj =
      TICKET_CATEGORIES.find((c) => c.id === selectedCat) || TICKET_CATEGORIES[0];
    const catLabel = lang === 'en' ? catObj.labelEn : catObj.labelAr;

    soundEngine.playReward();
    onSubmitTicket(
      selectedCat,
      catLabel,
      subject.trim() || catLabel,
      message.trim()
    );
    setSubject('');
    setMessage('');
    setSubmittedNotice(
      tr(
        lang,
        'تم إرسال رسالتك إلى خدمة العملاء بنجاح وتم تحديث سجل الرسائل بالرد الفوري!',
        'Your ticket has been sent to Customer Support and updated with an instant reply!'
      )
    );
    window.setTimeout(() => {
      setSubmittedNotice(null);
      setActiveTab('history');
    }, 1500);
  };

  const handleCopyContact = async (val: string, key: string) => {
    soundEngine.playClick();
    try {
      await navigator.clipboard.writeText(val);
      setCopiedContact(key);
      window.setTimeout(() => setCopiedContact(null), 2000);
    } catch {
      setCopiedContact(key);
      window.setTimeout(() => setCopiedContact(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">
                {tr(
                  lang,
                  '🎧 مركز خدمة العملاء والدعم الفني',
                  '🎧 Customer Support & Help Center'
                )}
              </h3>
              <p className="text-xs text-slate-400 font-mono-num">
                {tr(lang, 'حساب اللاعب:', 'Player:')} {profile.username} · ID: {profile.playerId}
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

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-[#0B1120] border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('new');
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'new'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{tr(lang, 'إرسال رسالة جديدة', 'New Ticket')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('history');
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>
              {tr(lang, `سجل رسائلي (${tickets.length})`, `My Tickets (${tickets.length})`)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab('direct');
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'direct'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>{tr(lang, 'التواصل المباشر', 'Direct Contact')}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="overflow-y-auto pr-1 space-y-5 flex-1">
          {activeTab === 'new' && (
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  {tr(lang, '1. اختر نوع الطلب:', '1. Select Request Category:')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TICKET_CATEGORIES.map((cat) => {
                    const isSelected = selectedCat === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSelectedCat(cat.id);
                        }}
                        className={`p-3 rounded-xl border text-start transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400 text-white'
                            : 'bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-extrabold text-white">
                          {lang === 'en' ? cat.labelEn : cat.labelAr}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {lang === 'en' ? cat.descEn : cat.descAr}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  {tr(
                    lang,
                    '2. عنوان موجز للطلب (اختياري):',
                    '2. Brief Subject (Optional):'
                  )}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={tr(
                    lang,
                    'مثال: استفسار حول موعد تسليم جوائز الشهر...',
                    'e.g., Question about monthly prize delivery...'
                  )}
                  maxLength={60}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0B1120] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  {tr(lang, '3. تفاصيل الرسالة:', '3. Message Details:')}
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={tr(
                    lang,
                    'اكتب رسالتك أو استفسارك أو اقتراحك هنا بالتفصيل...',
                    'Write your message, inquiry, or feedback in detail...'
                  )}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#0B1120] border border-slate-700 focus:border-cyan-400 focus:outline-none text-sm text-white placeholder-slate-500 resize-none"
                />
              </div>

              {submittedNotice && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-xs font-bold text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{submittedNotice}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={message.trim().length < 5}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-extrabold text-sm cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                <span>
                  {tr(lang, 'إرسال الطلب إلى خدمة العملاء', 'Submit Ticket to Support')}
                </span>
              </button>
            </form>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {tickets.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#0B1120] border border-slate-800 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-sm font-bold text-slate-300">
                    {tr(lang, 'لا توجد رسائل سابقة في سجلك', 'No previous tickets found')}
                  </div>
                  <p className="text-xs text-slate-500">
                    {tr(
                      lang,
                      'يمكنك إرسال أي استفسار أو مشكلة تقنية أو اقتراح من تبويب «إرسال رسالة جديدة».',
                      'You can submit any inquiry, issue, or suggestion from the "New Ticket" tab.'
                    )}
                  </p>
                </div>
              ) : (
                tickets.map((t) => {
                  const dateFormatted = new Date(t.createdAt).toLocaleDateString(
                    lang === 'en' ? 'en-US' : 'ar-SA',
                    {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  );
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono-num font-bold text-cyan-400">
                            #{t.ticketNumber}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="text-xs font-extrabold text-white">
                            {t.categoryLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500">{dateFormatted}</span>
                          <span className="text-slate-600">·</span>
                          {t.status === 'replied' ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {tr(lang, 'تم الرد', 'Replied')}
                            </span>
                          ) : (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {tr(lang, 'قيد المراجعة', 'Pending')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-300">{t.subject}</div>
                        <p className="text-xs text-slate-400 leading-relaxed bg-[#111827] p-3 rounded-lg border border-slate-800/70">
                          {t.message}
                        </p>
                      </div>

                      {t.replyText && (
                        <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                          <div className="text-[11px] font-extrabold text-cyan-300 flex items-center gap-1.5">
                            <Headphones className="w-3.5 h-3.5" />
                            <span>
                              {tr(lang, 'رد فريق خدمة العملاء:', 'Support Team Reply:')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed">
                            {t.replyText}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'direct' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                {tr(
                  lang,
                  'يمكنك التواصل مباشرة مع فريق الدعم الفني وإدارة الجوائز في «قمة التحدي» عبر القنوات الرسمية التالية مع تزويدهم بكود اللاعب الخاص بك (',
                  'You can contact the Peak of Challenge support and prize team directly via our official channels using your Player ID ('
                )}
                <span className="font-mono-num text-amber-400 font-bold">
                  {profile.playerId}
                </span>
                ):
              </p>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">
                        {tr(
                          lang,
                          'البريد الإلكتروني للدعم الفني',
                          'Technical Support Email'
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono-num" dir="ltr">
                        support@midan-almarifa.app
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyContact('support@midan-almarifa.app', 'email')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedContact === 'email' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">
                          {tr(lang, 'تم النسخ', 'Copied')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{tr(lang, 'نسخ البريد', 'Copy Email')}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">
                        {tr(
                          lang,
                          'واتساب خدمة العملاء والجوائز',
                          'WhatsApp Support & Prizes'
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono-num" dir="ltr">
                        +966 50 000 0000
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyContact('+966500000000', 'whatsapp')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedContact === 'whatsapp' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">
                          {tr(lang, 'تم النسخ', 'Copied')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{tr(lang, 'نسخ الرقم', 'Copy Number')}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-purple-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">
                        {tr(lang, 'قناة ومعرف تيليجرام الرسمي', 'Official Telegram Channel')}
                      </div>
                      <div className="text-xs text-slate-400 font-mono-num" dir="ltr">
                        @MidanAlmarifaSupport
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyContact('@MidanAlmarifaSupport', 'tg')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {copiedContact === 'tg' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">
                          {tr(lang, 'تم النسخ', 'Copied')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{tr(lang, 'نسخ المعرف', 'Copy Handle')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
