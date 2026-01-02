-- Rename mobile column to phone
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'mobile'
    ) THEN
        ALTER TABLE public.users RENAME COLUMN mobile TO phone;
    END IF;
    
    -- Add phone column if it doesn't exist (safety check)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
