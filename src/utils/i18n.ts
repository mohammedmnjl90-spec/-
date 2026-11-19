import { AppLanguage, CategoryInfo, CountryInfo } from '../types/game';

const STORAGE_KEY_LANGUAGE = 'qimat_altahadi_lang_v1';

/**
 * Detects device language on first launch:
 * - If device language starts with 'ar', defaults to 'ar' (RTL)
 * - If device language is 'en' or any other language, defaults to 'en' (LTR)
 * If the user manually switched language earlier, respects the saved choice.
 */
export function detectInitialLanguage(): AppLanguage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
    if (saved === 'ar' || saved === 'en') {
      return saved;
    }
  } catch {
    // ignore storage access issues
  }

  try {
    const navLang =
      (typeof navigator !== 'undefined' &&
        (navigator.language || (navigator.languages && navigator.languages[0]))) ||
      'ar';
    if (navLang.toLowerCase().startsWith('ar')) {
      return 'ar';
    }
    return 'en';
  } catch {
    return 'ar';
  }
}

export function saveLanguagePreference(lang: AppLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY_LANGUAGE, lang);
  } catch {
    // ignore
  }
  applyDocumentLanguageDirection(lang);
}

export function applyDocumentLanguageDirection(lang: AppLanguage): void {
  if (typeof document === 'undefined') return;
  const htmlEl = document.documentElement;
  htmlEl.lang = lang;
  htmlEl.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function tr(lang: AppLanguage, ar: string, en: string): string {
  return lang === 'en' ? en : ar;
}

export function getCategoryName(cat: CategoryInfo, lang: AppLanguage): string {
  return lang === 'en' ? cat.nameEn : cat.name;
}

export function getCategorySubtitle(cat: CategoryInfo, lang: AppLanguage): string {
  return lang === 'en' ? cat.subtitleEn : cat.subtitle;
}

export function getCountryDisplayName(country: CountryInfo, lang: AppLanguage): string {
  return lang === 'en' ? country.nameEn : country.name;
}
