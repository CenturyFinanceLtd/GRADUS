
-- Resumes
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE,
    user_id UUID REFERENCES public.users(id),
    file_url TEXT,
    parsed_content JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Syllabuses
CREATE TABLE IF NOT EXISTS public.syllabuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE,
    course_id UUID REFERENCES public.courses(id),
    title TEXT,
    file_url TEXT,
    version TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Banners
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE,
    title TEXT,
    image_url TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    usage_location TEXT DEFAULT 'home',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignments
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE,
    course_id UUID REFERENCES public.courses(id),
    title TEXT,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    max_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assignment Submissions
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE,
    assignment_id UUID REFERENCES public.assignments(id),
    user_id UUID REFERENCES public.users(id),
    file_url TEXT,
    submission_text TEXT,
    score INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course Progress
CREATE TABLE IF NOT EXISTS public.course_progresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE,
    user_id UUID REFERENCES public.users(id),
    course_id UUID REFERENCES public.courses(id),
    progress_percentage INTEGER DEFAULT 0,
    completed_modules JSONB DEFAULT '[]'::jsonb,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read banners" ON public.banners FOR SELECT USING (true);
-- Other policies can be added later as needed
