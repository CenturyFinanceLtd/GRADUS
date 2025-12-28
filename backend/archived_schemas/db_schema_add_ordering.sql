
-- Add sort_order to testimonial_videos
ALTER TABLE public.testimonial_videos 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add sort_order to expert_videos
ALTER TABLE public.expert_videos 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
