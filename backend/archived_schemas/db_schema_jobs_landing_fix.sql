-- Jobs table fixes
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS mongo_id TEXT UNIQUE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Job Applications table fixes
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS resume_snapshot JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Landing Pages table fixes
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS hero_section JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS content_sections JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;
