-- Create a temporary audit table
CREATE TABLE IF NOT EXISTS public.debug_audit (
    id SERIAL PRIMARY KEY,
    operation TEXT,
    old_fullname TEXT,
    new_fullname TEXT,
    changed_by TEXT,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Create the audit function
CREATE OR REPLACE FUNCTION public.log_fullname_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.fullname IS DISTINCT FROM NEW.fullname) THEN
        INSERT INTO public.debug_audit (operation, old_fullname, new_fullname, changed_by)
        VALUES (TG_OP, OLD.fullname, NEW.fullname, current_user);
    End IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to public.users
DROP TRIGGER IF EXISTS audit_fullname_update ON public.users;
CREATE TRIGGER audit_fullname_update
AFTER UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.log_fullname_change();
