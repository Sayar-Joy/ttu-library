import supabase from '../supabase.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Admin Membership Controller
 * ────────────────────────────
 * Provides librarian endpoints for reviewing, approving, and rejecting
 * student library membership applications.
 *
 * All methods assume `verifyLibrarian` middleware has already run.
 */

// ============================================================
// 1. GET MEMBERSHIP APPLICATIONS
// ============================================================

/**
 * getMembershipApplications
 * Returns paginated student membership applications.
 *
 * Query params:
 *   ?status=pending|approved|rejected|none|all (default: 'pending')
 *   ?search=<name|email|roll_number>
 *   ?page=1&limit=25
 */
export async function getMembershipApplications(req, res) {
  try {
    const { status = 'pending', search, page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        student_id,
        roll_number,
        avatar_url,
        role,
        membership_status,
        phone,
        major,
        year,
        nrc,
        membership_applied_at,
        membership_approved_at,
        membership_rejected_reason,
        created_at
      `, { count: 'exact' })
      .eq('role', 'student')
      .order('membership_applied_at', { ascending: false, nullsFirst: false })
      .range(from, to);

    // Filter by status unless 'all'
    if (status && status !== 'all') {
      query = query.eq('membership_status', status);
    }

    // Search filter
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,student_id.ilike.%${search}%,roll_number.ilike.%${search}%`
      );
    }

    const { data: applications, error, count: totalCount } = await query;

    if (error) throw error;

    // Get count of pending applications for the dashboard badge
    const { count: pendingCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('membership_status', 'pending');

    res.json({
      success: true,
      count: applications.length,
      total: totalCount,
      pending_count: pendingCount || 0,
      page: pageNum,
      total_pages: Math.ceil(totalCount / pageSize),
      applications: applications || [],
    });
  } catch (err) {
    console.error('Admin getMembershipApplications error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch membership applications.' });
  }
}

// ============================================================
// 2. APPROVE MEMBERSHIP
// ============================================================

/**
 * approveMembership
 * Approves a student's membership application, enabling them to borrow books.
 */
export async function approveMembership(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, name, email, membership_status, roll_number, student_id')
      .eq('id', userId)
      .maybeSingle();

    if (findError) throw findError;

    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const now = new Date().toISOString();

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        membership_status: 'approved',
        membership_approved_at: now,
        membership_rejected_reason: null,
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Send notification to the student
    try {
      await createNotification(
        userId,
        'membership_approved',
        '🎉 Membership Approved!',
        'Your library membership application has been approved by the librarian. You can now borrow books!'
      );
    } catch (notifErr) {
      console.error('Failed to create approval notification:', notifErr);
    }

    res.json({
      success: true,
      message: `Membership approved for ${user.name} (${user.student_id || user.roll_number || user.email}).`,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Admin approveMembership error:', err);
    res.status(500).json({ success: false, message: 'Failed to approve membership.' });
  }
}

// ============================================================
// 3. REJECT MEMBERSHIP
// ============================================================

/**
 * rejectMembership
 * Rejects a student's membership application with an optional reason.
 */
export async function rejectMembership(req, res) {
  try {
    const { userId } = req.params;
    const { reason = 'Application details could not be verified.' } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, name, email, membership_status')
      .eq('id', userId)
      .maybeSingle();

    if (findError) throw findError;

    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        membership_status: 'rejected',
        membership_rejected_reason: reason,
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Send notification to the student
    try {
      await createNotification(
        userId,
        'membership_rejected',
        'Membership Application Update',
        `Your membership application was not approved. Reason: ${reason}. Please update your details in your profile.`
      );
    } catch (notifErr) {
      console.error('Failed to create rejection notification:', notifErr);
    }

    res.json({
      success: true,
      message: `Membership rejected for ${user.name}.`,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Admin rejectMembership error:', err);
    res.status(500).json({ success: false, message: 'Failed to reject membership.' });
  }
}
