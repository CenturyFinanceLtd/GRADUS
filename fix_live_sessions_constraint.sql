-- Force add the unique constraint to the existing table
-- This is required for the backend 'upsert' logic to work correctly.
ALTER TABLE public.live_sessions 
ADD CONSTRAINT live_sessions_meeting_token_key UNIQUE (meeting_token);
