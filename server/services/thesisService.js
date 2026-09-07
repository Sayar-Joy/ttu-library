import supabase from '../supabase.js';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCAL_DATA_FILE = join(__dirname, '..', 'data', 'theses.json');

// Ensure local data fallback directory exists
function ensureLocalDir() {
  const dir = dirname(LOCAL_DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readLocalTheses() {
  try {
    ensureLocalDir();
    if (!fs.existsSync(LOCAL_DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading local theses:', err);
    return [];
  }
}

function writeLocalTheses(theses) {
  try {
    ensureLocalDir();
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(theses, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing local theses:', err);
  }
}

/**
 * Check if the Supabase `theses` table exists and is accessible.
 */
let isSupabaseThesesAvailable = null;

async function checkSupabaseTable() {
  if (isSupabaseThesesAvailable !== null) {
    return isSupabaseThesesAvailable;
  }
  try {
    const { error } = await supabase.from('theses').select('id').limit(1);
    if (error && error.code === 'PGRST205') {
      console.warn('⚠️ Supabase `theses` table not found yet in database. Using seamless local storage + books sync.');
      isSupabaseThesesAvailable = false;
    } else {
      isSupabaseThesesAvailable = true;
    }
  } catch (err) {
    isSupabaseThesesAvailable = false;
  }
  return isSupabaseThesesAvailable;
}

// Helper for bidirectional major matching (supports codes and full titles)
function matchMajor(thesisMajor, filterMajor) {
  if (!filterMajor || filterMajor === 'all') return true;
  if (!thesisMajor) return false;
  const tm = String(thesisMajor).trim().toLowerCase();
  const fm = String(filterMajor).trim().toLowerCase();

  if (tm === fm) return true;

  const aliases = {
    'ceit': ['ceit', 'information technology', 'computer engineering & it', 'computer engineering & information technology'],
    'mc': ['mc', 'mechatronics', 'mechatronics engineering', 'mechatronic engineering'],
    'mech': ['mech', 'mechanical', 'mechanical engineering'],
    'archi': ['archi', 'arch', 'architecture'],
    'civil': ['civil', 'civil engineering'],
    'pe': ['pe', 'petroleum', 'petroleum engineering'],
    'che': ['che', 'chem', 'chemical', 'chemical engineering'],
    'ec': ['ec', 'electronic', 'electronic engineering', 'electronic communication'],
    'ep': ['ep', 'electrical power', 'electrical power engineering', 'power'],
  };

  for (const [code, list] of Object.entries(aliases)) {
    if (fm === code || list.includes(fm)) {
      if (tm === code || list.includes(tm) || list.some(alias => tm.includes(alias))) {
        return true;
      }
    }
  }

  return tm.includes(fm) || fm.includes(tm);
}

/**
 * Get all theses with optional filtering by major, year, search text, and pagination.
 */
export async function getAllTheses(filters = {}) {
  const tableAvailable = await checkSupabaseTable();

  if (tableAvailable) {
    let query = supabase.from('theses').select('*', { count: 'exact' });

    if (filters.major && filters.major !== 'all') {
      const norm = String(filters.major).trim();
      const lower = norm.toLowerCase();
      const majorAliases = {
        'ceit': ['CEIT', 'Information Technology', 'Computer Engineering'],
        'mc': ['MC', 'Mechatronics', 'Mechatronic'],
        'mech': ['Mech', 'Mechanical'],
        'archi': ['Archi', 'Arch', 'Architecture'],
        'civil': ['Civil'],
        'pe': ['PE', 'Petroleum'],
        'che': ['Che', 'Chem', 'Chemical'],
        'ec': ['EC', 'Electronic'],
        'ep': ['EP', 'Electrical Power'],
      };

      const matchedList = majorAliases[lower] || [norm];
      const orClauses = matchedList.map(a => `major.ilike.%${a}%`).join(',');
      query = query.or(orClauses);
    }

    if (filters.year && filters.year !== 'all') {
      query = query.eq('year', parseInt(filters.year, 10));
    }

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      query = query.or(`title.ilike.%${s}%,author.ilike.%${s}%,student_roll.ilike.%${s}%,major.ilike.%${s}%,supervisor.ilike.%${s}%`);
    }

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
      const limit = parseInt(filters.limit, 10);
      const page = parseInt(filters.page || 1, 10);
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('Error querying supabase theses:', error);
      // Fallback to local store
      return getLocalFiltered(filters);
    }

    return {
      theses: data || [],
      totalCount: count || (data ? data.length : 0),
    };
  }

  return getLocalFiltered(filters);
}

function getLocalFiltered(filters = {}) {
  let list = readLocalTheses();

  if (filters.major && filters.major !== 'all') {
    list = list.filter(t => matchMajor(t.major, filters.major));
  }

  if (filters.year && filters.year !== 'all') {
    list = list.filter(t => String(t.year) === String(filters.year));
  }

  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim().toLowerCase();
    list = list.filter(t =>
      (t.title && t.title.toLowerCase().includes(s)) ||
      (t.author && t.author.toLowerCase().includes(s)) ||
      (t.student_roll && t.student_roll.toLowerCase().includes(s)) ||
      (t.major && t.major.toLowerCase().includes(s)) ||
      (t.supervisor && t.supervisor.toLowerCase().includes(s))
    );
  }

  // Sort descending by year or created_at
  list.sort((a, b) => new Date(b.created_at || b.year) - new Date(a.created_at || a.year));

  const totalCount = list.length;
  if (filters.limit) {
    const limit = parseInt(filters.limit, 10);
    const page = parseInt(filters.page || 1, 10);
    const start = (page - 1) * limit;
    list = list.slice(start, start + limit);
  }

  return {
    theses: list,
    totalCount,
  };
}

/**
 * Get a single thesis by ID.
 */
export async function getThesisById(id) {
  const tableAvailable = await checkSupabaseTable();

  if (tableAvailable) {
    const { data, error } = await supabase
      .from('theses')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return data;
    }
  }

  const localList = readLocalTheses();
  const found = localList.find(t => t.id === id);
  return found || null;
}

/**
 * Create a new thesis record.
 */
export async function createThesis(thesisData) {
  if (!thesisData.title || !thesisData.author || !thesisData.student_roll || !thesisData.major || !thesisData.year) {
    throw new Error('Title, Student Author, Student Roll, Major, and Year are required.');
  }

  const id = thesisData.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const record = {
    id,
    title: thesisData.title.trim(),
    author: thesisData.author.trim(),
    student_roll: thesisData.student_roll.trim(),
    major: thesisData.major.trim(),
    year: parseInt(thesisData.year, 10),
    supervisor: thesisData.supervisor ? thesisData.supervisor.trim() : null,
    abstract: thesisData.abstract ? thesisData.abstract.trim() : null,
    category: 'Thesis',
    pdf_url: thesisData.pdf_url || null,
    preview_pdf_url: thesisData.preview_pdf_url || thesisData.pdf_url || null,
    cover_url: thesisData.cover_url || null,
    total_pages: thesisData.total_pages ? parseInt(thesisData.total_pages, 10) : 10,
    preview_pages_count: thesisData.preview_pages_count ? parseInt(thesisData.preview_pages_count, 10) : 10,
    accession_no: thesisData.accession_no ? thesisData.accession_no.trim() : null,
    created_at: now,
    updated_at: now,
  };

  const tableAvailable = await checkSupabaseTable();

  if (tableAvailable) {
    const { data, error } = await supabase
      .from('theses')
      .insert([record])
      .select()
      .single();

    if (error) {
      console.error('Failed to insert into supabase theses table:', error);
      // fallback to local
      const list = readLocalTheses();
      list.unshift(record);
      writeLocalTheses(list);
      return record;
    }
    return data;
  }

  // Fallback to local file store
  const list = readLocalTheses();
  list.unshift(record);
  writeLocalTheses(list);
  return record;
}

/**
 * Update an existing thesis record.
 */
export async function updateThesis(id, updateData) {
  const tableAvailable = await checkSupabaseTable();
  const now = new Date().toISOString();

  const cleaned = {
    ...updateData,
    updated_at: now,
  };
  if (cleaned.year) cleaned.year = parseInt(cleaned.year, 10);
  if (cleaned.total_pages) cleaned.total_pages = parseInt(cleaned.total_pages, 10);
  if (cleaned.preview_pages_count) cleaned.preview_pages_count = parseInt(cleaned.preview_pages_count, 10);

  if (tableAvailable) {
    const { data, error } = await supabase
      .from('theses')
      .update(cleaned)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return data;
    }
  }

  const list = readLocalTheses();
  const index = list.findIndex(t => t.id === id);
  if (index === -1) {
    throw new Error('Thesis not found.');
  }

  list[index] = {
    ...list[index],
    ...cleaned,
    updated_at: now,
  };
  writeLocalTheses(list);
  return list[index];
}

/**
 * Delete a thesis record by ID.
 */
export async function deleteThesis(id) {
  const tableAvailable = await checkSupabaseTable();

  if (tableAvailable) {
    const { error } = await supabase
      .from('theses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting thesis from Supabase:', error);
    }
  }

  const list = readLocalTheses();
  const filtered = list.filter(t => t.id !== id);
  writeLocalTheses(filtered);

  return { success: true, message: 'Thesis deleted successfully.' };
}

/**
 * Get statistical overview of theses.
 */
export async function getThesisStats() {
  const { theses, totalCount } = await getAllTheses();

  const majorCounts = {};
  const yearCounts = {};

  theses.forEach(t => {
    if (t.major) {
      majorCounts[t.major] = (majorCounts[t.major] || 0) + 1;
    }
    if (t.year) {
      yearCounts[t.year] = (yearCounts[t.year] || 0) + 1;
    }
  });

  return {
    totalTheses: totalCount,
    majorCounts,
    yearCounts,
  };
}

export default {
  getAllTheses,
  getThesisById,
  createThesis,
  updateThesis,
  deleteThesis,
  getThesisStats,
};
