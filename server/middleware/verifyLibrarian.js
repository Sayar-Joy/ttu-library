import supabase from '../supabase.js';

/**
 * verifyLibrarian Middleware
 * ─────────────────────────
 * Guards admin/librarian-only routes with a two-step check:
 *
 * 1. Extract and verify the Supabase Auth JWT from the `Authorization: Bearer <token>` header.
 *    This gives us the authenticated user's UUID.
 *
 * 2. Look up that UUID in the `users` table and confirm `role === 'librarian'`.
 *    Students (or unknown users) are rejected with 403 Forbidden.
 *
 * On success, attaches the full user profile to `req.librarianUser` for
 * downstream controllers to use without a redundant DB lookup.
 */
export async function verifyLibrarian(req, res, next) {
  try {
    // ── Step 1: Extract Bearer token ───────────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Provide a valid Bearer token.',
      });
    }

    const token = authHeader.split(' ')[1];

    // ── Step 2: Verify token with Supabase Auth ────────────────
    // `getUser` validates the JWT and returns the auth user object.
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.',
      });
    }

    // ── Step 3: Check role in the `users` table ────────────────
    // The `users` table is the source of truth for RBAC roles,
    // not the Supabase Auth metadata (which the user could tamper with).
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, name, student_id, email, role')
      .eq('id', authUser.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(403).json({
        success: false,
        message: 'User profile not found. Access denied.',
      });
    }

    if (userProfile.role !== 'librarian') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Librarian access required.',
      });
    }

    // ── Attach verified librarian profile for controllers ──────
    req.librarianUser = userProfile;
    next();
  } catch (err) {
    console.error('verifyLibrarian middleware error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authorization.',
    });
  }
}

export default verifyLibrarian;
