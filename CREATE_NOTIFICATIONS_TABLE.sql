-- ============================================
-- Create Notifications Table for Library Management System
-- Run this in Supabase SQL Editor
-- ============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_updated_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Enable Row Level Security (RLS)
-- NOTE: RLS is disabled by default because this app uses session-based auth
-- If you're using Supabase Auth, uncomment the RLS policies below
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Uncomment if using Supabase Auth):
-- CREATE POLICY "Users can view their own notifications"
--   ON notifications
--   FOR SELECT
--   USING (auth.uid() = user_id);

-- CREATE POLICY "Users can update their own notifications"
--   ON notifications
--   FOR UPDATE
--   USING (auth.uid() = user_id);

-- CREATE POLICY "Service role can insert notifications"
--   ON notifications
--   FOR INSERT
--   WITH CHECK (true);

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Notifications table created successfully!';
  RAISE NOTICE '✅ Indexes created for optimal performance';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Realtime enabled';
END $$;
