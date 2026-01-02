-- Create event_registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    state TEXT,
    qualification TEXT,
    program_name TEXT,
    landing_page_id UUID REFERENCES public.landing_pages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for registration form)
CREATE POLICY "Enable insert for public" ON public.event_registrations
    FOR INSERT
    WITH CHECK (true);

-- Allow public read (optional, maybe unrestricted for now or just insert)
-- Usually we don't want public to read other registrations.
-- Admin read is handled by service_role or admin user policies (usually service_role bypasses RLS).

-- Grant access to anon and authenticated roles
GRANT ALL ON TABLE public.event_registrations TO anon;
GRANT ALL ON TABLE public.event_registrations TO authenticated;
GRANT ALL ON TABLE public.event_registrations TO service_role;
