import { COUNTRIES_LIST } from '../data/countries';
import { AppLanguage, CountryInfo } from '../types/game';
import { tr } from './i18n';

export interface CountryPhoneRule {
  subscriberLength: number;
  validStartDigits?: string[];
  exampleLocal: string;
}

export const COUNTRY_PHONE_RULES: Record<string, CountryPhoneRule> = {
  '+967': { subscriberLength: 9, validStartDigits: ['7'], exampleLocal: '770000000' }, // Yemen
  '+966': { subscriberLength: 9, validStartDigits: ['5'], exampleLocal: '500000000' }, // Saudi Arabia
  '+20': { subscriberLength: 10, validStartDigits: ['1'], exampleLocal: '1000000000' }, // Egypt
  '+971': { subscriberLength: 9, validStartDigits: ['5'], exampleLocal: '500000000' }, // UAE
  '+965': { subscriberLength: 8, validStartDigits: ['5', '6', '9', '4'], exampleLocal: '50000000' }, // Kuwait
  '+974': { subscriberLength: 8, validStartDigits: ['3', '5', '6', '7'], exampleLocal: '33000000' }, // Qatar
  '+968': { subscriberLength: 8, validStartDigits: ['7', '9'], exampleLocal: '90000000' }, // Oman
  '+973': { subscriberLength: 8, validStartDigits: ['3', '6'], exampleLocal: '33000000' }, // Bahrain
  '+962': { subscriberLength: 9, validStartDigits: ['7'], exampleLocal: '790000000' }, // Jordan
  '+964': { subscriberLength: 10, validStartDigits: ['7'], exampleLocal: '7700000000' }, // Iraq
};

const SORTED_COUNTRIES_BY_DIAL_LEN: CountryInfo[] = [...COUNTRIES_LIST].sort(
  (a, b) =>
    b.dialCode.replace(/\D/g, '').length - a.dialCode.replace(/\D/g, '').length
);

/**
 * Converts Arabic-Indic (٠١٢٣٤٥٦٧٨٩) and Eastern Arabic/Persian (۰۱۲۳۴۵۶۷۸۹)
 * digits into standard ASCII digits (0-9) without altering other characters.
 */
export function toAsciiDigits(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (ch) => String(ch.charCodeAt(0) - 0x06f0));
}

/**
 * Extracts only ASCII digits (0-9) after converting Arabic-Indic & Persian digits.
 */
export function extractAsciiDigits(input: string): string {
  return toAsciiDigits(input).replace(/\D/g, '');
}

/**
 * Non-destructive international phone parser for live text input.
 * - NEVER erases user typing (keeps '+', '00', spaces, hyphens, leading zeros, and partial digits intact).
 * - Converts Arabic-Indic / Persian numerals smoothly only during validation/normalization.
 * - Auto-switches country ONLY when a pasted/completed international prefix (`+966...` or `00966...`)
 *   unambiguously contains subscriber digits after the dial code (at least 6 subscriber digits),
 *   so typing '+' or '00' one character at a time NEVER clears the field!
 */
export function parsePhoneInputNonDestructive(
  rawValue: string,
  currentCountry: CountryInfo
): {
  matchedCountry: CountryInfo;
  displayValue: string;
  didAutoSwitchCountry: boolean;
} {
  const asciiRaw = toAsciiDigits(rawValue);
  const trimmed = asciiRaw.trim();
  const hasIntlPrefix = trimmed.startsWith('+') || trimmed.startsWith('00');

  if (hasIntlPrefix) {
    const digitsOnly = trimmed.replace(/\D/g, '');
    const withoutZeroZero = trimmed.startsWith('00')
      ? digitsOnly.slice(2)
      : digitsOnly;

    for (const country of SORTED_COUNTRIES_BY_DIAL_LEN) {
      const codeDigits = country.dialCode.replace(/\D/g, '');
      if (
        codeDigits &&
        withoutZeroZero.startsWith(codeDigits) &&
        withoutZeroZero.length >= codeDigits.length + 6
      ) {
        const subscriberPart = withoutZeroZero.slice(codeDigits.length);
        return {
          matchedCountry: country,
          displayValue: subscriberPart,
          didAutoSwitchCountry: country.code !== currentCountry.code,
        };
      }
    }
  }

  // Keep user input intact (allow ASCII/Arabic digits, +, spaces, hyphens, parentheses)
  return {
    matchedCountry: currentCountry,
    displayValue: rawValue,
    didAutoSwitchCountry: false,
  };
}

