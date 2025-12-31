-- Add price columns to course table to support top-level syncing
ALTER TABLE IF EXISTS public.course
ADD COLUMN IF NOT EXISTS price_inr NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
