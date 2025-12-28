UPDATE public.enrollments 
SET payment_status = 'PAID', 
    status = 'ACTIVE',
    payment_gateway = 'RAZORPAY' -- Ensure this is set
WHERE payment_status = 'PENDING';
