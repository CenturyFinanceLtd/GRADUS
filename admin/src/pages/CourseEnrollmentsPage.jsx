import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import { useAuthContext } from "../context/AuthContext";
import { fetchCourseEnrollmentsAdmin, listAdminCourses } from "../services/adminCourses";
import "./CourseEnrollmentsPage.css";

const statusBadgeClass = {
  ACTIVE: "bg-success-subtle text-success-emphasis",
  CANCELLED: "bg-danger-subtle text-danger-emphasis",
};

const paymentBadgeClass = {
  PAID: "bg-success-subtle text-success-emphasis",
  PENDING: "bg-warning-subtle text-warning-emphasis",
  FAILED: "bg-danger-subtle text-danger-emphasis",
  REFUNDED: "bg-info-subtle text-info-emphasis",
};

const CourseEnrollmentsPage = () => {
  const { token } = useAuthContext();
  const [courses, setCourses] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadCourseList = async () => {
      try {
        const courseList = await listAdminCourses({ token });
        if (!cancelled) {
          setCourseOptions(courseList);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load enrollments.");
        }
      }
    };
    if (token) {
      loadCourseList();
    }
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const loadEnrollments = async () => {
      try {
        setLoading(true);
        const data = await fetchCourseEnrollmentsAdmin({
          token,
          slug: selectedSlug || undefined,
          status: statusFilter || undefined,
          paymentStatus: paymentFilter || undefined,
        });
        const normalized = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        if (!cancelled) {
          setCourses(normalized);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load enrollments.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    if (token) {
      loadEnrollments();
    }
    return () => {
      cancelled = true;
    };
  }, [token, selectedSlug, statusFilter, paymentFilter]);

  const filteredCourses = useMemo(() => {
    const source = selectedSlug
      ? courses.filter((course) => course.slug === selectedSlug)
      : courses;
    if (!search) {
      return source;
    }
    const term = search.trim().toLowerCase();
    return source.filter(
      (course) =>
        course.name?.toLowerCase().includes(term) ||
        course.programme?.toLowerCase().includes(term)
    );
  }, [courses, search, selectedSlug]);

  const summaryStats = useMemo(() => {
    const totalCourses = filteredCourses.length;
    const totalEnrollments = filteredCourses.reduce(
      (acc, course) => acc + (course.totalEnrollments || 0),
      0
    );
    const totalPaid = filteredCourses.reduce(
      (acc, course) => acc + (course.paidEnrollments || 0),
      0
    );
    const paidPercent = totalEnrollments
      ? Math.round((totalPaid / totalEnrollments) * 100)
      : 0;
    return { totalCourses, totalEnrollments, totalPaid, paidPercent };
  }, [filteredCourses]);

  return (
    <MasterLayout>
      <section className='section py-4 course-enrollments'>
        <div className='container-fluid'>
          <div className='enrollment-hero mb-4'>
            <div>
              <span className='hero-eyebrow'>Analytics</span>
              <div className='hero-title'>Course Enrollments</div>
              <p className='hero-subtitle mb-0'>
                Track how learners are joining programmes, monitor payment status, and jump
                into detailed progress.
              </p>
            </div>
            <div className='hero-stats'>
              <div className='hero-stat'>
                <span className='label'>Courses</span>
                <strong>{summaryStats.totalCourses}</strong>
              </div>
              <div className='hero-stat'>
                <span className='label'>Enrollments</span>
                <strong>{summaryStats.totalEnrollments}</strong>
              </div>
              <div className='hero-stat'>
                <span className='label'>Paid</span>
                <strong>{summaryStats.totalPaid}</strong>
                <small>{summaryStats.paidPercent}% paid</small>
              </div>
            </div>
          </div>

          <div className='filter-toolbar card border-0 shadow-sm mb-4'>
            <div className='filter-grid'>
              <select
                className='form-select filter-input'
                value={selectedSlug}
                onChange={(event) => setSelectedSlug(event.target.value)}
              >
                <option value=''>All courses</option>
                {courseOptions.map((course) => (
                  <option key={course.slug} value={course.slug}>
                    {course.name}
                  </option>
                ))}
              </select>
              <select
                className='form-select filter-input'
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value=''>All statuses</option>
                <option value='ACTIVE'>Active</option>
                <option value='CANCELLED'>Cancelled</option>
              </select>
              <select
                className='form-select filter-input'
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
              >
                <option value=''>All payment states</option>
                <option value='PAID'>Paid</option>
                <option value='PENDING'>Pending</option>
                <option value='FAILED'>Failed</option>
                <option value='REFUNDED'>Refunded</option>
              </select>
              <input
                type='search'
                className='form-control filter-input'
                style={{ maxWidth: 280 }}
                placeholder='Search by course or programme'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className='toolbar-hint'>
              Use filters to zero in on a specific cohort, then open their progress directly.
            </div>
          </div>

          {error ? <div className='alert alert-danger'>{error}</div> : null}
          {loading ? (
            <div className='text-center py-5'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
            </div>
          ) : filteredCourses.length ? (
            filteredCourses.map((course) => (
              <div className='card enrollment-card mb-4' key={course.slug}>
                <div className='card-header border-0'>
                  <div className='course-card-header'>
                    <div>
                      <p className='course-programme mb-2'>{course.programme}</p>
                      <h5 className='mb-1'>{course.name}</h5>
                      <p className='course-meta mb-0'>
                        {course.learners.length} learners · Updated{" "}
                        {new Date().toLocaleDateString(undefined, {
                          month: "short",
                          day: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className='course-stats'>
                      <div className='stat-chip'>
                        <span>Total</span>
                        <strong>{course.totalEnrollments}</strong>
                      </div>
                      <div className='stat-chip stat-chip--success'>
                        <span>Paid</span>
                        <strong>{course.paidEnrollments}</strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div className='card-body p-0'>
                  {course.learners.length ? (
                    <div className='table-responsive'>
                      <table className='table align-middle mb-0 enrollment-table'>
                        <thead className='table-light'>
                          <tr>
                            <th>Learner</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Location</th>
                            <th>Status</th>
                            <th>Payment</th>
                            <th>Enrolled</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {course.learners.map((learner) => (
                            <tr key={`${course.slug}-${learner.userId}`}>
                              <td>
                                <strong>{learner.name}</strong>
                                {learner.institution ? (
                                  <div className='text-muted small'>{learner.institution}</div>
                                ) : null}
                              </td>
                              <td>{learner.email}</td>
                              <td>{learner.phone || "—"}</td>
                              <td>
                                <small className='text-muted'>
                                  {[learner.city, learner.state].filter(Boolean).join(", ") || "—"}
                                </small>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    statusBadgeClass[learner.status] ||
                                    "bg-secondary-subtle text-secondary-emphasis"
                                  }`}
                                >
                                  {learner.status || "—"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    paymentBadgeClass[learner.paymentStatus] ||
                                    "bg-secondary-subtle text-secondary-emphasis"
                                  }`}
                                >
                                  {learner.paymentStatus || "—"}
                                </span>
                              </td>
                              <td>
                                <small className='text-muted'>
                                  {learner.createdAt
                                    ? new Date(learner.createdAt).toLocaleString()
                                    : "—"}
                                </small>
                              </td>
                              <td className='text-end'>
                                {learner.userId ? (
                                  <Link
                                    to={`/course-progress?slug=${encodeURIComponent(
                                      course.slug
                                    )}&userId=${encodeURIComponent(learner.userId)}`}
                                    className='btn btn-link btn-sm text-decoration-none'
                                  >
                                    View progress
                                  </Link>
                                ) : (
                                  <span className='text-muted small'>No progress data</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className='p-4 text-center text-muted'>
                      No enrollments recorded for this course.
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className='alert alert-info'>
              No course enrollments found. Learner sign ups will appear here automatically.
            </div>
          )}
        </div>
      </section>
    </MasterLayout>
  );
};

export default CourseEnrollmentsPage;
