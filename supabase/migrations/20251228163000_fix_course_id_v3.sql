-- Migration to fix Course ID format by temporarily dropping FK

DO $$
BEGIN
    -- 1. Drop the Foreign Key Constraint
    ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_course_id_fkey;

    -- 2. Update the Course ID
    UPDATE public.course
    SET id = '{"$oid": "691300440c7f03983dc0ed7a"}'
    WHERE id = '691300440c7f03983dc0ed7a';

    -- 3. Update the Enrollment IDs
    UPDATE public.enrollments
    SET course_id = '{"$oid": "691300440c7f03983dc0ed7a"}'
    WHERE course_id = '691300440c7f03983dc0ed7a';

    -- 4. Re-add the Foreign Key Constraint
    -- Note: ID types must match. Both are now text (containing JSON string).
    ALTER TABLE public.enrollments 
    ADD CONSTRAINT enrollments_course_id_fkey 
    FOREIGN KEY (course_id) REFERENCES public.course(id);

    RAISE NOTICE 'Constraint dropped, IDs updated, Constraint re-added.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Migration failed: %', SQLERRM;
    -- Reraise to ensure migration status is failed
    RAISE;
END $$;
