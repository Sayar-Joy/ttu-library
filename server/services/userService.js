import supabase from '../supabase.js';

/**
 * User Service
 * Handles all user-related database operations with Supabase
 */

export async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

export async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

export async function getUserByStudentId(studentId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('student_id', studentId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createUser(userData) {
  const userRecord = {
    name: userData.name,
    student_id: userData.student_id || null,
    roll_number: userData.roll_number || null,
    email: userData.email,
    avatar_url: userData.avatar_url || null,
    role: userData.role || 'student',
    membership_status: userData.membership_status || 'none',
    phone: userData.phone || null,
    major: userData.major || null,
    year: userData.year || null,
    nrc: userData.nrc || null,
    membership_applied_at: userData.membership_applied_at || null,
    membership_approved_at: userData.membership_approved_at || null,
    membership_rejected_reason: userData.membership_rejected_reason || null,
  };

  // If id is provided (from Supabase Auth), use it
  if (userData.id) {
    userRecord.id = userData.id;
  }

  const { data, error } = await supabase
    .from('users')
    .insert([userRecord])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Synchronize Google OAuth user:
 * Looks up user by ID or email. If not found, creates profile from OAuth data.
 * If found, updates name and avatar if provided.
 */
export async function syncOAuthUser(oauthData) {
  const { id, email, name, avatar_url } = oauthData;

  // Try finding by id first
  let user = await getUserById(id);

  // If not found by id, try finding by email
  if (!user && email) {
    user = await getUserByEmail(email);
  }

  if (!user) {
    // Generate initials fallback avatar
    const initials = name
      ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : '👤';
    // First time sign-up via Google OAuth
    user = await createUser({
      id,
      name: name || email.split('@')[0],
      email,
      avatar_url: avatar_url || null,
      role: 'student',
      membership_status: 'none'
    });
  } else {
    // Profile exists — update avatar if provided, but NEVER overwrite the student's real custom name with Google OAuth display name
    const updates = {};
    if (!user.avatar_url && avatar_url) updates.avatar_url = avatar_url;
    if (!user.name && name) updates.name = name;

    if (Object.keys(updates).length > 0) {
      user = await updateUser(user.id, updates);
    }
  }

  return user;
}

/**
 * Submit student library membership application
 */
export async function submitMembershipApplication(userId, appData) {
  const { name, roll_number, student_id, major, year, phone, nrc } = appData;

  const updates = {
    membership_status: 'pending',
    membership_applied_at: new Date().toISOString(),
    membership_rejected_reason: null, // Clear any previous rejection reason
  };

  if (name) updates.name = name.trim();
  if (roll_number) updates.roll_number = roll_number.trim();
  if (student_id || roll_number) updates.student_id = (student_id || roll_number).trim();
  if (major) updates.major = major.trim();
  if (year) updates.year = year.trim();
  if (phone) updates.phone = phone.trim();
  if (nrc) updates.nrc = nrc.trim();

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user membership status (Approve / Reject by Librarian)
 */
export async function updateMembershipStatus(userId, { status, rejectionReason = null }) {
  const updates = {
    membership_status: status,
  };

  if (status === 'approved') {
    updates.membership_approved_at = new Date().toISOString();
    updates.membership_rejected_reason = null;
  } else if (status === 'rejected') {
    updates.membership_rejected_reason = rejectionReason || 'Membership application was not approved.';
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUser(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getUserFavorites(userId) {
  // First, get the user's favorite book IDs
  const { data: favorites, error: favError } = await supabase
    .from('user_favorites')
    .select('book_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (favError) throw favError;
  if (!favorites || favorites.length === 0) return [];

  // Then, fetch the actual book details for those IDs
  const bookIds = favorites.map(fav => fav.book_id);
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('*')
    .in('id', bookIds);
  
  if (booksError) throw booksError;
  
  // Return books in the same order as favorites (most recent first)
  const bookMap = {};
  (books || []).forEach(book => { bookMap[book.id] = book; });
  return favorites.map(fav => bookMap[fav.book_id]).filter(Boolean);
}

export async function addFavorite(userId, bookId) {
  const { data, error } = await supabase
    .from('user_favorites')
    .insert([{ user_id: userId, book_id: bookId }])
    .select();
  
  if (error) throw error;
  return data;
}

export async function removeFavorite(userId, bookId) {
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('book_id', bookId);
  
  if (error) throw error;
  return true;
}

export async function isFavorite(userId, bookId) {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('user_id')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

export async function getUserFriends(userId) {
  const { data, error } = await supabase
    .from('user_friends')
    .select(`
      friend_id,
      friend:users!user_friends_friend_id_fkey (*)
    `)
    .eq('user_id', userId);
  
  if (error) throw error;
  return data.map(f => f.friend);
}
