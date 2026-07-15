import supabase from '../supabase.js';

/**
 * Notification Service
 * Handles creating notifications for various user events
 */

/**
 * Create a notification for a user
 * @param {string} userId - The user to notify
 * @param {string} type - Notification type (e.g., 'borrow_success', 'due_soon', 'overdue_fine')
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} linkId - Optional: related transaction/book ID for navigation
 * @returns {Promise<object>} The created notification
 */
export async function createNotification(userId, type, title, message, linkId = null) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type: type,
        title: title,
        message: message,
        is_read: false,
        link_id: linkId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('createNotification error:', err);
    throw err;
  }
}

/**
 * Create a borrow success notification
 */
export async function notifyBorrowSuccess(userId, bookTitle, accessionNo, dueDate) {
  const dueDateStr = new Date(dueDate).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  return createNotification(
    userId,
    'borrow_success',
    'Checkout Successful',
    `You have borrowed "${bookTitle}". It is due on ${dueDateStr}.`,
    accessionNo
  );
}

/**
 * Create a due soon notification
 */
export async function notifyDueSoon(userId, bookTitle, accessionNo, dueDate) {
  const dueDateStr = new Date(dueDate).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  
  return createNotification(
    userId,
    'due_soon',
    'Book Due Tomorrow',
    `"${bookTitle}" is due tomorrow (${dueDateStr}). Please return it on time to avoid fines.`,
    accessionNo
  );
}

/**
 * Create an overdue fine notification
 */
export async function notifyOverdueFine(userId, bookTitle, accessionNo, daysOverdue, fineAmount) {
  return createNotification(
    userId,
    'overdue_fine',
    'Overdue Book - Fine Pending',
    `"${bookTitle}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. Current fine: ${fineAmount} kyats. Please return it as soon as possible.`,
    accessionNo
  );
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(userId, limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
  return true;
}
