-- Migration: Make fullname "Sticky" (Cannot be deleted/cleared once set)

CREATE OR REPLACE FUNCTION public.protect_fullname_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If the old name existed, and the new name is NULL or Empty...
    IF (OLD.fullname IS NOT NULL AND TRIM(OLD.fullname) <> '') AND 
       (NEW.fullname IS NULL OR TRIM(NEW.fullname) = '' OR NEW.fullname = 'EMPTY') THEN
       
        -- REJECT the deletion by keeping the old name
        RAISE NOTICE 'Blocked attempt to clear fullname for user %. Keeping old value.', NEW.id;
        NEW.fullname := OLD.fullname;
        
    END IF;
    
    RETURN NEW;
END;
$$;

-- Attach to public.users (Runs BEFORE update to intercept the change)
DROP TRIGGER IF EXISTS trg_protect_fullname ON public.users;
CREATE TRIGGER trg_protect_fullname
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_fullname_deletion();
