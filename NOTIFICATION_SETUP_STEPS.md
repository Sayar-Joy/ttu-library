# 🔔 Complete Notification System Setup Guide

## Step-by-Step Instructions to Make Notifications Work

### ✅ STEP 1: Enable Realtime in Supabase Database

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste this SQL command:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see: "Success. No rows returned"

**Verify it worked:**
Run this query to check:
```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```
You should see `notifications` in the results.

---

### ✅ STEP 2: Environment Variables (ALREADY DONE ✓)

Your `.env` file now has the required variables:
```
VITE_SUPABASE_URL=https://zclgdoysycqatwgxtspm.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_fS7Oeucqq9bH98pDs7w0Pw_PMQpS-xE
```

**Note:** You MUST restart your dev server after adding these:
1. Stop the server (Ctrl+C)
2. Run `npm start` again

---

### ✅ STEP 3: Backend is Running (ALREADY DONE ✓)

Your server already has:
- ✅ Notification service (`server/services/notificationService.js`)
- ✅ Borrow notification trigger (creates notification on checkout)
- ✅ Cron jobs for due date and overdue alerts (runs daily at 8 AM)
- ✅ API routes (`/api/notifications/...`)

---

### ✅ STEP 4: Frontend Integration (DOING NOW)

I'm integrating the notification system into your BookshelfPage now...

---

## How to Test Notifications

### Test 1: Real-time Subscription
1. Open browser console (F12)
2. Log in and go to BookshelfPage
3. Look for: `✅ Subscribed to notifications channel`
4. This confirms the real-time listener is working

### Test 2: Create a Notification (Manual)
Open Supabase SQL Editor and run:
```sql
INSERT INTO notifications (user_id, type, title, message, is_read)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with your actual user ID
  'test',
  'Test Notification',
  'This is a test notification from SQL',
  false
);
```

You should immediately see:
- Console log: `🔔 New notification received:`
- Browser alert popup with the notification

### Test 3: Borrow a Book
1. Log in to your app
2. Find an available book
3. Click "Borrow" or "Checkout"
4. You should immediately receive a notification:
   - Title: "Checkout Successful"
   - Message: "You have borrowed [Book Title]. It is due in 7 days."

### Test 4: Check Cron Jobs
The cron jobs run daily at 8:00 AM. To test immediately:

**Option A:** Wait until 8 AM tomorrow
**Option B:** Manually trigger (for testing only):

1. Open `server/cron/notificationJobs.js`
2. Find line with: `// runNotificationChecks();`
3. Uncomment it: `runNotificationChecks();`
4. Restart the server
5. Check your notifications table in Supabase

---

## Troubleshooting

### Problem: "Notifications not appearing"

**Check 1:** Is Realtime enabled?
```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

**Check 2:** Are environment variables loaded?
- Open browser console
- Type: `import.meta.env.VITE_SUPABASE_URL`
- Should show your Supabase URL (not undefined)

**Check 3:** Is the server running?
- Check terminal for: `[CRON] ✅ Notification cron jobs initialized.`
- Check: `http://localhost:3001/api/health`

**Check 4:** Is user ID correct?
- Open browser console
- Type: `JSON.parse(sessionStorage.getItem('ttu_user'))`
- Check the `id` field

**Check 5:** Check browser console for errors
- Look for Supabase connection errors
- Look for "Failed to subscribe" messages

### Problem: "Port 3001 already in use"

Kill the process:
```bash
lsof -ti:3001 | xargs kill -9
```
Then restart: `npm start`

### Problem: "Favorite books disappearing"

This is unrelated to notifications. Check:
1. Is the favorites API working? Check Network tab in browser
2. Are there any errors in the browser console?
3. Check the MyBooksPage component for state management issues

---

## What Happens When Notifications Work

1. **On Borrow:** Immediately get a success notification
2. **Daily at 8 AM:** Get reminders for books due tomorrow
3. **Daily at 8 AM:** Get overdue fine notifications (50 kyats/day)
4. **Real-time:** All notifications appear instantly without refresh
5. **Bell Icon:** Shows unread count badge
6. **Browser Alert:** Popup alert when new notification arrives (you can customize this)

---

## Next Steps (Optional Enhancements)

Once basic notifications are working, you can enhance the system:

1. **Replace Browser Alert with Toast Notifications**
   - Install: `npm install react-toastify`
   - Use styled toast popups instead of browser alerts

2. **Create a Notification Center Page**
   - Full page to view all notifications
   - Mark as read, delete, etc.

3. **Add More Notification Types**
   - Book returned
   - Reservation ready
   - Book reservation reminder
   - Account updates

4. **Customize Notification Styles**
   - Different colors for different types
   - Icons for each notification type
   - Sound effects

---

## Files Created/Modified

**New Files:**
- `ENABLE_REALTIME.sql` - SQL to enable realtime
- `server/services/notificationService.js` - Notification helper functions
- `server/cron/notificationJobs.js` - Scheduled notification jobs
- `src/lib/supabase.js` - Frontend Supabase client
- `src/hooks/useNotifications.js` - React hook for notifications
- `NOTIFICATION_SYSTEM.md` - Complete documentation
- `NOTIFICATION_SETUP_STEPS.md` - This file!

**Modified Files:**
- `.env` - Added VITE_ prefixed variables
- `server/index.js` - Added notification routes and cron init
- `server/services/transactionService.js` - Added notification on borrow
- `src/pages/BookshelfPage.jsx` - Integrated notifications (being done now)

---

## Summary

✅ **Backend:** Complete and running (notifications are being created)
✅ **Database:** Needs Step 1 (run the SQL command)
✅ **Frontend:** Being integrated now
✅ **Environment:** Variables added

**You're almost there!** Just need to:
1. Run the SQL command in Supabase (Step 1)
2. Restart your dev server if you haven't
3. Test by borrowing a book
