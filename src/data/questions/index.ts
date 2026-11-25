import { AppLanguage, CategoryId, CategoryInfo, QuestionItem } from '../../types/game';
import { QURAN_QUESTIONS, ISLAMIC_QUESTIONS, ARABIC_QUESTIONS } from './part1_islamic_quran';
import { MEDICINE_QUESTIONS, ENGINEERING_QUESTIONS, SCIENCE_QUESTIONS } from './part2_science_tech';
import { HISTORY_QUESTIONS, GEOGRAPHY_QUESTIONS, COUNTRIES_QUESTIONS } from './part3_history_geo';
import { SPORTS_QUESTIONS, MATH_QUESTIONS, PHYSICS_QUESTIONS } from './part4_math_physics_sports';
import {
  generateQuranQuestions,
  generateIslamicQuestions,
  generateArabicQuestions,
  generateMedicineQuestions,
  generateEngineeringQuestions,
  generateScienceQuestions,
} from './domainGeneratorsPart1';
import {
  generateCountriesQuestions,
  generateGeographyQuestions,
  generateHistoryQuestions,
  generateSportsQuestions,
  generateMathQuestions,
  generatePhysicsQuestions,
} from './domainGeneratorsPart2';
import {
  ALL_BASE_QUESTIONS_EN,
  DAILY_BOSS_QUESTIONS_EN,
  QUESTIONS_BY_CATEGORY_EN,
} from './englishQuestions';
import { HARD_QUESTIONS_AR, HARD_QUESTIONS_EN } from './hardQuestionsBank';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'quran',
    name: 'القرآن الكريم',
    nameEn: 'The Holy Quran',
    subtitle: 'آيات، سور، وأحكام كتاب الله العزيز',
    subtitleEn: 'Surahs, verses, and meanings of the Noble Quran',
    iconName: 'BookOpen',
    accentColor: '#F59E0B',
    isSpecialGold: true,
  },
  {
    id: 'islamic',
    name: 'الإسلاميات',
    nameEn: 'Islamic Studies',
    subtitle: 'السيرة النبوية، الصحابة، والفقه الإسلامي',
    subtitleEn: 'Prophetic biography, companions, and Islamic history',
    iconName: 'Moon',
    accentColor: '#10B981',
  },
  {
    id: 'medicine',
    name: 'الطب والعلوم الصحية',
    nameEn: 'Medicine & Health',
    subtitle: 'تشريح الجسم، الفيتامينات، والاكتشافات الطبية',
    subtitleEn: 'Human anatomy, vitamins, and medical discoveries',
    iconName: 'HeartPulse',
    accentColor: '#F43F5E',
  },
  {
    id: 'engineering',
    name: 'الهندسة والتقنية',
    nameEn: 'Engineering & Tech',
    subtitle: 'علوم الحاسوب، البرمجة، والابتكارات الهندسية',
    subtitleEn: 'Computer science, programming, and modern engineering',
    iconName: 'Cpu',
    accentColor: '#06B6D4',
  },
  {
    id: 'sports',
    name: 'الرياضة وكرة القدم',
    nameEn: 'Sports & Football',
    subtitle: 'كأس العالم، الدوريات الكبرى، والألعاب الأولمبية',
    subtitleEn: 'World Cup, major leagues, and Olympic Games',
    iconName: 'Trophy',
    accentColor: '#22C55E',
  },
  {
    id: 'arabic',
    name: 'اللغة العربية والأدب',
    nameEn: 'Arabic & Literature',
    subtitle: 'النحو، البلاغة، المعاجم، وعيون الشعر العربي',
    subtitleEn: 'Grammar, rhetoric, dictionaries, and classic literature',
    iconName: 'Feather',
    accentColor: '#D97706',
  },
  {
    id: 'science',
    name: 'العلوم العامة',
    nameEn: 'General Science',
    subtitle: 'الكيمياء، الفلك، الأحياء، وعلوم الأرض',
    subtitleEn: 'Chemistry, astronomy, biology, and earth sciences',
    iconName: 'FlaskConical',
    accentColor: '#3B82F6',
  },
  {
    id: 'history',
    name: 'التاريخ',
    nameEn: 'World History',
    subtitle: 'المعارك الفاصلة، الدول الإسلامية، وتاريخ الحضارات',
    subtitleEn: 'Decisive battles, empires, and ancient civilizations',
    iconName: 'Landmark',
    accentColor: '#EAB308',
  },
  {
    id: 'geography',
    name: 'الجغرافيا',
    nameEn: 'Geography',
    subtitle: 'القارات، المحيطات، الجبال، والأنهار والمضائق',
    subtitleEn: 'Continents, oceans, mountains, rivers, and straits',
    iconName: 'Compass',
    accentColor: '#14B8A6',
  },
  {
    id: 'countries',
    name: 'بلدان وعواصم',
    nameEn: 'Countries & Capitals',
    subtitle: 'عواصم ورموز دول العالم العربي والقارات',
    subtitleEn: 'World flags, capitals, and international codes',
    iconName: 'Globe2',
    accentColor: '#6366F1',
  },
  {
    id: 'math',
    name: 'الرياضيات',
    nameEn: 'Mathematics',
    subtitle: 'الجبر، الهندسة، المتتاليات، والحساب الذهني السريع',
    subtitleEn: 'Algebra, geometry, sequences, and mental math',
    iconName: 'Calculator',
    accentColor: '#A855F7',
  },
  {
    id: 'physics',
    name: 'الفيزياء',
    nameEn: 'Physics',
    subtitle: 'قوانين الحركة، الكهرباء، الضوء، والطاقة الكونية',
    subtitleEn: 'Laws of motion, electricity, light, and energy',
    iconName: 'Atom',
    accentColor: '#38BDF8',
  },
  {
    id: 'cocktail',
    name: 'كوكتيل شامل',
    nameEn: 'All-in-One Cocktail',
    subtitle: 'تحدي النخبة: مزيج عشوائي من جميع الأقسام',
    subtitleEn: 'Elite Challenge: Random mix from all categories',
    iconName: 'Sparkles',
    accentColor: '#8B5CF6',
    isCocktail: true,
  },
];

