ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS hero JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS middle_section JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS mentor JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS certificate JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS sticky_footer JSONB DEFAULT '{}'::jsonb;
