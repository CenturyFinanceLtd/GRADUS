-- Drop parents_details column if it exists in users table
ALTER TABLE IF EXISTS public.users 
DROP COLUMN IF EXISTS parents_details;
