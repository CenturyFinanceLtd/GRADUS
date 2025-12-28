-- Fix the price values for the Agentic AI course
-- 1. Update the top-level price_inr column to match the doc (46000)
-- 2. Update the enrollment to have a realistic paid amount (46000 + 18% = 54280)

DO $$
BEGIN
    -- Update Course
    UPDATE public.course
    SET price_inr = 46000
    WHERE id = '{"$oid": "691300440c7f03983dc0ed7a"}';

    -- Update Enrollments
    -- Base: 46000, Tax: 8280, Total: 54280
    UPDATE public.enrollments
    SET 
        price_base = 46000,
        price_tax = 8280,
        price_total = 54280
    WHERE course_id = '{"$oid": "691300440c7f03983dc0ed7a"}';
    
    RAISE NOTICE 'Prices updated successfully.';
END $$;
