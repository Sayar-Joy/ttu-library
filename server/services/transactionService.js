import supabase from '../supabase.js';
import { getAvailableCopy, updatePhysicalCopyStatus, getPhysicalCopy } from './bookService.js';
import { notifyBorrowSuccess, createNotification } from './notificationService.js';

/**
 * Transaction Service
 * Handles borrowing/returning requests, approvals, and fine calculations:
 * - Student Borrow Requests & Librarian Approval
 * - Student Return Requests & Librarian Verification
 * - 7-day loan period default
 * - 50 kyats/day fine for overdue books
 */

const LOAN_PERIOD_DAYS = 7;
const FINE_PER_DAY = 50; // kyats

// ============================================================
// FINE CALCULATION
// ============================================================

/**
 * Calculate fine for an active transaction
 * Returns 0 if not overdue, otherwise 50 kyats per day overdue
 */
export function calculateFine(dueDate) {
  if (!dueDate) return 0;
  const now = new Date();
  const due = new Date(dueDate);
  
  if (now <= due) {
    return 0; // Not overdue
  }
  
  const daysOverdue = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
  return daysOverdue * FINE_PER_DAY;
}

/**
 * Calculate days remaining until due date
 * Negative values indicate overdue days
 */
export function calculateDaysRemaining(dueDate) {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

// ============================================================
// BORROW REQUEST (Student Side)
// ============================================================

/**
 * Student submits a request to borrow a book
 */
export async function requestBorrowBook(userId, bookId, { notes = '', durationDays = 7, preferredAccessionNo = null, studentRealName = '' } = {}) {
  // ── 1. If student provided real name, update in user record ─
  if (studentRealName && studentRealName.trim()) {
    try {
      await supabase
        .from('users')
        .update({ name: studentRealName.trim() })
        .eq('id', userId);
    } catch (nameErr) {
      console.warn('Could not update user real name:', nameErr);
    }
  }

  // ── 2. Verify user membership status ───────────────────────
  const { data: userProfile, error: userError } = await supabase
    .from('users')
    .select('id, name, role, membership_status')
    .eq('id', userId)
    .single();

  if (userError || !userProfile) {
    throw new Error('User profile not found. Please log in again.');
  }

  if (userProfile.role !== 'librarian' && userProfile.membership_status !== 'approved') {
    if (userProfile.membership_status === 'pending') {
      throw new Error('Your library membership application is currently under review by the librarian.');
    } else if (userProfile.membership_status === 'rejected') {
      throw new Error('Your library membership application was not approved. Please update your application in your profile.');
    } else {
      throw new Error('You must have an approved library membership before submitting borrow requests.');
    }
  }

  // ── 3. Check for physical copy availability ────────────────
  let physicalCopy;
  if (preferredAccessionNo) {
    physicalCopy = await getPhysicalCopy(preferredAccessionNo);
    if (!physicalCopy || physicalCopy.book_id !== bookId) {
      throw new Error('Preferred physical copy not found for this book.');
    }
    if (physicalCopy.status !== 'available') {
      throw new Error(`This copy is currently ${physicalCopy.status}.`);
    }
  } else {
    physicalCopy = await getAvailableCopy(bookId);
    if (!physicalCopy) {
      throw new Error('No physical copies are currently available for this book.');
    }
  }

  // ── 4. Check for existing active borrow or pending request ─
  const { data: existingActive } = await supabase
    .from('transactions')
    .select('id, status, return_date')
    .eq('user_id', userId)
    .eq('accession_no', physicalCopy.accession_no)
    .is('return_date', null)
    .maybeSingle();

  if (existingActive) {
    if (existingActive.status === 'borrow_requested') {
      throw new Error('You already have a pending borrow request for this book.');
    } else {
      throw new Error('You currently have an active borrowed copy of this book.');
    }
  }

  // ── 5. Create transaction in 'borrow_requested' status ─────
  const requestedDays = parseInt(durationDays, 10) || LOAN_PERIOD_DAYS;
  const insertPayload = {
    user_id: userId,
    accession_no: physicalCopy.accession_no,
    status: 'borrow_requested',
    borrow_request_notes: notes || null,
    borrow_duration_days: requestedDays,
    borrow_requested_at: new Date().toISOString(),
    fine_status: 'no_fine',
    final_fine_amount: 0,
    progress_percentage: 0
  };

  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert([insertPayload])
    .select(`
      *,
      physical_copies (
        accession_no,
        status,
        books (*)
      )
    `)
    .single();

  if (txError) throw txError;

  // ── 5. Create confirmation notification for student ────────
  try {
    const bookTitle = transaction.physical_copies?.books?.title || 'Book';
    await createNotification(
      userId,
      'borrow_requested',
      'Borrow Request Submitted',
      `Your request to borrow "${bookTitle}" has been submitted and is awaiting librarian approval.`
    );
  } catch (notifErr) {
    console.error('Failed to dispatch borrow request notification:', notifErr);
  }

  return {
    ...transaction,
    book: transaction.physical_copies?.books
  };
}

/**
 * Direct Instant Borrow (For Librarian testing or direct counter checkout)
 */
export async function borrowBook(userId, bookId, accessionNo = null) {
  // ── Verify user membership status ──────────────────────────
  const { data: userProfile, error: userError } = await supabase
    .from('users')
    .select('id, name, role, membership_status')
    .eq('id', userId)
    .single();

  if (userError || !userProfile) {
    throw new Error('User profile not found. Please log in again.');
  }

  if (userProfile.role !== 'librarian' && userProfile.membership_status !== 'approved') {
    throw new Error('Approved library membership is required to borrow books.');
  }

  let physicalCopy;
  if (accessionNo) {
    physicalCopy = await getPhysicalCopy(accessionNo);
    if (!physicalCopy || physicalCopy.book_id !== bookId) {
      throw new Error('Physical copy not found or does not match book.');
    }
  } else {
    physicalCopy = await getAvailableCopy(bookId);
    if (!physicalCopy) {
      throw new Error('No copies available for this book.');
    }
  }

  const borrowDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);

  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert([{
      user_id: userId,
      accession_no: physicalCopy.accession_no,
      status: 'borrowed',
      borrow_date: borrowDate.toISOString(),
      due_date: dueDate.toISOString(),
      borrow_duration_days: LOAN_PERIOD_DAYS,
      fine_status: 'no_fine',
      final_fine_amount: 0,
      progress_percentage: 0
    }])
    .select()
    .single();

  if (txError) throw txError;

  await updatePhysicalCopyStatus(physicalCopy.accession_no, 'borrowed');

  const { data: bookDetails } = await supabase
    .from('physical_copies')
    .select('books(title)')
    .eq('accession_no', physicalCopy.accession_no)
    .single();

  const bookTitle = bookDetails?.books?.title || 'Book';

  try {
    await notifyBorrowSuccess(
      userId,
      bookTitle,
      physicalCopy.accession_no,
      dueDate.toISOString()
    );
  } catch (notifError) {
    console.error('Failed to create borrow notification:', notifError);
  }

  return transaction;
}

