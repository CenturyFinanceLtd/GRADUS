-- Add unique constraint to enrollments table to allow upsert
ALTER TABLE public.enrollments
ADD CONSTRAINT enrollments_user_course_unique UNIQUE (user_id, course_id);
