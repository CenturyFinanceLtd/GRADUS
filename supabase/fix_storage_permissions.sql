-- Run this in your Supabase SQL Editor to fix the "violates row-level security policy" error.

BEGIN;

  -- 1. Ensure the bucket exists and is public
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('landing_page', 'landing_page', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

  -- 2. Drop any existing conflicting policies for this bucket
  DROP POLICY IF EXISTS "Public Access for landing_page" ON storage.objects;
  DROP POLICY IF EXISTS "Public Upload for landing_page" ON storage.objects;
  DROP POLICY IF EXISTS "Public Update for landing_page" ON storage.objects;

  -- 3. Allow Public READ (so the website can show images)
  CREATE POLICY "Public Access for landing_page"
  ON storage.objects FOR SELECT
  TO public
  USING ( bucket_id = 'landing_page' );

  -- 4. Allow Public INSERT (so the node script can upload images)
  CREATE POLICY "Public Upload for landing_page"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK ( bucket_id = 'landing_page' );

  -- 5. Allow Public UPDATE (so you can re-run the script to overwrite images)
  CREATE POLICY "Public Update for landing_page"
  ON storage.objects FOR UPDATE
  TO public
  USING ( bucket_id = 'landing_page' );

COMMIT;