/**
 * Canonical phone normalization shared across Registration, Login, and Firebase Auth.
 * Produces deterministic `phone_<digits>@neurox.app` + E.164 `+digits` plus safe
 * alternate lookup candidates (for login only, handling historical formatting differences).
 */
export function normalizePhoneForAuth(
  dialCode: string,
  rawPhone: string
): {
  syntheticEmail: string;
  normalizedPhone: string;
  subscriberDigits: string;
  effectiveDialCode: string;
  loginFallbackEmails: string[];
} {
  const asciiTrimmed = toAsciiDigits(rawPhone).trim();
  let effectiveDialDigits = extractAsciiDigits(dialCode);
  let cleanLocalDigits = extractAsciiDigits(asciiTrimmed);

  // Detect explicit international prefix (+... or 00...) even if user didn't switch dropdown
  if (asciiTrimmed.startsWith('+') || asciiTrimmed.startsWith('00')) {
    const withoutZeroZero = asciiTrimmed.startsWith('00')
      ? cleanLocalDigits.slice(2)
      : cleanLocalDigits;

    for (const country of SORTED_COUNTRIES_BY_DIAL_LEN) {
      const codeDigits = extractAsciiDigits(country.dialCode);
      if (
        codeDigits &&
        withoutZeroZero.startsWith(codeDigits) &&
        withoutZeroZero.length >= codeDigits.length + 6
      ) {
        effectiveDialDigits = codeDigits;
        cleanLocalDigits = withoutZeroZero.slice(codeDigits.length);
        break;
      }
    }
  } else if (
    effectiveDialDigits &&
    cleanLocalDigits.startsWith(effectiveDialDigits) &&
    cleanLocalDigits.length > effectiveDialDigits.length + 5
  ) {
    // Strip duplicate country dial code if pasted without '+'
    cleanLocalDigits = cleanLocalDigits.slice(effectiveDialDigits.length);
  }

  const rawLocalBeforeZeroStrip = cleanLocalDigits;

  // Strip leading trunk zeros (e.g., 050... -> 50..., 077... -> 77..., 010... -> 10...)
  if (cleanLocalDigits.startsWith('0') && cleanLocalDigits.length > 6) {
    cleanLocalDigits = cleanLocalDigits.replace(/^0+/, '');
  }

  const fullDigits = `${effectiveDialDigits}${cleanLocalDigits}`;
  const canonicalEmail = `phone_${fullDigits}@neurox.app`;
  const normalizedPhone = `+${fullDigits}`;

  // Build safe legacy fallback synthetic emails ONLY for login lookup (e.g., if user registered with trunk 0 kept)
  const fallbackSet = new Set<string>();
  if (
    rawLocalBeforeZeroStrip !== cleanLocalDigits &&
    rawLocalBeforeZeroStrip.length >= 7
  ) {
    const withZeroDigits = `${effectiveDialDigits}${rawLocalBeforeZeroStrip}`;
    if (/^[1-9][0-9]{7,14}$/.test(withZeroDigits)) {
      const legacyEmail = `phone_${withZeroDigits}@neurox.app`;
      if (legacyEmail !== canonicalEmail) {
        fallbackSet.add(legacyEmail);
      }
    }
  }

  return {
    syntheticEmail: canonicalEmail,
    normalizedPhone,
    subscriberDigits: cleanLocalDigits,
    effectiveDialCode: `+${effectiveDialDigits}`,
    loginFallbackEmails: Array.from(fallbackSet),
  };
}

/**
 * Validates a phone number for Registration or Login.
 * - Handles Arabic-Indic & Persian numerals transparently.
 * - On `register`: enforces country rules when defined so new accounts are clean & uniform.
 * - On `login`: accepts valid E.164 lengths for the country (and warns softly rather than
 *   blocking existing accounts that may have legacy lengths/prefixes).
 */
