# 🔔 Notification System Documentation

Complete notification system for the Library Management System with real-time updates, backend triggers, and scheduled cron jobs.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Task 1: Database Realtime Setup](#task-1-database-realtime-setup)
3. [Task 2: Backend Action-Driven Alert](#task-2-backend-action-driven-alert)
4. [Task 3: Time-Based Alerts (Cron Jobs)](#task-3-time-based-alerts-cron-jobs)
5. [Task 4: Frontend Realtime Listener](#task-4-frontend-realtime-listener)
6. [API Endpoints](#api-endpoints)
7. [Usage Examples](#usage-examples)
8. [Testing the System](#testing-the-system)

---

## Overview

The notification system consists of four main components:

1. **Database Realtime** - Supabase realtime subscription for instant updates
2. **Backend Triggers** - Notifications created on specific actions (e.g., book checkout)
3. **Scheduled Jobs** - Daily cron jobs for due date and overdue reminders
4. **Frontend Listener** - React hook that subscribes to real-time notifications

**Notification Types:**
- `borrow_success` - Sent immediately when a book is checked out
- `due_soon` - Sent daily at 8 AM for books due tomorrow
- `overdue_fine` - Sent daily at 8 AM for overdue books with fine calculations

---

## Task 1: Database Realtime Setup

### Step 1: Enable Realtime for Notifications Table

Run this SQL command in your **Supabase SQL Editor**:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

**Location:** `ENABLE_REALTIME.sql`

### How to Run:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the SQL from `ENABLE_REALTIME.sql`
5. Click **Run** or press `Ctrl/Cmd + Enter`

### Verify:

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

You should see the `notifications` table listed.

---

## Task 2: Backend Action-Driven Alert

### Implementation

When a user successfully borrows a book, a notification is automatically created.

**File:** `server/services/transactionService.js`

```javascript
import { notifyBorrowSuccess } from './notificationService.js';

// Inside borrowBook function, after transaction creation:
await notifyBorrowSuccess(
  userId,
  bookTitle,
  physicalCopy.accession_no,
  dueDate.toISOString()
);
```

### Notification Service

**File:** `server/services/notificationService.js`

Provides helper functions for creating different types of notifications:

- `createNotification(userId, type, title, message, linkId)`
- `notifyBorrowSuccess(userId, bookTitle, accessionNo, dueDate)`
- `notifyDueSoon(userId, bookTitle, accessionNo, dueDate)`
- `notifyOverdueFine(userId, bookTitle, accessionNo, daysOverdue, fineAmount)`
- `markNotificationAsRead(notificationId)`
- `markAllNotificationsAsRead(userId)`
- `getUserNotifications(userId, limit)`
- `getUnreadCount(userId)`
- `deleteNotification(notificationId)`

### Example: Creating a Custom Notification

```javascript
import { createNotification } from './services/notificationService.js';

await createNotification(
  userId,
  'custom_type',
  'Custom Title',
  'Custom message content',
  'optional-link-id'
);
```

---

## Task 3: Time-Based Alerts (Cron Jobs)

### Implementation

**File:** `server/cron/notificationJobs.js`

Runs daily at **8:00 AM (Asia/Rangoon timezone)** to check for:

1. **Books Due Tomorrow** - Sends reminder notifications
2. **Overdue Books** - Sends fine notifications with calculated amounts

### Features:

- **Due Soon Alerts:** Queries transactions where `due_date` is exactly tomorrow
- **Fine Alerts:** Queries overdue transactions and calculates fines (50 kyats/day)
- **Automatic Scheduling:** Runs at 8 AM daily using node-cron
- **Error Handling:** Graceful error handling with detailed logging

### Cron Schedule

```javascript
// Runs daily at 8:00 AM
const cronSchedule = '0 8 * * *';
```

### Manual Testing

To run notification checks manually (for testing):

```javascript
import { runNotificationChecks } from './server/cron/notificationJobs.js';

// Run checks immediately
await runNotificationChecks();
```

Or uncomment this line in `notificationJobs.js`:

```javascript
// runNotificationChecks(); // Uncomment to run on server startup
```

### Integration

The cron jobs are automatically initialized when the server starts:

**File:** `server/index.js`

```javascript
import { initNotificationCronJobs } from './cron/notificationJobs.js';

// In startServer function:
initNotificationCronJobs();
```

---

## Task 4: Frontend Realtime Listener

### Supabase Client Setup

**File:** `src/lib/supabase.js`

Creates a frontend Supabase client using the anon/public key:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### useNotifications Hook

**File:** `src/hooks/useNotifications.js`

A React hook that subscribes to real-time notifications for the logged-in user.

#### Features:

- ✅ Real-time subscription to notification INSERT events
- ✅ Automatic unread count updates
- ✅ Mark as read functionality
- ✅ Delete notifications
- ✅ Callback support for UI updates
- ✅ Automatic cleanup on unmount

#### Basic Usage:

```jsx
import { useNotifications } from '../hooks/useNotifications';

function MyComponent() {
  const userId = 'user-id-here';
  
  const { notifications, unreadCount, loading, markAsRead } = useNotifications(userId);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Notifications ({unreadCount} unread)</h2>
      {notifications.map(notif => (
        <div key={notif.id} onClick={() => markAsRead(notif.id)}>
          <h3>{notif.title}</h3>
          <p>{notif.message}</p>
        </div>
      ))}
    </div>
  );
}
```

#### Advanced Usage with Toast Notifications:

```jsx
import { useNotifications } from '../hooks/useNotifications';

function App() {
  const userId = localStorage.getItem('userId');
  
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(
    userId,
    {
      onNotification: (notification) => {
        // Show toast notification
        showToast(notification.title, notification.message);
        
        // Play sound
        playNotificationSound();
        
        // Update bell icon badge
        updateBellBadge(unreadCount + 1);
      }
    }
  );

  return (
    <div>
      <BellIcon count={unreadCount} />
      <NotificationList notifications={notifications} onRead={markAsRead} />
    </div>
  );
}
```

#### Hook API:

```typescript
useNotifications(userId: string, options?: {
  onNotification?: (notification: Notification) => void,
  enabled?: boolean
})

Returns: {
  notifications: Notification[],
  unreadCount: number,
  loading: boolean,
  error: string | null,
  markAsRead: (notificationId: string) => Promise<boolean>,
  markAllAsRead: () => Promise<boolean>,
  deleteNotification: (notificationId: string) => Promise<boolean>,
  refetch: () => Promise<void>
}
```

---

## API Endpoints

### Get User Notifications

```http
GET /api/notifications/:userId
```

Returns all notifications for a user (limit 50, sorted by created_at desc).

### Get Unread Count

```http
GET /api/notifications/:userId/unread-count
```

Returns the count of unread notifications.

### Mark as Read

```http
PATCH /api/notifications/:notificationId/read
```

Marks a single notification as read.

### Mark All as Read

```http
PATCH /api/notifications/:userId/read-all
```

Marks all notifications as read for a user.

### Delete Notification

```http
DELETE /api/notifications/:notificationId
```

Deletes a notification.

---

## Usage Examples

### Example 1: Notification Bell Icon

```jsx
import { useNotifications } from '../hooks/useNotifications';

function NotificationBell({ userId }) {
  const { unreadCount, notifications, markAsRead } = useNotifications(userId);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="notification-bell">
      <button onClick={() => setShowDropdown(!showDropdown)}>
        🔔
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>
      
      {showDropdown && (
        <div className="notification-dropdown">
          {notifications.slice(0, 5).map(notif => (
            <div 
              key={notif.id}
              className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
              onClick={() => markAsRead(notif.id)}
            >
              <h4>{notif.title}</h4>
              <p>{notif.message}</p>
              <span className="time">{formatTime(notif.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Example 2: Toast Notifications

```jsx
import { useNotifications } from '../hooks/useNotifications';
import { toast } from 'react-toastify';

function AppWithToasts() {
  const userId = localStorage.getItem('userId');
  
  useNotifications(userId, {
    onNotification: (notification) => {
      // Show different toast styles based on notification type
      if (notification.type === 'borrow_success') {
        toast.success(notification.message, {
          position: 'top-right',
          autoClose: 5000,
        });
      } else if (notification.type === 'overdue_fine') {
        toast.error(notification.message, {
          position: 'top-right',
          autoClose: false, // Don't auto-close overdue alerts
        });
      } else if (notification.type === 'due_soon') {
        toast.warning(notification.message, {
          position: 'top-right',
          autoClose: 8000,
        });
      }
    }
  });

  return <YourApp />;
}
```

### Example 3: Notification Center Page

```jsx
import { useNotifications } from '../hooks/useNotifications';

function NotificationCenter({ userId }) {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications(userId);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="notification-center">
      <div className="header">
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead}>
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <p>No notifications yet.</p>
        ) : (
          notifications.map(notif => (
            <div 
              key={notif.id}
              className={`notification-card ${!notif.is_read ? 'unread' : ''}`}
            >
              <div className="notification-content">
                <h3>{notif.title}</h3>
                <p>{notif.message}</p>
                <span className="time">
                  {new Date(notif.created_at).toLocaleString()}
                </span>
              </div>
              <div className="notification-actions">
                {!notif.is_read && (
                  <button onClick={() => markAsRead(notif.id)}>
                    Mark as read
                  </button>
                )}
                <button onClick={() => deleteNotification(notif.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## Testing the System

### 1. Test Database Realtime

Run the SQL command and verify the table is in the publication:

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

### 2. Test Backend Notification on Borrow

1. Start the server: `npm run server`
2. Borrow a book via API: `POST /api/transactions/borrow`
3. Check notifications table: `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1;`
4. Verify a `borrow_success` notification was created

### 3. Test Cron Jobs

**Option A: Wait for 8 AM**
- Cron jobs run automatically at 8:00 AM daily

**Option B: Manual Test**
In `server/cron/notificationJobs.js`, uncomment:

```javascript
// runNotificationChecks(); // Run on server startup
```

Then restart the server to trigger the checks immediately.

**Option C: Adjust Cron Schedule**
For testing, change the schedule to run every minute:

```javascript
const cronSchedule = '* * * * *'; // Every minute
```

### 4. Test Frontend Realtime

1. Start both server and frontend: `npm start`
2. Open browser console
3. Log in with a user
4. Trigger a notification (borrow a book or wait for cron)
5. Watch console for: `🔔 New notification received:`
6. Verify UI updates automatically

### 5. Test with Multiple Browsers

1. Open two browser windows
2. Log in as the same user in both
3. Trigger a notification in one window
4. Verify both windows receive the real-time update

---

## 🎉 System Complete!

All four tasks are fully implemented and documented:

✅ **Task 1:** Database Realtime enabled via SQL  
✅ **Task 2:** Backend notifications on book borrow  
✅ **Task 3:** Scheduled cron jobs for due/overdue alerts  
✅ **Task 4:** Frontend React hook with real-time subscriptions  

The notification system is production-ready with error handling, cleanup, and comprehensive documentation.
