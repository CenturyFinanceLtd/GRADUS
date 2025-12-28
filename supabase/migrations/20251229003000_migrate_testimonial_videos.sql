
-- Copy data from testimonial_videos to testimonials with full mapping
INSERT INTO public.testimonials (id, name, role, video_url, image_url, quote, featured, sort_order, created_at, updated_at)
SELECT 
  id, 
  person_name as name, 
  person_role as role, 
  video_url, 
  thumbnail_url as image_url,
  quote,
  is_featured as featured,
  sort_order,
  created_at, 
  updated_at
FROM public.testimonial_videos
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  video_url = EXCLUDED.video_url,
  image_url = EXCLUDED.image_url,
  quote = EXCLUDED.quote,
  featured = EXCLUDED.featured,
  sort_order = EXCLUDED.sort_order,
  updated_at = EXCLUDED.updated_at;

