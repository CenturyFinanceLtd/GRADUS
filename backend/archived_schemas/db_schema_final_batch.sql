
-- ... (Previous batches: Users, AdminUsers, Courses, Enrollments, Events, Blogs, Jobs, AssessmentSets, Tickets)

-- EVENT REGISTRATIONS
CREATE TABLE public.event_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  event_id UUID REFERENCES public.events(id),
  user_id UUID REFERENCES public.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'confirmed', -- confirmed, cancelled, attended
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EXPERT VIDEOS
CREATE TABLE public.expert_videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  title TEXT NOT NULL,
  expert_name TEXT,
  expert_role TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration TEXT,
  category TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GALLERY ITEMS
CREATE TABLE public.gallery_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT, -- e.g., 'campus', 'event', 'convocation'
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- JOB APPLICATIONS
CREATE TABLE public.job_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  job_id UUID REFERENCES public.jobs(id),
  user_id UUID REFERENCES public.users(id), -- Optional if applied w/o logging in
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT,
  resume_url TEXT,
  status TEXT DEFAULT 'new', -- new, reviewing, interviewed, rejected, hired
  cover_letter TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LANDING PAGES
CREATE TABLE public.landing_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  hero_section JSONB,
  content_sections JSONB, -- Array of objects for flexible layout
  meta_title TEXT,
  meta_description TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LIVE EVENTS (Distinguish from 'events' - these seem to be specifically for live streaming metadata?)
CREATE TABLE public.live_events_metadata (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  room_id TEXT,
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LIVE SESSIONS (Seems to be course-related live classes)
CREATE TABLE public.live_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  course_id UUID REFERENCES public.courses(id),
  instructor_id UUID REFERENCES public.users(id), -- Or admin_users?
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  meeting_link TEXT, -- If external
  livekit_room_name TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  user_id UUID REFERENCES public.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system', -- system, course, promotion
  is_read BOOLEAN DEFAULT FALSE,
  action_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAGE METAS (SEO)
CREATE TABLE public.page_metas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  page_path TEXT UNIQUE NOT NULL, -- e.g., '/home', '/about'
  title TEXT,
  description TEXT,
  keywords TEXT[],
  og_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PARTNER LOGOS
CREATE TABLE public.partner_logos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  category TEXT DEFAULT 'hiring', -- hiring, educational, etc.
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TICKET MESSAGES (Child of Tickets)
CREATE TABLE public.ticket_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  ticket_id UUID REFERENCES public.tickets(id),
  sender_config JSONB, -- { type: 'user'|'admin', id: '...' }
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SITE VISITS (Analytics)
CREATE TABLE public.site_visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  visitor_id TEXT, -- cookie-based ID
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TESTIMONIAL VIDEOS
CREATE TABLE public.testimonial_videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  person_name TEXT NOT NULL,
  person_role TEXT, -- e.g., 'Alumni, Batch 2023'
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  quote TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER AUTH LOGS
CREATE TABLE public.user_auth_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  user_id UUID REFERENCES public.users(id),
  event_type TEXT, -- login, logout, password_change
  ip_address TEXT,
  user_agent TEXT,
  status TEXT, -- success, failure
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VERIFICATION SESSIONS (KYC/Identity)
CREATE TABLE public.verification_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  user_id UUID REFERENCES public.users(id),
  session_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  outcome JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WHY GRADUS VIDEOS
CREATE TABLE public.why_gradus_videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  title TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_event_regs_event ON public.event_registrations(event_id);
CREATE INDEX idx_job_app_job ON public.job_applications(job_id);
CREATE INDEX idx_ticket_msgs_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
