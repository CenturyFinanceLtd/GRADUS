-- Safely migrate mobile to phone
DO $$
BEGIN
    -- 1. Ensure phone column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
    END IF;

    -- 2. Copy data from mobile to phone if mobile exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'mobile'
    ) THEN
        UPDATE public.users 
        SET phone = mobile 
        WHERE (phone IS NULL OR phone = '') AND mobile IS NOT NULL;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
