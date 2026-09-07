import supabase from '../supabase.js';
import { getBookDdcClass, toEnglishDigits, toBurmeseDigits, DDC_CLASSES } from '../lib/ddc.js';

/**
 * Book & Physical Copy Service
 * Handles bibliographic data (books) and inventory (physical_copies)
 */

// ============================================================
// BOOKS (Catalog/Bibliographic Data)
// ============================================================

export async function getAllBooks(filters = {}) {
  let query = supabase
    .from('books')
    .select(`
      *,
      physical_copies (
        accession_no,
        status
      )
    `);
  
  if (filters.search) {
    const rawSearch = filters.search.trim();
    const enSearch = toEnglishDigits(rawSearch);
    const mySearch = toBurmeseDigits(rawSearch);

    // Support searching by title, author, publisher, and class_no in both English and Burmese digits
    const orClauses = [
      `title.ilike.%${rawSearch}%`,
      `author.ilike.%${rawSearch}%`,
      `publisher.ilike.%${rawSearch}%`,
      `class_no.ilike.%${enSearch}%`,
      `class_no.ilike.%${mySearch}%`
    ];

    // If query matches a DDC class code (e.g. 600 or ၆၀၀)
    const isClassMatch = DDC_CLASSES.find(c => c.code === enSearch || c.burmeseCode === rawSearch);
    if (isClassMatch) {
      orClauses.push(`class_no.ilike.${isClassMatch.digit}%`);
      orClauses.push(`class_no.ilike.${isClassMatch.burmeseDigit}%`);
    }

    query = query.or(orClauses.join(','));
  }

  if (filters.class_no) {
    const enClass = toEnglishDigits(filters.class_no).trim();
    const myClass = toBurmeseDigits(filters.class_no).trim();
    query = query.or(`class_no.ilike.%${enClass}%,class_no.ilike.%${myClass}%`);
  }
  
  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Enrich books with availability data and standard DDC category
  return data.map(book => {
    const ddc = getBookDdcClass(book);
    const categoryName = ddc.name;
    return {
      ...book,
      category: categoryName,
      genre: categoryName,
      ddc_code: ddc.code,
      ddc_burmese_code: ddc.burmeseCode,
      ddc_name: ddc.name,
      ddc_burmese_name: ddc.burmeseName,
      cover: book.cover_url,
      year: book.publication_year,
      totalCopies: book.physical_copies.length,
      availableCopies: book.physical_copies.filter(c => c.status === 'available').length,
      borrowedCopies: book.physical_copies.filter(c => c.status === 'borrowed').length
    };
  });
}

export async function getBookById(bookId) {
  const { data, error } = await supabase
    .from('books')
    .select(`
      *,
      physical_copies (
        accession_no,
        status,
        date_acquired,
        price,
        how_obtained,
        remark
      )
    `)
    .eq('id', bookId)
    .single();
  
  if (error) throw error;
  
  const ddc = getBookDdcClass(data);
  return {
    ...data,
    category: ddc.name,
    genre: ddc.name,
    ddc_code: ddc.code,
    ddc_burmese_code: ddc.burmeseCode,
    ddc_name: ddc.name,
    ddc_burmese_name: ddc.burmeseName,
    totalCopies: data.physical_copies.length,
    availableCopies: data.physical_copies.filter(c => c.status === 'available').length,
    borrowedCopies: data.physical_copies.filter(c => c.status === 'borrowed').length
  };
}

export async function createBook(bookData) {
  const ddc = getBookDdcClass(bookData);
  const finalCategory = bookData.category || ddc.name;

  const { data, error } = await supabase
    .from('books')
    .insert([{
      title: bookData.title,
      author: bookData.author,
      publisher: bookData.publisher,
      edition: bookData.edition,
      publication_year: bookData.publication_year,
      class_no: bookData.class_no,
      isbn: bookData.isbn,
      cover_url: bookData.cover_url,
      category: finalCategory,
      review: bookData.review,
      total_pages: bookData.total_pages,
      size: bookData.size,
      place_of_publication: bookData.place_of_publication,
      is_translated: bookData.is_translated || false,
      original_title: bookData.original_title,
      original_author: bookData.original_author,
      translator: bookData.translator,
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateBook(bookId, updates) {
  const { data, error } = await supabase
    .from('books')
    .update(updates)
    .eq('id', bookId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteBook(bookId) {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId);
  
  if (error) throw error;
  return true;
}

// ============================================================
// PHYSICAL COPIES (Inventory)
// ============================================================

export async function getPhysicalCopy(accessionNo) {
  const { data, error } = await supabase
    .from('physical_copies')
    .select(`
      *,
      books (*)
    `)
    .eq('accession_no', accessionNo)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getPhysicalCopiesByBook(bookId) {
  const { data, error } = await supabase
    .from('physical_copies')
    .select('*')
    .eq('book_id', bookId)
    .order('accession_no');
  
  if (error) throw error;
  return data;
}

export async function getAvailableCopy(bookId) {
  const { data, error } = await supabase
    .from('physical_copies')
    .select('*')
    .eq('book_id', bookId)
    .eq('status', 'available')
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createPhysicalCopy(copyData) {
  const { data, error } = await supabase
    .from('physical_copies')
    .insert([{
      accession_no: copyData.accession_no,
      book_id: copyData.book_id,
      date_acquired: copyData.date_acquired,
      price: copyData.price,
      how_obtained: copyData.how_obtained,
      remark: copyData.remark,
      status: copyData.status || 'available'
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updatePhysicalCopyStatus(accessionNo, status) {
  const { data, error } = await supabase
    .from('physical_copies')
    .update({ status })
    .eq('accession_no', accessionNo)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deletePhysicalCopy(accessionNo) {
  const { error } = await supabase
    .from('physical_copies')
    .delete()
    .eq('accession_no', accessionNo);
  
  if (error) throw error;
  return true;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export async function getBookAvailability(bookId) {
  const { data, error } = await supabase
    .from('physical_copies')
    .select('status')
    .eq('book_id', bookId);
  
  if (error) throw error;
  
  return {
    total: data.length,
    available: data.filter(c => c.status === 'available').length,
    borrowed: data.filter(c => c.status === 'borrowed').length,
    lost: data.filter(c => c.status === 'lost').length,
    maintenance: data.filter(c => c.status === 'maintenance').length
  };
}
