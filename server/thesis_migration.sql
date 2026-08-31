-- ============================================================
-- TTU Library - Thesis System Migration
-- ============================================================
-- Run this SQL in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> + New Query -> Paste & Run

-- 1. Create the dedicated `theses` table
CREATE TABLE IF NOT EXISTS public.theses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,                -- Student Author Name(s)
    student_roll TEXT NOT NULL,          -- e.g. '5EC-14', '5IT-02'
    major TEXT NOT NULL,                 -- e.g. 'Information Technology', 'Electronic Communication'
    year INTEGER NOT NULL,               -- Academic / Submission Year (e.g. 2025)
    supervisor TEXT,                     -- Advisor / Supervisor Name
    abstract TEXT,                       -- Thesis Abstract / Summary
    category TEXT DEFAULT 'Thesis',
    pdf_url TEXT,                        -- Full PDF Storage URL
    preview_pdf_url TEXT,                -- Sliced 10-Page Preview PDF URL
    cover_url TEXT,                      -- Cover Image URL or styled thumbnail
    total_pages INTEGER DEFAULT 10,      -- Total page count of full thesis
    preview_pages_count INTEGER DEFAULT 10, -- Number of preview pages (up to 10)
    accession_no TEXT,                   -- Optional physical copy accession number
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Performance indexes for filtering and searching
CREATE INDEX IF NOT EXISTS idx_theses_major ON public.theses(major);
CREATE INDEX IF NOT EXISTS idx_theses_year ON public.theses(year);
CREATE INDEX IF NOT EXISTS idx_theses_student_roll ON public.theses(student_roll);

-- 3. Enable row level security (optional) & public read policy
ALTER TABLE public.theses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on theses"
ON public.theses FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated service role full access on theses"
ON public.theses FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
