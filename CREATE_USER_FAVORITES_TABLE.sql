-- ============================================================
-- Create user_favorites table for saving favorite books
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure user can't favorite the same book twice
  UNIQUE(user_id, book_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_book_id ON user_favorites(book_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at DESC);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies (users can only manage their own favorites)
CREATE POLICY "Users can view their own favorites"
  ON user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_favorites TO authenticated;
GRANT ALL ON user_favorites TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ user_favorites table created successfully!';
  RAISE NOTICE '👉 You can now save and unsave books.';
END $$;
