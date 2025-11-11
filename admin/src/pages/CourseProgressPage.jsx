import { useEffect, useMemo, useState } from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import { useAuthContext } from "../context/AuthContext";
import {
  listAdminCourses,
  fetchCourseProgressAdmin,
} from "../services/adminCourses";

const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`;

const CourseProgressPage = () => {
  const { token } = useAuthContext();
  const [courses, setCourses] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [progressData, setProgressData] = useState([]);
  const [lectureSummary, setLectureSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredProgress = useMemo(() => {
    if (!searchTerm) {
      return progressData;
    }
    const term = searchTerm.trim().toLowerCase();
    return progressData.filter(
      (entry) =>
        entry.userName?.toLowerCase().includes(term) ||
        entry.userEmail?.toLowerCase().includes(term)
    );
  }, [progressData, searchTerm]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.slug === selectedSlug),
    [courses, selectedSlug]
  );

  return (
    <MasterLayout>
      <section className='section py-4'>
        <div className='container-fluid'>
          <div className='d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4'>
            <div>
              <p className='text-uppercase text-muted small mb-1'>Analytics</p>
              <h4 className='mb-0'>Course Progress</h4>
            </div>
            <div className='d-flex flex-wrap gap-2'>
              <select
                className='form-select'
                value={selectedSlug}
                onChange={(event) => setSelectedSlug(event.target.value)}
              >
                <option value=''>Select a course</option>
                {courses.map((course) => (
                  <option key={course.slug} value={course.slug}>
                    {course.name}
                  </option>
                ))}
              </select>
              <input
                type='search'
                className='form-control'
                placeholder='Filter by learner name or email'
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          {selectedCourse ? (
            <div className='card mb-4'>
              <div className='card-body d-flex flex-wrap align-items-center gap-4'>
                <div>
                  <p className='text-uppercase text-muted small mb-1'>Course</p>
                  <h5 className='mb-0'>{selectedCourse.name}</h5>
                  <span className='text-muted'>
                    {selectedCourse.programme || "Gradus Programme"}
                  </span>
                </div>
                <div className='ms-auto text-end'>
                  <p className='text-uppercase text-muted small mb-1'>Learners tracked</p>
                  <h4 className='mb-0'>{progressData.length}</h4>
                </div>
              </div>
            </div>
          ) : null}

          {error ? <div className='alert alert-danger'>{error}</div> : null}
          {loading ? (
            <div className='text-center py-5'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
            </div>
          ) : filteredProgress.length ? (
            filteredProgress.map((entry) => (
              <div className='card mb-4' key={entry.userId || entry.userEmail}>
                <div className='card-header d-flex flex-wrap align-items-center gap-3'>
                  <div>
                    <h6 className='mb-0'>{entry.userName}</h6>
                    <small className='text-muted'>{entry.userEmail}</small>
                  </div>
                  <div className='ms-auto text-end'>
                    <span className='badge bg-primary-subtle text-primary'>
                      {entry.completedLectures}/{entry.totalLectures} lectures completed
                    </span>
                  </div>
                </div>
                <div className='card-body p-0'>
                  <div className='table-responsive'>
                    <table className='table table-sm align-middle mb-0'>
                      <thead className='table-light'>
                        <tr>
                          <th>Lecture</th>
                          <th>Module</th>
                          <th>Progress</th>
                          <th className='text-center'>Completed</th>
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
                                <small className='text-muted'>{lecture.moduleId}</small>
                              </td>
                              <td style={{ minWidth: 160 }}>
                                <div className='d-flex align-items-center gap-2'>
                                  <div className='flex-grow-1 progress progress-thin'>
                                    <div
                                      className='progress-bar bg-primary'
                                      style={{ width: formatPercent(lecture.completionRatio) }}
                                    />
                                  </div>
                                  <span className='text-muted small'>
                                    {formatPercent(lecture.completionRatio)}
                                  </span>
                                </div>
                              </td>
                              <td className='text-center'>
                                {lecture.completedAt ? (
                                  <span className='badge text-bg-success-subtle'>Yes</span>
                                ) : (
                                  <span className='badge text-bg-secondary-subtle'>No</span>
                                )}
                              </td>
                              <td className='text-end'>
                                <small className='text-muted'>
                                  {lecture.updatedAt
                                    ? new Date(lecture.updatedAt).toLocaleString()
                                    : "—"}
                                </small>
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
            <div className='card mb-4'>
              <div className='card-header'>
                <h6 className='mb-0'>Lecture overview</h6>
              </div>
              <div className='card-body p-0'>
                <div className='table-responsive'>
                  <table className='table align-middle mb-0'>
                    <thead className='table-light'>
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
                              <small className='text-muted'>{lecture.moduleId}</small>
                            </td>
                            <td className='text-center'>{lecture.learners}</td>
                            <td className='text-center'>{lecture.completed}</td>
                            <td style={{ minWidth: 180 }}>
                              <div className='d-flex align-items-center gap-2'>
                                <div className='flex-grow-1 progress progress-thin'>
                                  <div
                                    className='progress-bar bg-success'
                                    style={{ width: formatPercent(lecture.avgCompletion) }}
                                  />
                                </div>
                                <span className='text-muted small'>
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
