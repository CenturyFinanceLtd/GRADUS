-- Add profile_image_url column to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'profile_image', 'profile_image', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'profile_image'
);

-- RLS for the bucket
-- Allow public access to view profile images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile_image' );

-- Allow users to upload their own profile image
-- We path them as bucket_id/user_id/filename
CREATE POLICY "Users can upload own profile image"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'profile_image' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own profile image"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'profile_image' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own profile image"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'profile_image' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
