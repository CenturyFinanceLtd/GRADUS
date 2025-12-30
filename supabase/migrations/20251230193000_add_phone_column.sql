-- Add phone column to users table with unique constraint
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add unique constraint on phone (only if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_phone_unique'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
  END IF;
END $$;

-- Remove unique constraint from email if exists (email can be reused)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_key' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_email_key;
  END IF;
END $$;
