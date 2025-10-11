import { useCallback, useEffect, useMemo, useState } from 'react';
import useAuth from '../../hook/useAuth';
import {
  fetchLiveCourses,
  fetchCourseRoster,
  fetchLiveSessions,
  createLiveSession,
  startLiveSession,
  endLiveSession,
} from '../../services/adminLiveSessions';

const buildMeetingLaunchUrl = (url, provider = 'teams') => {
  if (!url) {
    return '';
  }

  const normalizedProvider = (provider || '').toLowerCase();

  if (normalizedProvider === 'teams') {
    try {
      const joinUrl = new URL(url);
      joinUrl.searchParams.set('web', '1');
      return joinUrl.toString();
    } catch (error) {
      return url.includes('?') ? `${url}&web=1` : `${url}?web=1`;
    }
  }

  return url;
};

const openMeetingInWebClient = (url, provider = 'teams') => {
  const launchUrl = buildMeetingLaunchUrl(url, provider);
  if (!launchUrl) {
    return;
  }
  window.open(launchUrl, '_blank', 'noopener,noreferrer');
};

const toLocalInputValue = (dateValue) => {
  try {
    const date = dateValue ? new Date(dateValue) : new Date();
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISO = new Date(date.getTime() - tzOffset).toISOString();
    return localISO.slice(0, 16);
  } catch (error) {
    console.warn('[live-classes] Failed to parse date for input', error);
    return '';
  }
};

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch (error) {
    return value;
  }
};

const buildInitialForm = () => ({
  title: '',
  description: '',
  scheduledStart: toLocalInputValue(new Date()),
  durationMinutes: 60,
  provider: 'teams',
  joinUrl: '',
});

const statusBadgeClass = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'LIVE':
      return 'badge bg-success-600';
    case 'SCHEDULED':
      return 'badge bg-info-600';
    case 'ENDED':
      return 'badge bg-neutral-500';
    case 'CANCELLED':
      return 'badge bg-danger-600';
    default:
      return 'badge bg-secondary';
  }
};

