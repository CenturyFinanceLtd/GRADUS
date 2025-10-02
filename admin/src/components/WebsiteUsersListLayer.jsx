import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import useAuth from "../hook/useAuth";
import { fetchWebsiteUsers } from "../services/adminWebsiteUsers";

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

const toFullName = (user) => {
  const studentName = user?.personalDetails?.studentName;
  if (studentName) {
    return studentName;
  }
  const parts = [user?.firstName, user?.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : "Unnamed User";
};

const getInitials = (value) => {
  if (!value) {
    return "?";
  }
  const parts = String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatEventType = (type) => {
  if (type === "LOGIN") {
    return "Sign In";
  }
  if (type === "LOGOUT") {
    return "Sign Out";
  }
  return type;
};

const WebsiteUsersListLayer = () => {
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState({ search: "" });
  const [expandedUserId, setExpandedUserId] = useState(null);

  const totalUsers = users.length;
  const totalEnrollments = useMemo(
    () => users.reduce((sum, user) => sum + (user.enrollments?.length || 0), 0),
    [users]
  );

  const loadUsers = useCallback(
    async (params = {}) => {
      if (!token) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await fetchWebsiteUsers(token, params);
        const list = Array.isArray(response?.users) ? response.users : [];
        setUsers(list);
      } catch (err) {
        setError(err.message || "Unable to fetch website users.");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters({
        search: searchValue.trim(),
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [searchValue]);

  useEffect(() => {
    loadUsers(filters);
  }, [filters, loadUsers]);

  const handleToggleExpand = (userId) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  const renderCourseList = (user) => {
    if (!user.enrollments || user.enrollments.length === 0) {
      return <span className='text-secondary-light'>No course enrollments yet.</span>;
    }

    return (
      <ul className='list-unstyled mb-0 d-grid gap-8'>
        {user.enrollments.map((enrollment) => (
          <li key={enrollment.id} className='border border-neutral-200 radius-8 p-12'>
            <div className='d-flex justify-content-between flex-wrap gap-8'>
              <div>
                <p className='mb-1 fw-semibold text-md'>{enrollment.courseName}</p>
                <p className='mb-0 text-sm text-secondary-light'>
                  Status: {enrollment.status} • Payment: {enrollment.paymentStatus}
                </p>
              </div>
              <div className='text-sm text-secondary-light text-end'>
                <div>Enrolled: {formatDate(enrollment.enrolledAt)}</div>
                {enrollment.paidAt ? <div>Paid: {formatDate(enrollment.paidAt)}</div> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderRecentEvents = (user) => {
    const events = user.loginStats?.recentEvents || [];
    if (events.length === 0) {
      return <span className='text-secondary-light'>No activity recorded yet.</span>;
    }

    return (
      <ul className='list-unstyled mb-0 d-grid gap-8'>
        {events.map((event, index) => (
          <li key={`${event.type}-${event.occurredAt}-${index}`} className='border border-neutral-200 radius-8 p-12'>
            <div className='d-flex flex-column flex-md-row justify-content-between gap-8'>
              <div className='d-flex align-items-center gap-8'>
                <span className='badge bg-primary-100 text-primary-600 fw-semibold text-uppercase'>
                  {formatEventType(event.type)}
                </span>
                <span className='text-sm text-secondary-light'>{formatDateTime(event.occurredAt)}</span>
              </div>
              <div className='text-sm text-secondary-light text-break'>
                {event.ipAddress ? <span className='me-3'>IP: {event.ipAddress}</span> : null}
                {event.userAgent ? <span className='d-block d-md-inline'>Agent: {event.userAgent}</span> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section className='section-padding'>
      <div className='container'>
        <div className='card radius-16 border-0 shadow-sm'>
          <div className='card-header border-0 pb-0'>
            <div className='d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-16'>
              <div>
                <h4 className='mb-2'>Website Users</h4>
                <p className='mb-0 text-secondary-light text-sm'>
                  View detailed activity for every learner who has signed up on the website.
                </p>
              </div>
              <div className='d-flex flex-column align-items-start align-items-md-end gap-8'>
                <div className='d-flex gap-12'>
                  <div className='text-center'>
                    <p className='mb-0 text-xs text-secondary-light text-uppercase'>Total Users</p>
                    <p className='mb-0 fw-bold text-lg'>{totalUsers}</p>
                  </div>
                  <div className='text-center'>
                    <p className='mb-0 text-xs text-secondary-light text-uppercase'>Total Enrollments</p>
                    <p className='mb-0 fw-bold text-lg'>{totalEnrollments}</p>
                  </div>
                </div>
                <div className='position-relative search-box'>
                  <Icon icon='mingcute:search-line' className='position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary-light' />
                  <input
                    type='search'
                    className='form-control ps-5 radius-12'
                    placeholder='Search by name, email or phone'
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className='card-body'>
            {loading ? (
              <div className='py-5 text-center'>
                <div className='spinner-border text-primary' role='status'>
                  <span className='visually-hidden'>Loading...</span>
                </div>
              </div>
            ) : error ? (
              <div className='alert alert-danger mb-0'>{error}</div>
            ) : users.length === 0 ? (
              <div className='py-5 text-center text-secondary-light'>No website users found.</div>
            ) : (
              <div className='table-responsive'>
                <table className='table align-middle'>
                  <thead className='table-light'>
                    <tr>
                      <th scope='col'>User</th>
                      <th scope='col'>Email</th>
                      <th scope='col'>Phone</th>
                      <th scope='col'>Sign-ins</th>
                      <th scope='col'>Sign-outs</th>
                      <th scope='col'>Last Sign-in</th>
                      <th scope='col'>Last Sign-out</th>
                      <th scope='col'>Courses</th>
                      <th scope='col' className='text-end'>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const fullName = toFullName(user);
                      const isExpanded = expandedUserId === user.id;
                      const courseCount = user.enrollments?.length || 0;
                      const loginStats = user.loginStats || {};
                      return (
                        <Fragment key={user.id}>
                          <tr className='border-bottom border-neutral-200'>
                            <td>
                              <div className='d-flex align-items-center gap-12'>
                                <div className='avatar avatar-md bg-primary-100 text-primary-600 fw-semibold radius-12'>
                                  {getInitials(fullName)}
                                </div>
                                <div>
                                  <p className='mb-0 fw-semibold text-md'>{fullName}</p>
                                  <p className='mb-0 text-xs text-secondary-light'>Joined {formatDate(user.createdAt)}</p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className='text-sm text-secondary-700'>{user.email}</span>
                              {user.emailVerified ? (
                                <span className='badge bg-success-focus text-success-600 ms-2'>Verified</span>
                              ) : null}
                            </td>
                            <td className='text-sm text-secondary-700'>{user.mobile || '—'}</td>
                            <td>{loginStats.totalLogins || 0}</td>
                            <td>{loginStats.totalLogouts || 0}</td>
                            <td className='text-sm text-secondary-700'>{formatDateTime(loginStats.lastLoginAt)}</td>
                            <td className='text-sm text-secondary-700'>{formatDateTime(loginStats.lastLogoutAt)}</td>
                            <td>
                              <span className='badge bg-neutral-200 text-secondary-700 fw-medium'>
                                {courseCount} {courseCount === 1 ? 'Course' : 'Courses'}
                              </span>
                            </td>
                            <td className='text-end'>
                              <button
                                type='button'
                                className='btn btn-link p-0 text-primary fw-semibold text-decoration-none'
                                onClick={() => handleToggleExpand(user.id)}
                              >
                                <span className='d-inline-flex align-items-center gap-1'>
                                  {isExpanded ? 'Hide details' : 'View details'}
                                  <Icon
                                    icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                                    className='fs-4'
                                  />
                                </span>
                              </button>
                            </td>
                          </tr>
                          {isExpanded ? (
                            <tr className='bg-neutral-100'>
                              <td colSpan={9}>
                                <div className='p-4 d-grid gap-24'>
                                  <div className='row g-4'>
                                    <div className='col-12 col-lg-4'>
                                      <h6 className='fw-semibold mb-2 text-secondary-700'>Personal Details</h6>
                                      <div className='d-grid gap-4 text-sm text-secondary-700'>
                                        <div>
                                          <span className='fw-medium'>Student Name:</span> {user.personalDetails?.studentName || '—'}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Email:</span> {user.email || '—'}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Phone:</span> {user.mobile || '—'}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Gender:</span> {user.personalDetails?.gender || '—'}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Date of Birth:</span> {formatDate(user.personalDetails?.dateOfBirth)}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Location:</span>{' '}
                                          {[user.personalDetails?.city, user.personalDetails?.state, user.personalDetails?.country]
                                            .filter(Boolean)
                                            .join(', ') || '—'}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Zip / Postal Code:</span> {user.personalDetails?.zipCode || '—'}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Address:</span> {user.personalDetails?.address || '—'}
                                        </div>
                                      </div>
                                    </div>
                                    <div className='col-12 col-lg-4'>
                                      <h6 className='fw-semibold mb-2 text-secondary-700'>Account Activity</h6>
                                      <div className='d-grid gap-4 text-sm text-secondary-700'>
                                        <div>
                                          <span className='fw-medium'>Total Sign-ins:</span> {loginStats.totalLogins || 0}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Total Sign-outs:</span> {loginStats.totalLogouts || 0}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Last Sign-in:</span> {formatDateTime(loginStats.lastLoginAt)}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Last Sign-out:</span> {formatDateTime(loginStats.lastLogoutAt)}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Account Created:</span> {formatDate(user.createdAt)}
                                        </div>
                                      </div>
                                    </div>
                                    <div className='col-12 col-lg-4'>
                                      <h6 className='fw-semibold mb-2 text-secondary-700'>Education</h6>
                                      <div className='d-grid gap-4 text-sm text-secondary-700'>
                                        <div>
                                          <span className='fw-medium'>Institution:</span> {user.educationDetails?.institutionName || '—'}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Passing Year:</span> {user.educationDetails?.passingYear || '—'}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Field of Study:</span> {user.educationDetails?.fieldOfStudy || '—'}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Class / Grade:</span> {user.educationDetails?.classGrade || '—'}
                                        </div>
                                        <div>
                                          <span className='fw-medium'>Address:</span> {user.educationDetails?.address || '—'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h6 className='fw-semibold mb-3 text-secondary-700'>Recent Sign-in / Sign-out Activity</h6>
                                    {renderRecentEvents(user)}
                                  </div>
                                  <div>
                                    <h6 className='fw-semibold mb-3 text-secondary-700'>Course Enrollments</h6>
                                    {renderCourseList(user)}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WebsiteUsersListLayer;
