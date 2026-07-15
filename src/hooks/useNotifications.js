import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';

/**
 * useNotifications Hook
 * 
 * Subscribes to real-time notifications for the logged-in user
 * and triggers callbacks when new notifications arrive.
 * 
 * @param {string} userId - The current user's ID
 * @param {object} options - Configuration options
 * @param {function} options.onNotification - Callback fired when new notification arrives
 * @param {boolean} options.enabled - Whether to enable the subscription (default: true)
 * 
 * @returns {object} - Notifications state and helper functions
 * 
 * @example
 * ```jsx
 * const { notifications, unreadCount, refetch } = useNotifications(userId, {
 *   onNotification: (notification) => {
 *     toast.success(notification.title);
 *   }
 * });
 * ```
 */
export function useNotifications(userId, options = {}) {
  const {
    onNotification = null,
    enabled = true
  } = options;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use ref to store the latest callback without triggering re-subscriptions
  const onNotificationRef = useRef(onNotification);
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch notifications
      const { data: notificationData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (notifError) throw notifError;

      setNotifications(notificationData || []);

      // Fetch unread count
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (countError) throw countError;

      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!userId || !enabled) return;

    // Initial fetch
    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 New notification received:', payload.new);

          const newNotification = payload.new;

          // Update notifications list
          setNotifications((prev) => [newNotification, ...prev]);

          // Update unread count
          if (!newNotification.is_read) {
            setUnreadCount((prev) => prev + 1);
          }

          // Trigger callback if provided (use ref to get latest callback)
          if (onNotificationRef.current && typeof onNotificationRef.current === 'function') {
            onNotificationRef.current(newNotification);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Subscribed to notifications channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to notifications channel');
          setError('Failed to connect to notification service');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Notification subscription timed out');
          setError('Connection timed out');
        }
      });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up notification subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, enabled]); // Removed fetchNotifications and onNotification to prevent infinite loop

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));

      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );

      setUnreadCount(0);

      return true;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return false;
    }
  }, [userId]);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      // Update unread count if notification was unread
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      return true;
    } catch (err) {
      console.error('Error deleting notification:', err);
      return false;
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications
  };
}

export default useNotifications;
