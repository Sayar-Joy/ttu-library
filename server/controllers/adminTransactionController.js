import supabase from '../supabase.js';

/**
 * Admin Transaction & Fine Management Controller
 * ────────────────────────────────────────────────
 * Handles checkout-desk operations for librarians:
 *   - Processing book returns (by accession number)
 *   - Marking fines as paid
 *
 * Fine policy: 50 kyats per day overdue.
 *
 * All methods assume the `verifyLibrarian` middleware has already run.
 */

const FINE_PER_DAY = 50; // kyats

// ============================================================
// 1. PROCESS RETURN (by accession number)
// ============================================================

/**
 * processReturn
 * The librarian scans/enters an accession number at the return desk.
 * This controller:
 *   1. Finds the active (unreturned) transaction for this accession_no.
 *   2. Sets return_date to NOW().
 *   3. Calculates overdue fine (50 kyats/day if past due_date).
 *   4. Updates the physical_copies status back to 'available'.
 *
 * Error handling:
 *   - 404 if no active transaction exists (book wasn't borrowed or already returned).
 *   - 400 if accession_no is missing.
 *
 * Relational join:
 *   transactions → physical_copies → books
 *   Used to return book details (title, author) in the response
 *   so the librarian sees what was returned.
 */
export async function processReturn(req, res) {
  try {
    const { accessionNo } = req.params;

    if (!accessionNo) {
      return res.status(400).json({
        success: false,
        message: 'Accession number is required.',
      });
    }

    // ── Step 1: Find the active transaction for this copy ─────
    // An "active" transaction is one where return_date IS NULL,
    // meaning the book hasn't been returned yet.
    const { data: activeTransaction, error: txFindError } = await supabase
      .from('transactions')
      .select(`
        id,
        user_id,
        accession_no,
        borrow_date,
        due_date,
        return_date,
        fine_status,
        final_fine_amount,
        users (
          id, name, student_id, email
        ),
        physical_copies (
          accession_no,
          status,
          book_id,
          books (
            id, title, author, isbn
          )
        )
      `)
      .eq('accession_no', accessionNo)
      .is('return_date', null)
      .maybeSingle();

    if (txFindError) throw txFindError;

    if (!activeTransaction) {
      return res.status(404).json({
        success: false,
        message: `No active borrow found for accession number "${accessionNo}". The book may not be currently borrowed or has already been returned.`,
      });
    }

    // ── Step 2: Calculate overdue fine ─────────────────────────
    const now = new Date();
    const dueDate = new Date(activeTransaction.due_date);
    let fineAmount = 0;
    let fineStatus = 'no_fine';
    let daysOverdue = 0;

    if (now > dueDate) {
      // Book is overdue — calculate days and fine
      daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
      fineAmount = daysOverdue * FINE_PER_DAY;
      fineStatus = 'unpaid';
    }

    // ── Step 3: Update the transaction record ─────────────────
    const { data: updatedTransaction, error: txUpdateError } = await supabase
      .from('transactions')
      .update({
        return_date: now.toISOString(),
        final_fine_amount: fineAmount,
        fine_status: fineStatus,
      })
      .eq('id', activeTransaction.id)
      .select()
      .single();

    if (txUpdateError) throw txUpdateError;

    // ── Step 4: Update physical copy status to 'available' ────
    const { error: copyUpdateError } = await supabase
      .from('physical_copies')
      .update({ status: 'available' })
      .eq('accession_no', accessionNo);

    if (copyUpdateError) throw copyUpdateError;

    // ── Build a rich response for the librarian ───────────────
    const bookInfo = activeTransaction.physical_copies?.books;
    const userInfo = activeTransaction.users;

    res.json({
      success: true,
      message: fineAmount > 0
        ? `Return processed. "${bookInfo?.title}" is ${daysOverdue} day(s) overdue. Fine: ${fineAmount} kyats.`
        : `Return processed. "${bookInfo?.title}" returned on time. No fine.`,
      transaction: {
        id: updatedTransaction.id,
        accession_no: accessionNo,
        borrow_date: activeTransaction.borrow_date,
        due_date: activeTransaction.due_date,
        return_date: updatedTransaction.return_date,
        days_overdue: daysOverdue,
        fine_amount: fineAmount,
        fine_status: fineStatus,
      },
      book: bookInfo
        ? { id: bookInfo.id, title: bookInfo.title, author: bookInfo.author, isbn: bookInfo.isbn }
        : null,
      borrower: userInfo
        ? { id: userInfo.id, name: userInfo.name, student_id: userInfo.student_id, email: userInfo.email }
        : null,
    });
  } catch (err) {
    console.error('Admin processReturn error:', err);
    res.status(500).json({ success: false, message: 'Failed to process return.' });
  }
}

// ============================================================
// 2. MARK FINE AS PAID
// ============================================================

/**
 * markFinePaid
 * Updates a specific transaction's fine_status from 'unpaid' to 'paid'.
 *
 * Validates:
 *   - Transaction exists
 *   - Transaction actually has an unpaid fine (prevents double-paying
 *     or paying a fine that doesn't exist)
 */
export async function markFinePaid(req, res) {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required.',
      });
    }

    // ── Fetch the transaction to verify it has an unpaid fine ──
    const { data: transaction, error: txFindError } = await supabase
      .from('transactions')
      .select(`
        id,
        user_id,
        accession_no,
        fine_status,
        final_fine_amount,
        users (
          id, name, student_id
        ),
        physical_copies (
          books (
            id, title
          )
        )
      `)
      .eq('id', transactionId)
      .maybeSingle();

    if (txFindError) throw txFindError;

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: `Transaction "${transactionId}" not found.`,
      });
    }

    // ── Guard: only unpaid fines can be marked as paid ────────
    if (transaction.fine_status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This fine has already been marked as paid.',
      });
    }

    if (transaction.fine_status === 'no_fine' || transaction.final_fine_amount === 0) {
      return res.status(400).json({
        success: false,
        message: 'This transaction has no fine to pay.',
      });
    }

    // ── Update fine_status to 'paid' ──────────────────────────
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({ fine_status: 'paid' })
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError) throw updateError;

    const bookTitle = transaction.physical_copies?.books?.title || 'Unknown';
    const borrowerName = transaction.users?.name || 'Unknown';

    res.json({
      success: true,
      message: `Fine of ${transaction.final_fine_amount} kyats marked as paid for "${bookTitle}" (Borrower: ${borrowerName}).`,
      transaction: {
        id: updatedTransaction.id,
        accession_no: updatedTransaction.accession_no,
        fine_amount: updatedTransaction.final_fine_amount,
        fine_status: updatedTransaction.fine_status,
        book_title: bookTitle,
        borrower_name: borrowerName,
      },
    });
  } catch (err) {
    console.error('Admin markFinePaid error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark fine as paid.' });
  }
}
