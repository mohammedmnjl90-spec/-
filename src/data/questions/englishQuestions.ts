import { CategoryId, QuestionItem } from '../../types/game';
import { COUNTRIES_LIST } from '../countries';

function pick3WrongEn(pool: string[], correct: string, seed: number): [string, string, string] {
  const filtered = pool.filter((item) => item !== correct);
  const n = filtered.length;
  const a = filtered[seed % n];
  let b = filtered[(seed * 7 + 3) % n];
  if (b === a) b = filtered[(seed + 1) % n];
  let c = filtered[(seed * 13 + 5) % n];
  if (c === a || c === b) c = filtered[(seed + 2) % n];
  return [a, b, c];
}

export function generateEnglishQuranQuestions(): QuestionItem[] {
  const surahs: [number, string, number, 'Meccan' | 'Medinan'][] = [
    [1, 'Al-Fatihah', 7, 'Meccan'],
    [2, 'Al-Baqarah', 286, 'Medinan'],
    [3, 'Ali Imran', 200, 'Medinan'],
    [4, 'An-Nisa', 176, 'Medinan'],
    [5, 'Al-Maidah', 120, 'Medinan'],
    [6, 'Al-Anam', 165, 'Meccan'],
    [7, 'Al-Araf', 206, 'Meccan'],
    [12, 'Yusuf', 111, 'Meccan'],
    [18, 'Al-Kahf', 110, 'Meccan'],
    [19, 'Maryam', 98, 'Meccan'],
    [20, 'Ta-Ha', 135, 'Meccan'],
    [24, 'An-Nur', 64, 'Medinan'],
    [36, 'Ya-Sin', 83, 'Meccan'],
    [55, 'Ar-Rahman', 78, 'Medinan'],
    [56, 'Al-Waqiah', 96, 'Meccan'],
    [67, 'Al-Mulk', 30, 'Meccan'],
    [78, 'An-Naba', 40, 'Meccan'],
    [108, 'Al-Kawthar', 3, 'Meccan'],
    [112, 'Al-Ikhlas', 4, 'Meccan'],
    [114, 'An-Nas', 6, 'Meccan'],
  ];

  const items: QuestionItem[] = [];
  const names = surahs.map((s) => `Surah ${s[1]}`);

  for (let i = 0; i < 520; i++) {
    const s = surahs[i % surahs.length];
    const mode = i % 3;
    if (mode === 0) {
      const correct = `Surah ${s[1]}`;
      const [w1, w2, w3] = pick3WrongEn(names, correct, i);
      items.push({
        id: `en_qur_${i}`,
        categoryId: 'quran',
        question: `Which Surah is number ${s[0]} in the Holy Quran?`,
        options: [correct, w1, w2, w3],
        correctAnswer: correct,
      });
    } else if (mode === 1) {
      const correct = `${s[2]} verses`;
      const vPool = ['7 verses', '286 verses', '200 verses', '110 verses', '78 verses', '30 verses', '3 verses', '176 verses'];
      const [w1, w2, w3] = pick3WrongEn(vPool, correct, i);
      items.push({
        id: `en_qur_${i}`,
        categoryId: 'quran',
        question: `How many verses are in Surah ${s[1]}?`,
        options: [correct, w1, w2, w3],
        correctAnswer: correct,
      });
    } else {
      const correct = s[3];
      const wrong = s[3] === 'Meccan' ? 'Medinan' : 'Meccan';
      items.push({
        id: `en_qur_${i}`,
        categoryId: 'quran',
        question: `What is the revelation type of Surah ${s[1]}?`,
        options: [correct, wrong, 'Both Meccan & Medinan', 'Revealed in Taif'],
        correctAnswer: correct,
      });
    }
  }
  return items;
}

