-- Add payment details column
ALTER TABLE IF EXISTS public.enrollments
ADD COLUMN IF NOT EXISTS razorpay_payment_data JSONB DEFAULT '{}'::jsonb;
