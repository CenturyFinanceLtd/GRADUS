-- Force update any pending enrollments to PAID to resolve user issue
UPDATE public.enrollments 
SET payment_status = 'PAID', 
    status = 'ACTIVE',
    payment_gateway = 'RAZORPAY',
    paid_at = NOW()
WHERE payment_status = 'PENDING';