/**
 * Computes a deterministic intrinsic difficulty rating (1 = Easy, 2 = Medium, 3 = Hard)
 * for any question so every category scales smoothly as a player's points increase.
 */
function inferQuestionDifficulty(
  q: QuestionItem,
  indexInCategory: number,
  totalInCategory: number
): 1 | 2 | 3 {
  if (q.difficulty === 1 || q.difficulty === 2 || q.difficulty === 3) {
    return q.difficulty;
  }

  let score = 0;
  const text = q.question;
  const answer = q.correctAnswer;

  // 1. Curated progression: later questions in handcrafted sets tend to be more specialized
  const relativePos = totalInCategory > 1 ? indexInCategory / (totalInCategory - 1) : 0;
  if (relativePos > 0.68) score += 2;
  else if (relativePos > 0.32) score += 1;

  // 2. Domain-specific complexity markers
  if (q.categoryId === 'countries') {
    if (text.includes('مفتاح الاتصال') || text.includes('dialing code') || text.includes('calling code')) {
      score += 3;
    } else if (
      text.includes('السعودية') ||
      text.includes('مصر') ||
      text.includes('الإمارات') ||
      text.includes('الكويت') ||
      text.includes('قطر') ||
      text.includes('فرنسا') ||
      text.includes('اليابان') ||
      text.includes('المملكة المتحدة')
    ) {
      score -= 1;
    }
  }

  if (q.categoryId === 'quran') {
    if (text.includes('الجزء') || text.includes('ترتيب سورة') || text.includes('number ')) {
      score += 2;
    } else if (text.includes('عدد آيات')) {
      score += 1;
    }
  }

  // 3. Structural & precision cues (dates, years, formulas, scientific units, longer nuanced prompts)
  if (/\d{3,4}/.test(text) || /\d{3,4}/.test(answer)) score += 1;
  if (/[²³πΩ×÷=]|O\(|log|sin|cos/.test(text) || /[²³πΩ×÷=]|O\(/.test(answer)) score += 2;
  if (text.length >= 78) score += 1;

  if (score >= 3) return 3;
  if (score >= 1) return 2;
  return 1;
}

function tagCategoryQuestions(items: QuestionItem[]): QuestionItem[] {
  const total = items.length;
  return items.map((item, idx) => ({
    ...item,
    difficulty: inferQuestionDifficulty(item, idx, total),
  }));
}

export const QUESTIONS_BY_CATEGORY: Record<Exclude<CategoryId, 'cocktail'>, QuestionItem[]> = {
  quran: tagCategoryQuestions([...QURAN_QUESTIONS, ...generateQuranQuestions(), ...HARD_QUESTIONS_AR.quran]),
  islamic: tagCategoryQuestions([...ISLAMIC_QUESTIONS, ...generateIslamicQuestions(), ...HARD_QUESTIONS_AR.islamic]),
  medicine: tagCategoryQuestions([...MEDICINE_QUESTIONS, ...generateMedicineQuestions(), ...HARD_QUESTIONS_AR.medicine]),
  engineering: tagCategoryQuestions([...ENGINEERING_QUESTIONS, ...generateEngineeringQuestions(), ...HARD_QUESTIONS_AR.engineering]),
  sports: tagCategoryQuestions([...SPORTS_QUESTIONS, ...generateSportsQuestions(), ...HARD_QUESTIONS_AR.sports]),
  arabic: tagCategoryQuestions([...ARABIC_QUESTIONS, ...generateArabicQuestions(), ...HARD_QUESTIONS_AR.arabic]),
  science: tagCategoryQuestions([...SCIENCE_QUESTIONS, ...generateScienceQuestions(), ...HARD_QUESTIONS_AR.science]),
  history: tagCategoryQuestions([...HISTORY_QUESTIONS, ...generateHistoryQuestions(), ...HARD_QUESTIONS_AR.history]),
  geography: tagCategoryQuestions([...GEOGRAPHY_QUESTIONS, ...generateGeographyQuestions(), ...HARD_QUESTIONS_AR.geography]),
  countries: tagCategoryQuestions([...COUNTRIES_QUESTIONS, ...generateCountriesQuestions(), ...HARD_QUESTIONS_AR.countries]),
  math: tagCategoryQuestions([...MATH_QUESTIONS, ...generateMathQuestions(), ...HARD_QUESTIONS_AR.math]),
  physics: tagCategoryQuestions([...PHYSICS_QUESTIONS, ...generatePhysicsQuestions(), ...HARD_QUESTIONS_AR.physics]),
};

const TAGGED_QUESTIONS_BY_CATEGORY_EN: Record<Exclude<CategoryId, 'cocktail'>, QuestionItem[]> = {
  quran: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.quran, ...HARD_QUESTIONS_EN.quran]),
  islamic: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.islamic, ...HARD_QUESTIONS_EN.islamic]),
  medicine: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.medicine, ...HARD_QUESTIONS_EN.medicine]),
  engineering: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.engineering, ...HARD_QUESTIONS_EN.engineering]),
  sports: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.sports, ...HARD_QUESTIONS_EN.sports]),
  arabic: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.arabic, ...HARD_QUESTIONS_EN.arabic]),
  science: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.science, ...HARD_QUESTIONS_EN.science]),
  history: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.history, ...HARD_QUESTIONS_EN.history]),
  geography: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.geography, ...HARD_QUESTIONS_EN.geography]),
  countries: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.countries, ...HARD_QUESTIONS_EN.countries]),
  math: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.math, ...HARD_QUESTIONS_EN.math]),
  physics: tagCategoryQuestions([...QUESTIONS_BY_CATEGORY_EN.physics, ...HARD_QUESTIONS_EN.physics]),
};

