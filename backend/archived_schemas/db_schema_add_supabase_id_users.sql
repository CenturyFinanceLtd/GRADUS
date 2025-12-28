-- Add supabase_id to users table for hybrid authentication
-- This allows linking Supabase auth users to existing user profiles

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS supabase_id UUID UNIQUE;

-- Create index for efficient lookups by Supabase ID
CREATE INDEX IF NOT EXISTS idx_users_supabase_id ON users(supabase_id);

-- Add comment
COMMENT ON COLUMN users.supabase_id IS 'Links to Supabase auth.users(id) for new authentication system';
