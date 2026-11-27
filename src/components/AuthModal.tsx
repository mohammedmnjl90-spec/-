import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppLanguage, CountryInfo, PlayerProfile } from '../types/game';
import { COUNTRIES_LIST, filterCountriesByQuery, getCountryByCode } from '../data/countries';
import { CloudSyncStatus, storageRepo } from '../services/storageRepository';
import { auth } from '../firebaseConfig';
import { soundEngine } from '../utils/sound';
import { getCountryDisplayName, tr } from '../utils/i18n';
import { globalErrorHandler } from '../utils/globalErrorHandler';
import {
  COUNTRY_PHONE_RULES,
  extractAsciiDigits,
  parsePhoneInputNonDestructive,
  validatePhoneForAuth,
} from '../utils/phoneUtils';
import {
  AlertCircle,
  CheckCircle2,
  Search,
  Lock,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
  X,
  KeyRound,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

/**
 * Backwards-compatible exports backed by the shared non-destructive phoneUtils module.
 */
export function parseInternationalPhoneInput(
  rawValue: string,
  currentCountry: CountryInfo
): { matchedCountry: CountryInfo; cleanSubscriberInput: string } {
  const parsed = parsePhoneInputNonDestructive(rawValue, currentCountry);
  return {
    matchedCountry: parsed.matchedCountry,
    cleanSubscriberInput: parsed.displayValue,
  };
}

export function validateAndTransformPhoneForAuth(
  dialCode: string,
  rawPhone: string,
  lang: AppLanguage,
  mode: 'register' | 'login' = 'register'
) {
  return validatePhoneForAuth(dialCode, rawPhone, lang, mode);
}

/**
 * Validates an email address format for Firebase Auth.
 */
export function validateEmailForAuth(
  rawEmail: string,
  lang: AppLanguage
): { valid: true; normalizedEmail: string } | { valid: false; error: string } {
  const trimmed = rawEmail.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return {
      valid: false,
      error: tr(
        lang,
        'يرجى إدخال بريد إلكتروني صحيح (مثال: name@example.com).',
        'Please enter a valid email address (e.g., name@example.com).'
      ),
    };
  }
  return { valid: true, normalizedEmail: trimmed };
}

