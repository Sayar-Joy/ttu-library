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
    student_id: userData.student_id,
    roll_number: userData.roll_number,
    email: userData.email,
    avatar_url: userData.avatar_url,
    role: userData.role || 'student'
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
