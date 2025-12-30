-- Make password column optional for phone auth users (no password needed)
ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;

-- Set default to NULL for new users
ALTER TABLE public.users ALTER COLUMN password SET DEFAULT NULL;
