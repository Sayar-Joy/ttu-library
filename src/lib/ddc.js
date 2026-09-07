// ============================================================
// Dewey Decimal Classification (DDC) — The Ten Main Classes
// Official TTU Library Classification System
// ============================================================

export const BURMESE_TO_ENGLISH = {
  '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4',
  '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9'
};

export const ENGLISH_TO_BURMESE = {
  '0': '၀', '1': '၁', '2': '၂', '3': '၃', '4': '၄',
  '5': '၅', '6': '၆', '7': '၇', '8': '၈', '9': '၉'
};

/**
 * Converts Burmese digits to English digits
 * e.g. "၈၉၅.၈" -> "895.8"
 */
export function toEnglishDigits(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[၀-၉]/g, ch => BURMESE_TO_ENGLISH[ch] || ch);
}

/**
 * Converts English digits to Burmese digits
 * e.g. "895.8" -> "၈၉၅.၈"
 */
export function toBurmeseDigits(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[0-9]/g, ch => ENGLISH_TO_BURMESE[ch] || ch);
}

/**
 * Format a class number showing both English and Burmese if different
 * e.g. "895.8 (၈၉၅.၈)"
 */
export function formatClassNoDual(classNo) {
  if (!classNo) return '—';
  const en = toEnglishDigits(classNo).trim();
  const my = toBurmeseDigits(en).trim();
  if (en === my) return en;
  return `${en} (${my})`;
}

/**
 * The Ten Main Classes of the Dewey Decimal Classification
 * As standardized in TTU Library:
 * 000 Computer science, information & general works
 * 100 Philosophy & psychology
 * 200 Religion
 * 300 Social sciences
 * 400 Language
 * 500 Science
 * 600 Technology
 * 700 Arts & recreation
 * 800 Literature
 * 900 History & geography
 */
export const DDC_CLASSES = [
  {
    code: '000',
    burmeseCode: '၀၀၀',
    digit: '0',
    burmeseDigit: '၀',
    name: 'Computer science & general works',
    fullName: 'Computer science, information & general works',
    shortName: 'Computer science & general works',
    burmeseName: 'ကွန်ပျူတာသိပ္ပံနှင့် အထွေထွေ',
    color: '#E0F2FE',
    textColor: '#0369A1',
    borderColor: '#BAE6FD'
  },
  {
    code: '100',
    burmeseCode: '၁၀၀',
    digit: '1',
    burmeseDigit: '၁',
    name: 'Philosophy & psychology',
    shortName: 'Philosophy & psychology',
    burmeseName: 'ဒဿနိကဗေဒနှင့် စိတ်ပညာ',
    color: '#FCE7F3',
    textColor: '#9D174D',
    borderColor: '#FBCFE8'
  },
  {
    code: '200',
    burmeseCode: '၂၀၀',
    digit: '2',
    burmeseDigit: '၂',
    name: 'Religion',
    shortName: 'Religion',
    burmeseName: 'ဘာသာရေး',
    color: '#FEF3C7',
    textColor: '#B45309',
    borderColor: '#FDE68A'
  },
  {
    code: '300',
    burmeseCode: '၃၀၀',
    digit: '3',
    burmeseDigit: '၃',
    name: 'Social sciences',
    shortName: 'Social sciences',
    burmeseName: 'လူမှုရေးသိပ္ပံ',
    color: '#EDE9FE',
    textColor: '#6D28D9',
    borderColor: '#DDD6FE'
  },
  {
    code: '400',
    burmeseCode: '၄၀၀',
    digit: '4',
    burmeseDigit: '၄',
    name: 'Language',
    shortName: 'Language',
    burmeseName: 'ဘာသာစကား',
    color: '#DCFCE7',
    textColor: '#15803D',
    borderColor: '#BBF7D0'
  },
  {
    code: '500',
    burmeseCode: '၅၀၀',
    digit: '5',
    burmeseDigit: '၅',
    name: 'Science',
    shortName: 'Science',
    burmeseName: 'သိပ္ပံ',
    color: '#CCFBF1',
    textColor: '#0F766E',
    borderColor: '#99F6E4'
  },
  {
    code: '600',
    burmeseCode: '၆၀၀',
    digit: '6',
    burmeseDigit: '၆',
    name: 'Technology',
    shortName: 'Technology',
    burmeseName: 'နည်းပညာ',
    color: '#DBEAFE',
    textColor: '#1D4ED8',
    borderColor: '#BFDBFE'
  },
  {
    code: '700',
    burmeseCode: '၇၀၀',
    digit: '7',
    burmeseDigit: '၇',
    name: 'Arts & recreation',
    shortName: 'Arts & recreation',
    burmeseName: 'အနုပညာနှင့် အပန်းဖြေခြင်း',
    color: '#FFEDD5',
    textColor: '#C2410C',
    borderColor: '#FED7AA'
  },
  {
    code: '800',
    burmeseCode: '၈၀၀',
    digit: '8',
    burmeseDigit: '၈',
    name: 'Literature',
    shortName: 'Literature',
    burmeseName: 'စာပေ',
    color: '#F3E8FF',
    textColor: '#7E22CE',
    borderColor: '#E9D5FF'
  },
  {
    code: '900',
    burmeseCode: '၉၀၀',
    digit: '9',
    burmeseDigit: '၉',
    name: 'History & geography',
    shortName: 'History & geography',
    burmeseName: 'သမိုင်းနှင့် ပထဝီဝင်',
    color: '#F1F5F9',
    textColor: '#334155',
    borderColor: '#CBD5E1'
  }
];

