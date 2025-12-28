-- Database Performance Optimization Script V2
-- Focused on frequently joined and filtered columns

-- 1. Users Table
-- Email is already indexed, but let's ensure mongo_id is indexed for legacy migration support
CREATE INDEX IF NOT EXISTS idx_users_mongo_id ON public.users(mongo_id);
-- Ensure role is indexed if we filter users by role often
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 2. Courses Table
-- Slug and is_visible are primary filters
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_is_visible ON public.courses(is_visible);
-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_courses_order ON public.courses("order" ASC);

-- 3. Enrollments Table
-- Crucial for checking enrollment status (USER_ID + COURSE_ID is a common join)
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
-- Compound index for faster enrollment checks
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course_status ON public.enrollments(user_id, course_id, status);

-- 4. Course Details Table
-- course_id is used for JOINs with courses
CREATE INDEX IF NOT EXISTS idx_course_details_course_id ON public.course_details(course_id);
-- course_slug is used for direct lookup in modules-api
CREATE INDEX IF NOT EXISTS idx_course_details_course_slug ON public.course_details(course_slug);

-- 5. Blogs, Events & Jobs
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs(slug);
-- CREATE INDEX IF NOT EXISTS idx_blogs_is_active ON public.blogs(is_active); -- is_active doesn't exist
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON public.events(is_featured);
CREATE INDEX IF NOT EXISTS idx_jobs_is_featured ON public.jobs(is_featured);

-- 6. Analytics Table
-- High volume table needs specific indexes
CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at ON public.site_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_path ON public.site_visits(path);

-- 7. JSONB GIN Indexes (Optional but recommended for modules search)
-- Only apply if we query inside JSONB frequently. 
-- For now, we fetch the whole JSONB so standard B-Tree on foreign keys above is more important.
