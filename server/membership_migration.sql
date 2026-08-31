-- ============================================================
-- TTU Library - Membership System Migration
-- ============================================================
-- Run this SQL query in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> + New Query -> Paste & Run

-- 1. Add membership and student detail columns to the `users` table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS membership_status TEXT CHECK (membership_status IN ('none', 'pending', 'approved', 'rejected')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS major TEXT,
ADD COLUMN IF NOT EXISTS year TEXT,
ADD COLUMN IF NOT EXISTS nrc TEXT,
ADD COLUMN IF NOT EXISTS membership_applied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS membership_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS membership_rejected_reason TEXT;

-- 2. Index for quick filtering by membership status in admin panel
CREATE INDEX IF NOT EXISTS idx_users_membership_status ON users(membership_status);

-- 3. Optional: Set any existing demo users with complete student_id as approved members
UPDATE users 
SET membership_status = 'approved',
    membership_approved_at = NOW()
WHERE student_id IS NOT NULL AND role = 'student' AND (membership_status IS NULL OR membership_status = 'none');