export const ALL_BASE_QUESTIONS: QuestionItem[] = Object.values(QUESTIONS_BY_CATEGORY).flat();
const ALL_TAGGED_BASE_QUESTIONS_EN: QuestionItem[] = Object.values(TAGGED_QUESTIONS_BY_CATEGORY_EN).flat();

export const DAILY_BOSS_QUESTIONS: QuestionItem[] = [
  {
    id: 'boss_1',
    categoryId: 'quran',
    question: 'ما هي السورة الوحيدة في القرآن الكريم التي تخلو تماماً من حرف الميم؟',
    options: ['سورة الكوثر', 'سورة الإخلاص', 'سورة العصر', 'سورة النصر'],
    correctAnswer: 'سورة الكوثر',
    difficulty: 3,
  },
  {
    id: 'boss_2',
    categoryId: 'quran',
    question: 'ما هي السورة التي تخلو جميع آياتها من حرف الفاء؟',
    options: ['سورة الفاتحة', 'سورة الناس', 'سورة المسد', 'سورة القارعة'],
    correctAnswer: 'سورة الفاتحة',
    difficulty: 3,
  },
  {
    id: 'boss_3',
    categoryId: 'science',
    question: 'ما هو العنصر الكيميائي الذي يمتلك أعلى درجة انصهار بين المعادن (3422°م)؟',
    options: ['التنغستن (W)', 'التيتانيوم (Ti)', 'البلاتين (Pt)', 'الكروم (Cr)'],
    correctAnswer: 'التنغستن (W)',
    difficulty: 3,
  },
  {
    id: 'boss_4',
    categoryId: 'history',
    question: 'في أي عام هجري فُتحت جزيرة قبرص في عهد عثمان بن عفان رضي الله عنه؟',
    options: ['28 هـ', '19 هـ', '35 هـ', '41 هـ'],
    correctAnswer: '28 هـ',
    difficulty: 3,
  },
  {
    id: 'boss_5',
    categoryId: 'physics',
    question: 'عند أي درجة حرارة تتساوى قراءة مقياس سيلسيوس مع فهرنهايت؟',
    options: ['-40 درجة', '0 درجة', '-273 درجة', '100 درجة'],
    correctAnswer: '-40 درجة',
    difficulty: 3,
  },
  {
    id: 'boss_6',
    categoryId: 'geography',
    question: 'ما هي الدولة الوحيدة التي تحيط بها جنوب أفريقيا من جميع الجهات؟',
    options: ['ليسوتو', 'إسواتيني', 'بوتسوانا', 'ناميبيا'],
    correctAnswer: 'ليسوتو',
    difficulty: 3,
  },
];

