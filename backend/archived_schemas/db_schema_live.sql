-- Drop tables to ensure fresh schema
DROP TABLE IF EXISTS public.live_recordings CASCADE;
DROP TABLE IF EXISTS public.live_events CASCADE;
DROP TABLE IF EXISTS public.live_chat_messages CASCADE;
DROP TABLE IF EXISTS public.live_participants CASCADE;
DROP TABLE IF EXISTS public.live_rooms CASCADE;
DROP TABLE IF EXISTS public.live_sessions CASCADE;

-- Live Sessions
CREATE TABLE IF NOT EXISTS public.live_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
    scheduled_for TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    host_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    host_display_name TEXT,
    host_secret TEXT NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL, -- assuming course_id links to courses
    course_slug TEXT,
    course_name TEXT,
    allow_student_audio BOOLEAN DEFAULT TRUE,
    allow_student_video BOOLEAN DEFAULT TRUE,
    allow_student_screen_share BOOLEAN DEFAULT TRUE,
    waiting_room_enabled BOOLEAN DEFAULT FALSE,
    locked BOOLEAN DEFAULT FALSE,
    passcode_hash TEXT,
    meeting_token TEXT,
    banned_user_ids TEXT[], -- Array of user IDs or strings
    screen_share_owner TEXT, -- Participant ID
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Rooms (Breakout rooms)
CREATE TABLE IF NOT EXISTS public.live_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Participants
CREATE TABLE IF NOT EXISTS public.live_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('instructor', 'student', 'host', 'cohost')),
    display_name TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    signaling_key TEXT,
    connected BOOLEAN DEFAULT FALSE,
    waiting BOOLEAN DEFAULT FALSE,
    room_id UUID REFERENCES public.live_rooms(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Chat Messages
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES public.live_participants(id) ON DELETE SET NULL,
    sender_role TEXT,
    sender_display_name TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Events (Audit log)
CREATE TABLE IF NOT EXISTS public.live_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    participant_id UUID, -- Can be null or reference live_participants
    role TEXT,
    kind TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Recordings
CREATE TABLE IF NOT EXISTS public.live_recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    participant_id UUID,
    url TEXT NOT NULL,
    public_id TEXT,
    bytes BIGINT,
    duration_ms BIGINT,
    format TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON public.live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_course_id ON public.live_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_host_admin_id ON public.live_sessions(host_admin_id);
CREATE INDEX IF NOT EXISTS idx_live_participants_session_id ON public.live_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_live_participants_user_id ON public.live_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_session_id ON public.live_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_live_events_session_id ON public.live_events(session_id);

-- RLS Policies (Simplified for now - relying on Service Key for backend operations)
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_recordings ENABLE ROW LEVEL SECURITY;

-- Allow public read fetch active sessions? No, controller handles it.
-- Backend uses service key, so RLS is bypassed. 
-- We can add policies for authenticated users later if they access Supabase directly.
-- For now, create a basic 'read' policy for authenticated users to view sessions they are in? 
-- Leaving policies open for service role, restrictive for others implies default deny.
