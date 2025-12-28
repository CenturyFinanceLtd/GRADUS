-- Database Performance Indexes for 100k+ Users (SAFE SUBSET)

-- 1. Users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
-- CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 2. Courses
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_is_visible ON public.courses(is_visible);

-- 3. Enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON public.enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
-- CREATE INDEX IF NOT EXISTS idx_enrollments_razorpay_order_id ON public.enrollments(razorpay_order_id);

-- 4. Content: Blogs & Events
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs(slug);
-- CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON public.blogs(published_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_blogs_category ON public.blogs(category);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
-- CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);

-- 5. Analytics
CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at ON public.site_visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_path ON public.site_visits(path);

-- 6. Notifications
-- CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);
