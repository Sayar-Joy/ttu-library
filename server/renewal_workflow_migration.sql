-- Migration: Add Renewal Request Workflow (Renewal Requests & Approvals)
-- Run this in your Supabase project SQL Editor

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS renewal_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS renewal_request_notes TEXT,
ADD COLUMN IF NOT EXISTS renewal_duration_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS renewal_approved_at TIMESTAMPTZ;
