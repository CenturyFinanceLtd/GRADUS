-- Update verification_sessions table to handle OTP and Auth flows
ALTER TABLE public.verification_sessions 
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS otp_hash text,
ADD COLUMN IF NOT EXISTS otp_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS verification_token text,
ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS approval_token text,
ADD COLUMN IF NOT EXISTS approval_responded_at timestamptz;

-- Ensure status has a default if not present
ALTER TABLE public.verification_sessions 
ALTER COLUMN status SET DEFAULT 'PENDING';

-- Optional: Index on email and type for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_sessions_email ON public.verification_sessions(email);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_type ON public.verification_sessions(type);
