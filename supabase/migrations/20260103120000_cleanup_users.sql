-- Drop the redundant 'mobile' column
ALTER TABLE public.users DROP COLUMN IF EXISTS mobile;

-- Enforce Uniqueness on Email and Phone
-- Using DO block to safe-guard against existing constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_key') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_phone_key UNIQUE (phone);
    END IF;
END $$;
