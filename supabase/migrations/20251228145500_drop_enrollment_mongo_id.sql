-- Drop mongo_id column from enrollments table
ALTER TABLE public.enrollments
DROP COLUMN IF EXISTS mongo_id;