export const TOTAL_QUESTIONS_COUNT = ALL_BASE_QUESTIONS.length + DAILY_BOSS_QUESTIONS.length;

export interface AdaptiveDifficultyTier {
  level: 1 | 2 | 3 | 4 | 5;
  labelAr: string;
  labelEn: string;
  accentClass: string;
  ratios: { easy: number; medium: number; hard: number };
}

/**
 * Progressive difficulty curve driven by player points:
 * Higher points => dramatically higher share of Medium & Hard/Expert questions in every category.
 */
export function getDifficultyTierForPoints(playerPoints: number): AdaptiveDifficultyTier {
  const pts = Math.max(0, Math.floor(playerPoints || 0));
  if (pts >= 90) {
    return {
      level: 5,
      labelAr: 'نخبة الأبطال (أقصى صعوبة)',
      labelEn: 'Grandmaster (Maximum Difficulty)',
      accentClass: 'text-rose-400',
      ratios: { easy: 0, medium: 0.15, hard: 0.85 },
    };
  }
  if (pts >= 50) {
    return {
      level: 4,
      labelAr: 'مستوى المحترفين (صعب)',
      labelEn: 'Expert Tier (Hard)',
      accentClass: 'text-amber-400',
      ratios: { easy: 0.05, medium: 0.25, hard: 0.7 },
    };
  }
  if (pts >= 25) {
    return {
      level: 3,
      labelAr: 'مستوى متقدم',
      labelEn: 'Advanced Tier',
      accentClass: 'text-purple-400',
      ratios: { easy: 0.15, medium: 0.4, hard: 0.45 },
    };
  }
  if (pts >= 10) {
    return {
      level: 2,
      labelAr: 'مستوى متوسط',
      labelEn: 'Intermediate Tier',
      accentClass: 'text-cyan-400',
      ratios: { easy: 0.3, medium: 0.5, hard: 0.2 },
    };
  }
  return {
    level: 1,
    labelAr: 'مستوى تمهيدي',
    labelEn: 'Starter Tier',
    accentClass: 'text-emerald-400',
    ratios: { easy: 0.65, medium: 0.3, hard: 0.05 },
  };
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

export function prepareQuestionWithShuffledOptions(q: QuestionItem): QuestionItem {
  const shuffledOpts = shuffleArray(q.options) as [string, string, string, string];
  return {
    ...q,
    options: shuffledOpts,
  };
}

/**
 * Selects 18 non-repeating questions for a 3-round match (6 questions per round)
 * in the active language ('ar' or 'en'), scaling difficulty dynamically based on
 * the player's points so every category gets progressively harder as points increase.
 */
export function selectMatchQuestions(
  categoryId: CategoryId,
  recentlyPlayedIds: string[],
  count: number = 18,
  lang: AppLanguage = 'ar',
  playerPoints: number = 0
): QuestionItem[] {
  const recentSet = new Set(recentlyPlayedIds);
  let pool: QuestionItem[];

  if (lang === 'en') {
    if (categoryId === 'cocktail') {
      pool = ALL_TAGGED_BASE_QUESTIONS_EN.length > 0 ? ALL_TAGGED_BASE_QUESTIONS_EN : ALL_BASE_QUESTIONS_EN;
    } else {
      pool = TAGGED_QUESTIONS_BY_CATEGORY_EN[categoryId] || ALL_TAGGED_BASE_QUESTIONS_EN;
    }
  } else {
    if (categoryId === 'cocktail') {
      pool = ALL_BASE_QUESTIONS;
    } else {
      pool = QUESTIONS_BY_CATEGORY[categoryId] || ALL_BASE_QUESTIONS;
    }
  }

  const tier = getDifficultyTierForPoints(playerPoints);
  const hardTarget = Math.round(count * tier.ratios.hard);
  const mediumTarget = Math.round(count * tier.ratios.medium);
  const easyTarget = Math.max(0, count - hardTarget - mediumTarget);

  const buildBucket = (diff: 1 | 2 | 3): QuestionItem[] => {
    const matching = pool.filter((q) => (q.difficulty || 2) === diff);
    const fresh = shuffleArray(matching.filter((q) => !recentSet.has(q.id)));
    const seen = shuffleArray(matching.filter((q) => recentSet.has(q.id)));
    return [...fresh, ...seen];
  };

  const easyBucket = buildBucket(1);
  const mediumBucket = buildBucket(2);
  const hardBucket = buildBucket(3);

  const pickedIds = new Set<string>();
  const picked: QuestionItem[] = [];

  const drawFrom = (bucket: QuestionItem[], howMany: number) => {
    for (const q of bucket) {
      if (picked.length >= count || howMany <= 0) break;
      if (pickedIds.has(q.id)) continue;
      pickedIds.add(q.id);
      picked.push(q);
      howMany--;
    }
  };

  // Draw according to the player's points-driven difficulty ratios
  drawFrom(hardBucket, hardTarget);
  drawFrom(mediumBucket, mediumTarget);
  drawFrom(easyBucket, easyTarget);

  // Fill any shortfall prioritizing harder buckets when player has higher points
  if (picked.length < count) {
    const fallbackOrder =
      tier.level >= 3
        ? [hardBucket, mediumBucket, easyBucket]
        : [mediumBucket, easyBucket, hardBucket];
    for (const bucket of fallbackOrder) {
      drawFrom(bucket, count - picked.length);
      if (picked.length >= count) break;
    }
  }

  // Ramp difficulty smoothly from Round 1 -> Round 3 while shuffling within each difficulty tier
  const rEasy = shuffleArray(picked.filter((q) => (q.difficulty || 2) === 1));
  const rMed = shuffleArray(picked.filter((q) => (q.difficulty || 2) === 2));
  const rHard = shuffleArray(picked.filter((q) => (q.difficulty || 2) === 3));
  const ordered = [...rEasy, ...rMed, ...rHard].slice(0, count);

  return ordered.map(prepareQuestionWithShuffledOptions);
}

export function getDailyBossQuestion(dateKey: string, lang: AppLanguage = 'ar'): QuestionItem {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const sourceList = lang === 'en' ? DAILY_BOSS_QUESTIONS_EN : DAILY_BOSS_QUESTIONS;
  const index = hash % sourceList.length;
  return prepareQuestionWithShuffledOptions(sourceList[index]);
}
