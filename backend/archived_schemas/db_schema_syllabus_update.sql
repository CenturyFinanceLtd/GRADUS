-- Update syllabuses table
ALTER TABLE public.syllabuses ADD COLUMN IF NOT EXISTS course_slug TEXT;
ALTER TABLE public.syllabuses ADD COLUMN IF NOT EXISTS programme_slug TEXT;
ALTER TABLE public.syllabuses ADD COLUMN IF NOT EXISTS course_name TEXT;
ALTER TABLE public.syllabuses ADD COLUMN IF NOT EXISTS syllabus JSONB DEFAULT '{}'::jsonb;

-- Unique constraint for course_slug if we want upsert to work via slug
-- But let's check if it exists or if we should just use course_id
-- Original code uses courseSlug for findOneAndUpdate.

ALTER TABLE public.syllabuses DROP CONSTRAINT IF EXISTS syllabuses_course_slug_key;
ALTER TABLE public.syllabuses ADD CONSTRAINT syllabuses_course_slug_key UNIQUE (course_slug);
