-- Add landing_page_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'event_registrations'
        AND column_name = 'landing_page_id'
    ) THEN
        ALTER TABLE public.event_registrations
        ADD COLUMN landing_page_id UUID REFERENCES public.landing_pages(id);
    END IF;
END $$;

-- Add program_name column if it doesn't exist (just in case)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'event_registrations'
        AND column_name = 'program_name'
    ) THEN
        ALTER TABLE public.event_registrations
        ADD COLUMN program_name TEXT;
    END IF;
END $$;

-- Reload Supabase Schema Cache (Required for PostgREST to see the new columns)
NOTIFY pgrst, 'reload schema';
