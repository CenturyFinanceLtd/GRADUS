-- Add a default value to the id column so new inserts from the UI don't fail
ALTER TABLE public.course ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