export interface AuthModalProps {
  lang: AppLanguage;
  cloudStatus?: CloudSyncStatus;
  initialTab?: 'login' | 'register';
  isModalOverlay?: boolean;
  onClose?: () => void;
  onAuthSuccess: (profile: PlayerProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  lang,
  initialTab,
  isModalOverlay = false,
  onClose,
  onAuthSuccess,
}) => {
  const [savedAccounts, setSavedAccounts] = useState<PlayerProfile[]>(() =>
    storageRepo.loadAllSavedAccounts()
  );
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>(() => {
    if (initialTab) return initialTab;
    return storageRepo.loadAllSavedAccounts().length > 0 ? 'login' : 'register';
  });

  // Registration state
  const [username, setUsername] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(COUNTRIES_LIST[0]);
  const [countrySearch, setCountrySearch] = useState('');
  const [contactType, setContactType] = useState<'phone' | 'email'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Login state (Email or Phone + Password) — default country to most recent saved account if available
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>(() => {
    const firstAcc = storageRepo.loadAllSavedAccounts()[0];
    return firstAcc?.contactType === 'email' ? 'email' : 'phone';
  });
  const [loginCountry, setLoginCountry] = useState<CountryInfo>(() => {
    const firstAcc = storageRepo.loadAllSavedAccounts()[0];
    if (firstAcc?.country?.code) {
      return getCountryByCode(firstAcc.country.code) || firstAcc.country;
    }
    return COUNTRIES_LIST[0];
  });
  const [showLoginCountryPicker, setShowLoginCountryPicker] = useState(false);
  const [loginCountrySearch, setLoginCountrySearch] = useState('');
  const [loginPhoneInput, setLoginPhoneInput] = useState('');
  const [loginPhoneTouched, setLoginPhoneTouched] = useState(false);
  const [loginEmailInput, setLoginEmailInput] = useState('');
  const [loginEmailTouched, setLoginEmailTouched] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const loginPasswordInputRef = useRef<HTMLInputElement | null>(null);

  // Forgot Password state
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setSavedAccounts(storageRepo.loadAllSavedAccounts());
  }, []);

  // Real-time validation & internal transformation (`phone_xxx@neurox.app`) for Registration
  const registerPhoneValidation = useMemo(
    () =>
      validatePhoneForAuth(selectedCountry.dialCode, phoneInput, lang, 'register'),
    [selectedCountry.dialCode, phoneInput, lang]
  );

  const registerEmailValidation = useMemo(
    () => validateEmailForAuth(emailInput, lang),
    [emailInput, lang]
  );

  // Real-time validation & internal transformation (`phone_xxx@neurox.app`) for Login (flexible E.164)
  const loginPhoneValidation = useMemo(
    () =>
      validatePhoneForAuth(loginCountry.dialCode, loginPhoneInput, lang, 'login'),
    [loginCountry.dialCode, loginPhoneInput, lang]
  );

  const loginEmailValidation = useMemo(
    () => validateEmailForAuth(loginEmailInput, lang),
    [loginEmailInput, lang]
  );

  const handleRegisterPhoneChange = (rawVal: string) => {
    setPhoneTouched(true);
    if (errorMsg) setErrorMsg(null);
    const parsed = parsePhoneInputNonDestructive(rawVal, selectedCountry);
    if (parsed.matchedCountry.code !== selectedCountry.code) {
      setSelectedCountry(parsed.matchedCountry);
    }
    setPhoneInput(parsed.displayValue);
  };

  const handleLoginPhoneChange = (rawVal: string) => {
    setLoginPhoneTouched(true);
    if (loginError) setLoginError(null);
    const parsed = parsePhoneInputNonDestructive(rawVal, loginCountry);
    if (parsed.matchedCountry.code !== loginCountry.code) {
      setLoginCountry(parsed.matchedCountry);
    }
    setLoginPhoneInput(parsed.displayValue);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) return;

    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setErrorMsg(
        tr(
          lang,
          'يرجى إدخال اسم مستخدم مكوّن من 3 أحرف على الأقل.',
          'Please enter a username with at least 3 characters.'
        )
      );
      soundEngine.playWrong();
      return;
    }

    if (trimmed.length > 20) {
      setErrorMsg(
        tr(
          lang,
          'اسم المستخدم يجب ألا يتجاوز 20 حرفاً.',
          'Username must not exceed 20 characters.'
        )
      );
      soundEngine.playWrong();
      return;
    }

    let prevalidatedSyntheticEmail: string | undefined;
    let prevalidatedNormalizedPhone: string | undefined;

    if (contactType === 'phone') {
      setPhoneTouched(true);
      if (!registerPhoneValidation.valid) {
        setErrorMsg(registerPhoneValidation.error);
        soundEngine.playWrong();
        return;
      }
      prevalidatedSyntheticEmail = registerPhoneValidation.syntheticEmail;
      prevalidatedNormalizedPhone = registerPhoneValidation.normalizedPhone;
    } else {
      setEmailTouched(true);
      if (!registerEmailValidation.valid) {
        setErrorMsg(registerEmailValidation.error);
        soundEngine.playWrong();
        return;
      }
    }

    if (registerPassword.length < 6) {
      setErrorMsg(
        tr(
          lang,
          'كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل.',
          'Password must be at least 6 characters long.'
        )
      );
      soundEngine.playWrong();
      return;
    }

    setErrorMsg(null);
    setIsRegistering(true);

    try {
      const result = await storageRepo.registerAccountWithFirebaseAuth({
        username: trimmed,
        country: selectedCountry,
        contactType,
        rawContactValue: contactType === 'phone' ? phoneInput : emailInput,
        password: registerPassword,
        lang,
        validatedSyntheticEmail: prevalidatedSyntheticEmail,
        validatedNormalizedPhone: prevalidatedNormalizedPhone,
      });

      if (!result.ok) {
        setErrorMsg(result.error);
        soundEngine.playWrong();
        setIsRegistering(false);
        return;
      }

      soundEngine.playReward();
      setIsRegistering(false);
      onAuthSuccess(result.profile);
    } catch (err) {
      const { userMessage } = globalErrorHandler.recordAndFormat({
        error: err,
        category: 'auth',
        operation: 'register_submit',
        path: 'auth/register',
        lang,
      });
      setErrorMsg(userMessage);
      soundEngine.playWrong();
      setIsRegistering(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;

    setLoginError(null);
    setResetSuccessMsg(null);

    let prevalidatedSyntheticEmail: string | undefined;
    let prevalidatedNormalizedPhone: string | undefined;

    if (loginMethod === 'phone') {
      setLoginPhoneTouched(true);
      if (!loginPhoneValidation.valid) {
        setLoginError(loginPhoneValidation.error);
        soundEngine.playWrong();
        return;
      }
      prevalidatedSyntheticEmail = loginPhoneValidation.syntheticEmail;
      prevalidatedNormalizedPhone = loginPhoneValidation.normalizedPhone;
    } else {
      setLoginEmailTouched(true);
      if (!loginEmailValidation.valid) {
        setLoginError(loginEmailValidation.error);
        soundEngine.playWrong();
        return;
      }
    }

    if (!loginPassword || loginPassword.length < 6) {
      setLoginError(
        tr(
          lang,
          'يرجى إدخال كلمة المرور (6 أحرف أو أرقام على الأقل).',
          'Please enter your password (at least 6 characters).'
        )
      );
      soundEngine.playWrong();
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await storageRepo.loginAccountWithFirebaseAuth({
        contactType: loginMethod,
        country: loginCountry,
        rawIdentifier: loginMethod === 'phone' ? loginPhoneInput : loginEmailInput,
        password: loginPassword,
        lang,
        validatedSyntheticEmail: prevalidatedSyntheticEmail,
        validatedNormalizedPhone: prevalidatedNormalizedPhone,
      });

      if (!result.ok) {
        setLoginError(result.error);
        soundEngine.playWrong();
        setIsLoggingIn(false);
        return;
      }

      soundEngine.playReward();
      setIsLoggingIn(false);
      onAuthSuccess(result.profile);
    } catch (err) {
      const { userMessage } = globalErrorHandler.recordAndFormat({
        error: err,
        category: 'auth',
        operation: 'login_submit',
        path: 'auth/login',
        lang,
      });
      setLoginError(userMessage);
      soundEngine.playWrong();
      setIsLoggingIn(false);
    }
  };

  const handleOpenForgotPassword = () => {
    soundEngine.playClick();
    setResetError(null);
    setResetSuccessMsg(null);
    if (loginEmailInput.trim()) {
      setResetEmailInput(loginEmailInput.trim());
    }
    setAuthMode('forgot_password');
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendingReset) return;

    setResetError(null);
    setResetSuccessMsg(null);

    const emailCheck = validateEmailForAuth(resetEmailInput, lang);
    if (!emailCheck.valid) {
      setResetError(emailCheck.error);
      soundEngine.playWrong();
      return;
    }

    setIsSendingReset(true);
    const res = await storageRepo.resetPasswordByEmail(emailCheck.normalizedEmail, lang);
    setIsSendingReset(false);

    if (res.ok) {
      soundEngine.playReward();
      setResetSuccessMsg(res.message);
    } else {
      soundEngine.playWrong();
      setResetError(res.error);
    }
  };

  const filteredCountries = filterCountriesByQuery(countrySearch);
  const filteredLoginCountries = filterCountriesByQuery(loginCountrySearch);

  const renderRealtimePhoneStatus = (
    validation: ReturnType<typeof validateAndTransformPhoneForAuth>,
    rawValue: string,
    touched: boolean
  ) => {
    if (!touched && rawValue.length === 0) return null;

    if (validation.valid) {
      return (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 text-[11px] text-emerald-300 font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            {tr(lang, 'رقم الجوال صحيح:', 'Valid mobile number:')}{' '}
            <strong className="font-mono-num text-white" dir="ltr">
              {validation.normalizedPhone}
            </strong>
          </span>
        </div>
      );
    }

    return (
      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-300 leading-relaxed">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>{validation.error}</span>
      </div>
    );
  };

  const renderRealtimeEmailStatus = (
    validation: ReturnType<typeof validateEmailForAuth>,
    rawValue: string,
    touched: boolean
  ) => {
    if (!touched && rawValue.length === 0) return null;
    if (validation.valid) {
      return (
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 text-[11px] text-emerald-300 font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            {tr(lang, 'البريد الإلكتروني صحيح:', 'Valid email address:')}{' '}
            <span className="font-mono-num text-white">{validation.normalizedEmail}</span>
          </span>
        </div>
      );
    }
    return (
      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-300">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>{validation.error}</span>
      </div>
    );
  };

  const cardContent = (
    <div className="max-w-xl w-full bg-[#111827] border border-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      {isModalOverlay && onClose && (
        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onClose();
          }}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white absolute top-4 left-4 cursor-pointer transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Clean Tabs: "حساب جديد / New Account" and "تسجيل الدخول / Sign In" */}
      {authMode !== 'forgot_password' && (
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0B1120] border border-slate-800">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setAuthMode('register');
              setErrorMsg(null);
            }}
            className={`py-2.5 px-4 rounded-lg text-xs font-extrabold flex items-center justify-center cursor-pointer transition-colors whitespace-nowrap ${
              authMode === 'register'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {tr(lang, 'حساب جديد', 'New Account')}
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setAuthMode('login');
              setLoginError(null);
              setResetSuccessMsg(null);
            }}
            className={`py-2.5 px-4 rounded-lg text-xs font-extrabold flex items-center justify-center cursor-pointer transition-colors whitespace-nowrap ${
              authMode === 'login'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {tr(lang, 'تسجيل الدخول', 'Sign In')}
          </button>
        </div>
      )}

      {authMode === 'forgot_password' ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setAuthMode('login');
                setResetError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              {lang === 'ar' ? (
                <ArrowRight className="w-4 h-4" />
              ) : (
                <ArrowLeft className="w-4 h-4" />
              )}
              <span>{tr(lang, 'العودة لتسجيل الدخول', 'Back to Sign In')}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <KeyRound className="w-6 h-6 text-cyan-400 shrink-0" />
              <span>{tr(lang, 'استعادة كلمة المرور', 'Reset Password')}</span>
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {tr(
                lang,
                'أدخل البريد الإلكتروني المرتبط بحسابك وسنرسل لك رابطاً فورياً لإعادة تعيين كلمة المرور.',
                'Enter the email address linked to your account and we will send you an instant password reset link.'
              )}
            </p>
          </div>

          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                {tr(lang, 'البريد الإلكتروني', 'Email Address')}
              </label>
              <input
                type="email"
                dir="ltr"
                value={resetEmailInput}
                onChange={(e) => {
                  setResetEmailInput(e.target.value);
                  if (resetError) setResetError(null);
                  if (resetSuccessMsg) setResetSuccessMsg(null);
                }}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl bg-[#0B1120] border border-slate-700 focus:border-cyan-400 focus:outline-none text-white placeholder-slate-500 text-sm"
                required
              />
            </div>

            {resetError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-300 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-start gap-2.5 text-xs text-emerald-300 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSendingReset}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isSendingReset ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{tr(lang, 'جاري إرسال الرابط...', 'Sending reset link...')}</span>
                </>
              ) : (
                <span>
                  {tr(lang, 'إرسال رابط إعادة تعيين كلمة المرور', 'Send Password Reset Link')}
                </span>
              )}
            </button>
          </form>
        </div>
      ) : authMode === 'login' ? (
        <div className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white">
              {tr(lang, 'تسجيل الدخول', 'Sign In')}
            </h2>
            <p className="text-xs text-slate-400">
              {tr(
                lang,
                'سجّل دخولك عبر رقم الجوال أو البريد الإلكتروني مع كلمة المرور من أي جهاز.',
                'Sign in with your mobile number or email and password from any device.'
              )}
            </p>
          </div>

          {/* Method Selector: Mobile Number vs Email */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0B1120] border border-slate-800">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setLoginMethod('phone');
                setLoginError(null);
                setResetSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                loginMethod === 'phone'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{tr(lang, 'برقم الجوال', 'Mobile Number')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setLoginMethod('email');
                setLoginError(null);
                setResetSuccessMsg(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                loginMethod === 'email'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{tr(lang, 'بالبريد الإلكتروني', 'Email Address')}</span>
            </button>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginMethod === 'phone' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300">
                    {tr(lang, 'رقم الجوال بالصيغة الدولية', 'International Mobile Number')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLoginCountryPicker((prev) => !prev)}
                    className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{loginCountry.flag}</span>
                    <span>{getCountryDisplayName(loginCountry, lang)}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showLoginCountryPicker && (
                  <div className="p-3 rounded-xl bg-[#0B1120] border border-slate-700 space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={loginCountrySearch}
                        onChange={(e) => setLoginCountrySearch(e.target.value)}
                        placeholder={tr(lang, 'ابحث عن الدولة...', 'Search country...')}
                        className="w-full pr-9 pl-3 py-2 rounded-lg bg-[#111827] border border-slate-700 text-xs text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                      {filteredLoginCountries.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setLoginCountry(c);
                            setShowLoginCountryPicker(false);
                          }}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-start text-xs cursor-pointer ${
                            c.code === loginCountry.code
                              ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                              : 'bg-[#111827] border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span>{c.flag}</span>
                          <span className="truncate">{getCountryDisplayName(c, lang)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 w-full min-w-0" dir="ltr">
                  <button
                    type="button"
                    onClick={() => setShowLoginCountryPicker((prev) => !prev)}
                    className="px-2.5 sm:px-3.5 py-3 rounded-xl bg-[#0B1120] border border-cyan-500/40 hover:border-cyan-400 flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer"
                  >
                    <span className="text-base sm:text-lg leading-none">{loginCountry.flag}</span>
                    <span className="text-xs sm:text-sm font-mono-num font-bold text-cyan-400">
                      {loginCountry.dialCode}
                    </span>
                  </button>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={loginPhoneInput}
                    onBlur={() => setLoginPhoneTouched(true)}
                    onChange={(e) => handleLoginPhoneChange(e.target.value)}
                    placeholder={
                      COUNTRY_PHONE_RULES[loginCountry.dialCode]?.exampleLocal || '770000000'
                    }
                    className={`flex-1 min-w-0 w-full px-3 sm:px-4 py-3 rounded-xl bg-[#0B1120] border focus:outline-none text-white placeholder-slate-500 text-sm font-mono-num ${
                      loginPhoneInput.length > 0
                        ? loginPhoneValidation.valid
                          ? 'border-emerald-500/60 focus:border-emerald-400'
                          : 'border-amber-500/60 focus:border-amber-400'
                        : 'border-slate-700 focus:border-cyan-400'
                    }`}
                    required
                  />
                </div>

                {/* Real-time International Format & phone_xxx@neurox.app transformation feedback */}
                {renderRealtimePhoneStatus(
                  loginPhoneValidation,
                  loginPhoneInput,
                  loginPhoneTouched
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  {tr(lang, 'البريد الإلكتروني', 'Email Address')}
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={loginEmailInput}
                  onBlur={() => setLoginEmailTouched(true)}
                  onChange={(e) => {
                    setLoginEmailTouched(true);
                    setLoginEmailInput(e.target.value);
                    if (loginError) setLoginError(null);
                    if (resetSuccessMsg) setResetSuccessMsg(null);
                  }}
                  placeholder="name@example.com"
                  className={`w-full px-4 py-3 rounded-xl bg-[#0B1120] border focus:outline-none text-white placeholder-slate-500 text-sm ${
                    loginEmailInput.length > 0
                      ? loginEmailValidation.valid
                        ? 'border-emerald-500/60 focus:border-emerald-400'
                        : 'border-amber-500/60 focus:border-amber-400'
                      : 'border-slate-700 focus:border-cyan-400'
                  }`}
                  required
                />
                {renderRealtimeEmailStatus(
                  loginEmailValidation,
                  loginEmailInput,
                  loginEmailTouched
                )}
              </div>
            )}

            {/* Password Field + Forgot Password Link */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">
                  {tr(lang, 'كلمة المرور', 'Password')}
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotPassword}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  {tr(lang, 'نسيت كلمة المرور؟', 'Forgot Password?')}
                </button>
              </div>

              <div className="relative" dir="ltr">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={loginPasswordInputRef}
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#0B1120] border border-slate-700 focus:border-cyan-400 focus:outline-none text-white placeholder-slate-500 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-300 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            {resetSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-start gap-2.5 text-xs text-emerald-300 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                isLoggingIn ||
                (loginMethod === 'phone'
                  ? !loginPhoneValidation.valid
                  : !loginEmailValidation.valid)
              }
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {tr(lang, 'جارٍ التحقق وتسجيل الدخول...', 'Signing in...')}
                  </span>
                </>
              ) : (
                <span>{tr(lang, 'تسجيل الدخول', 'Sign In')}</span>
              )}
            </button>
          </form>

          {/* Saved accounts on this device for quick switching */}
          {savedAccounts.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <div className="text-xs font-bold text-slate-400">
                {tr(lang, 'حسابات نشطة على هذا الجهاز:', 'Active accounts on this device:')}
              </div>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {savedAccounts.map((acc) => (
                  <div
                    key={acc.playerId}
                    className="p-3 rounded-xl bg-[#0B1120] border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{acc.country.flag}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-white truncate">
                          {acc.username}
                        </div>
                        <div className="text-xs text-slate-400 font-mono-num">
                          {tr(lang, 'نقاط الشهر:', 'Monthly Pts:')} {acc.monthlyPoints} ·{' '}
                          {tr(lang, 'العملات:', 'Coins:')} {acc.coins}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        // If Firebase Auth is already authenticated as this exact account, hydrate and enter directly
                        if (auth.currentUser && acc.uid && auth.currentUser.uid === acc.uid) {
                          const synced = storageRepo.loginByIdentifier(acc.playerId);
                          if (synced) {
                            soundEngine.playReward();
                            onAuthSuccess(synced);
                          }
                          return;
                        }

                        // Otherwise, pre-fill the real Sign-In form so Firebase Auth authenticates properly
                        // and loads the full cloud profile & username immediately
                        setLoginError(null);
                        if (acc.contactType === 'email' && (acc.email || acc.contactValue)) {
                          setLoginMethod('email');
                          setLoginEmailInput(acc.email || acc.contactValue || '');
                          setLoginEmailTouched(true);
                        } else {
                          setLoginMethod('phone');
                          const accCountry =
                            getCountryByCode(acc.country.code) || acc.country || COUNTRIES_LIST[0];
                          setLoginCountry(accCountry);
                          const rawSavedPhone = acc.phone || acc.contactValue || '';
                          const dialDigits = extractAsciiDigits(accCountry.dialCode);
                          let localSub = extractAsciiDigits(rawSavedPhone);
                          if (
                            dialDigits &&
                            localSub.startsWith(dialDigits) &&
                            localSub.length > dialDigits.length
                          ) {
                            localSub = localSub.slice(dialDigits.length);
                          }
                          setLoginPhoneInput(localSub || rawSavedPhone);
                          setLoginPhoneTouched(true);
                        }
                        setResetSuccessMsg(
                          tr(
                            lang,
                            `تم تعبئة بيانات حساب «${acc.username}» — أدخل كلمة المرور لتسجيل الدخول.`,
                            `Filled credentials for "${acc.username}" — enter your password to sign in.`
                          )
                        );
                        window.setTimeout(() => {
                          loginPasswordInputRef.current?.focus();
                        }, 60);
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {tr(lang, 'اختيار', 'Select')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white">
              {tr(lang, 'انضم إلى قمة التحدي', 'Join Peak of Challenge')}
            </h2>
            <p className="text-xs text-slate-400">
              {tr(
                lang,
                'أنشئ حسابك لحفظ نقاطك ومنافسة الأوائل في قائمة المتصدرين الشهرية.',
                'Create your account to save your score and compete on the monthly leaderboard.'
              )}
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Step 1: Username */}
            <div className="space-y-1.5">
              <label htmlFor="player-username" className="block text-sm font-bold text-slate-200">
                {tr(lang, 'اسم المستخدم', 'Username')}
              </label>
              <input
                id="player-username"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={tr(lang, 'أدخل اسم المستخدم', 'Enter username')}
                className="w-full min-w-0 px-4 py-3 rounded-xl bg-[#0B1120] border border-slate-700 focus:border-cyan-400 focus:outline-none text-white placeholder-slate-500 text-sm"
                maxLength={20}
                required
              />
            </div>

            {/* Step 2: Country Selection (Shows Flag + Country Name ONLY in the list) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-200">
                  {tr(lang, 'اختيار الدولة', 'Select Country')}
                </label>
                <span className="text-xs text-cyan-400 font-bold flex items-center gap-1.5">
                  <span>{selectedCountry.flag}</span>
                  <span>{getCountryDisplayName(selectedCountry, lang)}</span>
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder={tr(lang, 'ابحث عن الدولة...', 'Search country...')}
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[#0B1120] border border-slate-700 focus:border-cyan-400 focus:outline-none text-xs sm:text-sm text-slate-100 placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                {filteredCountries.map((c) => {
                  const isSelected = c.code === selectedCountry.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedCountry(c);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-start transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400 text-white'
                          : 'bg-[#0B1120] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xl shrink-0">{c.flag}</span>
                      <span className="text-xs font-bold text-white truncate">
                        {getCountryDisplayName(c, lang)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Phone Number (with auto Flag + Dial Code + Real-time International Validation) or Email */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="block text-sm font-bold text-slate-200">
                  {tr(lang, 'رقم الجوال أو البريد الإلكتروني', 'Mobile Number or Email')}
                </label>
                <div className="inline-flex p-0.5 rounded-lg bg-[#0B1120] border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setContactType('phone');
                      setErrorMsg(null);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      contactType === 'phone'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Phone className="w-3 h-3" />
                    <span>{tr(lang, 'رقم الجوال', 'Mobile')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setContactType('email');
                      setErrorMsg(null);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      contactType === 'email'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    <span>{tr(lang, 'البريد الإلكتروني', 'Email')}</span>
                  </button>
                </div>
              </div>

              {contactType === 'phone' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 w-full min-w-0" dir="ltr">
                    {/* Auto Country Flag + Dial Code badge */}
                    <div className="px-2.5 sm:px-3.5 py-3 rounded-xl bg-[#0B1120] border border-cyan-500/40 flex items-center gap-1.5 sm:gap-2 shrink-0 select-none">
                      <span className="text-base sm:text-lg leading-none">{selectedCountry.flag}</span>
                      <span className="text-xs sm:text-sm font-mono-num font-bold text-cyan-400">
                        {selectedCountry.dialCode}
                      </span>
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      value={phoneInput}
                      onBlur={() => setPhoneTouched(true)}
                      onChange={(e) => handleRegisterPhoneChange(e.target.value)}
                      placeholder={
                        COUNTRY_PHONE_RULES[selectedCountry.dialCode]?.exampleLocal ||
                        '770000000'
                      }
                      className={`flex-1 min-w-0 w-full px-3 sm:px-4 py-3 rounded-xl bg-[#0B1120] border focus:outline-none text-white placeholder-slate-500 text-sm font-mono-num ${
                        phoneInput.length > 0
                          ? registerPhoneValidation.valid
                            ? 'border-emerald-500/60 focus:border-emerald-400'
                            : 'border-amber-500/60 focus:border-amber-400'
                          : 'border-slate-700 focus:border-cyan-400'
                      }`}
                      required
                    />
                  </div>

                  {/* Real-time International Format & phone_xxx@neurox.app transformation feedback */}
                  {renderRealtimePhoneStatus(
                    registerPhoneValidation,
                    phoneInput,
                    phoneTouched
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="email"
                    dir="ltr"
                    value={emailInput}
                    onBlur={() => setEmailTouched(true)}
                    onChange={(e) => {
                      setEmailTouched(true);
                      setEmailInput(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="name@example.com"
                    className={`w-full px-4 py-3 rounded-xl bg-[#0B1120] border focus:outline-none text-white placeholder-slate-500 text-sm ${
                      emailInput.length > 0
                        ? registerEmailValidation.valid
                          ? 'border-emerald-500/60 focus:border-emerald-400'
                          : 'border-amber-500/60 focus:border-amber-400'
                        : 'border-slate-700 focus:border-cyan-400'
                    }`}
                    required
                  />
                  {renderRealtimeEmailStatus(
                    registerEmailValidation,
                    emailInput,
                    emailTouched
                  )}
                </div>
              )}
            </div>

            {/* Step 4: Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-200">
                {tr(lang, 'كلمة المرور', 'Password')}
              </label>
              <div className="relative" dir="ltr">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showRegisterPassword ? 'text' : 'password'}
                  value={registerPassword}
                  onChange={(e) => {
                    setRegisterPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder={tr(
                    lang,
                    '6 أحرف أو أرقام على الأقل',
                    'At least 6 characters'
                  )}
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#0B1120] border border-slate-700 focus:border-cyan-400 focus:outline-none text-white placeholder-slate-500 text-sm"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showRegisterPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-300 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                isRegistering ||
                (contactType === 'phone'
                  ? !registerPhoneValidation.valid
                  : !registerEmailValidation.valid)
              }
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-l from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-extrabold text-base shadow-lg shadow-cyan-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>
                    {tr(lang, 'جارٍ إنشاء حسابك...', 'Creating your account...')}
                  </span>
                </>
              ) : (
                <span>{tr(lang, 'ابدأ التحدي الآن 🚀', 'Start Challenge Now 🚀')}</span>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );

  if (isModalOverlay) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        {cardContent}
      </div>
    );
  }

  return cardContent;
};
