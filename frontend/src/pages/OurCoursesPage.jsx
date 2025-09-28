import { useEffect, useMemo, useState } from "react";
import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import CourseSeriesOverview from "../components/ourCourses/CourseSeriesOverview";
import CourseSeriesDetailSection from "../components/ourCourses/CourseSeriesDetailSection";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import { fetchCoursePage } from "../services/courseService";

const OurCoursesPage = () => {
  const [pageContent, setPageContent] = useState({ hero: null, courses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadCoursePage = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchCoursePage();
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
  }, []);

  const courses = useMemo(
    () => (Array.isArray(pageContent.courses) ? pageContent.courses.filter((course) => course?.name) : []),
    [pageContent.courses]
  );

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
        <Breadcrumb title={"Our Courses"} />
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
              />
            ))}
          </>
        )}
      <FooterOne />
    </>
  );
};

export default OurCoursesPage;
