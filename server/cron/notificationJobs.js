import cron from 'node-cron';
import supabase from '../supabase.js';
import { notifyDueSoon, notifyOverdueFine } from '../services/notificationService.js';
import { calculateFine } from '../services/transactionService.js';

/**
 * Scheduled Notification Jobs
 * Runs daily at 8:00 AM to send due date and overdue fine notifications
 */

/**
 * Check for books due tomorrow and send notifications
 */
async function checkDueSoonNotifications() {
  try {
    console.log('[CRON] Checking for books due tomorrow...');
    
    // Calculate tomorrow's date range (start and end of day)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);
    
    // Query active transactions where due_date is tomorrow
    const { data: dueSoonTransactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        users (id, name, email),
        physical_copies (
          accession_no,
          books (title)
        )
      `)
      .is('return_date', null)
      .gte('due_date', tomorrow.toISOString())
      .lte('due_date', tomorrowEnd.toISOString());
    
    if (error) {
      console.error('[CRON] Error fetching due soon transactions:', error);
      return;
    }
    
    if (!dueSoonTransactions || dueSoonTransactions.length === 0) {
      console.log('[CRON] No books due tomorrow.');
      return;
    }
    
    console.log(`[CRON] Found ${dueSoonTransactions.length} book(s) due tomorrow.`);
    
    // Send notification for each transaction
    for (const tx of dueSoonTransactions) {
      const userId = tx.user_id;
      const bookTitle = tx.physical_copies?.books?.title || 'Book';
      const accessionNo = tx.accession_no;
      const dueDate = tx.due_date;
      
      try {
        await notifyDueSoon(userId, bookTitle, accessionNo, dueDate);
        console.log(`[CRON] Sent due soon notification for user ${userId} - ${bookTitle}`);
      } catch (notifError) {
        console.error(`[CRON] Failed to send due soon notification for user ${userId}:`, notifError);
      }
    }
    
    console.log('[CRON] Due soon notifications completed.');
  } catch (err) {
    console.error('[CRON] Error in checkDueSoonNotifications:', err);
  }
}

/**
 * Check for overdue books and send fine notifications
 */
async function checkOverdueNotifications() {
  try {
    console.log('[CRON] Checking for overdue books...');
    
    const now = new Date();
    
    // Query active transactions where due_date is in the past
    const { data: overdueTransactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        users (id, name, email),
        physical_copies (
          accession_no,
          books (title)
        )
      `)
      .is('return_date', null)
      .lt('due_date', now.toISOString());
    
    if (error) {
      console.error('[CRON] Error fetching overdue transactions:', error);
      return;
    }
    
    if (!overdueTransactions || overdueTransactions.length === 0) {
      console.log('[CRON] No overdue books found.');
      return;
    }
    
    console.log(`[CRON] Found ${overdueTransactions.length} overdue book(s).`);
    
    // Send notification for each overdue transaction
    for (const tx of overdueTransactions) {
      const userId = tx.user_id;
      const bookTitle = tx.physical_copies?.books?.title || 'Book';
      const accessionNo = tx.accession_no;
      const dueDate = new Date(tx.due_date);
      
      // Calculate days overdue and fine amount
      const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
      const fineAmount = calculateFine(tx.due_date);
      
      try {
        await notifyOverdueFine(userId, bookTitle, accessionNo, daysOverdue, fineAmount);
        console.log(`[CRON] Sent overdue notification for user ${userId} - ${bookTitle} (${daysOverdue} days, ${fineAmount} kyats)`);
      } catch (notifError) {
        console.error(`[CRON] Failed to send overdue notification for user ${userId}:`, notifError);
      }
    }
    
    console.log('[CRON] Overdue notifications completed.');
  } catch (err) {
    console.error('[CRON] Error in checkOverdueNotifications:', err);
  }
}

/**
 * Run all notification checks
 */
async function runNotificationChecks() {
  console.log('[CRON] ========================================');
  console.log('[CRON] Running scheduled notification checks...');
  console.log('[CRON] Time:', new Date().toLocaleString('en-US', { timeZone: 'Asia/Rangoon' }));
  console.log('[CRON] ========================================');
  
  await checkDueSoonNotifications();
  await checkOverdueNotifications();
  
  console.log('[CRON] ========================================');
  console.log('[CRON] Notification checks completed.');
  console.log('[CRON] ========================================');
}

/**
 * Initialize and start cron jobs
 */
export function initNotificationCronJobs() {
  // Schedule job to run daily at 8:00 AM (Asia/Rangoon timezone)
  // Cron expression: '0 8 * * *' = minute 0, hour 8, every day
  const cronSchedule = '0 8 * * *';
  
  cron.schedule(cronSchedule, runNotificationChecks, {
    timezone: 'Asia/Rangoon'
  });
  
  console.log('[CRON] ✅ Notification cron jobs initialized.');
  console.log('[CRON] Schedule: Daily at 8:00 AM (Asia/Rangoon)');
  console.log('[CRON] Next run:', new Date(Date.now() + getMillisecondsUntilNext8AM()).toLocaleString('en-US', { timeZone: 'Asia/Rangoon' }));
  
  // Optional: Run checks immediately on startup (for testing)
  // Uncomment the line below to run notification checks when server starts
  // runNotificationChecks();
}

/**
 * Helper function to calculate time until next 8 AM
 */
function getMillisecondsUntilNext8AM() {
  const now = new Date();
  const next8AM = new Date();
  next8AM.setHours(8, 0, 0, 0);
  
  if (now.getHours() >= 8) {
    next8AM.setDate(next8AM.getDate() + 1);
  }
  
  return next8AM - now;
}

// Export the run function for manual testing
export { runNotificationChecks };
