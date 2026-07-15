import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './NotificationPage.css';
import { useNotifications } from '../hooks/useNotifications';

function NotificationPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('notifications');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  // Real-time notifications hook
  const { unreadCount } = useNotifications(userId, {
    enabled: !!userId,
    onNotification: (newNotification) => {
      // Add new notification to the list
      setNotifications(prev => [newNotification, ...prev]);
    }
  });

  const closeSidebar = () => setSidebarOpen(false);

  const handleNavClick = (id) => {
    setActiveNav(id);
    setSidebarOpen(false);
    if (id === 'bookshelf') navigate('/bookshelf');
    if (id === 'mybooks') navigate(`/mybooks/${userId}`);
    if (id === 'profile') navigate(`/profile/${userId}`);
    if (id === 'logout') navigate('/');
  };

  // Fetch notifications on mount
  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    fetchNotifications();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(`/api/notifications/${userId}/read-all`, {
        method: 'PATCH'
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true; // 'all'
  });

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {});

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'borrow_success':
        return '📚';
      case 'due_soon':
        return '⏰';
      case 'overdue_fine':
        return '💰';
      case 'return_success':
        return '✅';
      default:
        return '📬';
    }
  };

  const navItems = [
    { id: 'bookshelf', label: 'Bookshelf', icon: BookshelfIcon },
    { id: 'mybooks', label: 'My Books', icon: BooksIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'ai', label: 'OrionPax AI', icon: AIIcon },
    { id: 'profile', label: 'Profile', icon: ProfileIcon },
    { id: 'loan', label: 'Loan', icon: LoanIcon },
  ];

  const bottomNavItems = [
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'logout', label: 'Logout', icon: LogoutIcon },
  ];

  if (loading) {
    return (
      <div className="notification-page">
        <div className="notification-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="loading-spinner" style={{ textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E4E7EC" strokeWidth="3"/>
              <path d="M12 2a10 10 0 019.95 9" stroke="#366380" strokeWidth="3" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </path>
            </svg>
            <p style={{ marginTop: 16, color: '#43474D', fontSize: 14 }}>Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-page">
      <Sidebar activeNav={activeNav} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="notification-main-content">
        {/* Header */}
        <header className="bookshelf-header">
          <div className="header-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                {sidebarOpen ? (
                  <path d="M6 6L18 18M18 6L6 18" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/>
                ) : (
                  <>
                    <path d="M4 6H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M4 12H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M4 18H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/>
                  </>
                )}
              </svg>
            </button>
            <h1 className="page-title">Notifications</h1>
          </div>
          <div className="header-right">
            <button className="header-icon-btn">
              <HelpIcon />
            </button>
            <div className="header-avatar">
              <div className="avatar-circle">AS</div>
            </div>
          </div>
        </header>

        {/* Notification Content */}
        <div className="notification-content">
          {/* Filter Bar */}
          <div className="notification-filter-bar">
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({notifications.length})
              </button>
              <button
                className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                onClick={() => setFilter('unread')}
              >
                Unread ({notifications.filter(n => !n.is_read).length})
              </button>
              <button
                className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
                onClick={() => setFilter('read')}
              >
                Read ({notifications.filter(n => n.is_read).length})
              </button>
            </div>
            {unreadCount > 0 && (
              <button className="mark-all-read-btn" onClick={markAllAsRead}>
                <CheckAllIcon />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <div className="empty-notifications">
              <div className="empty-icon">🔔</div>
              <h3>No notifications</h3>
              <p>
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : filter === 'read'
                  ? "No read notifications yet."
                  : "You don't have any notifications yet."}
              </p>
            </div>
          ) : (
            <div className="notifications-list">
              {Object.entries(groupedNotifications).map(([date, notifs]) => (
                <div key={date} className="notification-group">
                  <h3 className="group-date">{date}</h3>
                  {notifs.map(notification => (
                    <div
                      key={notification.id}
                      className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <div className="notification-icon">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="notification-content-text">
                        <h4 className="notification-title">{notification.title}</h4>
                        <p className="notification-message">{notification.message}</p>
                        <span className="notification-time">
                          {new Date(notification.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                      <div className="notification-actions">
                        {!notification.is_read && (
                          <button
                            className="action-btn mark-read-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            title="Mark as read"
                          >
                            <CheckIcon />
                          </button>
                        )}
                        <button
                          className="action-btn delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* SVG Icons */
function BookshelfIcon() { return (<svg width="22" height="16" viewBox="0 0 22 16" fill="none"><rect x="1" y="1" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="13" y="1" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="1" y="9" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="13" y="9" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/></svg>); }
function BooksIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="6" height="14" rx="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><rect x="10" y="4" width="7" height="14" rx="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><line x1="6" y1="6" x2="6" y2="12" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/><line x1="13.5" y1="8" x2="13.5" y2="15" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/></svg>); }
function BellIcon() { return (<svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M6 4C6 3.44772 6.44772 3 7 3H9C9.55228 3 10 3.44772 10 4V4.5812C12.1682 5.03092 13.75 6.91008 13.75 9.16667V12.3206L15.2803 13.8509C15.4362 14.0068 15.504 14.2332 15.4493 14.4405C15.3946 14.6478 15.2275 14.7917 15.0243 14.7917H0.97566C0.772492 14.7917 0.605384 14.6478 0.550688 14.4405C0.496013 14.2332 0.563788 14.0068 0.71967 13.8509L2.25 12.3206V9.16667C2.25 6.91008 3.83185 5.03092 6 4.5812V4Z" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M6 17C6 17.5523 6.44772 18 7 18H9C9.55228 18 10 17.5523 10 17" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function AIIcon() { return (<svg width="22" height="19" viewBox="0 0 22 19" fill="none"><circle cx="11" cy="9.5" r="8.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M11 4V15M5 9.5H17" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="11" cy="9.5" r="2.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/></svg>); }
function ProfileIcon() { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="4.5" r="3.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M1.5 14.5C1.5 11.1863 4.41015 8.5 8 8.5C11.5899 8.5 14.5 11.1863 14.5 14.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function LoanIcon() { return (<svg width="19" height="21" viewBox="0 0 19 21" fill="none"><rect x="1" y="6" width="17" height="13" rx="2" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M5 1.5V4M14 1.5V4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="9" x2="18" y2="9" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/></svg>); }
function SettingsIcon() { return (<svg width="20.1" height="20" viewBox="0 0 21 20" fill="none"><circle cx="10.5" cy="10" r="3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M10.5 1.5V3.5M10.5 16.5V18.5M2 10H4M17 10H19M4.49 4.49L5.9 5.9M15.1 14.6L16.51 16.01M4.49 15.51L5.9 14.1M15.1 5.4L16.51 3.99" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function LogoutIcon() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 13L16 9L12 5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 9H7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function HelpIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="#485E78" strokeWidth="1.5"/><path d="M7.5 8C7.5 6.61929 8.61929 5.5 10 5.5C11.3807 5.5 12.5 6.61929 12.5 8C12.5 9.38071 11.3807 10.5 10 10.5V12" stroke="#485E78" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="14.5" r="0.75" fill="#485E78"/></svg>); }
function CheckAllIcon() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9L7 13L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>); }
function CheckIcon() { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8L6 11L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>); }
function TrashIcon() { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4H13M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M6 7V11M10 7V11M4 4H12V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>); }

export default NotificationPage;