// ============================================================
// LIBRARIAN BORROW APPROVAL & REJECTION
// ============================================================

/**
 * Librarian approves a pending borrow request
 */
export async function approveBorrowRequest(transactionId, { accessionNo = null, durationDays = null, librarianNotes = '' } = {}) {
  const { data: tx, error: fetchErr } = await supabase
    .from('transactions')
    .select(`
      *,
      users (id, name, email),
      physical_copies (
        accession_no,
        status,
        books (*)
      )
    `)
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) {
    throw new Error('Borrow request transaction not found.');
  }

  if (tx.status === 'borrowed') {
    throw new Error('This request has already been approved.');
  }

  const targetAccessionNo = accessionNo || tx.accession_no;
  const loanDays = durationDays || tx.borrow_duration_days || LOAN_PERIOD_DAYS;

  const borrowDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + loanDays);

  // Update physical copy to borrowed
  await updatePhysicalCopyStatus(targetAccessionNo, 'borrowed');

  // Update transaction to 'borrowed'
  const { data: updatedTx, error: updateErr } = await supabase
    .from('transactions')
    .update({
      accession_no: targetAccessionNo,
      status: 'borrowed',
      borrow_date: borrowDate.toISOString(),
      due_date: dueDate.toISOString(),
      librarian_notes: librarianNotes || null,
      fine_status: 'no_fine',
      final_fine_amount: 0
    })
    .eq('id', transactionId)
    .select(`
      *,
      users (id, name, email),
      physical_copies (
        accession_no,
        status,
        books (*)
      )
    `)
    .single();

  if (updateErr) throw updateErr;

  // Send student notification
  try {
    const bookTitle = tx.physical_copies?.books?.title || 'your requested book';
    await createNotification(
      tx.user_id,
      'borrow_approved',
      'Borrow Request Approved! 📚',
      `Your borrow request for "${bookTitle}" has been approved. Please collect copy (${targetAccessionNo}) from the library desk. Due date: ${dueDate.toLocaleDateString()}.`
    );
  } catch (notifErr) {
    console.error('Notification dispatch error:', notifErr);
  }

  return {
    ...updatedTx,
    book: updatedTx.physical_copies?.books
  };
}

