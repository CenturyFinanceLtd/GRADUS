-- Drop mongo_id column from users table
ALTER TABLE public.users
DROP COLUMN IF EXISTS mongo_id;
