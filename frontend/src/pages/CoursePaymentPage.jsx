import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import { enrollInCourse, fetchCoursePage } from "../services/courseService";
import { useAuth } from "../context/AuthContext";

const CoursePaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const courseSlug = (searchParams.get("course") || "").trim().toLowerCase();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCourse = async () => {
      if (!courseSlug) {
        setError("No course was specified for enrollment.");
        setLoading(false);
        return;
      }

      if (!token) {
        navigate(`/sign-in`, {
          replace: true,
          state: {
            redirectTo: `/payment?course=${encodeURIComponent(courseSlug)}`,
            pendingEnrollment: courseSlug,
          },
        });
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetchCoursePage({ token });
        if (!isMounted) {
          return;
        }
        const courses = Array.isArray(response?.courses) ? response.courses : [];
        const matchedCourse = courses.find(
          (item) => item.slug === courseSlug || item.id === courseSlug
        );

        if (!matchedCourse) {
          setCourse(null);
          setError("We couldn't find the selected course.");
          return;
        }

        if (matchedCourse.isEnrolled) {
          navigate(`/our-courses`, {
            replace: true,
            state: { enrollmentCompleted: matchedCourse.slug || courseSlug },
          });
          return;
        }

        setCourse(matchedCourse);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setCourse(null);
        setError(err?.message || "Unable to load course details.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      isMounted = false;
    };
  }, [courseSlug, navigate, token]);

  const handleCompletePayment = async () => {
    if (!courseSlug || !token) {
      return;
    }

    setEnrolling(true);
    setError("");

    try {
      await enrollInCourse({ slug: courseSlug, token });
      navigate(`/our-courses`, {
        replace: true,
        state: { enrollmentCompleted: courseSlug },
      });
    } catch (err) {
      if (err?.status === 409) {
        navigate(`/our-courses`, {
          replace: true,
          state: { enrollmentCompleted: courseSlug },
        });
        return;
      }
      setError(err?.message || "Payment could not be completed. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleCancel = () => {
    navigate("/our-courses");
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className='d-flex justify-content-center py-80'>
          <div className='text-center'>
            <div className='spinner-border text-main-600 mb-16' role='status'>
              <span className='visually-hidden'>Processing…</span>
            </div>
            <p className='text-neutral-600 mb-0'>Preparing a secure checkout experience…</p>
          </div>
        </div>
      );
    }

    if (error && !course) {
      return (
        <div className='card p-32 rounded-24 border border-neutral-40 bg-white'>
          <div className='alert alert-danger mb-24' role='alert'>
            {error}
          </div>
          <button type='button' className='btn btn-main rounded-pill' onClick={handleCancel}>
            Back to Courses
          </button>
        </div>
      );
    }

    if (!course) {
      return null;
    }

    return (
      <div className='card p-32 rounded-24 border border-neutral-40 bg-white box-shadow-md'>
        <h3 className='text-neutral-900 mb-16'>Secure Enrollment Checkout</h3>
        <p className='text-neutral-600 mb-24'>
          Review your program details and confirm the enrollment payment to unlock the complete
          curriculum.
        </p>
        <div className='d-grid gap-16 mb-24'>
          <div className='d-flex justify-content-between align-items-center'>
            <span className='text-neutral-500'>Course</span>
            <span className='text-neutral-900 fw-semibold'>{course.name}</span>
          </div>
          {course.subtitle ? (
            <div className='d-flex justify-content-between align-items-center'>
              <span className='text-neutral-500'>Track</span>
              <span className='text-neutral-900'>{course.subtitle}</span>
            </div>
          ) : null}
          <div className='d-flex justify-content-between align-items-center'>
            <span className='text-neutral-500'>Program Fee</span>
            <span className='text-main-600 fw-semibold text-lg'>{course.price || "Included"}</span>
          </div>
        </div>
        <div className='mb-24 p-24 rounded-20 bg-main-25 border border-main-100'>
          <h5 className='text-neutral-900 mb-12'>Payment Summary</h5>
          <p className='text-neutral-600 mb-0'>
            This is a simulated payment gateway for demo purposes. Selecting “Complete Payment” will
            instantly mark your enrollment as paid.
          </p>
        </div>
        {error ? (
          <div className='alert alert-danger mb-24' role='alert'>
            {error}
          </div>
        ) : null}
        <div className='d-flex flex-wrap gap-12'>
          <button
            type='button'
            className='btn btn-main rounded-pill flex-align gap-8'
            onClick={handleCompletePayment}
            disabled={enrolling}
          >
            {enrolling ? "Completing Payment…" : "Complete Payment"}
            <i className='ph-bold ph-lock-simple-open d-inline-flex text-lg' />
          </button>
          <button
            type='button'
            className='btn btn-outline-neutral-500 rounded-pill'
            onClick={handleCancel}
            disabled={enrolling}
          >
            Cancel and Return
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
        <Breadcrumb title={"Complete Enrollment"} />
        <section className='py-120'>
          <div className='container'>
            <div className='row justify-content-center'>
              <div className='col-xl-7 col-lg-8'>{renderContent()}</div>
            </div>
          </div>
        </section>
      <FooterOne />
    </>
  );
};

export default CoursePaymentPage;
