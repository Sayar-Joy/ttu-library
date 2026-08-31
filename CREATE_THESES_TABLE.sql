-- ============================================================
-- TTU Library - Thesis Database Table Schema
-- ============================================================
-- Run this in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> + New Query -> Paste & Run

CREATE TABLE IF NOT EXISTS public.theses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    student_roll TEXT NOT NULL,
    major TEXT NOT NULL,
    year INTEGER NOT NULL,
    supervisor TEXT,
    abstract TEXT,
    category TEXT DEFAULT 'Thesis',
    pdf_url TEXT,
    preview_pdf_url TEXT,
    cover_url TEXT,
    total_pages INTEGER DEFAULT 10,
    preview_pages_count INTEGER DEFAULT 10,
    accession_no TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_theses_major ON public.theses(major);
CREATE INDEX IF NOT EXISTS idx_theses_year ON public.theses(year);
CREATE INDEX IF NOT EXISTS idx_theses_student_roll ON public.theses(student_roll);
