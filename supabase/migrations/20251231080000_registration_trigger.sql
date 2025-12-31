-- Migration: Add registration form data and trigger for profile updates

-- Step 1: Add columns to masterclass_registrations to store form data
ALTER TABLE public.masterclass_registrations
  ADD COLUMN IF NOT EXISTS registration_fullname TEXT,
  ADD COLUMN IF NOT EXISTS registration_email TEXT,
  ADD COLUMN IF NOT EXISTS registration_state TEXT,
  ADD COLUMN IF NOT EXISTS registration_city TEXT,
  ADD COLUMN IF NOT EXISTS registration_college TEXT;

-- Step 2: Create trigger function to update public.users
CREATE OR REPLACE FUNCTION public.update_user_profile_on_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  name_parts TEXT[];
BEGIN
  -- Log for debugging
  RAISE NOTICE 'Trigger fired for user_id: %, fullname: %', NEW.user_id, NEW.registration_fullname;

  -- Update user profile with registration data
  -- COALESCE ensures we only update if new data is provided
  UPDATE public.users
  SET
    fullname = COALESCE(NULLIF(TRIM(NEW.registration_fullname), ''), fullname),
    email = COALESCE(NULLIF(TRIM(NEW.registration_email), ''), email),
    state = COALESCE(NULLIF(TRIM(NEW.registration_state), ''), state),
    city = COALESCE(NULLIF(TRIM(NEW.registration_city), ''), city),
    college = COALESCE(NULLIF(TRIM(NEW.registration_college), ''), college),
    updated_at = NOW()
  WHERE id = NEW.user_id;

  -- Split fullname into first_name and last_name
  IF NEW.registration_fullname IS NOT NULL AND TRIM(NEW.registration_fullname) != '' THEN
    name_parts := string_to_array(TRIM(NEW.registration_fullname), ' ');
    
    UPDATE public.users
    SET
      first_name = COALESCE(name_parts[1], ''),
      last_name = COALESCE(array_to_string(name_parts[2:array_length(name_parts, 1)], ' '), '')
    WHERE id = NEW.user_id;
  END IF;

  RAISE NOTICE 'User profile updated for user_id: %', NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger on masterclass_registrations
DROP TRIGGER IF EXISTS trg_update_user_profile_on_registration ON public.masterclass_registrations;

CREATE TRIGGER trg_update_user_profile_on_registration
  AFTER INSERT ON public.masterclass_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profile_on_registration();

-- Step 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_user_profile_on_registration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile_on_registration() TO service_role;
