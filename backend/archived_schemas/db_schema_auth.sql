
-- Users Table (Custom management, not auth.users for easier migration of existing logic)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mobile TEXT NOT NULL,
  whatsapp_number TEXT,
  personal_details JSONB DEFAULT '{}'::jsonb,
  parent_details JSONB DEFAULT '{}'::jsonb,
  education_details JSONB DEFAULT '{}'::jsonb,
  job_details JSONB DEFAULT '{}'::jsonb,
  password TEXT, -- hashed
  email_verified BOOLEAN DEFAULT FALSE,
  auth_provider TEXT DEFAULT 'LOCAL',
  push_token TEXT,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification Sessions (OTP)
CREATE TABLE IF NOT EXISTS public.verification_sessions (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL, -- SIGNUP, PASSWORD_RESET
  email TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  otp_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verification_token TEXT,
  status TEXT DEFAULT 'OTP_PENDING', -- OTP_PENDING, OTP_VERIFIED, COMPLETED
  payload JSONB DEFAULT '{}'::jsonb, -- Temporary storage for signup details
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Auth Logs
CREATE TABLE IF NOT EXISTS public.user_auth_logs (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS verification_sessions_email_idx ON public.verification_sessions (email);
CREATE INDEX IF NOT EXISTS user_auth_logs_user_idx ON public.user_auth_logs (user_id);

-- Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_auth_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read of users? No. Service role only or strict policies.
-- For now, backend uses Service Key which bypasses RLS.
