import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchMyEnrollments } from "../services/userService.js";

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return "";
  }
};

const normalizeText = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : "";

const getInitials = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "GR";
  }

  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const toTitleCase = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

const MyCoursesInner = () => {
  const { isAuthenticated, token, user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({ loading: true, error: null, items: [] });

  useEffect(() => {
    let isActive = true;

    const loadEnrollments = async () => {
      if (!isAuthenticated || !token) {
        if (isActive) {
          setState({ loading: false, error: null, items: [] });
        }
        return;
      }

      if (isActive) {
        setState((previous) => ({ ...previous, loading: true, error: null }));
      }

      try {
        const response = await fetchMyEnrollments({ token });
        if (!isActive) {
          return;
        }

        const items = Array.isArray(response?.items) ? response.items : [];
        setState({ loading: false, error: null, items });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState({
          loading: false,
          error:
            error?.message ||
            "We couldn't load your enrolled courses. Please try again shortly.",
          items: [],
        });
      }
    };

    loadEnrollments();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, token, refreshKey]);

  const greeting = useMemo(() => {
    if (!user) {
      return "Here are the programs you are enrolled in.";
    }

    const firstName = normalizeText(user.firstName);
    if (firstName) {
      return `Hi ${firstName}, here are the programs you are enrolled in.`;
    }

    return "Here are the programs you are enrolled in.";
  }, [user]);

  const handleRefresh = () => setRefreshKey((previous) => previous + 1);

  return (
    <section className='favorite-course py-120'>
      <div className='container'>
        <div className='d-flex flex-wrap align-items-center justify-content-between gap-12 mb-24'>
          <span className='text-neutral-700'>{greeting}</span>
          <button
            type='button'
            className='btn btn-outline-main py-12 px-24 rounded-pill flex-align gap-8 fw-semibold'
            onClick={handleRefresh}
          >
            <i className='ph-bold ph-arrow-clockwise d-flex text-lg' />
            Refresh list
          </button>
        </div>
        <div className='row gy-4'>
          {state.loading ? (
            <div className='col-12'>
              <div className='text-center py-80'>
                <p className='text-neutral-600 mb-0'>Loading your courses...</p>
              </div>
            </div>
          ) : state.error ? (
            <div className='col-12'>
              <div className='text-center py-80'>
                <p className='text-danger-600 mb-12'>{state.error}</p>
                <button
                  type='button'
                  className='btn btn-main py-12 px-32 rounded-pill'
                  onClick={handleRefresh}
                >
                  Try again
                </button>
              </div>
            </div>
          ) : state.items.length === 0 ? (
            <div className='col-12'>
              <div className='text-center py-80'>
                <p className='text-neutral-600 mb-16'>You haven't enrolled in any courses yet.</p>
                <Link
                  to='/our-courses'
                  className='btn btn-main py-12 px-32 rounded-pill text-md fw-semibold'
                >
                  Explore courses
                </Link>
              </div>
            </div>
          ) : (
            state.items.map((enrollment) => {
              const course = enrollment.course || {};
              const courseName = normalizeText(course.name) || "Gradus Course";
              const courseSubtitle = normalizeText(course.subtitle);
              const courseFocus = normalizeText(course.focus);
              const paymentStatus = toTitleCase(enrollment.paymentStatus);
              const enrollmentStatus = toTitleCase(enrollment.status);
              const enrolledAt = formatDate(enrollment.enrolledAt);
              const price = normalizeText(course.price);

              return (
                <div className='col-lg-4 col-sm-6' key={enrollment.id}>
                  <div className='course-item bg-white rounded-16 p-12 h-100 box-shadow-md'>
                    <div className='course-item__thumb rounded-12 overflow-hidden position-relative bg-main-25 flex-center'>
                      <span className='text-main-600 text-2xl fw-semibold'>
                        {getInitials(courseName)}
                      </span>
                    </div>
                    <div className='course-item__content d-flex flex-column h-100'>
                      <div className='flex-grow-1'>
                        <h4 className='mb-12'>{courseName}</h4>
                        {courseSubtitle && (
                          <p className='text-neutral-600 mb-16 text-sm'>{courseSubtitle}</p>
                        )}
                        <div className='d-flex flex-column gap-8 text-sm text-neutral-600 mb-20'>
                          {courseFocus && (
                            <div className='flex-align gap-8'>
                              <span className='text-main-600 text-lg d-flex'>
                                <i className='ph-bold ph-target' />
                              </span>
                              <span>{courseFocus}</span>
                            </div>
                          )}
                          {price && (
                            <div className='flex-align gap-8'>
                              <span className='text-main-600 text-lg d-flex'>
                                <i className='ph-bold ph-currency-circle-dollar' />
                              </span>
                              <span>{price}</span>
                            </div>
                          )}
                          {enrolledAt && (
                            <div className='flex-align gap-8'>
                              <span className='text-main-600 text-lg d-flex'>
                                <i className='ph-bold ph-calendar-blank' />
                              </span>
                              <span>Enrolled on {enrolledAt}</span>
                            </div>
                          )}
                        </div>
                        <div className='d-flex flex-wrap gap-12'>
                          <span className='badge bg-main-25 text-main-600 px-16 py-8 rounded-pill text-sm fw-semibold'>
                            {paymentStatus || "Paid"}
                          </span>
                          <span className='badge bg-neutral-100 text-neutral-700 px-16 py-8 rounded-pill text-sm fw-semibold'>
                            {enrollmentStatus || "Active"}
                          </span>
                        </div>
                      </div>
                      <div className='flex-between gap-8 pt-24 border-top border-neutral-50 mt-28 border-dashed border-0'>
                        <div className='d-flex flex-column'>
                          <span className='text-sm text-neutral-500'>Need another course?</span>
                          <span className='text-md text-main-600 fw-semibold'>Continue learning</span>
                        </div>
                        <Link
                          to='/our-courses'
                          className='flex-align gap-8 text-main-600 hover-text-decoration-underline transition-1 fw-semibold'
                        >
                          Browse
                          <i className='ph ph-arrow-right' />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default MyCoursesInner;
