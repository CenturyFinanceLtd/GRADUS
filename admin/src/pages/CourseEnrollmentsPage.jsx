import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import { useAuthContext } from "../context/AuthContext";
import { fetchCourseEnrollmentsAdmin, listAdminCourses } from "../services/adminCourses";

const statusBadgeClass = {
  ACTIVE: "text-bg-success-subtle",
  CANCELLED: "text-bg-danger-subtle",
};

const paymentBadgeClass = {
  PAID: "text-bg-success-subtle",
  PENDING: "text-bg-warning-subtle",
  FAILED: "text-bg-danger-subtle",
  REFUNDED: "text-bg-info-subtle",
};

const CourseEnrollmentsPage = () => {
  const { token } = useAuthContext();
  const [courses, setCourses] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        setLoading(true);
        const [courseList, data] = await Promise.all([
          listAdminCourses({ token }),
          fetchCourseEnrollmentsAdmin({ token }),
        ]);
        const normalized = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        if (!cancelled) {
          setCourseOptions(courseList);
          setCourses(normalized);
          if (!selectedSlug && courseList.length) {
            setSelectedSlug(courseList[0].slug);
          }
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
    loadData();
    return () => {
      cancelled = true;
    };
  }, [token]);

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

  return (
    <MasterLayout>
      <section className='section py-4'>
        <div className='container-fluid'>
          <div className='d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4'>
            <div>
              <p className='text-uppercase text-muted small mb-1'>Analytics</p>
              <h4 className='mb-0'>Course Enrollments</h4>
            </div>
            <div className='d-flex flex-wrap gap-2'>
              <select
                className='form-select'
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
              <input
                type='search'
                className='form-control'
                style={{ maxWidth: 280 }}
                placeholder='Search by course or programme'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
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
              <div className='card mb-4' key={course.slug}>
                <div className='card-header d-flex flex-wrap align-items-center gap-3'>
                  <div>
                    <p className='text-uppercase text-muted small mb-1'>
                      {course.programme}
                    </p>
                    <h5 className='mb-0'>{course.name}</h5>
                  </div>
                  <div className='ms-auto d-flex flex-wrap gap-3'>
                    <div>
                      <small className='text-muted d-block text-uppercase'>Total</small>
                      <span className='badge bg-primary-subtle text-primary'>
                        {course.totalEnrollments}
                      </span>
                    </div>
                    <div>
                      <small className='text-muted d-block text-uppercase'>Paid</small>
                      <span className='badge bg-success-subtle text-success'>
                        {course.paidEnrollments}
                      </span>
                    </div>
                  </div>
                </div>
                <div className='card-body p-0'>
                  {course.learners.length ? (
                    <div className='table-responsive'>
                      <table className='table align-middle mb-0'>
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
                                    "text-bg-secondary-subtle"
                                  }`}
                                >
                                  {learner.status}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    paymentBadgeClass[learner.paymentStatus] ||
                                    "text-bg-secondary-subtle"
                                  }`}
                                >
                                  {learner.paymentStatus}
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
