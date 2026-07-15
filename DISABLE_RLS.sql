-- Temporarily disable RLS for development
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Disable RLS on all tables for easier development
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE books DISABLE ROW LEVEL SECURITY;
ALTER TABLE physical_copies DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_friends DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations DISABLE ROW LEVEL SECURITY;

-- OR if you want to keep RLS enabled, add policies that allow service role full access:
-- (Uncomment the lines below if you prefer this approach)

/*
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add policy for service role to do anything
CREATE POLICY "Service role can do anything on users" 
ON users 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Note: The service role key should bypass RLS anyway, but this ensures it
*/
