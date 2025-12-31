DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'dob') THEN
        ALTER TABLE "users" ADD COLUMN "dob" DATE;
    END IF;
END $$;
