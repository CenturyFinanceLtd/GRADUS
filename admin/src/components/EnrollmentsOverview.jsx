import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import useAuth from "../hook/useAuth";
import { fetchCourseEnrollments } from "../services/adminCourses";

const COURSES_PER_PAGE = 3;

const getCourseKey = (course) => {
  if (!course) {
    return null;
  }

  return course.id || course.slug || course.name || null;
};

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const EnrollmentsOverview = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourseKey, setSelectedCourseKey] = useState(null);
  const [tabPage, setTabPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    const loadEnrollments = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchCourseEnrollments({ token });
        if (!isMounted) {
          return;
        }

        const enrollmentItems = Array.isArray(response?.items) ? response.items : [];
        setEnrollments(enrollmentItems);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err?.message || "Failed to load enrollment records.");
        setEnrollments([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEnrollments();

    return () => {
      isMounted = false;
    };
  }, [token, refreshKey]);

  const courseSummaries = useMemo(() => {
    const map = new Map();

    enrollments.forEach((enrollment) => {
      const key = getCourseKey(enrollment.course);
      if (!key) {
        return;
      }

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: enrollment.course?.name || "Untitled Course",
          slug: enrollment.course?.slug || "",
          total: 0,
        });
      }

      const summary = map.get(key);
      summary.total += 1;
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [enrollments]);

  const courseChunks = useMemo(() => {
    if (!courseSummaries.length) {
      return [];
    }

    const chunks = [];
    for (let index = 0; index < courseSummaries.length; index += COURSES_PER_PAGE) {
      chunks.push(courseSummaries.slice(index, index + COURSES_PER_PAGE));
    }
    return chunks;
  }, [courseSummaries]);

  useEffect(() => {
    if (!courseChunks.length) {
      if (selectedCourseKey !== null) {
        setSelectedCourseKey(null);
      }
      if (tabPage !== 0) {
        setTabPage(0);
      }
      return;
    }

    if (tabPage >= courseChunks.length) {
      setTabPage(courseChunks.length - 1);
      return;
    }

    const currentChunk = courseChunks[tabPage] || [];
    if (!currentChunk.length) {
      return;
    }

    const hasSelectedCourse = currentChunk.some((course) => course.key === selectedCourseKey);
    if (!hasSelectedCourse) {
      setSelectedCourseKey(currentChunk[0]?.key || null);
    }
  }, [courseChunks, tabPage, selectedCourseKey]);

  const enrollmentCountByCourse = useMemo(() => {
    const counts = {};

    enrollments.forEach((enrollment) => {
      const key = getCourseKey(enrollment.course);
      if (!key) {
        return;
      }
      counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
  }, [enrollments]);

  const filteredEnrollments = useMemo(() => {
    if (!selectedCourseKey) {
      return [];
    }

    return enrollments.filter((enrollment) => getCourseKey(enrollment.course) === selectedCourseKey);
  }, [enrollments, selectedCourseKey]);

  const activeCourse = useMemo(
    () => courseSummaries.find((course) => course.key === selectedCourseKey) || null,
    [courseSummaries, selectedCourseKey]
  );

  const totalCourses = courseSummaries.length;
  const chunkStartIndex = tabPage * COURSES_PER_PAGE;
  const chunkEndIndex = Math.min(chunkStartIndex + COURSES_PER_PAGE, totalCourses);
  const currentChunk = courseChunks[tabPage] || [];

  const handleRefresh = () => setRefreshKey((previous) => previous + 1);

  return (
    <div className='card p-24'>
      <div className='d-flex flex-wrap justify-content-between align-items-center gap-16 mb-24'>
        <div>
          <h5 className='mb-8'>Recent Enrollments</h5>
          <p className='text-neutral-500 mb-0'>Monitor which learners have been enrolled into your courses.</p>
        </div>
        <div className='d-flex gap-12'>
          <button
            type='button'
            className='btn btn-outline-primary radius-8'
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className='alert alert-warning mb-24' role='alert'>
          {error}
        </div>
      ) : null}

      <div className='row g-24'>
        <div className='col-12 col-xl-4 col-xxl-3'>
          <div className='card h-100'>
            <div className='card-body d-flex flex-column gap-16'>
              <div>
                <span className='badge bg-primary-50 text-primary-600 border border-primary-100 px-16 py-8 radius-8 fw-semibold text-sm'>
                  Courses
                </span>
                <h6 className='mt-12 mb-8 text-neutral-900'>Filter by program</h6>
                <p className='text-neutral-500 text-sm mb-0'>Select a course to view the learners enrolled in it.</p>
              </div>

              {totalCourses > COURSES_PER_PAGE ? (
                <div className='d-flex align-items-center justify-content-between gap-12'>
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-secondary-600 d-flex align-items-center gap-4'
                    onClick={() => setTabPage((previous) => Math.max(previous - 1, 0))}
                    disabled={tabPage === 0}
                  >
                    <Icon icon='mdi:chevron-left' />
                    Previous
                  </button>
                  <span className='text-sm text-neutral-500'>
                    {`Courses ${chunkStartIndex + 1}-${chunkEndIndex} of ${totalCourses}`}
                  </span>
                  <button
                    type='button'
                    className='btn btn-sm btn-outline-secondary-600 d-flex align-items-center gap-4'
                    onClick={() =>
                      setTabPage((previous) =>
                        Math.min(previous + 1, Math.max(courseChunks.length - 1, 0))
                      )
                    }
                    disabled={tabPage >= courseChunks.length - 1}
                  >
                    Next
                    <Icon icon='mdi:chevron-right' />
                  </button>
                </div>
              ) : null}

              <div className='d-flex flex-column gap-12'>
                {loading && !courseChunks.length ? (
                  <div className='d-flex justify-content-center py-32'>
                    <div className='spinner-border text-primary' role='status'>
                      <span className='visually-hidden'>Loading…</span>
                    </div>
                  </div>
                ) : currentChunk.length ? (
                  currentChunk.map((course) => {
                    const isActive = course.key === selectedCourseKey;
                    const enrollmentTotal = enrollmentCountByCourse[course.key] || 0;

                    return (
                      <button
                        key={course.key}
                        type='button'
                        className={`w-100 text-start d-flex align-items-start justify-content-between gap-12 px-16 py-12 radius-12 border ${
                          isActive
                            ? "border-primary-600 bg-primary-50 text-primary-700 shadow-sm"
                            : "border-neutral-200 bg-white text-neutral-900"
                        }`}
                        onClick={() => setSelectedCourseKey(course.key)}
                      >
                        <div className='d-flex flex-column gap-4'>
                          <span className='fw-semibold'>{course.name}</span>
                          <span className='text-sm text-neutral-500'>{course.slug || "—"}</span>
                        </div>
                        <span
                          className={`badge px-12 py-6 radius-8 text-xs fw-semibold ${
                            isActive ? "bg-primary-600 text-white" : "bg-neutral-200 text-neutral-700"
                          }`}
                        >
                          {enrollmentTotal} {enrollmentTotal === 1 ? "learner" : "learners"}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className='alert alert-info mb-0' role='alert'>
                    {error ? "Unable to load courses." : "No courses have enrollments yet."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='col-12 col-xl-8 col-xxl-9'>
          <div className='card h-100'>
            <div className='card-body'>
              {loading ? (
                <div className='d-flex justify-content-center py-64'>
                  <div className='spinner-border text-primary' role='status'>
                    <span className='visually-hidden'>Loading…</span>
                  </div>
                </div>
              ) : !selectedCourseKey ? (
                <div className='alert alert-info mb-0' role='alert'>
                  No enrollments have been recorded yet.
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <div className='alert alert-info mb-0' role='alert'>
                  No learners are currently enrolled in {activeCourse?.name || "this course"}.
                </div>
              ) : (
                <>
                  <div className='d-flex flex-wrap justify-content-between align-items-center gap-16 mb-24'>
                    <div>
                      <h6 className='mb-4 text-neutral-900'>{activeCourse?.name}</h6>
                      <p className='text-neutral-500 text-sm mb-0'>
                        Showing {filteredEnrollments.length} {filteredEnrollments.length === 1 ? "learner" : "learners"} enrolled in this course.
                      </p>
                    </div>
                    <div className='text-end'>
                      <span className='badge bg-primary-50 text-primary-600 border border-primary-100 px-12 py-6 radius-8 fw-semibold text-xs'>
                        {activeCourse?.slug || "—"}
                      </span>
                    </div>
                  </div>

                  <div className='table-responsive'>
                    <table className='table align-middle'>
                      <thead>
                        <tr>
                          <th>Learner</th>
                          <th>Course</th>
                          <th>Status</th>
                          <th>Payment</th>
                          <th>Enrolled On</th>
                          <th>Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEnrollments.map((enrollment) => {
                          const studentName = enrollment.student
                            ? `${enrollment.student.firstName || ""} ${enrollment.student.lastName || ""}`.trim() ||
                              enrollment.student.email ||
                              "Learner"
                            : "Learner";
                          const studentEmail = enrollment.student?.email || "—";
                          const courseName = enrollment.course?.name || "—";
                          const courseSlug = enrollment.course?.slug || "";
                          const statusBadgeClass =
                            enrollment.status === "ACTIVE"
                              ? "badge bg-success-600 text-white"
                              : "badge bg-neutral-200 text-neutral-700";
                          const paymentBadgeClass =
                            enrollment.paymentStatus === "PAID"
                              ? "badge bg-success-600 text-white"
                              : "badge bg-warning-600 text-white";

                          return (
                            <tr key={enrollment.id}>
                              <td>
                                <div className='d-flex flex-column'>
                                  <span className='fw-semibold text-neutral-900'>{studentName}</span>
                                  <span className='text-neutral-500 text-sm'>{studentEmail}</span>
                                </div>
                              </td>
                              <td>
                                <div className='d-flex flex-column'>
                                  <span className='fw-medium text-neutral-900'>{courseName}</span>
                                  <span className='text-neutral-500 text-sm'>{courseSlug || "—"}</span>
                                </div>
                              </td>
                              <td>
                                <span className={statusBadgeClass}>{enrollment.status}</span>
                              </td>
                              <td>
                                <span className={paymentBadgeClass}>{enrollment.paymentStatus}</span>
                              </td>
                              <td>{formatDateTime(enrollment.enrolledAt)}</td>
                              <td className='text-neutral-600 text-sm'>
                                {enrollment.paymentReference || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentsOverview;