export const THESIS_CLASS = {
  code: 'THESIS',
  burmeseCode: 'ကျမ်း',
  digit: 'T',
  burmeseDigit: 'ကျမ်း',
  name: 'Thesis',
  shortName: 'Thesis',
  burmeseName: 'ဘွဲ့ယူကျမ်း',
  color: '#D1FAE5',
  textColor: '#047857',
  borderColor: '#A7F3D0'
};

// Map of category names to colors for fast lookup
export const DDC_COLORS = DDC_CLASSES.reduce((acc, c) => {
  acc[c.name] = c.color;
  acc[c.code] = c.color;
  acc[c.burmeseCode] = c.color;
  return acc;
}, { 'Thesis': THESIS_CLASS.color });

export const DDC_TEXT_COLORS = DDC_CLASSES.reduce((acc, c) => {
  acc[c.name] = c.textColor;
  acc[c.code] = c.textColor;
  acc[c.burmeseCode] = c.textColor;
  return acc;
}, { 'Thesis': THESIS_CLASS.textColor });

/**
 * Determine the official DDC class of a book
 * Prioritizes class_no, then fallback to category text/keywords
 */
export function getBookDdcClass(book) {
  if (!book) return DDC_CLASSES[0];
  if (book.isThesis || book.genre === 'Thesis' || book.category === 'Thesis') {
    return THESIS_CLASS;
  }

  // 1. Extract first digit from class_no (supports Burmese and English)
  if (book.class_no) {
    const rawClass = String(book.class_no).trim();
    const enDigits = toEnglishDigits(rawClass);
    const digitMatch = enDigits.match(/\d/);
    if (digitMatch) {
      const digit = digitMatch[0];
      const found = DDC_CLASSES.find(c => c.digit === digit);
      if (found) return found;
    }
  }

  // 2. Match based on existing category string if class_no is non-numeric
  const cat = String(book.category || book.genre || '').toLowerCase();
  
  // Exact or code match
  const byCode = DDC_CLASSES.find(c => c.code === cat || c.burmeseCode === cat || cat.startsWith(c.code) || cat.startsWith(c.burmeseCode));
  if (byCode) return byCode;

  // Keyword match
  if (cat.includes('tech') || cat.includes('engineer') || cat.includes('civil') || cat.includes('network') || cat.includes('architect') || cat.includes('dbms')) return DDC_CLASSES[6]; // 600
  if (cat.includes('scien') || cat.includes('chem') || cat.includes('phys') || cat.includes('math') || cat.includes('bio')) return DDC_CLASSES[5]; // 500
  if (cat.includes('art') || cat.includes('design') || cat.includes('draw') || cat.includes('recreat')) return DDC_CLASSES[7]; // 700
  if (cat.includes('phil') || cat.includes('psych') || cat.includes('self-help') || cat.includes('habit') || cat.includes('action')) return DDC_CLASSES[1]; // 100
  if (cat.includes('relig') || cat.includes('buddh') || cat.includes('ဓမ္မ')) return DDC_CLASSES[2]; // 200
  if (cat.includes('soci') || cat.includes('educat') || cat.includes('law') || cat.includes('econom') || cat.includes('politi')) return DDC_CLASSES[3]; // 300
  if (cat.includes('lang') || cat.includes('english') || cat.includes('grammar') || cat.includes('ဝါကျ')) return DDC_CLASSES[4]; // 400
  if (cat.includes('liter') || cat.includes('fict') || cat.includes('classic') || cat.includes('novel') || cat.includes('ကဗျာ') || cat.includes('ဝတ္ထု')) return DDC_CLASSES[8]; // 800
  if (cat.includes('hist') || cat.includes('geog') || cat.includes('bio') || cat.includes('memoir') || cat.includes('အတ္ထုပ္ပတ္တိ')) return DDC_CLASSES[9]; // 900
  if (cat.includes('comput') || cat.includes('it') || cat.includes('general') || cat.includes('magazin')) return DDC_CLASSES[0]; // 000

  return DDC_CLASSES[0];
}

