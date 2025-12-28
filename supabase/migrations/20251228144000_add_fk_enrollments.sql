-- Add Foreign Key to enrollments table pointing to the new course table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_course_id_fkey'
    ) THEN
        ALTER TABLE public.enrollments 
        ADD CONSTRAINT enrollments_course_id_fkey 
        FOREIGN KEY (course_id) REFERENCES public.course(id)
        ON DELETE CASCADE;
    END IF;
END $$;