/**
 * Librarian rejects a pending borrow request
 */
export async function rejectBorrowRequest(transactionId, { reason = 'Request could not be fulfilled at this time.' } = {}) {
  const { data: tx, error: fetchErr } = await supabase
    .from('transactions')
    .select(`
      *,
      physical_copies (books (*))
    `)
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) {
    throw new Error('Borrow request not found.');
  }

  const { data: updatedTx, error: updateErr } = await supabase
    .from('transactions')
    .update({
      status: 'rejected',
      librarian_notes: reason,
      return_date: new Date().toISOString()
    })
    .eq('id', transactionId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  try {
    const bookTitle = tx.physical_copies?.books?.title || 'your requested book';
    await createNotification(
      tx.user_id,
      'borrow_rejected',
      'Borrow Request Not Approved',
      `Your request to borrow "${bookTitle}" was not approved. Note: ${reason}`
    );
  } catch (notifErr) {
    console.error('Notification dispatch error:', notifErr);
  }

  return updatedTx;
}

// ============================================================
// RETURN REQUEST (Student Side)
// ============================================================

/**
 * Student submits a request to return a borrowed book
 */
export async function requestReturnBook(transactionId, { returnCondition = 'good', notes = '' } = {}) {
  const { data: tx, error: fetchErr } = await supabase
    .from('transactions')
    .select(`
      *,
      physical_copies (
        accession_no,
        books (*)
      )
    `)
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) {
    throw new Error('Transaction not found.');
  }

  if (tx.return_date || tx.status === 'returned') {
    throw new Error('This book has already been marked as returned.');
  }

  if (tx.status === 'return_requested') {
    throw new Error('You have already submitted a return request for this book. Awaiting librarian verification.');
  }

  const { data: updatedTx, error: updateErr } = await supabase
    .from('transactions')
    .update({
      status: 'return_requested',
      return_requested_at: new Date().toISOString(),
      return_condition: returnCondition,
      return_request_notes: notes || null
    })
    .eq('id', transactionId)
    .select(`
      *,
      physical_copies (
        accession_no,
        status,
        books (*)
      )
    `)
    .single();

  if (updateErr) throw updateErr;

  try {
    const bookTitle = tx.physical_copies?.books?.title || 'Book';
    await createNotification(
      tx.user_id,
      'return_requested',
      'Return Request Submitted',
      `Return request submitted for "${bookTitle}". Please drop off the physical copy at the circulation desk for inspection.`
    );
  } catch (notifErr) {
    console.error('Notification error:', notifErr);
  }

  return {
    ...updatedTx,
    book: updatedTx.physical_copies?.books
  };
}

