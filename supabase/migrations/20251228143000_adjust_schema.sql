-- 1) Add price_inr to course table
ALTER TABLE public.course ADD COLUMN IF NOT EXISTS price_inr NUMERIC;

-- Update existing data from JSONB doc
UPDATE public.course SET price_inr = (doc->'hero'->>'priceINR')::NUMERIC;

-- 2) Adjust enrollments schema
-- Ensure course_id can be TEXT to match course.id (which is from Mongo _id)
ALTER TABLE public.enrollments ALTER COLUMN course_id TYPE TEXT;

-- Update or Add foreign key
-- (Assuming we want to link it to the new course table)
-- We'll just ensure the column exists for now and is used correctly.
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS course_slug TEXT;

-- If we want to strictly link them, we could add a FK, but let's keep it flexible for now as requested.