/**
 * Query matcher for books:
 * Supports querying by class number in both Burmese (၆၂၀, ၈၉၅.၈, ၀၀၀) and English (620, 895.8, 000),
 * as well as searching by title, author, publisher, and DDC class name.
 */
export function matchBookSearch(book, query) {
  if (!query || !query.trim()) return true;
  const qTrim = query.trim();
  const qEn = toEnglishDigits(qTrim).toLowerCase();
  const qMy = toBurmeseDigits(qTrim);

  const ddc = getBookDdcClass(book);
  const bookClassEn = toEnglishDigits(book.class_no || '').toLowerCase();
  const bookClassMy = toBurmeseDigits(book.class_no || '');

  // 1. DDC Class Code query: e.g. "000" or "၀၀၀", "100" or "၁၀၀", "600" or "၆၀၀"
  const isClassCode = DDC_CLASSES.some(c => c.code === qEn || c.burmeseCode === qTrim);
  if (isClassCode) {
    return ddc.code === qEn || ddc.burmeseCode === qTrim;
  }

  // 2. Specific class number query: e.g. "620" <-> "၆၂၀", "895.8" <-> "၈၉၅.၈", "721" <-> "၇၂၁"
  if (bookClassEn && (bookClassEn.includes(qEn) || bookClassMy.includes(qMy))) {
    return true;
  }

  // 3. Category or DDC class name query: e.g. "technology", "literature", "science"
  const ddcNameEn = ddc.name.toLowerCase();
  const ddcShortEn = ddc.shortName.toLowerCase();
  if (ddcNameEn.includes(qEn) || ddcShortEn.includes(qEn) || ddc.burmeseName.includes(qTrim)) {
    return true;
  }

  // 4. Standard bibliographic search (Title, Author, Publisher, ISBN)
  const title = (book.title || '').toLowerCase();
  const author = (book.author || '').toLowerCase();
  const publisher = (book.publisher || '').toLowerCase();
  const isbn = (book.isbn || '').toLowerCase();

  return title.includes(qEn) || title.includes(qTrim) ||
         author.includes(qEn) || author.includes(qTrim) ||
         publisher.includes(qEn) || publisher.includes(qTrim) ||
         isbn.includes(qEn);
}
