create table public.live_sessions (
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
  constraint live_sessions_host_admin_id_fkey foreign KEY (host_admin_id) references admin_users (id) on delete set null,
  constraint live_sessions_status_check check (
    (
      status = any (
        array['scheduled'::text, 'live'::text, 'ended'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_live_sessions_status on public.live_sessions using btree (status) TABLESPACE pg_default;

create index IF not exists idx_live_sessions_course_id on public.live_sessions using btree (course_id) TABLESPACE pg_default;

create index IF not exists idx_live_sessions_host_admin_id on public.live_sessions using btree (host_admin_id) TABLESPACE pg_default;
