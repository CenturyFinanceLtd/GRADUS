-- Add missing columns to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS price_inr numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS approvals jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS deliverables jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS outcomes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS capstone_points jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS career_outcomes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tools_frameworks jsonb DEFAULT '[]'::jsonb;

-- Note: We keep the existing 'price' (text) column for backward compatibility 
-- but 'price_inr' will be used for numerical price data from 'hero.priceINR'.
