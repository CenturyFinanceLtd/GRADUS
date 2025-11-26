import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const formatDateTime = (value) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleString();
};

const LiveSessionList = ({
  sessions,
  loading,
  error,
  onCreate,
  onJoin,
  onRefresh,
  onEnd,
  buildStudentLink,
  courses = [],
  coursesLoading = false,
}) => {
  const [formState, setFormState] = useState({
    title: '',
    scheduledFor: '',
    courseId: '',
    passcode: '',
    waitingRoomEnabled: false,
    locked: false,
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      }),
    [sessions]
  );
  const selectedCourse = useMemo(() => {
    if (!formState.courseId) {
      return null;
    }
    return (
      courses.find(
        (course) => String(course.id || course._id || course.slug) === String(formState.courseId)
      ) || null
    );
  }, [courses, formState.courseId]);

  useEffect(() => {
    if (selectedCourse && !formState.title) {
      setFormState((prev) => ({
        ...prev,
        title: `${selectedCourse.name || selectedCourse.slug || 'Live Class'} - Live Session`,
      }));
    }
  }, [selectedCourse, formState.title]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!formState.courseId) {
      setFormError('Select a course to start a live class.');
      return;
    }
    if (!formState.title.trim()) {
      setFormError('Give this session a title.');
      return;
    }
    setFormError('');

    try {
      setCreating(true);
      await onCreate({
        ...formState,
        course: selectedCourse,
      });
      setFormState({
        title: '',
        scheduledFor: '',
        courseId: '',
        passcode: '',
        waitingRoomEnabled: false,
        locked: false,
      });
    } finally {
      setCreating(false);
    }
  };

  const copyJoinLink = async (session) => {
    const link = buildStudentLink(session.id, session.meetingToken);
    try {
      await navigator.clipboard.writeText(link);
    } catch (_) {
      // ignore clipboard errors
    }
  };

  return (
    <div className='live-session-list'>
      <div className='card'>
        <div className='card-body'>
          <h4 className='card-title'>Schedule a live class</h4>
          <form className='live-session-form' onSubmit={handleCreate}>
            <div className='form-group'>
              <label htmlFor='live-course'>Pick a course</label>
              <select
                id='live-course'
                className='form-select'
                value={formState.courseId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, courseId: event.target.value }))
                }
                disabled={creating || coursesLoading}
                required
              >
                <option value=''>Select one course</option>
                {courses.map((course) => (
                  <option key={course.id || course.slug} value={course.id || course.slug}>
                    {course.name || course.slug}
                  </option>
                ))}
              </select>
              {coursesLoading && <small className='text-muted'>Loading courses...</small>}
              {!coursesLoading && courses.length === 0 && (
                <small className='text-muted'>Create a course first to start a live class.</small>
              )}
            </div>
            <div className='form-group'>
              <label htmlFor='live-title'>Session title</label>
              <input
                id='live-title'
                type='text'
                className='form-control'
                placeholder='E.g., Gradus X - Portfolio Mastery'
                value={formState.title}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, title: event.target.value }))
                }
                disabled={creating}
                required
              />
            </div>
            <div className='form-group'>
              <label htmlFor='live-schedule'>Scheduled for (optional)</label>
              <input
                id='live-schedule'
                type='datetime-local'
                className='form-control'
                value={formState.scheduledFor}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, scheduledFor: event.target.value }))
                }
                disabled={creating}
              />
            </div>
            <div className='form-group'>
              <label htmlFor='live-passcode'>Passcode (optional)</label>
              <input
                id='live-passcode'
                type='text'
                className='form-control'
                placeholder='Set a passcode for students'
                value={formState.passcode}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, passcode: event.target.value }))
                }
                disabled={creating}
              />
              <small className='text-muted'>Share this only with invited students.</small>
            </div>
            <div className='form-check form-switch mb-2'>
              <input
                className='form-check-input'
                type='checkbox'
                id='live-waiting-room'
                checked={formState.waitingRoomEnabled}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, waitingRoomEnabled: event.target.checked }))
                }
                disabled={creating}
              />
              <label className='form-check-label' htmlFor='live-waiting-room'>
                Enable waiting room
              </label>
            </div>
            <div className='form-check form-switch mb-3'>
              <input
                className='form-check-input'
                type='checkbox'
                id='live-lock-meeting'
                checked={formState.locked}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, locked: event.target.checked }))
                }
                disabled={creating}
              />
              <label className='form-check-label' htmlFor='live-lock-meeting'>
                Lock meeting (block new joins)
              </label>
            </div>
            {formError && <div className='text-danger small'>{formError}</div>}
            <button className='btn btn-primary mt-2' type='submit' disabled={creating}>
              {creating ? 'Creating…' : 'Create session'}
            </button>
          </form>
        </div>
      </div>

      <div className='card mt-4'>
        <div className='card-body'>
          <div className='d-flex align-items-center justify-content-between mb-3'>
            <h4 className='card-title mb-0'>Upcoming & recent sessions</h4>
            <button
              className='btn btn-sm btn-outline-secondary'
              type='button'
              onClick={onRefresh}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          {error && <div className='alert alert-danger'>{error}</div>}
          {loading ? (
            <div className='text-muted'>Loading sessions…</div>
          ) : sortedSessions.length === 0 ? (
            <div className='text-muted'>No live sessions yet. Create your first session above.</div>
          ) : (
            <div className='table-responsive'>
              <table className='table table-striped'>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Title</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th>Security</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSessions.map((session, idx) => {
                    const rowKey =
                      session.id || session._id || session.meetingToken || `${session.title || 'session'}-${idx}`;
                    const isEnded = session.status === 'ended';
                    return (
                      <tr key={rowKey}>
                      <td>{session.courseName || '-'}</td>
                      <td>{session.title}</td>
                      <td>{formatDateTime(session.scheduledFor)}</td>
                      <td>
                        <span
                          className={`badge ${
                            session.status === 'live'
                              ? 'bg-success text-white'
                              : session.status === 'ended'
                              ? 'bg-danger text-white'
                              : 'bg-secondary text-white'
                          }`}
                        >
                          {session.status || 'scheduled'}
                        </span>
                      </td>
                      <td>
                        <div className='d-flex flex-column gap-1'>
                          {session.requiresPasscode ? (
                            <span className='badge bg-secondary text-white'>Passcode</span>
                          ) : (
                            <span className='badge bg-light text-dark'>Open</span>
                          )}
                          {session.waitingRoomEnabled ? (
                            <span className='badge bg-warning text-dark'>Waiting room</span>
                          ) : null}
                          {session.locked ? <span className='badge bg-danger'>Locked</span> : null}
                        </div>
                      </td>
                      <td className='live-session-actions'>
                        <button
                          className='btn btn-sm btn-primary'
                          type='button'
                          onClick={() => !isEnded && onJoin(session.id)}
                          disabled={isEnded}
                        >
                          Go live
                        </button>
                        <button
                          className='btn btn-sm btn-outline-secondary'
                          type='button'
                          onClick={() => !isEnded && copyJoinLink(session)}
                          disabled={isEnded}
                        >
                          Copy student link
                        </button>
                        {!isEnded && (
                          <button
                            className='btn btn-sm btn-outline-danger'
                            type='button'
                            onClick={() => onEnd(session.id)}
                          >
                            End
                          </button>
                        )}
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

LiveSessionList.propTypes = {
  sessions: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onCreate: PropTypes.func.isRequired,
  onJoin: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onEnd: PropTypes.func.isRequired,
  buildStudentLink: PropTypes.func.isRequired,
  courses: PropTypes.arrayOf(PropTypes.object),
  coursesLoading: PropTypes.bool,
};

export default LiveSessionList;
