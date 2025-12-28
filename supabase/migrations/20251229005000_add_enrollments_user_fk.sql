
-- Delete orphan enrollments that reference non-existent users
DELETE FROM public.enrollments WHERE user_id NOT IN (SELECT id FROM public.users);

-- Add Foreign Key to enrollments table pointing to users table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_user_id_fkey'
    ) THEN
        ALTER TABLE public.enrollments 
        ADD CONSTRAINT enrollments_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;
