import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import { useAuthContext } from "../context/AuthContext";
import {
  listAdminCourses,
  fetchCourseProgressAdmin,
  fetchCourseEnrollmentsAdmin,
} from "../services/adminCourses";
import "./CourseProgressPage.css";

const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`;

const CourseProgressPage = () => {
  const { token } = useAuthContext();
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [progressData, setProgressData] = useState([]);
  const [lectureSummary, setLectureSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightUserId, setHighlightUserId] = useState("");
  const [restrictedCourseSlugs, setRestrictedCourseSlugs] = useState(null);
  const [userCourseError, setUserCourseError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const slugParam = params.get("slug");
    const userParam = params.get("userId");
    if (slugParam) {
      setSelectedSlug(slugParam);
    }
    setHighlightUserId(userParam || "");
  }, [location.search]);

  useEffect(() => {
    if (!highlightUserId) {
      setRestrictedCourseSlugs(null);
      setUserCourseError("");
      return;
    }
    let cancelled = false;
    const loadUserCourses = async () => {
      try {
        setUserCourseError("");
        const result = await fetchCourseEnrollmentsAdmin({
          token,
          userId: highlightUserId,
          status: "ACTIVE",
        });
        const items = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : [];
        const allowed = items
          .filter((course) =>
            Array.isArray(course.learners) &&
            course.learners.some((learner) => learner.userId === highlightUserId)
          )
          .map((course) => course.slug)
          .filter(Boolean);
        if (!cancelled) {
          setRestrictedCourseSlugs(allowed);
          if (allowed.length) {
            if (!allowed.includes(selectedSlug)) {
              setSelectedSlug(allowed[0]);
            }
          } else {
            setSelectedSlug("");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setRestrictedCourseSlugs([]);
          setUserCourseError(err?.message || "Unable to load learner enrollments.");
        }
      }
    };
    loadUserCourses();
    return () => {
      cancelled = true;
    };
  }, [highlightUserId, token]);

  useEffect(() => {
    let cancelled = false;
    const loadCourses = async () => {
      try {
        const list = await listAdminCourses({ token });
        if (!cancelled) {
          setCourses(list);
          if (!selectedSlug && list.length) {
            setSelectedSlug(list[0].slug);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load courses.");
        }
      }
    };
    loadCourses();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedSlug) {
      setProgressData([]);
      setLectureSummary([]);
      return;
    }
    let cancelled = false;
    const loadProgress = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchCourseProgressAdmin({ slug: selectedSlug, token });
        if (!cancelled) {
          setProgressData(data.progress || []);
          setLectureSummary(data.lectureSummary || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load progress.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    loadProgress();
    return () => {
      cancelled = true;
    };
  }, [selectedSlug, token]);

  const highlightLearner = useMemo(() => {
    if (!highlightUserId) return null;
    return progressData.find((entry) => entry.userId === highlightUserId) || null;
  }, [highlightUserId, progressData]);

  const dropdownCourses = useMemo(() => {
    if (!highlightUserId || !Array.isArray(restrictedCourseSlugs)) {
      return courses;
    }
    if (!restrictedCourseSlugs.length) {
      return [];
    }
    const allowed = new Set(restrictedCourseSlugs);
    return courses.filter((course) => allowed.has(course.slug));
  }, [courses, highlightUserId, restrictedCourseSlugs]);

  const filteredProgress = useMemo(() => {
    if (highlightUserId) {
      return progressData.filter((entry) => entry.userId === highlightUserId);
    }
    if (!searchTerm) {
      return progressData;
    }
    const term = searchTerm.trim().toLowerCase();
    return progressData.filter(
      (entry) =>
        entry.userName?.toLowerCase().includes(term) ||
        entry.userEmail?.toLowerCase().includes(term)
    );
  }, [progressData, searchTerm, highlightUserId]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.slug === selectedSlug),
    [courses, selectedSlug]
  );

  const aggregateStats = useMemo(() => {
    const learners = progressData.length;
    const totalLectures = progressData.reduce(
      (acc, entry) => acc + (entry.totalLectures || 0),
      0
    );
    const totalCompleted = progressData.reduce(
      (acc, entry) => acc + (entry.completedLectures || 0),
      0
    );
    const avgCompletion =
      totalLectures > 0 ? Math.round((totalCompleted / totalLectures) * 100) : 0;
    return {
      learners,
      totalLectures,
      avgCompletion,
      lectureOverview: lectureSummary.length,
    };
  }, [progressData, lectureSummary]);

  return (
    <MasterLayout>
      <section className='section py-4 course-progress-page'>
        <div className='container-fluid'>
          <div className='progress-hero mb-4'>
            <div>
              <span className='hero-eyebrow'>Analytics</span>
              <div className='hero-title'>Course Progress</div>
              <p className='hero-subtitle mb-0'>
                Visualize how learners advance through every lecture, spot drop-offs instantly,
                and jump straight into individual timelines.
              </p>
            </div>
            <div className='hero-stats'>
              <div className='hero-stat'>
                <span className='label'>Learners tracked</span>
                <strong>{aggregateStats.learners}</strong>
              </div>
              <div className='hero-stat'>
                <span className='label'>Avg completion</span>
                <strong>{aggregateStats.avgCompletion}%</strong>
              </div>
              <div className='hero-stat'>
                <span className='label'>Lectures monitored</span>
                <strong>{aggregateStats.lectureOverview}</strong>
              </div>
            </div>
          </div>

          <div className='progress-toolbar card border-0 shadow-sm mb-4'>
            <div className='filter-grid'>
              <select
                className='form-select filter-input'
                value={selectedSlug}
                onChange={(event) => setSelectedSlug(event.target.value)}
              >
                <option value=''>Select a course</option>
                {dropdownCourses.map((course) => (
                  <option key={course.slug} value={course.slug}>
                    {course.name}
                  </option>
                ))}
              </select>
              <input
                type='search'
                className='form-control filter-input'
                placeholder='Filter by learner name or email'
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                disabled={Boolean(highlightUserId)}
              />
            </div>
            <div className='toolbar-hint'>
              {highlightUserId
                ? "Search is disabled when a learner filter is active. Clear the URL parameter to browse all learners."
                : "Drill into a course, then refine by learner to compare completion velocity."}
            </div>
          </div>

          {highlightUserId &&
          Array.isArray(restrictedCourseSlugs) &&
          !restrictedCourseSlugs.length ? (
            <div className='alert alert-warning'>
              This learner does not have any active course enrollments yet.
            </div>
          ) : null}
          {userCourseError ? (
            <div className='alert alert-warning'>{userCourseError}</div>
          ) : null}

          {selectedCourse ? (
            <div className='course-spotlight card border-0 shadow-sm mb-4'>
              <div className='course-spotlight__content'>
                <div>
                  <span className='course-pill'>{selectedCourse.programme || "Gradus Programme"}</span>
                  <h4 className='mb-1'>{selectedCourse.name}</h4>
                  <p className='mb-0 text-muted'>
                    {aggregateStats.learners} learners | {aggregateStats.totalLectures} lecture touch points
                  </p>
                </div>
                <div className='course-spotlight__meta'>
                  <div>
                    <span className='text-uppercase text-muted small'>Avg completion</span>
                    <h3 className='mb-0 text-primary'>{aggregateStats.avgCompletion}%</h3>
                  </div>
                  <div>
                    <span className='text-uppercase text-muted small'>Filter</span>
                    <p className='mb-0 fw-semibold'>{highlightLearner ? "Single learner" : "All learners"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {error ? <div className='alert alert-danger'>{error}</div> : null}
          {highlightUserId ? (
            <div className='info-banner info-banner--accent d-flex justify-content-between align-items-center'>
              <span className='me-3'>
                {highlightLearner ? (
                  <>
                    {(() => {
                      const primaryName =
                        highlightLearner.userName || highlightLearner.userEmail || "Unknown learner";
                      const email = highlightLearner.userEmail;
                      const showEmail =
                        email &&
                        email.toLowerCase() !== (highlightLearner.userName || "").toLowerCase();
                      return (
                        <>
                          Showing progress for <strong>{primaryName}</strong>
                          {showEmail ? (
                            <span className='text-muted ms-1'>({email})</span>
                          ) : null}
                          . Use the button to clear the parameter and view every learner.
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    Showing progress for learner ID <strong>{highlightUserId}</strong>. Clear the
                    parameter to view all learners.
                  </>
                )}
              </span>
              <button
                type='button'
                className='btn btn-sm btn-outline-secondary rounded-pill px-3'
                onClick={() => {
                  setHighlightUserId("");
                }}
              >
                Clear filter
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className='text-center py-5'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
            </div>
          ) : filteredProgress.length ? (
            filteredProgress.map((entry) => (
              <div className='card learner-card mb-4' key={entry.userId || entry.userEmail}>
                <div className='learner-card__header'>
                  <div>
                    <h6 className='mb-0'>{entry.userName || "Unknown learner"}</h6>
                    <small className='text-muted'>{entry.userEmail}</small>
                  </div>
                  <div className='learner-card__chips'>
                    <span className='progress-pill'>
                      {entry.completedLectures}/{entry.totalLectures} lectures
                    </span>
                    <span className='progress-pill progress-pill--accent'>
                      {formatPercent(
                        entry.totalLectures
                          ? entry.completedLectures / entry.totalLectures
                          : 0
                      )}{" "}
                      complete
                    </span>
                  </div>
                </div>
                <div className='learner-card__body'>
                  <div className='table-responsive'>
                    <table className='table align-middle mb-0 learner-table'>
                      <thead>
                        <tr>
                          <th>Lecture</th>
                          <th>Module</th>
                          <th>Progress</th>
                          <th className='text-center'>Complete</th>
                          <th className='text-end'>Last update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.lectures
                          .sort((a, b) =>
                            (a.lectureTitle || "").localeCompare(b.lectureTitle || "")
                          )
                          .map((lecture) => (
                            <tr key={lecture.lectureId}>
                              <td>
                                <strong>{lecture.lectureTitle || "Lecture"}</strong>
                              </td>
                              <td>
                                <div className='module-cell'>
                                  <span className='module-title'>
                                    {lecture.moduleLabel ||
                                      lecture.moduleTitle ||
                                      lecture.moduleId ||
                                      "—"}
                                  </span>
                                  {lecture.sectionLabel ? (
                                    <span className='module-week'>{lecture.sectionLabel}</span>
                                  ) : null}
                                </div>
                              </td>
                              <td style={{ minWidth: 180 }}>
                                <div className='progress-track'>
                                  <div className='progress-track__bar'>
                                    <div
                                      className='progress-track__fill'
                                      style={{ width: formatPercent(lecture.completionRatio) }}
                                    />
                                  </div>
                                  <span className='progress-track__value'>
                                    {formatPercent(lecture.completionRatio)}
                                  </span>
                                </div>
                              </td>
                              <td className='text-center'>
                                {lecture.completedAt ? (
                                  <span className='badge bg-success-subtle text-success-emphasis'>
                                    Done
                                  </span>
                                ) : (
                                  <span className='badge bg-secondary-subtle text-secondary-emphasis'>
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className='text-end text-muted small'>
                                {lecture.updatedAt
                                  ? new Date(lecture.updatedAt).toLocaleString()
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className='alert alert-info'>
              {selectedSlug
                ? "No learner progress has been recorded for this course yet."
                : "Select a course to view progress details."}
            </div>
          )}

          {lectureSummary.length ? (
            <div className='card lecture-overview-card border-0 shadow-sm'>
              <div className='card-header border-0 bg-transparent'>
                <h6 className='mb-0'>Lecture overview</h6>
                <p className='text-muted mb-0'>
                  Aggregate view of every lecture, how many learners saw it, and completion ratios.
                </p>
              </div>
              <div className='card-body p-0'>
                <div className='table-responsive'>
                  <table className='table align-middle mb-0 overview-table'>
                    <thead>
                      <tr>
                        <th>Lecture</th>
                        <th>Module</th>
                        <th className='text-center'>Learners</th>
                        <th className='text-center'>Completed</th>
                        <th>Avg completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lectureSummary
                        .sort((a, b) =>
                          (a.lectureTitle || "").localeCompare(b.lectureTitle || "")
                        )
                        .map((lecture) => (
                          <tr key={lecture.lectureId}>
                            <td>{lecture.lectureTitle || lecture.lectureId}</td>
                            <td>
                              <div className='module-cell'>
                                <span className='module-title'>
                                  {lecture.moduleLabel ||
                                    lecture.moduleTitle ||
                                    lecture.moduleId ||
                                    "—"}
                                </span>
                                {lecture.sectionLabel ? (
                                  <span className='module-week'>{lecture.sectionLabel}</span>
                                ) : null}
                              </div>
                            </td>
                            <td className='text-center'>{lecture.learners}</td>
                            <td className='text-center'>{lecture.completed}</td>
                            <td style={{ minWidth: 200 }}>
                              <div className='progress-track progress-track--thin'>
                                <div className='progress-track__bar'>
                                  <div
                                    className='progress-track__fill progress-track__fill--success'
                                    style={{ width: formatPercent(lecture.avgCompletion) }}
                                  />
                                </div>
                                <span className='progress-track__value'>
                                  {formatPercent(lecture.avgCompletion)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </MasterLayout>
  );
};

export default CourseProgressPage;