// ============================================================
// LIBRARIAN RETURN VERIFICATION & APPROVAL
// ============================================================

/**
 * Librarian approves return, calculates overdue fines, and marks copy available
 */
export async function approveReturnRequest(transactionId, { conditionRemark = '' } = {}) {
  const { data: tx, error: fetchErr } = await supabase
    .from('transactions')
    .select(`
      *,
      physical_copies (
        accession_no,
        status,
        books (*)
      )
    `)
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) throw new Error('Transaction not found.');
  if (tx.return_date) throw new Error('Book already returned.');

  // Calculate overdue fine if past due date
  const fine = calculateFine(tx.due_date);
  const fineStatus = fine > 0 ? 'unpaid' : 'no_fine';

  const { data: updatedTx, error: updateErr } = await supabase
    .from('transactions')
    .update({
      status: 'returned',
      return_date: new Date().toISOString(),
      final_fine_amount: fine,
      fine_status: fineStatus,
      librarian_notes: conditionRemark || tx.librarian_notes || null
    })
    .eq('id', transactionId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Make physical copy available again
  await updatePhysicalCopyStatus(tx.accession_no, 'available');

  try {
    const bookTitle = tx.physical_copies?.books?.title || 'Book';
    const fineMsg = fine > 0 ? ` (Overdue Fine: ${fine} kyats)` : '';
    await createNotification(
      tx.user_id,
      'return_approved',
      'Return Verified ✓',
      `Your return of "${bookTitle}" has been inspected and confirmed by the librarian${fineMsg}. Thank you!`
    );
  } catch (notifErr) {
    console.error('Notification error:', notifErr);
  }

  return updatedTx;
}

/**
 * Librarian rejects return request (e.g. Physical copy not received)
 */
export async function rejectReturnRequest(transactionId, { reason = 'Book copy was not received at the desk.' } = {}) {
  const { data: tx, error: fetchErr } = await supabase
    .from('transactions')
    .select(`
      *,
      physical_copies (books (*))
    `)
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) throw new Error('Transaction not found.');

  const { data: updatedTx, error: updateErr } = await supabase
    .from('transactions')
    .update({
      status: 'borrowed',
      librarian_notes: reason
    })
    .eq('id', transactionId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  try {
    const bookTitle = tx.physical_copies?.books?.title || 'Book';
    await createNotification(
      tx.user_id,
      'return_rejected',
      'Return Request Not Verified ⚠️',
      `The return request for "${bookTitle}" could not be confirmed: ${reason}. Please visit the circulation desk.`
    );
  } catch (notifErr) {
    console.error('Notification error:', notifErr);
  }

  return updatedTx;
}

/**
 * Return by accession number (Counter Quick Return)
 */
export async function returnBook(transactionId) {
  return approveReturnRequest(transactionId);
}

// ============================================================
// MARK FINE AS PAID
// ============================================================

