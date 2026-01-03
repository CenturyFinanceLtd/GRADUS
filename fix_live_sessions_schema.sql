-- Create live_sessions table if it doesn't exist
create table IF NOT EXISTS public.live_sessions (
  id uuid not null default gen_random_uuid (),
  title text not null,
  status text null default 'scheduled'::text,
  scheduled_for timestamp with time zone null,
  started_at timestamp with time zone null,
  ended_at timestamp with time zone null,
  host_admin_id uuid null,
  host_display_name text null,
  host_secret text not null,
  course_id uuid null,
  course_slug text null,
  course_name text null,
  allow_student_audio boolean null default true,
  allow_student_video boolean null default true,
  allow_student_screen_share boolean null default true,
  waiting_room_enabled boolean null default false,
  locked boolean null default false,
  passcode_hash text null,
  meeting_token text null,
  banned_user_ids text[] null,
  screen_share_owner text null,
  last_activity_at timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint live_sessions_pkey primary key (id),
  -- Fix: Add unique constraint for upsert
  constraint live_sessions_meeting_token_key unique (meeting_token),
  constraint live_sessions_status_check check (
    (
      status = any (
        array['scheduled'::text, 'live'::text, 'ended'::text]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes if they don't exist
create index IF not exists idx_live_sessions_status on public.live_sessions using btree (status) TABLESPACE pg_default;
create index IF not exists idx_live_sessions_course_id on public.live_sessions using btree (course_id) TABLESPACE pg_default;

-- Grant permissions to service_role and anon/authenticated
GRANT ALL ON TABLE public.live_sessions TO service_role;
GRANT SELECT ON TABLE public.live_sessions TO anon;
GRANT SELECT ON TABLE public.live_sessions TO authenticated;