export function validatePhoneForAuth(
  dialCode: string,
  rawPhone: string,
  lang: AppLanguage,
  mode: 'register' | 'login' = 'register'
):
  | {
      valid: true;
      syntheticEmail: string;
      normalizedPhone: string;
      subscriberDigits: string;
      effectiveDialCode: string;
    }
  | {
      valid: false;
      error: string;
      previewSyntheticEmail?: string;
    } {
  const normalized = normalizePhoneForAuth(dialCode, rawPhone);
  const { subscriberDigits, syntheticEmail, normalizedPhone, effectiveDialCode } = normalized;

  if (!subscriberDigits) {
    const rule = COUNTRY_PHONE_RULES[effectiveDialCode] || COUNTRY_PHONE_RULES[dialCode];
    const example = rule
      ? `${effectiveDialCode}${rule.exampleLocal}`
      : `${effectiveDialCode}500000000`;
    return {
      valid: false,
      error: tr(
        lang,
        `أدخل رقم الجوال بالصيغة الدولية المعتمدة (مثال: ${example}).`,
        `Enter mobile number in international format (e.g., ${example}).`
      ),
    };
  }

  const countryRule = COUNTRY_PHONE_RULES[effectiveDialCode];

  if (mode === 'register' && countryRule) {
    if (
      countryRule.validStartDigits &&
      subscriberDigits.length > 0 &&
      !countryRule.validStartDigits.some((prefix) => subscriberDigits.startsWith(prefix))
    ) {
      return {
        valid: false,
        previewSyntheticEmail: syntheticEmail,
        error: tr(
          lang,
          `رقم الجوال للدولة (${effectiveDialCode}) يجب أن يبدأ بـ (${countryRule.validStartDigits.join(
            ' أو '
          )}) بدون الصفر الابتدائي (مثال: ${effectiveDialCode}${countryRule.exampleLocal}).`,
          `Mobile number for (${effectiveDialCode}) must start with (${countryRule.validStartDigits.join(
            ' or '
          )}) without leading zero (e.g., ${effectiveDialCode}${countryRule.exampleLocal}).`
        ),
      };
    }

    if (subscriberDigits.length !== countryRule.subscriberLength) {
      return {
        valid: false,
        previewSyntheticEmail: syntheticEmail,
        error: tr(
          lang,
          `الصيغة الدولية للدولة (${effectiveDialCode}) تتطلب ${countryRule.subscriberLength} أرقام بعد مفتاح الدولة (المدخل حالياً: ${subscriberDigits.length}). مثال: ${effectiveDialCode}${countryRule.exampleLocal}`,
          `International format for (${effectiveDialCode}) requires ${countryRule.subscriberLength} digits after country code (currently ${subscriberDigits.length}). Example: ${effectiveDialCode}${countryRule.exampleLocal}`
        ),
      };
    }
  } else {
    // Login mode or countries without strict local prefix rule:
    // Accept any valid ITU-T E.164 international phone (6 to 12 subscriber digits, 8 to 15 total digits)
    if (subscriberDigits.length < 6 || subscriberDigits.length > 12) {
      return {
        valid: false,
        previewSyntheticEmail: syntheticEmail,
        error: tr(
          lang,
          `يرجى إدخال رقم جوال دولي صحيح (${effectiveDialCode} متبوعاً بـ 6 إلى 12 رقماً).`,
          `Please enter a valid international mobile number (${effectiveDialCode} followed by 6 to 12 digits).`
        ),
      };
    }
  }

  const e164Regex = /^\+[1-9][0-9]{7,14}$/;
  const syntheticPattern = /^phone_[1-9][0-9]{7,14}@neurox\.app$/;

  if (!e164Regex.test(normalizedPhone) || !syntheticPattern.test(syntheticEmail)) {
    return {
      valid: false,
      previewSyntheticEmail: syntheticEmail,
      error: tr(
        lang,
        'يرجى التأكد من إدخال رقم جوال صحيح مع مفتاح الدولة.',
        'Please make sure to enter a valid mobile number with country code.'
      ),
    };
  }

  return {
    valid: true,
    syntheticEmail,
    normalizedPhone,
    subscriberDigits,
    effectiveDialCode,
  };
}

/**
 * Extracts normalized digits for comparing two phone numbers regardless of spaces, dashes,
 * Arabic-Indic digits, or '+' prefix.
 */
export function arePhonesEquivalent(phoneA?: string, phoneB?: string): boolean {
  if (!phoneA || !phoneB) return false;
  const a = extractAsciiDigits(phoneA);
  const b = extractAsciiDigits(phoneB);
  if (!a || !b) return false;
  return a === b;
}
