-- Migration: Restructure users table with fullname instead of first_name/last_name
-- Add individual columns for all profile fields instead of JSONB

-- Step 1: Add fullname column and make identity columns nullable
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fullname TEXT;

-- Migrate existing first_name + last_name to fullname
UPDATE public.users SET fullname = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
WHERE fullname IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- Make old columns nullable (will be deprecated)
ALTER TABLE public.users ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- Drop unique constraint on email (phone is primary identifier now)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;

-- Step 2: Add Personal Info columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dob DATE;

-- Step 3: Add Academic Info columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS graduation_year TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS degree TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS college TEXT;

-- Step 4: Add Job Info columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS years_of_experience TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Step 5: Migrate existing JSONB data to new columns (if any data exists)
UPDATE public.users SET
  address = COALESCE(address, personal_details->>'address'),
  city = COALESCE(city, personal_details->>'city'),
  state = COALESCE(state, personal_details->>'state'),
  pincode = COALESCE(pincode, personal_details->>'zipCode', personal_details->>'pincode'),
  graduation_year = COALESCE(graduation_year, education_details->>'graduationYear'),
  degree = COALESCE(degree, education_details->>'degree'),
  college = COALESCE(college, education_details->>'institutionName', education_details->>'college'),
  company_name = COALESCE(company_name, job_details->>'companyName'),
  designation = COALESCE(designation, job_details->>'designation'),
  years_of_experience = COALESCE(years_of_experience, job_details->>'yearsOfExperience'),
  linkedin_url = COALESCE(linkedin_url, job_details->>'linkedinUrl')
WHERE personal_details IS NOT NULL OR education_details IS NOT NULL OR job_details IS NOT NULL;
