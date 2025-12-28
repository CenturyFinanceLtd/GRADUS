
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE, -- To store original MongoDB ID during migration
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT NOT NULL,
  whatsapp_number TEXT,
  password_hash TEXT, -- Storing hashed password
  email_verified BOOLEAN DEFAULT FALSE,
  auth_provider TEXT DEFAULT 'LOCAL',
  push_token TEXT,
  role TEXT DEFAULT 'student',
  
  -- Nested JSONB fields for structured data
  personal_details JSONB,
  parent_details JSONB,
  education_details JSONB,
  job_details JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COURSES TABLE
CREATE TABLE public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  programme TEXT,
  programme_slug TEXT,
  course_slug TEXT,
  
  subtitle TEXT,
  focus TEXT,
  placement_range TEXT,
  price TEXT, -- Display price string
  level TEXT,
  duration TEXT,
  mode TEXT,
  outcome_summary TEXT,
  final_award TEXT,
  
  -- JSONB for complex nested structures
  weeks JSONB,
  partner_schema JSONB,
  certifications JSONB,
  hero JSONB,
  stats JSONB,
  about_program JSONB,
  learn JSONB,
  target_audience JSONB,
  prereqs_list JSONB,
  modules JSONB,
  instructors JSONB,
  offered_by JSONB,
  capstone JSONB,
  image JSONB,
  media JSONB,
  
  assessment_max_attempts INTEGER DEFAULT 3,
  is_visible BOOLEAN DEFAULT TRUE,
  "order" INTEGER, -- 'order' is a reserved keyword, so quoted

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENROLLMENTS TABLE
CREATE TABLE public.enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  
  user_id UUID REFERENCES public.users(id),
  course_id UUID REFERENCES public.courses(id),
  
  status TEXT DEFAULT 'ACTIVE',
  payment_status TEXT DEFAULT 'PENDING',
  payment_reference TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  currency TEXT DEFAULT 'INR',
  price_base NUMERIC,
  price_tax NUMERIC,
  price_total NUMERIC,
  
  payment_gateway TEXT DEFAULT 'RAZORPAY',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  receipt TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EVENTS TABLE
CREATE TABLE public.events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,

  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subtitle TEXT,
  summary TEXT,
  description TEXT,
  category TEXT DEFAULT 'General',
  badge TEXT,
  event_type TEXT DEFAULT 'Webinar',
  tags TEXT[], -- Array of text
  level TEXT,
  track_label TEXT,
  location TEXT,
  seat_limit INTEGER,
  duration_minutes INTEGER,
  recording_available BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'draft',
  sort_order INTEGER DEFAULT 0,
  is_masterclass BOOLEAN DEFAULT FALSE,
  
  -- Nested JSONB
  hero_image JSONB,
  host JSONB,
  price JSONB,
  cta JSONB,
  schedule JSONB, -- Check if we want to extract start/end dates for querying
  meta JSONB,
  masterclass_details JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_courses_slug ON public.courses(slug);
CREATE INDEX idx_enrollments_user_course ON public.enrollments(user_id, course_id);
CREATE INDEX idx_events_slug ON public.events(slug);
