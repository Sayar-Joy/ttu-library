import supabase from '../supabase.js';

/**
 * Admin User Management Controller
 * ─────────────────────────────────
 * Provides librarian-facing endpoints for managing student accounts.
 * All methods assume the `verifyLibrarian` middleware has already run.
 */

// ============================================================
// 1. GET ALL USERS (students only, with active borrow count)
// ============================================================

/**
 * getAllUsers
 * Fetches every user with role = 'student' and includes the count
 * of their currently active (unreturned) transactions.
 *
 * Strategy:
 *   - Fetch students from `users`.
 *   - For each student, count transactions where `return_date IS NULL`.
 *   - We use a single query with an embedded count via the Supabase
 *     relationship to `transactions`, then compute counts in JS.
 */
export async function getAllUsers(req, res) {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    // ── Build base query ──────────────────────────────────────
    // Join the `transactions` table to pull active borrows inline.
    // Supabase PostgREST embeds related rows via foreign-key relationships.
    let query = supabase
      .from('users')
      .select(`
        id, name, student_id, roll_number, email, avatar_url, role, created_at,
        transactions (
          id,
          return_date
        )
      `, { count: 'exact' })
      .eq('role', 'student')
      .order('created_at', { ascending: false })
      .range(from, to);

    // ── Optional search filter (name or student_id) ───────────
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,student_id.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data: students, error, count: totalCount } = await query;

    if (error) throw error;

    // ── Enrich each student with active_borrow_count ──────────
    // Active transactions = transactions where return_date IS NULL.
    const enrichedStudents = students.map(student => {
      const activeBorrows = (student.transactions || [])
        .filter(tx => tx.return_date === null)
        .length;

      // Remove raw transactions array from the response for cleanliness
      const { transactions, ...profile } = student;

      return {
        ...profile,
        active_borrow_count: activeBorrows,
      };
    });

    res.json({
      success: true,
      count: enrichedStudents.length,
      total: totalCount,
      page: pageNum,
      total_pages: Math.ceil(totalCount / pageSize),
      users: enrichedStudents,
    });
  } catch (err) {
    console.error('Admin getAllUsers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
}

// ============================================================
// 2. GET USER DETAILS (single student with borrows & fines)
// ============================================================

/**
 * getUserDetails
 * Fetches a specific student's profile, their active (unreturned) borrowed
 * books with full book details, and any outstanding unpaid fines.
 *
 * Relational joins:
 *   transactions → physical_copies → books
 *   This three-level join is necessary because transactions reference
 *   `accession_no` (a physical copy), and we need the book metadata
 *   (title, author) from the parent `books` table.
 */
export async function getUserDetails(req, res) {
  try {
    const { userId } = req.params;

    // ── Fetch student profile ─────────────────────────────────
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, student_id, roll_number, email, avatar_url, role, created_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'This endpoint is for viewing student details only.',
      });
    }

    // ── Fetch active (unreturned) transactions with book info ─
    // Join path: transactions → physical_copies → books
    // This gives us the accession_no, copy status, and full
    // bibliographic details (title, author, isbn) in one query.
    const { data: activeTransactions, error: txError } = await supabase
      .from('transactions')
      .select(`
        id,
        accession_no,
        borrow_date,
        due_date,
        progress_percentage,
        physical_copies (
          accession_no,
          status,
          books (
            id, title, author, isbn, cover_url
          )
        )
      `)
      .eq('user_id', userId)
      .is('return_date', null)
      .order('due_date', { ascending: true });

    if (txError) throw txError;

    // ── Enrich active borrows with overdue status ─────────────
    const now = new Date();
    const activeBorrows = (activeTransactions || []).map(tx => {
      const dueDate = new Date(tx.due_date);
      const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      const isOverdue = daysRemaining < 0;
      const currentFine = isOverdue
        ? Math.abs(daysRemaining) * 50 // 50 kyats/day
        : 0;

      return {
        transaction_id: tx.id,
        accession_no: tx.accession_no,
        borrow_date: tx.borrow_date,
        due_date: tx.due_date,
        days_remaining: daysRemaining,
        is_overdue: isOverdue,
        current_fine: currentFine,
        progress_percentage: tx.progress_percentage,
        book: tx.physical_copies?.books || null,
      };
    });

    // ── Fetch outstanding unpaid fines ────────────────────────
    // These come from RETURNED books that were overdue.
    // (Active overdue books have dynamic fines shown above.)
    const { data: unpaidFines, error: fineError } = await supabase
      .from('transactions')
      .select(`
        id,
        accession_no,
        borrow_date,
        due_date,
        return_date,
        final_fine_amount,
        fine_status,
        physical_copies (
          accession_no,
          books (
            id, title, author
          )
        )
      `)
      .eq('user_id', userId)
      .eq('fine_status', 'unpaid');

    if (fineError) throw fineError;

    const fines = (unpaidFines || []).map(tx => ({
      transaction_id: tx.id,
      accession_no: tx.accession_no,
      book_title: tx.physical_copies?.books?.title || 'Unknown',
      borrow_date: tx.borrow_date,
      due_date: tx.due_date,
      return_date: tx.return_date,
      fine_amount: tx.final_fine_amount,
    }));

    const totalUnpaidFines = fines.reduce((sum, f) => sum + (f.fine_amount || 0), 0);

    res.json({
      success: true,
      user,
      active_borrows: activeBorrows,
      active_borrow_count: activeBorrows.length,
      unpaid_fines: fines,
      total_unpaid_fine_amount: totalUnpaidFines,
    });
  } catch (err) {
    console.error('Admin getUserDetails error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user details.' });
  }
}
