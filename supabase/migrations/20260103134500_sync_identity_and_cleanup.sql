-- 1. SYNC TRIGGER: Google Identity -> Public Profile
-- This ensures that as soon as a user links Google, their profile gets the email/name.

CREATE OR REPLACE FUNCTION public.sync_google_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  google_email text;
  google_name text;
BEGIN
  -- Check if the new identity is from Google
  IF NEW.provider = 'google' THEN
    google_email := NEW.identity_data->>'email';
    google_name := NEW.identity_data->>'full_name'; -- Google usually provides 'full_name' or 'name'
    
    IF google_name IS NULL THEN
        google_name := NEW.identity_data->>'name';
    END IF;

    IF google_email IS NOT NULL THEN
      -- Sync to public.users
      UPDATE public.users
      SET 
        email = google_email,
        -- If public.users.fullname is NULL or empty, use Google Name. Otherwise keep existing.
        fullname = COALESCE(NULLIF(fullname, ''), google_name),
        auth_provider = 'google'
      WHERE id = NEW.user_id;

      -- Sync to auth.users (if email is missing)
      -- This allows the user to potentially login with Email+Password later if they set one
      UPDATE auth.users
      SET 
        email = google_email,
        email_confirmed_at = now(),
        raw_user_meta_data = 
          COALESCE(raw_user_meta_data, '{}'::jsonb) || 
          jsonb_build_object('full_name', COALESCE(google_name, raw_user_meta_data->>'full_name'))
      WHERE id = NEW.user_id AND email IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach Trigger to auth.identities
DROP TRIGGER IF EXISTS on_identity_linked ON auth.identities;
CREATE TRIGGER on_identity_linked
AFTER INSERT ON auth.identities
FOR EACH ROW
EXECUTE FUNCTION public.sync_google_identity();


-- 2. BIDIRECTIONAL DELETION (Cleanup Logic)
-- Cascade Delete: Deleting from Auth -> Deletes from Public
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users
ADD CONSTRAINT users_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Trigger Delete: Deleting from Public -> Deletes from Auth
CREATE OR REPLACE FUNCTION public.delete_auth_user_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_user_delete_cascade ON public.users;

CREATE TRIGGER on_user_delete_cascade
AFTER DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.delete_auth_user_v2();
