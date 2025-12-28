-- Update assignments table
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS module_id TEXT;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS max_points INTEGER DEFAULT 100;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS course_slug TEXT;

-- Sync max_score and max_points if needed
UPDATE public.assignments SET max_points = max_score WHERE max_points = 100 AND max_score IS NOT NULL;
