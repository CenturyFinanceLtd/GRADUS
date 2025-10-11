import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb';
import FooterOne from '../components/FooterOne';
import HeaderOne from '../components/HeaderOne';
import Animation from '../helper/Animation';
import Preloader from '../helper/Preloader';
import CourseSeriesDetailSection from '../components/ourCourses/CourseSeriesDetailSection';
import { fetchCourseBySlug } from '../services/courseService';
import {
  fetchActiveSession,
  joinLiveSession,
  leaveLiveSession,
  pingLiveSession,
} from '../services/liveSessionService';
import useLiveSessionSocket from '../hooks/useLiveSessionSocket';
import { useAuth } from '../context/AuthContext';

const PING_INTERVAL_MS = 30000;

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

const CourseLiveDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token, isAuthenticated } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinedSessionId, setJoinedSessionId] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [notification, setNotification] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
  }, []);

  useEffect(() => {
    if (!notification) {
      return undefined;
    }
    const timer = window.setTimeout(() => setNotification(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const loadCourse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCourseBySlug({ slug, token });
      setCourse(response?.course || null);
    } catch (err) {
      setError(err?.message || 'Unable to load course details.');
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    if (!loading && course && !course.isEnrolled) {
      if (!accessDenied) {
        setAccessDenied(true);
        showNotification('warning', 'You need to enroll in this course to access the live classroom.');
        navigate('/our-courses', {
          replace: true,
          state: { enrollmentRequired: course.slug },
        });
      }
    }
  }, [course, loading, accessDenied, navigate, showNotification]);

  const loadActiveSession = useCallback(async () => {
    if (!slug) {
      return;
    }
    try {
      const response = await fetchActiveSession({ courseSlug: slug });
      setActiveSession(response?.session || null);
    } catch (err) {
      console.warn('[live-class] Failed to load active session', err);
      setActiveSession(null);
    }
  }, [slug]);

  useEffect(() => {
    if (!course) {
      return;
    }
    loadActiveSession();
  }, [course, loadActiveSession]);

  useLiveSessionSocket({
    courseId: course?.id,
    onSessionStarted: (session) => {
      setActiveSession(session);
      setAttendanceStats(null);
      setJoinedSessionId(null);
      showNotification('success', `Live class "${session.title || course?.name}" is now live. Join before it fills up.`);
    },
    onSessionEnded: (session) => {
      setActiveSession(null);
      setJoinedSessionId(null);
      setAttendanceStats(null);
      showNotification('info', `The live class "${session.title || course?.name}" has ended.`);
    },
  });

  const handleJoinSession = useCallback(async () => {
    if (!activeSession || !course) {
      return;
    }

    if (!course.isEnrolled) {
      showNotification('warning', 'You need to be enrolled in this course to join live classes.');
      return;
    }

    if (!isAuthenticated) {
      navigate('/sign-in', {
        state: {
          from: location,
          redirectTo: `/our-courses/${slug}`,
        },
      });
      return;
    }

    setJoining(true);
    try {
      const response = await joinLiveSession({ sessionId: activeSession.id, token });
      const sessionData = response?.session || activeSession;
      setActiveSession(sessionData);
      setJoinedSessionId(sessionData.id);
      setAttendanceStats({ accumulatedWatchTimeMs: 0, attendancePercentage: 0 });
      showNotification(
        'success',
        'You are connected to the live class. Keep the window open to capture your attendance.'
      );

      const sessionJoinUrl =
        sessionData?.meeting?.joinUrl || activeSession?.meeting?.joinUrl || sessionData?.meeting?.startUrl;
      if (sessionJoinUrl) {
        openMeetingInWebClient(sessionJoinUrl, sessionData?.provider || activeSession?.provider);
      }
    } catch (err) {
      showNotification('error', err?.message || 'Unable to join the live class. Please try again.');
    } finally {
      setJoining(false);
    }
  }, [activeSession, course, isAuthenticated, navigate, location, slug, token, showNotification]);

  const handleLeaveSession = useCallback(async () => {
    if (!joinedSessionId || !token) {
      setJoinedSessionId(null);
      return;
    }

    try {
      await leaveLiveSession({ sessionId: joinedSessionId, token });
    } catch (err) {
      console.warn('[live-class] Failed to leave session gracefully', err);
    } finally {
      setJoinedSessionId(null);
      setAttendanceStats(null);
    }
  }, [joinedSessionId, token]);

  useEffect(() => {
    if (!joinedSessionId || !token) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      pingLiveSession({ sessionId: joinedSessionId, elapsedMs: PING_INTERVAL_MS, token })
        .then((response) => {
          if (response?.stats) {
            setAttendanceStats(response.stats);
          }
        })
        .catch((error) => {
          console.warn('[live-class] Heartbeat failed', error);
        });
    }, PING_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [joinedSessionId, token]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (joinedSessionId && token) {
        leaveLiveSession({ sessionId: joinedSessionId, token }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [joinedSessionId, token]);

  useEffect(() => {
    return () => {
      if (joinedSessionId && token) {
        leaveLiveSession({ sessionId: joinedSessionId, token }).catch(() => {});
      }
    };
  }, [joinedSessionId, token]);

  const liveSessionPanel = useMemo(() => {
    if (!course) {
      return null;
    }

    if (!course.isEnrolled) {
      return (
        <div className='p-32 rounded-24 border border-neutral-30 bg-main-25'>
          <h4 className='mb-12 text-neutral-900'>Live classes are available after enrollment</h4>
          <p className='text-neutral-600 mb-0'>
            Complete your enrollment to unlock interactive live sessions, real-time Q&amp;A, and attendance tracking.
          </p>
        </div>
      );
    }

    if (!activeSession) {
      return (
        <div className='p-32 rounded-24 border border-neutral-30 bg-white'>
          <h4 className='mb-12 text-neutral-900'>No live class is running right now</h4>
          <p className='text-neutral-600 mb-24'>
            Stay tuned. As soon as your mentor starts the next live session you will see an instant notification here and in
            your inbox.
          </p>
          <div className='position-relative rounded-20 bg-neutral-100 text-neutral-500 d-flex align-items-center justify-content-center' style={{ minHeight: '360px' }}>
            <span className='fw-semibold text-lg'>Live class stage will appear here.</span>
          </div>
        </div>
      );
    }

    const joinUrl = activeSession.meeting?.joinUrl || '';
    const isLive = activeSession.status === 'LIVE';
    const joined = joinedSessionId === activeSession.id;
    const providerLabel = activeSession.provider === 'zoom' ? 'Zoom' : 'Microsoft Teams';

    return (
      <div className='p-32 rounded-24 border border-main-100 bg-white shadow-sm live-session-panel'>
        <div className='d-flex flex-wrap justify-content-between align-items-start gap-16 mb-24'>
          <div>
            <span className='badge bg-main-25 text-main-600 text-uppercase mb-8'>{providerLabel} live classroom</span>
            <h3 className='mb-8 text-neutral-900'>{activeSession.title || `${course.name} Live Class`}</h3>
            <p className='text-neutral-600 mb-0'>
              {isLive
                ? `Started at ${formatDateTime(activeSession.actualStart || new Date())}`
                : `Scheduled for ${formatDateTime(activeSession.scheduledStart)}`}
            </p>
          </div>
          <span className={`badge ${isLive ? 'bg-success-600' : 'bg-info-600'}`}>
            {isLive ? 'LIVE NOW' : (activeSession.status || 'Scheduled')}
          </span>
        </div>

        <div className='position-relative rounded-20 overflow-hidden bg-neutral-900 text-white mb-24 p-32 text-center d-flex flex-column justify-content-center align-items-center gap-12' style={{ minHeight: '320px' }}>
          {joined ? (
            <>
              <h4 className='mb-0 text-white'>Your live class is open in Microsoft Teams</h4>
              <p className='text-neutral-200 mb-0'>
                We launched the meeting in a new browser tab. Keep this page open so your attendance continues to track.
                If you closed the tab accidentally, you can reopen it below.
              </p>
            </>
          ) : (
            <>
              <h4 className='mb-0 text-white'>Join the class in your browser</h4>
              <p className='text-neutral-200 mb-0'>
                Joining will open the Microsoft Teams web experience in a new tab—no desktop app required.
              </p>
            </>
          )}
        </div>

        <div className='d-flex flex-wrap gap-12'>
          {joined ? (
            <button type='button' className='btn btn-outline-danger-600' onClick={handleLeaveSession}>
              Leave Live Class
            </button>
          ) : (
            <button
              type='button'
              className='btn btn-main'
              onClick={handleJoinSession}
              disabled={joining || !joinUrl}
            >
              {joining ? 'Connecting…' : 'Join Live Class'}
            </button>
          )}
          {joinUrl ? (
            <button
              type='button'
              className='btn btn-outline-main-600'
              onClick={() => openMeetingInWebClient(joinUrl, activeSession.provider)}
            >
              {joined ? 'Reopen Teams Tab' : 'Open Teams in Browser'}
            </button>
          ) : null}
        </div>
        <div className='mt-16 text-neutral-500 small'>
          Attendance is captured automatically based on your watch time. Keep this window active while you’re in class so we can record your participation accurately.
          {attendanceStats ? (
            <span className='d-block mt-2'>
              Watch time captured:{' '}
              <strong>{(attendanceStats.accumulatedWatchTimeMs / 60000).toFixed(1)} minutes</strong> (
              {attendanceStats.attendancePercentage}% of the class)
            </span>
          ) : null}
        </div>
      </div>
    );
  }, [
    course,
    activeSession,
    joinedSessionId,
    joining,
    attendanceStats,
    handleJoinSession,
    handleLeaveSession,
  ]);

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={course?.name ? `${course.name} Live Classroom` : 'Live Class'} />
      {notification ? (
        <section className='pt-0'>
          <div className='container'>
            <div
              className={`alert ${
                notification.type === 'error'
                  ? 'alert-danger'
                  : notification.type === 'warning'
                  ? 'alert-warning'
                  : notification.type === 'info'
                  ? 'alert-info'
                  : 'alert-success'
              } mb-0`}
              role='alert'
            >
              {notification.message}
            </div>
          </div>
        </section>
      ) : null}
      {loading ? (
        <section className='py-120'>
          <div className='container d-flex justify-content-center'>
            <div className='text-center'>
              <div className='spinner-border text-main-600 mb-16' role='status'>
                <span className='visually-hidden'>Loading�?�</span>
              </div>
              <p className='text-neutral-600 mb-0'>Fetching the course experience for you�?�</p>
            </div>
          </div>
        </section>
      ) : error ? (
        <section className='py-120'>
          <div className='container'>
            <div className='alert alert-danger mb-0' role='alert'>
              {error}
            </div>
          </div>
        </section>
      ) : course ? (
        <CourseSeriesDetailSection course={course} liveSessionPanel={liveSessionPanel} />
      ) : null}
      <FooterOne />
    </>
  );
};

export default CourseLiveDetailPage;
