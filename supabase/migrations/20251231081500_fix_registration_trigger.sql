-- Migration: Fix trigger to not use first_name/last_name

-- Update trigger function to only use fullname (no splitting)
CREATE OR REPLACE FUNCTION public.update_user_profile_on_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  RAISE NOTICE 'User profile updated for user_id: %', NEW.user_id;
  
  RETURN NEW;
END;
$$;
