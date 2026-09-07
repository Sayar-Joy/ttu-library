// ============================================================
// TTU Engineering Majors — Official 9 Departments
// Standard Abbreviations, Full Names, and Styling
// ============================================================

export const TTU_MAJORS = [
  {
    code: 'CEIT',
    name: 'Computer Engineering & Information Technology',
    shortName: 'CEIT',
    burmeseName: 'ကွန်ပျူတာအင်ဂျင်နီယာနှင့် သုတနည်းပညာ',
    color: '#0284c7', // Sky 600
    bg: '#f0f9ff',
    border: '#bae6fd',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Software systems, network security, AI, embedded systems, and database engineering.'
  },
  {
    code: 'MC',
    name: 'Mechatronics Engineering',
    shortName: 'MC',
    burmeseName: 'မက္ကာထရောနစ် အင်ဂျင်နီယာ',
    color: '#059669', // Emerald 600
    bg: '#ecfdf5',
    border: '#a7f3d0',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Robotics, automated control systems, sensors, and intelligent electromechanical machines.'
  },
  {
    code: 'Mech',
    name: 'Mechanical Engineering',
    shortName: 'Mech',
    burmeseName: 'စက်မှုအင်ဂျင်နီယာ',
    color: '#ea580c', // Orange 600
    bg: '#fff7ed',
    border: '#fed7aa',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    description: 'Thermodynamics, mechanical design, automotive systems, and fluid mechanics.'
  },
  {
    code: 'Archi',
    name: 'Architecture',
    shortName: 'Archi',
    burmeseName: 'ဗိသုကာ',
    color: '#9333ea', // Purple 600
    bg: '#faf5ff',
    border: '#e9d5ff',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Sustainable building design, urban planning, structural aesthetics, and green architecture.'
  },
  {
    code: 'Civil',
    name: 'Civil Engineering',
    shortName: 'Civil',
    burmeseName: 'မြို့ပြအင်ဂျင်နီယာ',
    color: '#2563eb', // Blue 600
    bg: '#eff6ff',
    border: '#bfdbfe',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Structural engineering, transportation, geotechnics, environmental, and hydraulic infrastructure.'
  },
  {
    code: 'PE',
    name: 'Petroleum Engineering',
    shortName: 'PE',
    burmeseName: 'ရေနံအင်ဂျင်နီယာ',
    color: '#d97706', // Amber 600
    bg: '#fffbeb',
    border: '#fde68a',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Reservoir engineering, drilling technology, hydrocarbon extraction, and refining systems.'
  },
  {
    code: 'Che',
    name: 'Chemical Engineering',
    shortName: 'Che',
    burmeseName: 'ဓာတုအင်ဂျင်နီယာ',
    color: '#0d9488', // Teal 600
    bg: '#f0fdfa',
    border: '#99f6e4',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Chemical process dynamics, bio-processing, polymer technology, and material synthesis.'
  },
  {
    code: 'EC',
    name: 'Electronic Engineering',
    shortName: 'EC',
    burmeseName: 'အီလက်ထရောနစ် အင်ဂျင်နီယာ',
    color: '#4f46e5', // Indigo 600
    bg: '#eef2ff',
    border: '#c7d2fe',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Telecommunications, signal processing, VLSI design, wireless networks, and RF systems.'
  },
  {
    code: 'EP',
    name: 'Electrical Power Engineering',
    shortName: 'EP',
    burmeseName: 'လျှပ်စစ်စွမ်းအား အင်ဂျင်နီယာ',
    color: '#e11d48', // Rose 600
    bg: '#fff1f2',
    border: '#fecdd3',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Power transmission, smart grid distribution, renewable energy generation, and high-voltage engineering.'
  },
];

export const MAJOR_CODES = TTU_MAJORS.map(m => m.code);

/**
 * Normalizes any major string or roll number to the canonical TTU Major code (e.g. 'CEIT', 'MC')
 * Handles legacy names, full department titles, and abbreviations.
 */
export function normalizeMajor(input) {
  if (!input) return null;
  const raw = String(input).trim();
  const lower = raw.toLowerCase();

  // Check exact code match first (case-insensitive)
  const exact = TTU_MAJORS.find(m => m.code.toLowerCase() === lower);
  if (exact) return exact.code;

  // Check roll number patterns (e.g. "5CEIT-01", "5MC-08", "III-CEIT-1", "5Mech-12")
  const rollMatch = raw.match(/\b(CEIT|MC|Mech|Archi|Arch|Civil|CIVIL|PE|Che|Chem|EC|EP)\b/i);
  if (rollMatch) {
    const matched = rollMatch[1].toUpperCase();
    if (matched === 'ARCH') return 'Archi';
    if (matched === 'CHEM') return 'Che';
    const foundByRoll = TTU_MAJORS.find(m => m.code.toUpperCase() === matched);
    if (foundByRoll) return foundByRoll.code;
  }

  // Check keyword matches
  if (lower.includes('ceit') || lower.includes('computer') || lower.includes('information tech') || lower.includes('software')) return 'CEIT';
  if (lower.includes('mechatronic') || lower === 'mc') return 'MC';
  if (lower.includes('mechanical') || lower === 'mech') return 'Mech';
  if (lower.includes('architect') || lower.startsWith('arch')) return 'Archi';
  if (lower.includes('civil')) return 'Civil';
  if (lower.includes('petroleum') || lower === 'pe') return 'PE';
  if (lower.includes('chemical') || lower === 'chem' || lower === 'che') return 'Che';
  if (lower.includes('electronic') || lower.includes('telecom') || lower === 'ec') return 'EC';
  if (lower.includes('power') || lower.includes('electrical') || lower === 'ep') return 'EP';

  return raw;
}

/**
 * Get major metadata by code or name
 */
export function getMajorInfo(input) {
  const normCode = normalizeMajor(input);
  const found = TTU_MAJORS.find(m => m.code === normCode);
  if (found) return found;

  return {
    code: normCode || input || 'Unknown',
    name: input || 'Engineering Department',
    shortName: normCode || input || 'Eng',
    burmeseName: 'အင်ဂျင်နီယာ',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Graduation thesis and academic research.'
  };
}
