CREATE TABLE IF NOT EXISTS public.course_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE,
    course_id UUID REFERENCES public.courses(id),
    course_slug TEXT UNIQUE NOT NULL,
    course_name TEXT,
    programme TEXT,
    programme_slug TEXT,
    modules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ADD MISSING COLUMNS IF TABLE EXISTS
ALTER TABLE public.course_details ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id);
ALTER TABLE public.course_details ADD COLUMN IF NOT EXISTS course_name TEXT;
ALTER TABLE public.course_details ADD COLUMN IF NOT EXISTS programme TEXT;
ALTER TABLE public.course_details ADD COLUMN IF NOT EXISTS programme_slug TEXT;

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_course_details_slug ON public.course_details(course_slug);

