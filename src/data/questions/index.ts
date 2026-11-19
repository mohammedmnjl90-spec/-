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

export const QUESTIONS_BY_CATEGORY: Record<Exclude<CategoryId, 'cocktail'>, QuestionItem[]> = {
  quran: [...QURAN_QUESTIONS, ...generateQuranQuestions()],
  islamic: [...ISLAMIC_QUESTIONS, ...generateIslamicQuestions()],
  medicine: [...MEDICINE_QUESTIONS, ...generateMedicineQuestions()],
  engineering: [...ENGINEERING_QUESTIONS, ...generateEngineeringQuestions()],
  sports: [...SPORTS_QUESTIONS, ...generateSportsQuestions()],
  arabic: [...ARABIC_QUESTIONS, ...generateArabicQuestions()],
  science: [...SCIENCE_QUESTIONS, ...generateScienceQuestions()],
  history: [...HISTORY_QUESTIONS, ...generateHistoryQuestions()],
  geography: [...GEOGRAPHY_QUESTIONS, ...generateGeographyQuestions()],
  countries: [...COUNTRIES_QUESTIONS, ...generateCountriesQuestions()],
  math: [...MATH_QUESTIONS, ...generateMathQuestions()],
  physics: [...PHYSICS_QUESTIONS, ...generatePhysicsQuestions()],
};

export const ALL_BASE_QUESTIONS: QuestionItem[] = Object.values(QUESTIONS_BY_CATEGORY).flat();

export const DAILY_BOSS_QUESTIONS: QuestionItem[] = [
  {
    id: 'boss_1',
    categoryId: 'quran',
    question: 'ما هي السورة الوحيدة في القرآن الكريم التي تخلو تماماً من حرف الميم؟',
    options: ['سورة الكوثر', 'سورة الإخلاص', 'سورة العصر', 'سورة النصر'],
    correctAnswer: 'سورة الكوثر',
  },
  {
    id: 'boss_2',
    categoryId: 'quran',
    question: 'ما هي السورة التي تخلو جميع آياتها من حرف الفاء؟',
    options: ['سورة الفاتحة', 'سورة الناس', 'سورة المسد', 'سورة القارعة'],
    correctAnswer: 'سورة الفاتحة',
  },
  {
    id: 'boss_3',
    categoryId: 'science',
    question: 'ما هو العنصر الكيميائي الذي يمتلك أعلى درجة انصهار بين المعادن (3422°م)؟',
    options: ['التنغستن (W)', 'التيتانيوم (Ti)', 'البلاتين (Pt)', 'الكروم (Cr)'],
    correctAnswer: 'التنغستن (W)',
  },
  {
    id: 'boss_4',
    categoryId: 'history',
    question: 'في أي عام هجري فُتحت جزيرة قبرص في عهد عثمان بن عفان رضي الله عنه؟',
    options: ['28 هـ', '19 هـ', '35 هـ', '41 هـ'],
    correctAnswer: '28 هـ',
  },
  {
    id: 'boss_5',
    categoryId: 'physics',
    question: 'عند أي درجة حرارة تتساوى قراءة مقياس سيلسيوس مع فهرنهايت؟',
    options: ['-40 درجة', '0 درجة', '-273 درجة', '100 درجة'],
    correctAnswer: '-40 درجة',
  },
  {
    id: 'boss_6',
    categoryId: 'geography',
    question: 'ما هي الدولة الوحيدة التي تحيط بها جنوب أفريقيا من جميع الجهات؟',
    options: ['ليسوتو', 'إسواتيني', 'بوتسوانا', 'ناميبيا'],
    correctAnswer: 'ليسوتو',
  },
];

export const TOTAL_QUESTIONS_COUNT = ALL_BASE_QUESTIONS.length + DAILY_BOSS_QUESTIONS.length;

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
 * in the active language ('ar' or 'en').
 */
export function selectMatchQuestions(
  categoryId: CategoryId,
  recentlyPlayedIds: string[],
  count: number = 18,
  lang: AppLanguage = 'ar'
): QuestionItem[] {
  const recentSet = new Set(recentlyPlayedIds);
  let pool: QuestionItem[];

  if (lang === 'en') {
    if (categoryId === 'cocktail') {
      pool = ALL_BASE_QUESTIONS_EN;
    } else {
      pool = QUESTIONS_BY_CATEGORY_EN[categoryId] || ALL_BASE_QUESTIONS_EN;
    }
  } else {
    if (categoryId === 'cocktail') {
      pool = ALL_BASE_QUESTIONS;
    } else {
      pool = QUESTIONS_BY_CATEGORY[categoryId] || ALL_BASE_QUESTIONS;
    }
  }

  const freshQuestions = pool.filter((q) => !recentSet.has(q.id));
  const seenQuestions = pool.filter((q) => recentSet.has(q.id));

  const shuffledFresh = shuffleArray(freshQuestions);
  const shuffledSeen = shuffleArray(seenQuestions);

  const combined = [...shuffledFresh, ...shuffledSeen].slice(0, count);
  return combined.map(prepareQuestionWithShuffledOptions);
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
