-- Update the program name from 'Gradus TECH' to 'Gradus X' for Akhil's page
UPDATE public.landing_pages
SET middle_section = jsonb_set(middle_section, '{programName}', '"Gradus X"')
WHERE slug = 'akhil';

-- Ensure Vaibhav's page is correct (optional, based on request 'gradustech' specifically)
-- If you want to change FINLIT too, uncomment:
-- UPDATE public.landing_pages
-- SET middle_section = jsonb_set(middle_section, '{programName}', '"Gradus X"')
-- WHERE slug = 'vaibhav';

-- Also ensure images are updated if they weren't before
UPDATE public.landing_pages
SET mentor = jsonb_set(mentor, '{image}', '"akhil.png"')
WHERE slug = 'akhil';

UPDATE public.landing_pages
SET mentor = jsonb_set(mentor, '{image}', '"vaibhav.png"')
WHERE slug = 'vaibhav';