export function generateEnglishIslamicQuestions(): QuestionItem[] {
  const facts: [string, string, string, string, string][] = [
    ['In which Hijri year did the Battle of Badr take place?', '2 AH', '3 AH', '5 AH', '8 AH'],
    ['In which Hijri year was Mecca conquered?', '8 AH', '6 AH', '10 AH', '4 AH'],
    ['Who was the first Caliph in Islam?', 'Abu Bakr As-Siddiq', 'Umar ibn Al-Khattab', 'Uthman ibn Affan', 'Ali ibn Abi Talib'],
    ['How many daily obligatory prayers are there in Islam?', '5 prayers', '3 prayers', '4 prayers', '7 prayers'],
    ['Which companion was titled "The Sword of Allah"?', 'Khalid ibn Al-Walid', 'Saad ibn Abi Waqqas', 'Amr ibn Al-Aas', 'Abu Ubaidah'],
    ['Which mosque was the first Qibla for Muslims?', 'Al-Aqsa Mosque', 'Quba Mosque', 'Masjid Al-Haram', 'Prophet’s Mosque'],
    ['What is the first month of the Islamic Hijri calendar?', 'Muharram', 'Ramadan', 'Rajab', 'Shawwal'],
    ['On which mountain is the Cave of Hira located?', 'Jabal An-Nour', 'Jabal Thawr', 'Mount Uhud', 'Mount Arafat'],
    ['How many years did the Prophet Muhammad (PBUH) call to Islam in Mecca?', '13 years', '10 years', '23 years', '15 years'],
    ['Who was the first Muezzin in Islam?', 'Bilal ibn Rabah', 'Ammar ibn Yasir', 'Zayd ibn Thabit', 'Muadh ibn Jabal'],
  ];

  const items: QuestionItem[] = [];
  for (let i = 0; i < 520; i++) {
    const f = facts[i % facts.length];
    items.push({
      id: `en_isl_${i}`,
      categoryId: 'islamic',
      question: f[0],
      options: [f[1], f[2], f[3], f[4]],
      correctAnswer: f[1],
    });
  }
  return items;
}

export function generateEnglishMedicineQuestions(): QuestionItem[] {
  const facts: [string, string, string, string, string][] = [
    ['Which organ is responsible for secreting insulin?', 'Pancreas', 'Liver', 'Spleen', 'Kidney'],
    ['How many chambers does the human heart have?', '4 chambers', '2 chambers', '3 chambers', '6 chambers'],
    ['Which vitamin is synthesized by the skin upon sunlight exposure?', 'Vitamin D', 'Vitamin C', 'Vitamin A', 'Vitamin B12'],
    ['What is the largest internal organ in the human body?', 'Liver', 'Stomach', 'Heart', 'Lungs'],
    ['Which blood type is known as the universal donor?', 'O-', 'AB+', 'A+', 'B-'],
    ['How many bones are in an adult human body?', '206 bones', '180 bones', '250 bones', '300 bones'],
    ['Which blood cells defend the body against infections?', 'White blood cells', 'Red blood cells', 'Platelets', 'Plasma'],
    ['What is the normal resting human body temperature?', '37°C', '35°C', '39°C', '40°C'],
    ['Where is the smallest bone (Stapes) located?', 'Middle ear', 'Nose', 'Finger', 'Toe'],
    ['Which vitamin deficiency causes scurvy?', 'Vitamin C', 'Vitamin D', 'Vitamin K', 'Vitamin B1'],
  ];

  const items: QuestionItem[] = [];
  for (let i = 0; i < 520; i++) {
    const f = facts[i % facts.length];
    items.push({
      id: `en_med_${i}`,
      categoryId: 'medicine',
      question: f[0],
      options: [f[1], f[2], f[3], f[4]],
      correctAnswer: f[1],
    });
  }
  return items;
}

export function generateEnglishEngineeringQuestions(): QuestionItem[] {
  const facts: [string, string, string, string, string][] = [
    ['What is the default port for secure HTTPS traffic?', '443', '80', '22', '8080'],
    ['How many bits are in 1 Byte?', '8 bits', '4 bits', '16 bits', '32 bits'],
    ['Which data structure follows Last-In First-Out (LIFO)?', 'Stack', 'Queue', 'Linked List', 'Graph'],
    ['What does CPU stand for in computing?', 'Central Processing Unit', 'Core Program Utility', 'Control Panel Unit', 'Central Power Unit'],
    ['Which protocol translates domain names to IP addresses?', 'DNS', 'FTP', 'SMTP', 'SSH'],
    ['What is the time complexity of Binary Search?', 'O(log n)', 'O(n)', 'O(n²)', 'O(1)'],
    ['Which language runs natively in all web browsers?', 'JavaScript', 'C++', 'Rust', 'Swift'],
    ['Who created the Linux kernel in 1991?', 'Linus Torvalds', 'Tim Berners-Lee', 'Dennis Ritchie', 'Ken Thompson'],
    ['What is the binary representation of decimal 10?', '1010', '1100', '1001', '1110'],
    ['Which SQL command retrieves data from a database table?', 'SELECT', 'UPDATE', 'INSERT', 'DROP'],
  ];

  const items: QuestionItem[] = [];
  for (let i = 0; i < 520; i++) {
    const f = facts[i % facts.length];
    items.push({
      id: `en_eng_${i}`,
      categoryId: 'engineering',
      question: f[0],
      options: [f[1], f[2], f[3], f[4]],
      correctAnswer: f[1],
    });
  }
  return items;
}

