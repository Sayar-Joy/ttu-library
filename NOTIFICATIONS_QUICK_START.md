# 🔔 Notifications Quick Start Guide

## The Issue
The notifications table doesn't exist in your Supabase database yet.

## The Solution (1 Simple Step!)

### Run This SQL Command in Supabase

1. **Go to Supabase Dashboard**
   - Open: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Run This File**
   - Open the file: `CREATE_NOTIFICATIONS_TABLE.sql` (in your project root)
   - Copy ALL the content
   - Paste into Supabase SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Success!**
   - You should see: "Success. No rows returned"
   - The notifications table is now created with:
     - ✅ All required columns
     - ✅ Indexes for performance
     - ✅ Realtime enabled
     - ✅ Automatic timestamps

---

## What's Already Done ✅

**Backend (100% Complete)**
- ✅ Notification service functions
- ✅ Auto-creates notification when you borrow a book
- ✅ Cron jobs for due date reminders (runs daily at 8 AM)
- ✅ Cron jobs for overdue fines (50 kyats/day)
- ✅ API endpoints at `/api/notifications/*`

**Frontend (100% Complete)**
- ✅ Supabase client configured
- ✅ Real-time subscription hook
- ✅ Bell icon with unread count badge
- ✅ Browser alerts for new notifications
- ✅ Environment variables set

---

## Testing Your Notifications

### Test 1: Manual Notification (Quick Test)
After creating the table, test immediately by running this in Supabase SQL Editor:

```sql
-- Get your user ID first
SELECT id, name FROM users LIMIT 1;

-- Then insert a test notification (replace YOUR_USER_ID with actual ID)
INSERT INTO notifications (user_id, type, title, message)
VALUES (
  'YOUR_USER_ID',  -- Replace this!
  'test',
  'Test Notification',
  'If you see this, notifications are working!'
);
```

**Expected Result:**
- Browser alert pops up immediately: "📬 Test Notification"
- Bell icon shows red badge with "1"
- Console log: "🔔 New notification received"

### Test 2: Borrow a Book
1. Log in to your app
2. Find an available book
3. Click "Borrow" or "Checkout"
4. You'll get an instant notification!

### Test 3: Check Cron Jobs
- Cron jobs run automatically daily at 8:00 AM
- Check your server terminal - you should see:
  ```
  [CRON] ✅ Notification cron jobs initialized.
  [CRON] Daily notification checks scheduled for 08:00
  ```

---

## Troubleshooting

### "Error: relation 'notifications' does not exist"
→ You need to run the SQL file (Step 1 above)

### "No notifications appearing"
Check these in order:
1. **Did you run the SQL?** Check Supabase → Database → Tables. You should see "notifications" table.
2. **Is the server running?** Check terminal for cron initialization message
3. **Is the frontend running?** Check browser console for "✅ Subscribed to notifications"
4. **Environment variables loaded?** Restart dev server after adding VITE_ variables

### "Bell icon not showing badge"
- Open browser console (F12)
- Look for any errors
- Try borrowing a book to trigger a notification

### "Port 3001 already in use"
```bash
lsof -ti:3001 | xargs kill -9
npm start
```

---

## What Happens Next

Once the table is created:

1. **Immediate:** Borrow a book → Get instant notification
2. **Daily at 8 AM:** Get reminders for books due tomorrow  
3. **Daily at 8 AM:** Get overdue fine alerts (50 kyats/day)
4. **Real-time:** All notifications appear without page refresh
5. **Bell Badge:** Red circle shows unread count

---

## Files Reference

- `CREATE_NOTIFICATIONS_TABLE.sql` - **RUN THIS FIRST!**
- `NOTIFICATION_SYSTEM.md` - Complete technical documentation
- `NOTIFICATION_SETUP_STEPS.md` - Detailed setup guide
- `server/services/notificationService.js` - Backend notification functions
- `server/cron/notificationJobs.js` - Scheduled notification jobs
- `src/hooks/useNotifications.js` - Frontend real-time hook

---

## Summary

**To Do:** Run `CREATE_NOTIFICATIONS_TABLE.sql` in Supabase (1 minute)
**Already Done:** Everything else! Backend, frontend, cron jobs all ready.
**Result:** Full real-time notification system working instantly!

---

Need help? Check the detailed docs in `NOTIFICATION_SETUP_STEPS.md`
