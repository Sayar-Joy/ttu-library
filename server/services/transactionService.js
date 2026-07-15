import supabase from '../supabase.js';
import { getAvailableCopy, updatePhysicalCopyStatus, getPhysicalCopy } from './bookService.js';
import { notifyBorrowSuccess } from './notificationService.js';

/**
 * Transaction Service
 * Handles borrowing/returning with the new fine system:
 * - 7-day loan period
 * - 50 kyats/day fine for overdue books
 * - Fines calculated dynamically, saved on return
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
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

// ============================================================
// BORROW BOOK
// ============================================================

/**
 * Borrow a specific physical copy or find an available one
 */
export async function borrowBook(userId, bookId, accessionNo = null) {
  // Find physical copy to borrow
  let physicalCopy;
  
  if (accessionNo) {
    // Borrow specific copy
    physicalCopy = await getPhysicalCopy(accessionNo);
    if (!physicalCopy || physicalCopy.book_id !== bookId) {
      throw new Error('Physical copy not found or does not match book');
    }
    if (physicalCopy.status !== 'available') {
      throw new Error(`This copy is ${physicalCopy.status}, not available`);
    }
  } else {
    // Find any available copy
    physicalCopy = await getAvailableCopy(bookId);
    if (!physicalCopy) {
      throw new Error('No copies available for this book');
    }
  }
  
  // Check if user already has an active borrow of this accession_no
  const { data: existingTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('accession_no', physicalCopy.accession_no)
    .is('return_date', null)
    .single();
  
  if (existingTx) {
    throw new Error('You already have this copy borrowed');
  }
  
  // Create transaction
  const borrowDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);
  
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert([{
      user_id: userId,
      accession_no: physicalCopy.accession_no,
      borrow_date: borrowDate.toISOString(),
      due_date: dueDate.toISOString(),
      fine_status: 'no_fine',
      final_fine_amount: 0,
      progress_percentage: 0
    }])
    .select()
    .single();
  
  if (txError) throw txError;
  
  // Update physical copy status to borrowed
  await updatePhysicalCopyStatus(physicalCopy.accession_no, 'borrowed');
  
  // Create notification for successful borrow
  // Fetch book details to get the title
  const { data: bookDetails } = await supabase
    .from('physical_copies')
    .select('books(title)')
    .eq('accession_no', physicalCopy.accession_no)
    .single();
  
  const bookTitle = bookDetails?.books?.title || 'Book';
  
  // Send notification (non-blocking - don't fail transaction if notification fails)
  try {
    await notifyBorrowSuccess(
      userId,
      bookTitle,
      physicalCopy.accession_no,
      dueDate.toISOString()
    );
  } catch (notifError) {
    console.error('Failed to create borrow notification:', notifError);
    // Don't throw - notification failure shouldn't break the transaction
  }
  
  return transaction;
}

// ============================================================
// RETURN BOOK
// ============================================================

/**
 * Return a borrowed book and calculate final fine if overdue
 */
export async function returnBook(transactionId) {
  // Get transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();
  
  if (txError) throw txError;
  if (!transaction) throw new Error('Transaction not found');
  if (transaction.return_date) throw new Error('Book already returned');
  
  // Calculate final fine
  const fine = calculateFine(transaction.due_date);
  const fineStatus = fine > 0 ? 'unpaid' : 'no_fine';
  
  // Update transaction
  const { data: updatedTx, error: updateError } = await supabase
    .from('transactions')
    .update({
      return_date: new Date().toISOString(),
      final_fine_amount: fine,
      fine_status: fineStatus
    })
    .eq('id', transactionId)
    .select()
    .single();
  
  if (updateError) throw updateError;
  
  // Update physical copy status back to available
  await updatePhysicalCopyStatus(transaction.accession_no, 'available');
  
  return updatedTx;
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
// GET TRANSACTIONS
// ============================================================

/**
 * Get all active transactions for a user (not returned)
 */
export async function getActiveTransactions(userId) {
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
    .order('due_date', { ascending: true });
  
  if (error) throw error;
  
  // Enrich with calculated fields
  return data.map(tx => {
    const isOverdue = calculateDaysRemaining(tx.due_date) < 0;
    const status = isOverdue ? 'overdue' : 'active';
    
    return {
      ...tx,
      status,
      current_fine: calculateFine(tx.due_date),
      days_remaining: calculateDaysRemaining(tx.due_date),
      is_overdue: isOverdue,
      book: tx.physical_copies?.books
    };
  });
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
  
  if (error) throw error;
  
  return data.map(tx => ({
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
    const isOverdue = tx.return_date ? false : calculateDaysRemaining(tx.due_date) < 0;
    const status = tx.return_date ? 'returned' : (isOverdue ? 'overdue' : 'active');
    
    return {
      ...tx,
      status,
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

// ============================================================
// UPDATE TRANSACTION
// ============================================================

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

// ============================================================
// STATISTICS
// ============================================================

/**
 * Get user borrowing statistics
 */
export async function getUserStats(userId) {
  // Active borrows
  const { count: activeCount, error: activeError } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('return_date', null);
  
  if (activeError) throw activeError;
  
  // Total borrows
  const { count: totalCount, error: totalError } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (totalError) throw totalError;
  
  // Overdue books
  const activeTransactions = await getActiveTransactions(userId);
  const overdueCount = activeTransactions.filter(tx => tx.is_overdue).length;
  
  // Total unpaid fines
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
}