export function generateEnglishSportsQuestions(): QuestionItem[] {
  const facts: [string, string, string, string, string][] = [
    ['Which country won the 2022 FIFA World Cup in Qatar?', 'Argentina', 'France', 'Brazil', 'Croatia'],
    ['How many players are on the court per basketball team?', '5 players', '6 players', '7 players', '11 players'],
    ['Which national team has won the most FIFA World Cups (5 titles)?', 'Brazil', 'Germany', 'Italy', 'Argentina'],
    ['How long is a standard professional football match?', '90 minutes', '80 minutes', '60 minutes', '100 minutes'],
    ['Which Arab nation reached the 2022 World Cup semi-finals?', 'Morocco', 'Egypt', 'Saudi Arabia', 'Tunisia'],
    ['In which city were the 2024 Summer Olympics held?', 'Paris', 'Tokyo', 'London', 'Los Angeles'],
    ['How many rings are on the Olympic flag?', '5 rings', '4 rings', '6 rings', '7 rings'],
    ['Which club has won the most UEFA Champions League titles?', 'Real Madrid', 'AC Milan', 'Bayern Munich', 'Liverpool'],
    ['What is the distance of a full marathon race?', '42.195 km', '21.097 km', '50 km', '30 km'],
    ['On what surface is the Wimbledon Tennis Championship played?', 'Grass', 'Clay', 'Hard court', 'Carpet'],
  ];

  const items: QuestionItem[] = [];
  for (let i = 0; i < 520; i++) {
    const f = facts[i % facts.length];
    items.push({
      id: `en_spt_${i}`,
      categoryId: 'sports',
      question: f[0],
      options: [f[1], f[2], f[3], f[4]],
      correctAnswer: f[1],
    });
  }
  return items;
}

export function generateEnglishArabicLitQuestions(): QuestionItem[] {
  const facts: [string, string, string, string, string][] = [
    ['How many letters are in the Arabic alphabet?', '28 letters', '26 letters', '30 letters', '24 letters'],
    ['Which Arab author won the Nobel Prize in Literature in 1988?', 'Naguib Mahfouz', 'Taha Hussein', 'Gibran Khalil Gibran', 'Tawfiq Al-Hakim'],
    ['Who founded the science of Arabic grammar (Nahw)?', 'Abu Al-Aswad Ad-Du’ali', 'Sibawayh', 'Al-Farahidi', 'Al-Jahiz'],
    ['Who authored the famous Arabic dictionary "Lisan Al-Arab"?', 'Ibn Manzur', 'Al-Fayruzabadi', 'Al-Jawhari', 'Al-Zamakhshari'],
    ['Which poet is known as the "Prince of Poets" in modern Arabic literature?', 'Ahmed Shawqi', 'Hafez Ibrahim', 'Al-Mutanabbi', 'Mahmoud Darwish'],
    ['Why was the Arabic language called the Language of Dhad?', 'Its unique letter Dhad (ض)', 'Its ancient script', 'Its poetic meters', 'Its desert origin'],
    ['Who founded the science of Arabic prosody (Arud)?', 'Al-Khalil ibn Ahmad', 'Al-Asma’i', 'Ibn Jinni', 'Al-Mubarrad'],
    ['What is the famous collection of pre-Islamic Arabic odes called?', 'Al-Mu’allaqat', 'Al-Mufaddaliyat', 'Al-Hamasah', 'Al-Kamil'],
    ['Who wrote the philosophical novel "Hayy ibn Yaqdhan"?', 'Ibn Tufayl', 'Ibn Sina', 'Ibn Rushd', 'Al-Farabi'],
    ['Who is the author of the autobiography "Al-Ayyam" (The Days)?', 'Taha Hussein', 'Abbas Al-Aqqad', 'Mustafa Lutfi', 'Mikha’il Na’ima'],
  ];

  const items: QuestionItem[] = [];
  for (let i = 0; i < 520; i++) {
    const f = facts[i % facts.length];
    items.push({
      id: `en_ara_${i}`,
      categoryId: 'arabic',
      question: f[0],
      options: [f[1], f[2], f[3], f[4]],
      correctAnswer: f[1],
    });
  }
  return items;
}

