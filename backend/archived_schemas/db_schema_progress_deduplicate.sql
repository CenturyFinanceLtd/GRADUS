-- 1. Deduplicate course_progresses
-- Keep only the record with the latest updated_at for each user_id and course_id
DELETE FROM public.course_progresses
WHERE id NOT IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY user_id, course_id ORDER BY updated_at DESC) as row_num
        FROM public.course_progresses
    ) t
    WHERE t.row_num = 1
);

-- 2. Add Unique Constraint to prevent future duplicates
ALTER TABLE public.course_progresses
ADD CONSTRAINT course_progresses_user_id_course_id_key UNIQUE (user_id, course_id);
