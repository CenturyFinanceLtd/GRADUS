
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  role text,
  company text,
  quote text,
  rating integer DEFAULT 5,
  image_url text,
  video_url text,
  public_id text,
  featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT testimonials_pkey PRIMARY KEY (id)
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Allow full access to service role (admin API uses service role)
-- Allow read access to everyone (public API)
CREATE POLICY "Enable read access for all users" ON public.testimonials
    FOR SELECT USING (true);

-- Allow all access to service role (implicit, but we can be explicit if needed for authenticated admin users via RLS)
-- Since admin-testimonials-api verifies admin identity and uses SERVICE_ROLE_KEY to create client?
-- Wait, inspection of admin-testimonials-api:
-- const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
-- So the API bypasses RLS. We just need the table to exist.
-- But standard practice is to allow Select for public.

