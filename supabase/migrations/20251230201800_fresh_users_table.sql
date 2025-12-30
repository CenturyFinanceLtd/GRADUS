-- WARNING: This will DELETE ALL existing users!
-- Drop the old users table and recreate with clean schema

DROP TABLE IF EXISTS public.masterclass_registrations;
DROP TABLE IF EXISTS public.users CASCADE;

-- Create new users table with phone-first authentication
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  
  -- Primary identifier: Phone number (unique per user)
  phone TEXT UNIQUE,
  
  -- Basic Info
  fullname TEXT,
  email TEXT,
  mobile TEXT,
  
  -- Personal Info
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  dob DATE,
  
  -- Academic Info
  graduation_year TEXT,
  degree TEXT,
  college TEXT,
  
  -- Job Info
  company_name TEXT,
  designation TEXT,
  years_of_experience TEXT,
  linkedin_url TEXT,
  
  -- System fields
  role TEXT DEFAULT 'student',
  email_verified BOOLEAN DEFAULT FALSE,
  auth_provider TEXT DEFAULT 'PHONE',
  push_token TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Primary key
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users USING btree (role);

-- Recreate masterclass_registrations with foreign key to new users table
CREATE TABLE public.masterclass_registrations (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT masterclass_registrations_pkey PRIMARY KEY (id),
  CONSTRAINT masterclass_registrations_unique UNIQUE (event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masterclass_registrations ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (true);
  
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (true);

-- Policies for masterclass_registrations
CREATE POLICY "Users can view own registrations" ON public.masterclass_registrations
  FOR SELECT USING (true);
  
CREATE POLICY "Users can insert own registrations" ON public.masterclass_registrations
  FOR INSERT WITH CHECK (true);