export function generateEnglishScienceQuestions(): QuestionItem[] {
  const facts: [string, string, string, string, string][] = [
    ['What is the chemical symbol for Gold?', 'Au', 'Ag', 'Fe', 'Cu'],
    ['Which gas makes up about 78% of Earth’s atmosphere?', 'Nitrogen', 'Oxygen', 'Carbon Dioxide', 'Argon'],
    ['Which planet is the largest in our Solar System?', 'Jupiter', 'Saturn', 'Neptune', 'Earth'],
    ['What is the powerhouse of the biological cell?', 'Mitochondria', 'Nucleus', 'Ribosome', 'Golgi apparatus'],
    ['Which metal is liquid at room temperature?', 'Mercury', 'Iron', 'Aluminum', 'Zinc'],
    ['Which planet is closest to the Sun?', 'Mercury', 'Venus', 'Mars', 'Earth'],
    ['What is the chemical formula of water?', 'H2O', 'CO2', 'NaCl', 'CH4'],
    ['What is the hardest natural substance on Earth?', 'Diamond', 'Quartz', 'Topaz', 'Ruby'],
    ['Which gas do plants absorb during photosynthesis?', 'Carbon Dioxide', 'Oxygen', 'Hydrogen', 'Helium'],
    ['What is the neutral pH value of pure water?', '7', '5', '9', '14'],
  ];

  const items: QuestionItem[] = [];
  for (let i = 0; i < 520; i++) {
    const f = facts[i % facts.length];
    items.push({
      id: `en_sci_${i}`,
      categoryId: 'science',
      question: f[0],
      options: [f[1], f[2], f[3], f[4]],
      correctAnswer: f[1],
    });
  }
  return items;
}

export function generateEnglishHistoryQuestions(): QuestionItem[] {
  const facts: [string, string, string, string, string][] = [
    ['Who founded the science of sociology and wrote "Al-Muqaddimah"?', 'Ibn Khaldun', 'Ibn Battuta', 'Al-Tabari', 'Ibn Al-Athir'],
    ['In which year did World War II end?', '1945', '1939', '1918', '1950'],
    ['Who led the Muslims to victory at the Battle of Hattin in 1187?', 'Saladin (Salah Ad-Din)', 'Baybars', 'Qutuz', 'Nur Ad-Din Zangi'],
    ['Which caliph established the House of Wisdom in Baghdad?', 'Harun Al-Rashid & Al-Ma’mun', 'Al-Mu’tasim', 'Al-Mansur', 'Umar ibn Abd Al-Aziz'],
    ['In which year did Constantinople fall to Sultan Mehmed II?', '1453', '1492', '1517', '1258'],
    ['Which civilization built the Pyramids of Giza?', 'Ancient Egyptians', 'Sumerians', 'Phoenicians', 'Romans'],
    ['Who conquered Andalusia across the strait named after him in 711?', 'Tariq ibn Ziyad', 'Musa ibn Nusayr', 'Uqba ibn Nafi', 'Abd Al-Rahman'],
    ['In which year did the First World War begin?', '1914', '1918', '1905', '1920'],
    ['Which famous Muslim traveler journeyed for nearly 29 years?', 'Ibn Battuta', 'Al-Idrisi', 'Ibn Jubayr', 'Al-Mas’udi'],
    ['What was the capital of the Umayyad Caliphate?', 'Damascus', 'Baghdad', 'Cairo', 'Cordoba'],
  ];

  const items: QuestionItem[] = [];
  for (let i = 0; i < 520; i++) {
    const f = facts[i % facts.length];
    items.push({
      id: `en_his_${i}`,
      categoryId: 'history',
      question: f[0],
      options: [f[1], f[2], f[3], f[4]],
      correctAnswer: f[1],
    });
  }
  return items;
}

