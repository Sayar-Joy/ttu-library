import supabase from '../supabase.js';
import * as notificationService from '../services/notificationService.js';

/**
 * Admin User Management Controller
 * ─────────────────────────────────
 * Provides librarian-facing endpoints for managing user accounts and roles.
 * All methods assume the `verifyLibrarian` middleware has already run.
 */

// ============================================================
// 1. GET ALL USERS (with role filter and active borrow count)
// ============================================================

/**
 * getAllUsers
 * Fetches users with optional role filtering and includes the count
 * of their currently active (unreturned) transactions.
 *
 * Strategy:
 *   - Fetch users from `users` (filtered by role if specified).
 *   - For each user, count transactions where `return_date IS NULL`.
 *   - Also returns summary counts for students and librarians.
 */
export async function getAllUsers(req, res) {
  try {
    const { search, role, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    // ── Build base query ──────────────────────────────────────
    let query = supabase
      .from('users')
      .select(`
        id, name, student_id, roll_number, email, avatar_url, role, membership_status,
        phone, major, year, nrc, membership_applied_at, membership_approved_at, membership_rejected_reason, created_at,
        transactions (
          id,
          return_date
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // ── Role filter ───────────────────────────────────────────
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // ── Optional search filter (name, student_id, email) ───────
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,student_id.ilike.%${search}%,email.ilike.%${search}%,roll_number.ilike.%${search}%`
      );
    }

    const [
      { data: usersList, error, count: totalCount },
      { count: studentCount },
      { count: adminCount }
    ] = await Promise.all([
      query,
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'librarian'),
    ]);

    if (error) throw error;

    // ── Enrich each user with active_borrow_count ────────────
    const enrichedUsers = (usersList || []).map(user => {
      const activeBorrows = (user.transactions || [])
        .filter(tx => tx.return_date === null)
        .length;

      // Remove raw transactions array from the response for cleanliness
      const { transactions, ...profile } = user;

      return {
        ...profile,
        active_borrow_count: activeBorrows,
      };
    });

    res.json({
      success: true,
      count: enrichedUsers.length,
      total: totalCount || 0,
      student_count: studentCount || 0,
      admin_count: adminCount || 0,
      page: pageNum,
      total_pages: Math.ceil((totalCount || 0) / pageSize) || 1,
      users: enrichedUsers,
    });
  } catch (err) {
    console.error('Admin getAllUsers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
}

// ============================================================
// 2. GET USER DETAILS (single user with borrows & fines)
// ============================================================

/**
 * getUserDetails
 * Fetches a specific user's profile, their active (unreturned) borrowed
 * books with full book details, and any outstanding unpaid fines.
 */
export async function getUserDetails(req, res) {
  try {
    const { userId } = req.params;

    // ── Fetch user profile ─────────────────────────────────
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id, name, student_id, roll_number, email, avatar_url, role, membership_status,
        phone, major, year, nrc, membership_applied_at, membership_approved_at, membership_rejected_reason, created_at
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // ── Fetch active (unreturned) transactions with book info ─
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

// ============================================================
// 3. UPDATE USER ROLE (Upgrade to Admin / Revoke Admin)
// ============================================================

/**
 * updateUserRole
 * Allows a current librarian/admin to upgrade a user to librarian (admin)
 * or demote an administrator back to student status.
 *
 * Safeguards:
 *  - Disallow self-demotion (to avoid accidental admin lockout)
 *  - Disallow demoting the last remaining librarian
 *  - Update both DB profile and Supabase Auth metadata
 *  - Send automated in-app notification to the target user
 */
export async function updateUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const currentAdmin = req.librarianUser;

    // ── Validate role ──────────────────────────────────────────
    if (!role || !['student', 'librarian'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified. Role must be "student" or "librarian".',
      });
    }

    // ── Safeguard: Check target user exists ────────────────────
    const { data: targetUser, error: findError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', userId)
      .single();

    if (findError || !targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found.',
      });
    }

    // If role is already the requested role
    if (targetUser.role === role) {
      return res.json({
        success: true,
        message: `User is already configured as ${role === 'librarian' ? 'an Administrator' : 'a Student'}.`,
        user: targetUser,
      });
    }

    // ── Safeguard: Prevent self-demotion ───────────────────────
    if (currentAdmin && currentAdmin.id === userId && role !== 'librarian') {
      return res.status(400).json({
        success: false,
        message: 'You cannot revoke your own administrator privileges to prevent account lockout.',
      });
    }

    // ── Safeguard: Ensure at least one admin remains ───────────
    if (role === 'student' && targetUser.role === 'librarian') {
      const { count: librarianCount, error: countErr } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'librarian');

      if (!countErr && librarianCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the only remaining administrator in the system.',
        });
      }
    }

    // ── Update role in `users` table ───────────────────────────
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select(`
        id, name, student_id, roll_number, email, avatar_url, role, membership_status,
        phone, major, year, nrc, membership_applied_at, membership_approved_at, created_at
      `)
      .single();

    if (updateError) throw updateError;

    // ── Sync Supabase Auth user metadata ───────────────────────
    try {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role }
      });
    } catch (authErr) {
      console.warn('Note: Could not update Supabase Auth metadata (may be demo/external user):', authErr?.message || authErr);
    }

    // ── Send In-App Notification ───────────────────────────────
    try {
      if (role === 'librarian') {
        const adminName = currentAdmin?.name || 'an administrator';
        await notificationService.createNotification(
          userId,
          'role_upgrade',
          '🎉 Administrator Privileges Granted',
          `You have been promoted to Administrator / Librarian by ${adminName}. You now have full access to the Library Admin Management Panel.`
        );
      } else {
        await notificationService.createNotification(
          userId,
          'role_downgrade',
          'Account Role Updated',
          'Your account role has been updated to Student by the library administration.'
        );
      }
    } catch (notifErr) {
      console.error('Failed to create role change notification:', notifErr);
    }

    res.json({
      success: true,
      message: role === 'librarian'
        ? `Successfully upgraded ${updatedUser.name} to Administrator.`
        : `Successfully updated ${updatedUser.name}'s role to Student.`,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Admin updateUserRole error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update user role.',
    });
  }
}

