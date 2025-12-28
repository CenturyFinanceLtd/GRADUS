
CREATE TABLE IF NOT EXISTS public.course_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE, -- For migration mapping
    hero JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE, -- For migration mapping
    course_slug TEXT NOT NULL,
    modules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies (Public Read)
ALTER TABLE public.course_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public pages are viewable by everyone." ON public.course_pages FOR SELECT USING (true);

ALTER TABLE public.course_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public details are viewable by everyone." ON public.course_details FOR SELECT USING (true);
