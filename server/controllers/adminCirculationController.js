import supabase from '../supabase.js';
import * as transactionService from '../services/transactionService.js';

/**
 * Admin Circulation Controller
 * Handles Librarian review for Borrow Requests and Return Requests
 */

/**
 * GET /api/admin/requests/borrow
 * List pending/all borrow requests
 */
export async function getBorrowRequests(req, res) {
  try {
    const { status = 'borrow_requested', search = '', page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 15);
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('transactions')
      .select(`
        id,
        user_id,
        accession_no,
        status,
        borrow_date,
        due_date,
        return_date,
        borrow_request_notes,
        borrow_duration_days,
        borrow_requested_at,
        librarian_notes,
        fine_status,
        final_fine_amount,
        users (id, name, email, avatar_url, student_id, roll_number, major, year, phone),
        physical_copies (
          accession_no,
          status,
          books (id, title, author, isbn, cover_url, category)
        )
      `, { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('borrow_requested_at', { ascending: false, nullsFirst: false }).range(from, to);

    const { data: requests, error, count: totalCount } = await query;
    if (error) throw error;

    // Also get total pending count for badge
    const { count: pendingCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'borrow_requested');

    const formattedRequests = (requests || []).map(r => ({
      id: r.id,
      user_id: r.user_id,
      student: r.users || {},
      accession_no: r.accession_no,
      status: r.status || 'borrow_requested',
      borrow_date: r.borrow_date,
      due_date: r.due_date,
      borrow_request_notes: r.borrow_request_notes,
      borrow_duration_days: r.borrow_duration_days || 7,
      borrow_requested_at: r.borrow_requested_at,
      librarian_notes: r.librarian_notes,
      book: r.physical_copies?.books || {},
      copy_status: r.physical_copies?.status
    }));

    // Filter in-memory if search is applied
    let filtered = formattedRequests;
    if (search) {
      const q = search.toLowerCase();
      filtered = formattedRequests.filter(r => 
        r.student?.name?.toLowerCase().includes(q) ||
        r.student?.email?.toLowerCase().includes(q) ||
        r.student?.roll_number?.toLowerCase().includes(q) ||
        r.student?.student_id?.toLowerCase().includes(q) ||
        r.book?.title?.toLowerCase().includes(q) ||
        r.accession_no?.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      requests: filtered,
      total: totalCount || 0,
      total_pages: Math.ceil((totalCount || 0) / pageSize),
      page: pageNum,
      pending_count: pendingCount || 0
    });
  } catch (err) {
    console.error('Error fetching borrow requests:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch borrow requests.' });
  }
}

/**
 * PATCH /api/admin/requests/borrow/:txId/approve
 */
export async function approveBorrowRequest(req, res) {
  try {
    const { txId } = req.params;
    const { accessionNo, durationDays, librarianNotes } = req.body;

    const updatedTx = await transactionService.approveBorrowRequest(txId, {
      accessionNo,
      durationDays,
      librarianNotes
    });

    res.json({
      success: true,
      message: 'Borrow request approved successfully.',
      transaction: updatedTx
    });
  } catch (err) {
    console.error('Error approving borrow request:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to approve borrow request.' });
  }
}

/**
 * PATCH /api/admin/requests/borrow/:txId/reject
 */
export async function rejectBorrowRequest(req, res) {
  try {
    const { txId } = req.params;
    const { reason } = req.body;

    const updatedTx = await transactionService.rejectBorrowRequest(txId, { reason });

    res.json({
      success: true,
      message: 'Borrow request rejected.',
      transaction: updatedTx
    });
  } catch (err) {
    console.error('Error rejecting borrow request:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to reject borrow request.' });
  }
}

/**
 * GET /api/admin/requests/return
 * List pending/all return requests
 */
export async function getReturnRequests(req, res) {
  try {
    const { status = 'return_requested', search = '', page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 15);
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('transactions')
      .select(`
        id,
        user_id,
        accession_no,
        status,
        borrow_date,
        due_date,
        return_date,
        return_condition,
        return_request_notes,
        return_requested_at,
        librarian_notes,
        fine_status,
        final_fine_amount,
        users (id, name, email, avatar_url, student_id, roll_number, major, year, phone),
        physical_copies (
          accession_no,
          status,
          books (id, title, author, isbn, cover_url, category)
        )
      `, { count: 'exact' });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('return_requested_at', { ascending: false, nullsFirst: false }).range(from, to);

    const { data: requests, error, count: totalCount } = await query;
    if (error) throw error;

    const { count: pendingCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'return_requested');

    const formatted = (requests || []).map(r => {
      const isOverdue = transactionService.calculateDaysRemaining(r.due_date) < 0;
      const currentFine = transactionService.calculateFine(r.due_date);

      return {
        id: r.id,
        user_id: r.user_id,
        student: r.users || {},
        accession_no: r.accession_no,
        status: r.status,
        borrow_date: r.borrow_date,
        due_date: r.due_date,
        return_date: r.return_date,
        return_condition: r.return_condition || 'good',
        return_request_notes: r.return_request_notes,
        return_requested_at: r.return_requested_at,
        librarian_notes: r.librarian_notes,
        is_overdue: isOverdue,
        current_fine: currentFine,
        days_remaining: transactionService.calculateDaysRemaining(r.due_date),
        book: r.physical_copies?.books || {}
      };
    });

    let filtered = formatted;
    if (search) {
      const q = search.toLowerCase();
      filtered = formatted.filter(r => 
        r.student?.name?.toLowerCase().includes(q) ||
        r.student?.email?.toLowerCase().includes(q) ||
        r.student?.roll_number?.toLowerCase().includes(q) ||
        r.book?.title?.toLowerCase().includes(q) ||
        r.accession_no?.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      requests: filtered,
      total: totalCount || 0,
      total_pages: Math.ceil((totalCount || 0) / pageSize),
      page: pageNum,
      pending_count: pendingCount || 0
    });
  } catch (err) {
    console.error('Error fetching return requests:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch return requests.' });
  }
}

/**
 * PATCH /api/admin/requests/return/:txId/approve
 */
export async function approveReturnRequest(req, res) {
  try {
    const { txId } = req.params;
    const { conditionRemark } = req.body;

    const updatedTx = await transactionService.approveReturnRequest(txId, { conditionRemark });

    res.json({
      success: true,
      message: 'Book return verified and completed.',
      transaction: updatedTx
    });
  } catch (err) {
    console.error('Error approving return request:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to verify return request.' });
  }
}

/**
 * PATCH /api/admin/requests/return/:txId/reject
 */
export async function rejectReturnRequest(req, res) {
  try {
    const { txId } = req.params;
    const { reason } = req.body;

    const updatedTx = await transactionService.rejectReturnRequest(txId, { reason });

    res.json({
      success: true,
      message: 'Return request rejected.',
      transaction: updatedTx
    });
  } catch (err) {
    console.error('Error rejecting return request:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to reject return request.' });
  }
}
