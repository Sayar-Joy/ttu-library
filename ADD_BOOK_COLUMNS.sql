-- ═══════════════════════════════════════════════════════════
-- Migration: Add ALL new columns to books table
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- Batch 1: Category, review, dimensions (from previous migration)
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS review TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS total_pages INTEGER;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS size TEXT;

-- Batch 2: Publication origin & translation fields
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS place_of_publication TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_translated BOOLEAN DEFAULT false;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS original_title TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS original_author TEXT;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS translator TEXT;

-- Helper function for future migrations
CREATE OR REPLACE FUNCTION public.exec_ddl(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;
