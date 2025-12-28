
-- Why Gradus Videos
ALTER TABLE public.why_gradus_videos 
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS cta_label TEXT,
ADD COLUMN IF NOT EXISTS cta_href TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Partner Logos
ALTER TABLE public.partner_logos 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS programs JSONB DEFAULT '[]'::jsonb; -- Store array of program names

-- Testimonial Videos
ALTER TABLE public.testimonial_videos 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Expert Videos
ALTER TABLE public.expert_videos 
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Banners
ALTER TABLE public.banners 
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS cta_label TEXT,
ADD COLUMN IF NOT EXISTS mobile_image_url TEXT,
ADD COLUMN IF NOT EXISTS desktop_image_url TEXT; -- Alias for image_url if needed, or just use image_url
-- Note: banners already had 'is_active', 'link_url' (for ctaUrl)

-- Create Policies if not exists (Idempotent-ish)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'why_gradus_videos' AND policyname = 'Public read why_gradus_videos'
    ) THEN
        ALTER TABLE public.why_gradus_videos ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Public read why_gradus_videos" ON public.why_gradus_videos FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'partner_logos' AND policyname = 'Public read partner_logos'
    ) THEN
        ALTER TABLE public.partner_logos ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Public read partner_logos" ON public.partner_logos FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'testimonial_videos' AND policyname = 'Public read testimonial_videos'
    ) THEN
        ALTER TABLE public.testimonial_videos ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Public read testimonial_videos" ON public.testimonial_videos FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'expert_videos' AND policyname = 'Public read expert_videos'
    ) THEN
        ALTER TABLE public.expert_videos ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Public read expert_videos" ON public.expert_videos FOR SELECT USING (true);
    END IF;
END
$$;
