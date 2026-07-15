import supabase from '../supabase.js';

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
    query = query.or(
      `title.ilike.%${filters.search}%,` +
      `author.ilike.%${filters.search}%,` +
      `publisher.ilike.%${filters.search}%`
    );
  }
  
  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Helper function to derive genre from class_no
  const deriveGenre = (class_no) => {
    if (!class_no) return 'Fiction';
    const prefix = class_no.split('-')[0];
    const genreMap = {
      'FIC': 'Fiction',
      'TEC': 'Technology',
      'SCI': 'Science',
      'DES': 'Design',
      'HIS': 'History',
      'SEL': 'Self-Help',
      'PSY': 'Psychology',
      'BIO': 'Memoir',
      'BUS': 'Business',
      'PHI': 'Philosophy'
    };
    return genreMap[prefix] || 'Fiction';
  };

  // Enrich books with availability data and genre (camelCase for JavaScript)
  return data.map(book => ({
    ...book,
    genre: deriveGenre(book.class_no),
    cover: book.cover_url,
    year: book.publication_year,
    totalCopies: book.physical_copies.length,
    availableCopies: book.physical_copies.filter(c => c.status === 'available').length,
    borrowedCopies: book.physical_copies.filter(c => c.status === 'borrowed').length
  }));
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
        remark
      )
    `)
    .eq('id', bookId)
    .single();
  
  if (error) throw error;
  
  // Add availability counts (camelCase for JavaScript)
  return {
    ...data,
    totalCopies: data.physical_copies.length,
    availableCopies: data.physical_copies.filter(c => c.status === 'available').length,
    borrowedCopies: data.physical_copies.filter(c => c.status === 'borrowed').length
  };
}

export async function createBook(bookData) {
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
      cover_url: bookData.cover_url
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
