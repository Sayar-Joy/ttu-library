import supabase from './supabase.js';

/**
 * Migration: Add ALL new columns to `books` table.
 * 
 * Columns added:
 *   - category (text)
 *   - review (text)
 *   - total_pages (integer)
 *   - size (text)
 *   - place_of_publication (text)
 *   - is_translated (boolean, default false)
 *   - original_title (text)
 *   - original_author (text)
 *   - translator (text)
 * 
 * Run: node server/migrateBooks.js
 */

const ALL_COLUMNS = [
  'category', 'review', 'total_pages', 'size',
  'place_of_publication', 'is_translated', 'original_title', 'original_author', 'translator'
];

async function verifyColumns() {
  const selectCols = ALL_COLUMNS.join(', ');
  const { data, error } = await supabase
    .from('books')
    .select(`id, ${selectCols}`)
    .limit(1);
  return !error;
}

async function migrate() {
  console.log('🔧 Migration: Add new columns to books table\n');

  if (await verifyColumns()) {
    console.log('✅ All 9 columns already exist! No migration needed.\n');
    process.exit(0);
  }

  // If columns don't exist, print manual instructions
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  📋 MANUAL STEP REQUIRED');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Run this SQL in Supabase Dashboard → SQL Editor:');
  console.log('');
  console.log('  ALTER TABLE public.books ADD COLUMN IF NOT EXISTS category TEXT;');
  console.log('  ALTER TABLE public.books ADD COLUMN IF NOT EXISTS review TEXT;');
  console.log('  ALTER TABLE public.books ADD COLUMN IF NOT EXISTS total_pages INTEGER;');
  console.log('  ALTER TABLE public.books ADD COLUMN IF NOT EXISTS size TEXT;');
  console.log('  ALTER TABLE public.books ADD COLUMN IF NOT EXISTS place_of_publication TEXT;');
  console.log('  ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_translated BOOLEAN DEFAULT false;');
  console.log('  ALTER TABLE public.books ADD COLUMN IF NOT EXISTS original_title TEXT;');
  console.log('  ALTER TABLE public.books ADD COLUMN IF NOT EXISTS original_author TEXT;');
  console.log('  ALTER TABLE public.books ADD COLUMN IF NOT EXISTS translator TEXT;');
  console.log('');
  console.log('  Or copy the file: ADD_BOOK_COLUMNS.sql');
  console.log('');
  console.log('  After running, execute this script again to verify.');
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(1);
}

migrate();
