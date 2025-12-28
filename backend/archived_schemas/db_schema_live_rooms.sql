-- Create live_rooms table
CREATE TABLE IF NOT EXISTS live_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session uuid NOT NULL, -- references live_sessions(id) - assuming FK constraint if live_sessions exists
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for uniqueness on session + slug
CREATE UNIQUE INDEX IF NOT EXISTS live_rooms_session_slug_idx ON live_rooms (session, slug);

-- Add updated_at trigger if not exists (optional, keeping simple for now)
