-- Add supabase_id to admin_users table for hybrid authentication
-- This allows linking Supabase auth users to admin profiles

ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS supabase_id UUID UNIQUE;

-- Create index for efficient lookups by Supabase ID
CREATE INDEX IF NOT EXISTS idx_admin_users_supabase_id ON admin_users(supabase_id);

-- Add comment
COMMENT ON COLUMN admin_users.supabase_id IS 'Links to Supabase auth.users(id) for new authentication system';
