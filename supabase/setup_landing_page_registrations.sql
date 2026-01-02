-- Create landing_page_registrations table
CREATE TABLE IF NOT EXISTS public.landing_page_registrations (
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
ALTER TABLE public.landing_page_registrations ENABLE ROW LEVEL SECURITY;

-- Allow public insert
CREATE POLICY "Enable insert for everyone" ON public.landing_page_registrations
    FOR INSERT
    WITH CHECK (true);

-- Allow public/anon select (optional, keeping it restricted by default unless needed)
-- GRANT ALL ON TABLE public.landing_page_registrations TO anon;
-- GRANT ALL ON TABLE public.landing_page_registrations TO authenticated;
-- GRANT ALL ON TABLE public.landing_page_registrations TO service_role;

GRANT INSERT ON TABLE public.landing_page_registrations TO anon;
GRANT INSERT ON TABLE public.landing_page_registrations TO authenticated;
GRANT ALL ON TABLE public.landing_page_registrations TO service_role;

-- Reload schema cache to make sure API picks it up
NOTIFY pgrst, 'reload schema';
