
-- ... existing tables (Users, Courses, Enrollments, Events)

-- ADMIN USERS TABLE
CREATE TABLE public.admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  department TEXT,
  designation TEXT,
  languages TEXT[],
  bio TEXT,
  status TEXT DEFAULT 'active',
  role TEXT DEFAULT 'admin',
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BLOGS TABLE
CREATE TABLE public.blogs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  featured_image_public_id TEXT,
  author TEXT DEFAULT 'Admin',
  tags TEXT[],
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  meta JSONB DEFAULT '{"views": 0, "comments": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- JOBS TABLE
CREATE TABLE public.jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  salary TEXT,
  type TEXT DEFAULT 'Full-time',
  description TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ASSESSMENT SETS TABLE
-- Note: 'questions' is complex JSON, simpler to store as JSONB for now
CREATE TABLE public.assessment_sets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  course_id UUID REFERENCES public.courses(id),
  course_slug TEXT NOT NULL,
  programme_slug TEXT,
  course_name TEXT,
  module_index INTEGER,
  week_index INTEGER,
  module_title TEXT,
  week_title TEXT,
  title TEXT NOT NULL,
  level TEXT,
  summary TEXT,
  tags TEXT[],
  questions JSONB DEFAULT '[]'::jsonb,
  initial_question_count INTEGER DEFAULT 0,
  question_pool_size INTEGER DEFAULT 0,
  per_attempt_count INTEGER DEFAULT 10,
  source TEXT DEFAULT 'ai',
  variant TEXT DEFAULT 'course-default',
  model TEXT,
  usage JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TICKETS TABLE
CREATE TABLE public.tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  user_id UUID REFERENCES public.users(id),
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'not_opened',
  assigned_to UUID REFERENCES public.admin_users(id),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  first_opened_at TIMESTAMP WITH TIME ZONE,
  last_opened_by UUID REFERENCES public.admin_users(id),
  resolution_outcome TEXT DEFAULT 'unknown',
  
  -- Nested Objects
  closure JSONB,
  assignment JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for new tables
CREATE INDEX idx_blogs_slug ON public.blogs(slug);
CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_assessment_sets_course_slug ON public.assessment_sets(course_slug);
CREATE INDEX idx_tickets_user ON public.tickets(user_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