const LiveClassManager = () => {
  const { token, admin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [roster, setRoster] = useState([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [createForm, setCreateForm] = useState(buildInitialForm);
  const [savingSession, setSavingSession] = useState(false);
  const [startingSessionId, setStartingSessionId] = useState('');
  const [endingSessionId, setEndingSessionId] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [startOverrides, setStartOverrides] = useState({});

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const showFeedback = useCallback((type, message) => {
    setFeedback({ type, message });
  }, []);

  useEffect(() => {
    if (!feedback) {
      return undefined;
    }
    const timer = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const loadCourses = useCallback(async () => {
    if (!token) {
      return;
    }
    setCoursesLoading(true);
    try {
      const response = await fetchLiveCourses({ token });
      const courseItems = Array.isArray(response?.items) ? response.items : [];
      setCourses(courseItems);
      if (!selectedCourseId && courseItems.length > 0) {
        setSelectedCourseId(courseItems[0].id);
      }
    } catch (error) {
      console.error('[live-classes] Failed to load courses', error);
      showFeedback('error', error?.message || 'Failed to load courses.');
    } finally {
      setCoursesLoading(false);
    }
  }, [token, selectedCourseId, showFeedback]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const loadContext = useCallback(
    async (courseId, { includeRoster = true } = {}) => {
      if (!token || !courseId) {
        return;
      }
      setContextLoading(true);
      try {
        const requests = [];
        if (includeRoster) {
          requests.push(fetchCourseRoster({ token, courseId }));
        } else {
          requests.push(Promise.resolve(null));
        }
        requests.push(fetchLiveSessions({ token, filters: { courseId } }));

        const [rosterResponse, sessionsResponse] = await Promise.all(requests);

        if (rosterResponse?.students) {
          setRoster(rosterResponse.students);
        } else if (includeRoster) {
          setRoster([]);
        }

        const sessionItems = Array.isArray(sessionsResponse?.items) ? sessionsResponse.items : [];
        setSessions(sessionItems);
      } catch (error) {
        console.error('[live-classes] Failed to load context', error);
        showFeedback('error', error?.message || 'Unable to load course context.');
      } finally {
        setContextLoading(false);
      }
    },
    [token, showFeedback]
  );

  useEffect(() => {
    if (selectedCourseId) {
      loadContext(selectedCourseId, { includeRoster: true });
    } else {
      setRoster([]);
      setSessions([]);
    }
  }, [selectedCourseId, loadContext]);

  const handleCreateSession = async (event) => {
    event.preventDefault();
    if (!selectedCourseId || !token) {
      showFeedback('error', 'Select a course before scheduling a live class.');
      return;
    }

    const scheduledStart =
      createForm.scheduledStart && !Number.isNaN(new Date(createForm.scheduledStart).getTime())
        ? new Date(createForm.scheduledStart).toISOString()
        : new Date().toISOString();

    setSavingSession(true);
    try {
      await createLiveSession({
        token,
        data: {
          courseId: selectedCourseId,
          scheduledStart,
          durationMinutes: Number(createForm.durationMinutes) || 60,
          provider: createForm.provider,
          title: createForm.title,
          description: createForm.description,
          joinUrl: createForm.joinUrl || undefined,
        },
      });
      showFeedback('success', 'Live class scheduled successfully.');
      setCreateForm(buildInitialForm());
      await loadContext(selectedCourseId, { includeRoster: false });
    } catch (error) {
      console.error('[live-classes] Failed to create session', error);
      showFeedback('error', error?.message || 'Unable to create live session.');
    } finally {
      setSavingSession(false);
    }
  };

  const handleStartSession = async (session) => {
    if (!token) {
      return;
    }
    setStartingSessionId(session.id);
    try {
      const overrideUrl = (startOverrides && startOverrides[session.id]) || '';
      const payload = overrideUrl ? { joinUrl: overrideUrl.trim() } : undefined;
      await startLiveSession({
        token,
        sessionId: session.id,
        data: payload,
      });
      showFeedback('success', 'Live class started and notifications sent.');
      setStartOverrides((prev) => {
        const updated = { ...prev };
        delete updated[session.id];
        return updated;
      });
      await loadContext(selectedCourseId, { includeRoster: false });
    } catch (error) {
      console.error('[live-classes] Failed to start session', error);
      showFeedback('error', error?.message || 'Unable to start live session.');
    } finally {
      setStartingSessionId('');
    }
  };

  const handleEndSession = async (session) => {
    if (!token) {
      return;
    }
    setEndingSessionId(session.id);
    try {
      await endLiveSession({ token, sessionId: session.id });
      showFeedback('success', 'Live class ended.');
      await loadContext(selectedCourseId, { includeRoster: false });
    } catch (error) {
      console.error('[live-classes] Failed to end session', error);
      showFeedback('error', error?.message || 'Unable to end live session.');
    } finally {
      setEndingSessionId('');
    }
  };

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === 'LIVE'),
    [sessions]
  );

  return (
    <div className='d-grid gap-24'>
      {feedback ? (
        <div
          className={`alert ${feedback.type === 'error' ? 'alert-danger' : 'alert-success'} mb-0`}
          role='alert'
        >
          {feedback.message}
        </div>
      ) : null}

      <div className='card border-0 shadow-sm'>
        <div className='card-body d-flex flex-column gap-16 gap-md-20'>
          <div className='d-flex flex-wrap justify-content-between align-items-center gap-12'>
            <div>
              <h4 className='mb-1'>Live Class Control Center</h4>
              <p className='text-neutral-500 mb-0'>
                Manage real-time classes, meeting links, and student notifications without leaving the admin panel.
              </p>
            </div>
            <div className='text-end'>
              <span className='badge bg-neutral-200 text-neutral-700 d-flex flex-column text-start align-items-start gap-4'>
                <span>Signed in as {admin?.fullName || 'Teacher'}</span>
                {admin?.email ? <span className='text-neutral-500 fw-normal'>{admin.email}</span> : null}
              </span>
            </div>
          </div>

          <div className='row g-3 align-items-end'>
            <div className='col-md-6'>
              <label className='form-label fw-medium'>Select Course</label>
              <select
                className='form-select'
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                disabled={coursesLoading || contextLoading || courses.length === 0}
              >
                <option value=''>Choose a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
              {coursesLoading ? <p className='text-neutral-500 small mt-1 mb-0'>Loading courses…</p> : null}
            </div>
            <div className='col-md-6 d-flex justify-content-md-end'>
              <button
                type='button'
                className='btn btn-outline-primary-600'
                onClick={() => selectedCourseId && loadContext(selectedCourseId, { includeRoster: true })}
                disabled={!selectedCourseId || contextLoading}
              >
                Refresh Course Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='card border-0 shadow-sm'>
        <div className='card-header bg-transparent border-0 pb-0'>
          <h5 className='mb-1'>Schedule a New Live Class</h5>
          <p className='text-neutral-500 mb-0'>
            Define when the session should begin, how long it runs, and whether you want to provide your own meeting link.
          </p>
        </div>
        <div className='card-body'>
          <form className='row g-3' onSubmit={handleCreateSession}>
            <div className='col-md-4'>
              <label className='form-label fw-medium'>Session Title</label>
              <input
                type='text'
                className='form-control'
                value={createForm.title}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder='e.g., Week 3 Live Workshop'
                disabled={savingSession || !selectedCourseId}
              />
            </div>
            <div className='col-md-4'>
              <label className='form-label fw-medium'>Scheduled Start</label>
              <input
                type='datetime-local'
                className='form-control'
                value={createForm.scheduledStart}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, scheduledStart: event.target.value }))}
                disabled={savingSession || !selectedCourseId}
              />
            </div>
            <div className='col-md-2'>
              <label className='form-label fw-medium'>Duration (minutes)</label>
              <input
                type='number'
                className='form-control'
                min={15}
                step={5}
                value={createForm.durationMinutes}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, durationMinutes: event.target.value || 60 }))
                }
                disabled={savingSession || !selectedCourseId}
              />
            </div>
            <div className='col-md-2'>
              <label className='form-label fw-medium'>Meeting Provider</label>
              <select
                className='form-select'
                value={createForm.provider}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, provider: event.target.value }))}
                disabled={savingSession || !selectedCourseId}
              >
                <option value='teams'>Microsoft Teams</option>
                <option value='zoom'>Zoom</option>
              </select>
            </div>
            <div className='col-12'>
              <label className='form-label fw-medium'>Description (optional)</label>
              <textarea
                className='form-control'
                rows={2}
                value={createForm.description}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder='Students will practice live coding covering modules 7-9…'
                disabled={savingSession || !selectedCourseId}
              />
            </div>
            <div className='col-12'>
              <label className='form-label fw-medium'>Custom Meeting Link (optional)</label>
              <input
                type='url'
                className='form-control'
                value={createForm.joinUrl}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, joinUrl: event.target.value }))}
                placeholder='Paste Microsoft Teams or Zoom meeting URL if you already created one.'
                disabled={savingSession || !selectedCourseId}
              />
              <p className='text-neutral-500 small mb-0 mt-1'>
                Leave empty to let Gradus automatically create a meeting using the configured provider credentials.
              </p>
            </div>
            <div className='col-12 d-flex justify-content-end'>
              <button type='submit' className='btn btn-primary-600' disabled={savingSession || !selectedCourseId}>
                {savingSession ? 'Scheduling…' : 'Schedule Live Class'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className='card border-0 shadow-sm'>
        <div className='card-header bg-transparent border-0 pb-0 d-flex justify-content-between align-items-center'>
          <div>
            <h5 className='mb-1'>Enrolled Students</h5>
            <p className='text-neutral-500 mb-0'>
              Students enrolled for {selectedCourse?.name || 'the selected course'} will receive notifications and emails
              as soon as a session goes live.
            </p>
          </div>
          <span className='badge bg-neutral-200 text-neutral-700'>
            {roster.length} {roster.length === 1 ? 'student' : 'students'}
          </span>
        </div>
        <div className='card-body p-0'>
          {contextLoading ? (
            <div className='p-4'>
              <p className='mb-0 text-neutral-500'>Loading students…</p>
            </div>
          ) : roster.length === 0 ? (
            <div className='p-4'>
              <p className='mb-0 text-neutral-500'>No active enrollments found for this course.</p>
            </div>
          ) : (
            <div className='table-responsive'>
              <table className='table align-middle mb-0'>
                <thead className='table-light'>
                  <tr>
                    <th scope='col'>Student</th>
                    <th scope='col'>Email</th>
                    <th scope='col'>Phone</th>
                    <th scope='col'>Enrolled On</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((student) => (
                    <tr key={student.studentId}>
                      <td>
                        <div className='fw-semibold text-neutral-900'>
                          {student.firstName} {student.lastName}
                        </div>
                      </td>
                      <td>
                        <a href={`mailto:${student.email}`} className='text-decoration-none'>
                          {student.email}
                        </a>
                      </td>
                      <td>{student.mobile || '—'}</td>
                      <td>{formatDateTime(student.enrolledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className='card border-0 shadow-sm'>
        <div className='card-header bg-transparent border-0 pb-0 d-flex justify-content-between align-items-center'>
          <div>
            <h5 className='mb-1'>Session Timeline</h5>
            <p className='text-neutral-500 mb-0'>
              Track every session created for this course, from scheduling to attendance-ready completion.
            </p>
          </div>
          <span className='badge bg-info-100 text-info-700'>
            {activeSessions.length} live {activeSessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>
        <div className='card-body p-0'>
          {contextLoading ? (
            <div className='p-4'>
              <p className='mb-0 text-neutral-500'>Loading sessions…</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className='p-4'>
              <p className='mb-0 text-neutral-500'>No live classes scheduled yet. Create one above to get started.</p>
            </div>
          ) : (
            <div className='table-responsive'>
              <table className='table align-middle mb-0'>
                <thead className='table-light'>
                  <tr>
                    <th scope='col'>Title</th>
                    <th scope='col'>Scheduled</th>
                    <th scope='col'>Duration</th>
                    <th scope='col'>Provider</th>
                    <th scope='col'>Status</th>
                    <th scope='col'>Join Link</th>
                    <th scope='col' className='text-end'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td>
                        <div className='fw-semibold text-neutral-900'>{session.title || 'Untitled session'}</div>
                        <div className='text-neutral-500 small'>
                          Created {formatDateTime(session.createdAt)}
                        </div>
                      </td>
                      <td>{formatDateTime(session.scheduledStart)}</td>
                      <td>{session.durationMinutes || 0} min</td>
                      <td className='text-capitalize'>{session.provider}</td>
                      <td>
                        <span className={statusBadgeClass(session.status)}>{session.status}</span>
                      </td>
                      <td>
                        {session.meeting?.joinUrl ? (
                          <button
                            type='button'
                            className='btn btn-link p-0'
                            onClick={() => openMeetingInWebClient(session.meeting.joinUrl, session.provider)}
                          >
                            Open meeting
                          </button>
                        ) : (
                          <span className='text-neutral-500'>Not available</span>
                        )}
                        {session.status === 'SCHEDULED' ? (
                          <div className='mt-2'>
                            <input
                              type='url'
                              className='form-control form-control-sm'
                              placeholder='Override meeting link before starting'
                              value={startOverrides[session.id] || ''}
                              onChange={(event) =>
                                setStartOverrides((prev) => ({ ...prev, [session.id]: event.target.value }))
                              }
                              disabled={startingSessionId === session.id}
                            />
                          </div>
                        ) : null}
                      </td>
                      <td className='text-end'>
                        {session.status === 'SCHEDULED' ? (
                          <button
                            type='button'
                            className='btn btn-sm btn-primary-600'
                            onClick={() => handleStartSession(session)}
                            disabled={startingSessionId === session.id}
                          >
                            {startingSessionId === session.id ? 'Starting…' : 'Start Session'}
                          </button>
                        ) : null}
                        {session.status === 'LIVE' ? (
                          <button
                            type='button'
                            className='btn btn-sm btn-outline-danger-600 ms-2'
                            onClick={() => handleEndSession(session)}
                            disabled={endingSessionId === session.id}
                          >
                            {endingSessionId === session.id ? 'Ending…' : 'End Session'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveClassManager;
