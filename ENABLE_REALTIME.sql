-- ============================================================
-- TASK 1: Enable Supabase Realtime for notifications table
-- ============================================================
-- Run this SQL in the Supabase SQL Editor to enable real-time 
-- listening for the notifications table.
--
-- This adds the 'notifications' table to the supabase_realtime 
-- publication, allowing frontend clients to subscribe to INSERT, 
-- UPDATE, and DELETE events on this table.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Optional: Verify the publication includes notifications
-- Run this to check:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