export function generateEnglishGeographyQuestions(): QuestionItem[] {
  const facts: [string, string, string, string, string][] = [
    ['What is the largest continent on Earth by area?', 'Asia', 'Africa', 'North America', 'Europe'],
    ['What is the largest ocean in the world?', 'Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
    ['Which strait connects the Red Sea to the Gulf of Aden?', 'Bab-el-Mandeb', 'Strait of Hormuz', 'Strait of Gibraltar', 'Bosphorus'],
    ['What is the highest mountain peak in the world?', 'Mount Everest', 'K2', 'Kilimanjaro', 'Mont Blanc'],
    ['Which river is the longest in Africa?', 'Nile River', 'Congo River', 'Niger River', 'Zambezi River'],
    ['What is the smallest country in the world by area?', 'Vatican City', 'Monaco', 'Nauru', 'San Marino'],
    ['Which canal connects the Mediterranean Sea to the Red Sea?', 'Suez Canal', 'Panama Canal', 'Kiel Canal', 'Corinth Canal'],
    ['Which country has the largest population in Africa?', 'Nigeria', 'Egypt', 'Ethiopia', 'South Africa'],
    ['What is the deepest oceanic trench on Earth?', 'Mariana Trench', 'Tonga Trench', 'Java Trench', 'Puerto Rico Trench'],
    ['Which desert is the largest hot desert in the world?', 'Sahara Desert', 'Gobi Desert', 'Kalahari Desert', 'Atacama Desert'],
  ];

  const items: QuestionItem[] = [];
  for (let i = 0; i < 520; i++) {
    const f = facts[i % facts.length];
    items.push({
      id: `en_geo_${i}`,
      categoryId: 'geography',
      question: f[0],
      options: [f[1], f[2], f[3], f[4]],
      correctAnswer: f[1],
    });
  }
  return items;
}

export function generateEnglishCountriesQuestions(): QuestionItem[] {
  const items: QuestionItem[] = [];
  const dialPool = COUNTRIES_LIST.map((c) => c.dialCode);
  const namePool = COUNTRIES_LIST.map((c) => c.nameEn);

  for (let i = 0; i < 520; i++) {
    const c = COUNTRIES_LIST[i % COUNTRIES_LIST.length];
    if (i % 2 === 0) {
      const correct = c.dialCode;
      const [w1, w2, w3] = pick3WrongEn(dialPool, correct, i);
      items.push({
        id: `en_cnt_${i}`,
        categoryId: 'countries',
        question: `What is the international dialing code for ${c.nameEn} ${c.flag}?`,
        options: [correct, w1, w2, w3],
        correctAnswer: correct,
      });
    } else {
      const correct = c.nameEn;
      const [w1, w2, w3] = pick3WrongEn(namePool, correct, i);
      items.push({
        id: `en_cnt_${i}`,
        categoryId: 'countries',
        question: `Which country has the flag ${c.flag} and ISO code (${c.code})?`,
        options: [correct, w1, w2, w3],
        correctAnswer: correct,
      });
    }
  }
  return items;
}

export function generateEnglishMathQuestions(): QuestionItem[] {
  const items: QuestionItem[] = [];
  for (let i = 0; i < 520; i++) {
    const a = (i % 15) + 6;
    const b = ((i * 3) % 12) + 4;
    const mode = i % 3;
    if (mode === 0) {
      const ans = a * b;
      items.push({
        id: `en_mth_${i}`,
        categoryId: 'math',
        question: `What is the result of: ${a} × ${b}?`,
        options: [`${ans}`, `${ans + a}`, `${ans - b}`, `${ans + 10}`],
        correctAnswer: `${ans}`,
      });
    } else if (mode === 1) {
      const x = (i % 12) + 3;
      const c = x * 4 + 5;
      items.push({
        id: `en_mth_${i}`,
        categoryId: 'math',
        question: `Solve for x: 4x + 5 = ${c}`,
        options: [`${x}`, `${x + 2}`, `${x - 1}`, `${x + 4}`],
        correctAnswer: `${x}`,
      });
    } else {
      const side = (i % 14) + 5;
      const area = side * side;
      items.push({
        id: `en_mth_${i}`,
        categoryId: 'math',
        question: `What is the area of a square with side length ${side} cm?`,
        options: [`${area} cm²`, `${side * 4} cm²`, `${area + side} cm²`, `${area - 5} cm²`],
        correctAnswer: `${area} cm²`,
      });
    }
  }
  return items;
}

export function generateEnglishPhysicsQuestions(): QuestionItem[] {
  const facts: [string, string, string, string, string][] = [
    ['What is the SI unit of electrical resistance?', 'Ohm (Ω)', 'Volt (V)', 'Ampere (A)', 'Watt (W)'],
    ['What is the approximate speed of light in a vacuum?', '300,000 km/s', '150,000 km/s', '343 m/s', '1,000,000 km/s'],
    ['What is the SI unit of force?', 'Newton (N)', 'Joule (J)', 'Pascal (Pa)', 'Tesla (T)'],
    ['Which formula represents Newton’s Second Law of Motion?', 'F = m × a', 'E = mc²', 'V = I × R', 'P = F / A'],
    ['What is the SI unit of frequency?', 'Hertz (Hz)', 'Decibel (dB)', 'Watt (W)', 'Henry (H)'],
    ['At what temperature do Celsius and Fahrenheit scales read the same?', '-40°', '0°', '-273°', '100°'],
    ['What is the SI unit of work and energy?', 'Joule (J)', 'Watt (W)', 'Newton (N)', 'Coulomb (C)'],
    ['Who formulated the Theory of General Relativity?', 'Albert Einstein', 'Isaac Newton', 'Max Planck', 'Niels Bohr'],
    ['What is the standard acceleration due to gravity on Earth?', '9.8 m/s²', '5.2 m/s²', '15 m/s²', '1.6 m/s²'],
    ['Which device is used to measure electric current in a circuit?', 'Ammeter', 'Voltmeter', 'Barometer', 'Hygrometer'],
  ];

  const items: QuestionItem[] = [];
  for (let i = 0; i < 520; i++) {
    const f = facts[i % facts.length];
    items.push({
      id: `en_phy_${i}`,
      categoryId: 'physics',
      question: f[0],
      options: [f[1], f[2], f[3], f[4]],
      correctAnswer: f[1],
    });
  }
  return items;
}

export const QUESTIONS_BY_CATEGORY_EN: Record<Exclude<CategoryId, 'cocktail'>, QuestionItem[]> = {
  quran: generateEnglishQuranQuestions(),
  islamic: generateEnglishIslamicQuestions(),
  medicine: generateEnglishMedicineQuestions(),
  engineering: generateEnglishEngineeringQuestions(),
  sports: generateEnglishSportsQuestions(),
  arabic: generateEnglishArabicLitQuestions(),
  science: generateEnglishScienceQuestions(),
  history: generateEnglishHistoryQuestions(),
  geography: generateEnglishGeographyQuestions(),
  countries: generateEnglishCountriesQuestions(),
  math: generateEnglishMathQuestions(),
  physics: generateEnglishPhysicsQuestions(),
};

export const ALL_BASE_QUESTIONS_EN: QuestionItem[] = Object.values(QUESTIONS_BY_CATEGORY_EN).flat();

export const DAILY_BOSS_QUESTIONS_EN: QuestionItem[] = [
  {
    id: 'boss_en_1',
    categoryId: 'quran',
    question: 'Which is the shortest Surah in the Holy Quran (3 verses)?',
    options: ['Surah Al-Kawthar', 'Surah Al-Ikhlas', 'Surah Al-Asr', 'Surah An-Nasr'],
    correctAnswer: 'Surah Al-Kawthar',
  },
  {
    id: 'boss_en_2',
    categoryId: 'science',
    question: 'Which metal has the highest melting point of all pure elements (3422°C)?',
    options: ['Tungsten (W)', 'Titanium (Ti)', 'Platinum (Pt)', 'Chromium (Cr)'],
    correctAnswer: 'Tungsten (W)',
  },
  {
    id: 'boss_en_3',
    categoryId: 'physics',
    question: 'At what temperature are the Celsius and Fahrenheit readings equal?',
    options: ['-40 degrees', '0 degrees', '-273 degrees', '100 degrees'],
    correctAnswer: '-40 degrees',
  },
  {
    id: 'boss_en_4',
    categoryId: 'geography',
    question: 'Which country is completely enclaved within South Africa?',
    options: ['Lesotho', 'Eswatini', 'Botswana', 'Namibia'],
    correctAnswer: 'Lesotho',
  },
  {
    id: 'boss_en_5',
    categoryId: 'medicine',
    question: 'Which part of the human body has no blood vessels and gets oxygen directly from air?',
    options: ['Cornea of the eye', 'Eardrum', 'Earlobe', 'Tongue'],
    correctAnswer: 'Cornea of the eye',
  },
  {
    id: 'boss_en_6',
    categoryId: 'math',
    question: 'What is the smallest positive number evenly divisible by all numbers from 1 to 10?',
    options: ['2520', '1260', '5040', '3600'],
    correctAnswer: '2520',
  },
];
