-- Enable RLS on enrollments
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.enrollments;

-- Create policy
CREATE POLICY "Users can view their own enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
