-- ASSESSMENT ATTEMPTS
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE,
    user_id UUID REFERENCES public.users(id),
    course_id UUID REFERENCES public.courses(id),
    course_slug TEXT NOT NULL,
    programme_slug TEXT,
    course_name TEXT,
    module_index INTEGER,
    week_index INTEGER,
    module_title TEXT,
    week_title TEXT,
    title TEXT,
    status TEXT DEFAULT 'in-progress', -- in-progress, submitted
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    question_pool_size INTEGER DEFAULT 0,
    per_attempt_count INTEGER DEFAULT 10,
    questions JSONB DEFAULT '[]'::jsonb, -- Snapshotted questions for this attempt
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ASSESSMENT QUESTIONS (For individual question tracking if needed, though sets store them in JSONB)
CREATE TABLE IF NOT EXISTS public.assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE,
    course_id UUID REFERENCES public.courses(id),
    course_slug TEXT NOT NULL,
    programme_slug TEXT,
    module_index INTEGER,
    week_index INTEGER,
    variant TEXT,
    assessment_id UUID REFERENCES public.assessment_sets(id),
    question_id TEXT UNIQUE, -- Custom unique ID
    prompt TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb,
    correct_option_id TEXT,
    explanation TEXT,
    source TEXT DEFAULT 'ai',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ASSESSMENT JOBS (For AI generation tracking)
CREATE TABLE IF NOT EXISTS public.assessment_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id TEXT UNIQUE,
    course_id UUID REFERENCES public.courses(id),
    course_slug TEXT NOT NULL,
    programme_slug TEXT,
    course_name TEXT,
    module_index INTEGER,
    week_index INTEGER,
    variant TEXT,
    level TEXT,
    total_target INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON public.assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_course ON public.assessment_attempts(course_slug);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_course ON public.assessment_questions(course_slug);
CREATE INDEX IF NOT EXISTS idx_assessment_jobs_course ON public.assessment_jobs(course_slug);
