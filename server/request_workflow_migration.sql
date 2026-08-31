-- Migration: Add Circulation Request Workflow (Borrow Requests & Return Requests)
-- Run this in your Supabase project SQL Editor

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'borrowed',
ADD COLUMN IF NOT EXISTS borrow_request_notes TEXT,
ADD COLUMN IF NOT EXISTS borrow_duration_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS return_request_notes TEXT,
ADD COLUMN IF NOT EXISTS return_condition VARCHAR(50),
ADD COLUMN IF NOT EXISTS borrow_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS librarian_notes TEXT;

-- Update status of legacy unreturned transactions to 'borrowed'
UPDATE transactions 
SET status = 'borrowed' 
WHERE status IS NULL AND return_date IS NULL;

-- Update status of legacy returned transactions to 'returned'
UPDATE transactions 
SET status = 'returned' 
WHERE status IS NULL AND return_date IS NOT NULL;
