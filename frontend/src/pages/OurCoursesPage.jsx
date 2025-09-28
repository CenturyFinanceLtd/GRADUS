import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import CourseSeriesOverview from "../components/ourCourses/CourseSeriesOverview";
import CourseSeriesDetailSection from "../components/ourCourses/CourseSeriesDetailSection";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import { fetchCoursePage } from "../services/courseService";
import { useAuth } from "../context/AuthContext";

const OurCoursesPage = () => {
  const [pageContent, setPageContent] = useState({ hero: null, courses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingCourseSlug, setPendingCourseSlug] = useState(null);
  const [completedCourseSlug, setCompletedCourseSlug] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    const state = location.state;
    if (!state) {
      return;
    }

    const { pendingEnrollment, enrollmentCompleted } = state;

    if (pendingEnrollment) {
      setPendingCourseSlug(pendingEnrollment);
    }

    if (enrollmentCompleted) {
      setCompletedCourseSlug(enrollmentCompleted);
      setPendingCourseSlug((previous) => (previous === enrollmentCompleted ? null : previous));
      setRefreshKey((previous) => previous + 1);
    }

    navigate(location.pathname + location.search + location.hash, { replace: true });
  }, [location, navigate]);

  useEffect(() => {
    let isMounted = true;

    const loadCoursePage = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchCoursePage(token ? { token } : undefined);
        if (!isMounted) {
          return;
        }
        setPageContent({
          hero: response?.hero || null,
          courses: Array.isArray(response?.courses) ? response.courses : [],
        });
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err?.message || "Failed to load courses.");
        setPageContent({ hero: null, courses: [] });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCoursePage();

    return () => {
      isMounted = false;
    };
  }, [token, refreshKey]);

  const courses = useMemo(
    () => (Array.isArray(pageContent.courses) ? pageContent.courses.filter((course) => course?.name) : []),
    [pageContent.courses]
  );

  const findCourseBySlug = useCallback(
    (slug) =>
      courses.find(
        (course) =>
          (course.slug && course.slug === slug) ||
          (course.id && course.id === slug)
      ) || null,
    [courses]
  );

  const completedCourse = useMemo(
    () => (completedCourseSlug ? findCourseBySlug(completedCourseSlug) : null),
    [completedCourseSlug, findCourseBySlug]
  );

  const pendingCourse = useMemo(() => {
    if (!pendingCourseSlug) {
      return null;
    }
    if (completedCourseSlug && pendingCourseSlug === completedCourseSlug) {
      return null;
    }
    return findCourseBySlug(pendingCourseSlug);
  }, [pendingCourseSlug, completedCourseSlug, findCourseBySlug]);

  useEffect(() => {
    if (loading || error) {
      return;
    }

    const hashTarget = location.hash ? location.hash.replace('#', '') : null;
    const preferredTarget = hashTarget || completedCourseSlug || pendingCourseSlug;

    if (!preferredTarget) {
      return;
    }

    const scrollToCourse = () => {
      const element = document.getElementById(preferredTarget);
      if (!element) {
        return;
      }
      const rect = element.getBoundingClientRect();
      const offset = rect.top + window.pageYOffset - 96;
      window.scrollTo({ top: offset > 0 ? offset : 0, behavior: 'smooth' });
    };

    const timeoutId = window.setTimeout(scrollToCourse, 150);

    return () => window.clearTimeout(timeoutId);
  }, [loading, error, location.hash, completedCourseSlug, pendingCourseSlug, courses]);

  const handleStartEnrollment = useCallback((slug) => {
    if (!slug) {
      return;
    }
    setPendingCourseSlug((previous) => (previous === slug ? null : previous));
  }, []);

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
        <Breadcrumb title={"Our Courses"} />
        {(completedCourse || pendingCourse) && (
          <section className='pt-0 pb-32'>
            <div className='container'>
              {completedCourse ? (
                <div className='alert alert-success mb-16' role='alert'>
                  <div className='d-flex flex-column flex-md-row justify-content-between gap-12'>
                    <span>
                      You are now enrolled in <strong>{completedCourse.name}</strong>. The full
                      curriculum is unlocked for your account.
                    </span>
                    <button
                      type='button'
                      className='btn btn-sm btn-outline-success-600 ms-md-4'
                      onClick={() => setCompletedCourseSlug(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}
              {pendingCourse ? (
                <div className='alert alert-info mb-0' role='alert'>
                  Complete the enrollment for <strong>{pendingCourse.name}</strong> to unlock its
                  weekly curriculum.
                </div>
              ) : null}
            </div>
          </section>
        )}
        {loading ? (
          <section className='py-120'>
            <div className='container d-flex justify-content-center'>
              <div className='text-center'>
                <div className='spinner-border text-main-600 mb-16' role='status'>
                  <span className='visually-hidden'>Loading courses…</span>
                </div>
                <p className='text-neutral-600 mb-0'>Loading the latest course information…</p>
              </div>
            </div>
          </section>
        ) : error ? (
          <section className='py-120'>
            <div className='container'>
              <div className='alert alert-danger mb-0' role='alert'>
                {error}
              </div>
            </div>
          </section>
        ) : (
          <>
            <CourseSeriesOverview heroContent={pageContent.hero} courses={courses} />
            {courses.map((course, index) => (
              <CourseSeriesDetailSection
                key={course.id || course.slug || index}
                course={course}
                isAltBackground={index % 2 === 1}
                onRequestEnrollment={handleStartEnrollment}
              />
            ))}
          </>
        )}
      <FooterOne />
    </>
  );
};

export default OurCoursesPage;