export async function markFineAsPaid(transactionId) {
  const { data, error } = await supabase
    .from('transactions')
    .update({ fine_status: 'paid' })
    .eq('id', transactionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================================
// GET TRANSACTIONS & REQUESTS
// ============================================================

/**
 * Get all active borrowed books for a user
 */
export async function getActiveTransactions(userId) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        users (id, name, email, avatar_url),
        physical_copies (
          accession_no,
          status,
          books (*)
        )
      `)
      .eq('user_id', userId)
      .is('return_date', null)
      .order('due_date', { ascending: true, nullsFirst: false });
    
    if (error) throw error;
    
    return (data || [])
      .filter(tx => tx.status !== 'rejected' && tx.status !== 'borrow_requested')
      .map(tx => {
        const isOverdue = calculateDaysRemaining(tx.due_date) < 0;
        const computedStatus = tx.status === 'return_requested' ? 'return_requested' : (isOverdue ? 'overdue' : 'active');
        
        return {
          ...tx,
          status: computedStatus,
          raw_status: tx.status,
          current_fine: calculateFine(tx.due_date),
          days_remaining: calculateDaysRemaining(tx.due_date),
          is_overdue: isOverdue,
          book: tx.physical_copies?.books
        };
      });
  } catch (err) {
    console.error('Error fetching active transactions:', err);
    return [];
  }
}

/**
 * Get all student's borrow & return requests
 */
export async function getStudentRequests(userId) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        physical_copies (
          accession_no,
          status,
          books (*)
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.warn('Student requests query notice:', error.message);
      return [];
    }

    return (data || []).map(tx => ({
      ...tx,
      book: tx.physical_copies?.books
    }));
  } catch (err) {
    console.error('Error fetching student requests:', err);
    return [];
  }
}

/**
 * Get transaction history for a user (returned books)
 */
export async function getTransactionHistory(userId, limit = 50) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      users (id, name, email, avatar_url),
      physical_copies (
        accession_no,
        status,
        books (*)
      )
    `)
    .eq('user_id', userId)
    .not('return_date', 'is', null)
    .order('return_date', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
  
  return (data || []).map(tx => ({
    ...tx,
    book: tx.physical_copies?.books
  }));
}

/**
 * Get all transactions for a user
 */
export async function getAllTransactions(userId) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      users (id, name, email, avatar_url),
      physical_copies (
        accession_no,
        status,
        books (*)
      )
    `)
    .eq('user_id', userId)
    .order('borrow_date', { ascending: false });
  
  if (error) throw error;
  
  return data.map(tx => {
    const isOverdue = tx.return_date ? false : (calculateDaysRemaining(tx.due_date) < 0);
    let displayStatus = tx.status || (tx.return_date ? 'returned' : (isOverdue ? 'overdue' : 'active'));
    if (displayStatus === 'borrowed') {
      displayStatus = isOverdue ? 'overdue' : 'active';
    }
    
    return {
      ...tx,
      status: displayStatus,
      current_fine: tx.return_date ? tx.final_fine_amount : calculateFine(tx.due_date),
      days_remaining: tx.return_date ? null : calculateDaysRemaining(tx.due_date),
      is_overdue: isOverdue,
      book: tx.physical_copies?.books
    };
  });
}

/**
 * Get single transaction with all details
 */
export async function getTransactionById(transactionId) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      users (id, name, email, avatar_url, student_id),
      physical_copies (
        accession_no,
        status,
        books (*)
      )
    `)
    .eq('id', transactionId)
    .single();
  
  if (error) throw error;
  
  return {
    ...data,
    current_fine: data.return_date ? data.final_fine_amount : calculateFine(data.due_date),
    days_remaining: data.return_date ? null : calculateDaysRemaining(data.due_date),
    is_overdue: data.return_date ? false : calculateDaysRemaining(data.due_date) < 0,
    book: data.physical_copies?.books
  };
}

export async function updateProgress(transactionId, progressPercentage) {
  if (progressPercentage < 0 || progressPercentage > 100) {
    throw new Error('Progress must be between 0 and 100');
  }
  
  const { data, error } = await supabase
    .from('transactions')
    .update({ progress_percentage: progressPercentage })
    .eq('id', transactionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getUserStats(userId) {
  try {
    const { count: activeCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('return_date', null);
    
    const { count: totalCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    const activeTransactions = await getActiveTransactions(userId);
    const overdueCount = activeTransactions.filter(tx => tx.is_overdue).length;
    
    const { data: fines } = await supabase
      .from('transactions')
      .select('final_fine_amount')
      .eq('user_id', userId)
      .eq('fine_status', 'unpaid');
    
    const totalFines = fines?.reduce((sum, tx) => sum + (tx.final_fine_amount || 0), 0) || 0;
    
    return {
      active_borrows: activeCount || 0,
      total_borrows: totalCount || 0,
      overdue_count: overdueCount,
      unpaid_fines: totalFines
    };
  } catch (err) {
    console.error('Error in getUserStats:', err);
    return {
      active_borrows: 0,
      total_borrows: 0,
      overdue_count: 0,
      unpaid_fines: 0
    };
  }
}
