import supabase from '../supabase.js';

/**
 * Admin Catalog & Inventory Controller
 * ─────────────────────────────────────
 * Handles bibliographic catalog (books) and physical inventory (physical_copies).
 * 
 * Data model reminder:
 *   `books` = bibliographic records (title, author, isbn)
 *   `physical_copies` = real-world items on shelves (accession_no → book_id)
 *   One book can have many physical copies.
 *
 * All methods assume the `verifyLibrarian` middleware has already run.
 */

// Valid statuses for physical copies
const VALID_COPY_STATUSES = ['available', 'borrowed', 'lost', 'maintenance'];

// ============================================================
// 1. ADD BOOK RECORD (bibliographic catalog entry)
// ============================================================

/**
 * addBookRecord
 * Inserts a new record into the `books` table.
 * Validates required fields and checks for duplicate ISBNs.
 */
export async function addBookRecord(req, res) {
  try {
    const {
      title,
      author,
      isbn,
      publisher,
      edition,
      publication_year,
      class_no,
      cover_url,
      category,
      review,
      total_pages,
      size,
      place_of_publication,
      is_translated,
      original_title,
      original_author,
      translator,
    } = req.body;

    // ── Validation ────────────────────────────────────────────
    if (!title || !author) {
      return res.status(400).json({
        success: false,
        message: 'Title and author are required fields.',
      });
    }

    // ── Check for duplicate ISBN (if provided) ────────────────
    if (isbn) {
      const { data: existing, error: checkError } = await supabase
        .from('books')
        .select('id, title')
        .eq('isbn', isbn)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        return res.status(409).json({
          success: false,
          message: `A book with ISBN "${isbn}" already exists: "${existing.title}" (ID: ${existing.id}).`,
          existing_book_id: existing.id,
        });
      }
    }

    // ── Insert into `books` table ─────────────────────────────
    const { data: newBook, error: insertError } = await supabase
      .from('books')
      .insert([{
        title,
        author,
        isbn: isbn || null,
        publisher: publisher || null,
        edition: edition || null,
        publication_year: publication_year || null,
        class_no: class_no || null,
        cover_url: cover_url || null,
        category: category || null,
        review: review || null,
        total_pages: total_pages || null,
        size: size || null,
        place_of_publication: place_of_publication || null,
        is_translated: is_translated || false,
        original_title: original_title || null,
        original_author: original_author || null,
        translator: translator || null,
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({
      success: true,
      message: `Book "${title}" added to catalog successfully.`,
      book: newBook,
    });
  } catch (err) {
    console.error('Admin addBookRecord error:', err);
    res.status(500).json({ success: false, message: 'Failed to add book record.' });
  }
}

// ============================================================
// 2. ADD PHYSICAL COPY (inventory item linked to a book)
// ============================================================

/**
 * addPhysicalCopy
 * Inserts a new record into the `physical_copies` table.
 * Requires a unique `accession_no` and a valid `book_id` that exists
 * in the `books` table.
 */
export async function addPhysicalCopy(req, res) {
  try {
    const {
      accession_no,
      book_id,
      date_acquired,
      price,
      how_obtained,
      remark,
      status,
    } = req.body;

    // ── Validation ────────────────────────────────────────────
    if (!accession_no || !book_id) {
      return res.status(400).json({
        success: false,
        message: 'accession_no and book_id are required fields.',
      });
    }

    // ── Verify the parent `books` record exists ───────────────
    // This is a referential integrity check at the application level;
    // the FK constraint in the DB will also enforce this, but a
    // clear error message is better UX for the librarian.
    const { data: parentBook, error: bookError } = await supabase
      .from('books')
      .select('id, title')
      .eq('id', book_id)
      .maybeSingle();

    if (bookError) throw bookError;

    if (!parentBook) {
      return res.status(404).json({
        success: false,
        message: `No book found with ID "${book_id}". Add the book record first.`,
      });
    }

    // ── Check for duplicate accession number ──────────────────
    const { data: existingCopy, error: copyCheckError } = await supabase
      .from('physical_copies')
      .select('accession_no')
      .eq('accession_no', accession_no)
      .maybeSingle();

    if (copyCheckError) throw copyCheckError;

    if (existingCopy) {
      return res.status(409).json({
        success: false,
        message: `A physical copy with accession number "${accession_no}" already exists.`,
      });
    }

    // ── Validate status if provided ───────────────────────────
    const copyStatus = status || 'available';
    if (!VALID_COPY_STATUSES.includes(copyStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${copyStatus}". Must be one of: ${VALID_COPY_STATUSES.join(', ')}.`,
      });
    }

    // ── Insert into `physical_copies` table ───────────────────
    const { data: newCopy, error: insertError } = await supabase
      .from('physical_copies')
      .insert([{
        accession_no,
        book_id,
        date_acquired: date_acquired || new Date().toISOString().split('T')[0],
        price: price || null,
        how_obtained: how_obtained || null,
        remark: remark || null,
        status: copyStatus,
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({
      success: true,
      message: `Physical copy "${accession_no}" added for "${parentBook.title}".`,
      physical_copy: newCopy,
      book_title: parentBook.title,
    });
  } catch (err) {
    console.error('Admin addPhysicalCopy error:', err);
    res.status(500).json({ success: false, message: 'Failed to add physical copy.' });
  }
}

// ============================================================
// 3. GET INVENTORY STATUS (paginated, filterable list)
// ============================================================

/**
 * getInventoryStatus
 * Returns a paginated list of all `physical_copies`, joined with `books`
 * to show Title and Author. Supports filtering by copy status.
 *
 * Relational join:
 *   physical_copies → books (via `book_id` FK)
 *   Supabase embeds the parent `books` row inside each `physical_copies` row.
 *
 * Query params:
 *   ?status=available|borrowed|lost|maintenance
 *   ?search=<title or author search>
 *   ?page=1&limit=25
 */
export async function getInventoryStatus(req, res) {
  try {
    const { status, search, page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    // ── Build the query with a join to `books` ────────────────
    // The `books (...)` syntax embeds the related book record.
    let query = supabase
      .from('physical_copies')
      .select(`
        accession_no,
        book_id,
        status,
        date_acquired,
        price,
        how_obtained,
        remark,
        books (
          id,
          title,
          author,
          isbn,
          publisher,
          cover_url
        )
      `, { count: 'exact' })
      .order('accession_no', { ascending: true })
      .range(from, to);

    // ── Filter by physical copy status ────────────────────────
    if (status) {
      if (!VALID_COPY_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter "${status}". Must be one of: ${VALID_COPY_STATUSES.join(', ')}.`,
        });
      }
      query = query.eq('status', status);
    }

    const { data: copies, error, count: totalCount } = await query;

    if (error) throw error;

    // ── Optionally filter by book title/author (post-query) ───
    // Supabase doesn't support filtering on embedded relations directly
    // in all cases, so we do a secondary filter for search.
    let filteredCopies = copies;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCopies = copies.filter(copy => {
        const title = (copy.books?.title || '').toLowerCase();
        const author = (copy.books?.author || '').toLowerCase();
        return title.includes(searchLower) || author.includes(searchLower);
      });
    }

    // ── Flatten the response for readability ──────────────────
    const inventory = filteredCopies.map(copy => ({
      accession_no: copy.accession_no,
      status: copy.status,
      date_acquired: copy.date_acquired,
      price: copy.price,
      how_obtained: copy.how_obtained,
      remark: copy.remark,
      book_id: copy.book_id,
      book_title: copy.books?.title || 'Unknown',
      book_author: copy.books?.author || 'Unknown',
      book_isbn: copy.books?.isbn || null,
      book_cover_url: copy.books?.cover_url || null,
    }));

    res.json({
      success: true,
      count: inventory.length,
      total: totalCount,
      page: pageNum,
      total_pages: Math.ceil(totalCount / pageSize),
      inventory,
    });
  } catch (err) {
    console.error('Admin getInventoryStatus error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory.' });
  }
}

// ============================================================
// 4. UPDATE COPY STATUS (manual status change by admin)
// ============================================================

/**
 * updateCopyStatus
 * Allows the librarian to manually change a physical copy's status
 * (e.g., marking a damaged book as 'maintenance' or a lost book as 'lost').
 *
 * Safety check: Prevents changing status of a copy that currently has
 * an active (unreturned) transaction to 'available', which would create
 * an inconsistency.
 */
export async function updateCopyStatus(req, res) {
  try {
    const { accessionNo } = req.params;
    const { status: newStatus } = req.body;

    // ── Validation ────────────────────────────────────────────
    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'New status is required in the request body.',
      });
    }

    if (!VALID_COPY_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${newStatus}". Must be one of: ${VALID_COPY_STATUSES.join(', ')}.`,
      });
    }

    // ── Verify the physical copy exists ───────────────────────
    const { data: copy, error: copyError } = await supabase
      .from('physical_copies')
      .select(`
        accession_no,
        status,
        book_id,
        books (id, title)
      `)
      .eq('accession_no', accessionNo)
      .maybeSingle();

    if (copyError) throw copyError;

    if (!copy) {
      return res.status(404).json({
        success: false,
        message: `Physical copy with accession number "${accessionNo}" not found.`,
      });
    }

    // ── Safety: check for active transactions ─────────────────
    // If someone currently has this copy borrowed, don't allow
    // changing it to 'available' (it should stay 'borrowed' until returned).
    if (newStatus === 'available' && copy.status === 'borrowed') {
      const { data: activeTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('accession_no', accessionNo)
        .is('return_date', null)
        .maybeSingle();

      if (activeTx) {
        return res.status(409).json({
          success: false,
          message: `Cannot set to "available" — this copy has an active unreturned transaction (ID: ${activeTx.id}). Process the return first.`,
        });
      }
    }

    const oldStatus = copy.status;

    // ── Perform the update ────────────────────────────────────
    const { data: updatedCopy, error: updateError } = await supabase
      .from('physical_copies')
      .update({ status: newStatus })
      .eq('accession_no', accessionNo)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: `Copy "${accessionNo}" status changed: ${oldStatus} → ${newStatus}.`,
      physical_copy: updatedCopy,
      book_title: copy.books?.title || 'Unknown',
    });
  } catch (err) {
    console.error('Admin updateCopyStatus error:', err);
    res.status(500).json({ success: false, message: 'Failed to update copy status.' });
  }
}
