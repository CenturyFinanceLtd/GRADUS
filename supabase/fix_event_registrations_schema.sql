-- Comprehensive fix for event_registrations table
-- Ensures all required columns exist and schema cache is reloaded

DO $$
BEGIN
    -- 1. name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'name') THEN
        ALTER TABLE public.event_registrations ADD COLUMN name TEXT;
    END IF;

    -- 2. email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'email') THEN
        ALTER TABLE public.event_registrations ADD COLUMN email TEXT;
    END IF;

    -- 3. phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'phone') THEN
        ALTER TABLE public.event_registrations ADD COLUMN phone TEXT;
    END IF;

    -- 4. state
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'state') THEN
        ALTER TABLE public.event_registrations ADD COLUMN state TEXT;
    END IF;

    -- 5. qualification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'qualification') THEN
        ALTER TABLE public.event_registrations ADD COLUMN qualification TEXT;
    END IF;

    -- 6. program_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'program_name') THEN
        ALTER TABLE public.event_registrations ADD COLUMN program_name TEXT;
    END IF;

    -- 7. landing_page_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'landing_page_id') THEN
        ALTER TABLE public.event_registrations ADD COLUMN landing_page_id UUID REFERENCES public.landing_pages(id);
    END IF;
END $$;

-- Verify RLS is enabled
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Ensure public insert policy exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'event_registrations' 
        AND policyname = 'Enable insert for public'
    ) THEN
        CREATE POLICY "Enable insert for public" ON public.event_registrations
        FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Grant permissions (just to be safe)
GRANT ALL ON TABLE public.event_registrations TO anon;
GRANT ALL ON TABLE public.event_registrations TO authenticated;
GRANT ALL ON TABLE public.event_registrations TO service_role;

-- CRITICAL: Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
