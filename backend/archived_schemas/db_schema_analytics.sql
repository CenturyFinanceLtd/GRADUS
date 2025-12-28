
-- Site Visits Table for Analytics
CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  path TEXT,
  page_title TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  session_id TEXT,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  country TEXT,
  region TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Policy: Public can insert their visits (anon)
CREATE POLICY "Public insert site_visits" ON public.site_visits FOR INSERT WITH CHECK (true);

-- Policy: Only Admins can view analytics (Service Role usually bypasses RLS, but for client admin dashboard we might need policy if using Supabase client with auth)
-- For now, we rely on backend having Service Key access which bypasses RLS.
