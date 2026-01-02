-- Run this to update the image paths in your database to use the uploaded files.

UPDATE public.landing_pages
SET mentor = jsonb_set(mentor, '{image}', '"akhil.png"')
WHERE slug = 'akhil';

UPDATE public.landing_pages
SET mentor = jsonb_set(mentor, '{image}', '"vaibhav.png"')
WHERE slug = 'vaibhav';
