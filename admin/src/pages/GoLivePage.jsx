import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import { useAuthContext } from '../context/AuthContext';
import { listAdminCourses } from '../services/adminCourses';
import {
  listAdminLiveSessions,
  createAdminLiveSession,
  endAdminLiveSession,
  startAdminLiveSession,
} from '../services/adminLiveSessions';
import { createLiveSfuClient } from '../services/liveSfuClient';
import { PUBLIC_SITE_BASE } from '../config/env';
import './GoLivePage.css';

const defaultForm = {
  courseId: '',
  title: '',
  description: '',
  scheduledAt: '',
};

const GoLivePage = () => {
  const { token, admin } = useAuthContext();
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle');
  const [previewStream, setPreviewStream] = useState(null);
  const [publisherClient, setPublisherClient] = useState(null);
  const videoRef = useRef(null);
  const audienceRef = useRef(null);

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) =>
          course.id === form.courseId ||
          course._id === form.courseId ||
          course.slug === form.courseId
      ),
    [courses, form.courseId]
  );

  const defaultTitle = useMemo(() => {
    if (form.title.trim()) return form.title.trim();
    if (selectedCourse?.name) return `${selectedCourse.name} - Live class`;
    return 'Live class';
  }, [form.title, selectedCourse]);

  const shareUrl = useMemo(() => {
    if (!currentSession) return '';
    const frontendBase = (typeof PUBLIC_SITE_BASE === 'string' && PUBLIC_SITE_BASE) || '';
    const runtimeBase =
      frontendBase ||
      (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');
    const code = currentSession.viewerCode || currentSession.id;
    const slug = currentSession.courseSlug || '';
    const programmeSlug = currentSession.courseProgramme || 'gradus-x';
    const base = runtimeBase.replace(/\/+$/, '');
    if (slug && base) {
      return code ? `${base}/${programmeSlug}/${slug}/home/live/${code}` : `${base}/${programmeSlug}/${slug}/home`;
    }
    return code && base ? `${base}/live/${code}` : '';
  }, [currentSession]);

  const attachStreamToVideo = (videoEl) => {
    if (!videoEl) return;
    if (previewStream) {
      videoEl.srcObject = previewStream;
      videoEl
        .play()
        .catch(() => {
          /* autoplay can be blocked silently */
        });
    } else {
      videoEl.srcObject = null;
    }
  };

  useEffect(() => {
    attachStreamToVideo(videoRef.current);
    attachStreamToVideo(audienceRef.current);
  }, [previewStream]);

  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach((track) => track.stop());
    }
    setPreviewStream(null);
  };

  const stopPublishing = () => {
    if (publisherClient) {
      try {
        publisherClient.producer?.close && publisherClient.producer.close();
        publisherClient.producerTransport?.close && publisherClient.producerTransport.close();
        publisherClient.ws?.close();
      } catch (e) {
        console.warn('[live] Failed to stop publisher', e);
      }
    }
    setPublisherClient(null);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [courseList, liveSessions] = await Promise.all([
          listAdminCourses({ token }),
          listAdminLiveSessions({ token }),
        ]);
        setCourses(courseList);
        setSessions(liveSessions);
        const active = liveSessions.find((item) => item.status === 'live');
        if (active) {
          setCurrentSession(active);
          setStatus('live');
        } else {
          setCurrentSession(null);
          setStatus('idle');
        }
      } catch (e) {
        setError(e?.message || 'Unable to load Go Live data');
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => stopPreview();
  }, [token]);

  useEffect(() => {
    return () => {
      stopPublishing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hydratePreview = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera/microphone access is not supported in this browser.');
    }
    if (previewStream) {
      return previewStream;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setPreviewStream(stream);
    return stream;
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const startPublishing = async (viewerCode) => {
    if (!viewerCode) return;
    try {
      const stream = await hydratePreview();
      const client = createLiveSfuClient({ role: 'host', roomId: viewerCode });
      await client.connect();
      const [videoTrack] = stream.getVideoTracks();
      const [audioTrack] = stream.getAudioTracks();
      if (videoTrack) {
        await client.produce(videoTrack);
      }
      if (audioTrack) {
        await client.produce(audioTrack);
      }
      setPublisherClient(client);
    } catch (err) {
      console.error('[live] Failed to start publishing', err);
      setError('Live media could not start. Check camera/mic permissions.');
    }
  };

  const handleGoLive = async (event) => {
    event.preventDefault();
    if (!form.courseId) {
      setError('Select the course you want to go live in.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await hydratePreview();

      const payload = {
        courseId: form.courseId,
        title: defaultTitle,
        description: form.description,
        startNow: true,
      };
      if (form.scheduledAt) {
        payload.scheduledAt = form.scheduledAt;
      }

      const session = await createAdminLiveSession({ token, data: payload });
      if (!session) {
        throw new Error('Unable to create the live session.');
      }
      setCurrentSession(session);
      setStatus(session.status || 'live');
      setSessions((prev) => [session, ...prev.filter((item) => item.id !== session.id)]);
      await startPublishing(session.viewerCode);
    } catch (e) {
      setError(e?.message || 'Failed to start live session');
      stopPreview();
      setStatus('idle');
    } finally {
      setSaving(false);
    }
  };

  const handleEndSession = async (sessionToEnd) => {
    const targetSession = sessionToEnd || currentSession;
    if (!targetSession) return;
    try {
      setSaving(true);
      setError(null);
      const ended = await endAdminLiveSession({ token, id: targetSession.id });
      setCurrentSession((prev) => (prev?.id === ended.id ? ended : prev));
      setStatus('ended');
      setSessions((prev) => prev.map((item) => (item.id === ended.id ? ended : item)));
    } catch (e) {
      setError(e?.message || 'Failed to end live session');
    } finally {
      setSaving(false);
      stopPreview();
      stopPublishing();
    }
  };

  const startExistingSession = async (sessionId) => {
    try {
      setSaving(true);
      setError(null);
      await hydratePreview();
      const session = await startAdminLiveSession({ token, id: sessionId });
      setCurrentSession(session);
      setStatus('live');
      setSessions((prev) => prev.map((item) => (item.id === session.id ? session : item)));
      await startPublishing(session.viewerCode);
    } catch (e) {
      setError(e?.message || 'Unable to start this session');
    } finally {
      setSaving(false);
    }
  };

  const copyShareLink = async (urlToCopy) => {
    if (!urlToCopy) return;
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setError(null);
    } catch (e) {
      setError('Could not copy the join link. Please copy it manually.');
    }
  };

  const statusLabel = (value) => {
    if (value === 'live') return 'Live';
    if (value === 'ended') return 'Ended';
    return 'Ready';
  };

  const statusClass = (value) => {
    if (value === 'live') return 'status-live';
    if (value === 'ended') return 'status-ended';
    return 'status-ready';
  };

  return (
    <MasterLayout>
      <div className='container-fluid'>
        <Breadcrumb title='Go Live' subtitle='Host real-time classes without leaving Gradus' />

        {error && <div className='alert alert-danger'>{error}</div>}

        <div className='row g-4'>
          <div className='col-xxl-12'>
            <div className='card border-0 shadow-sm go-live-hero'>
              <div className='card-body'>
                <div className='d-flex align-items-start justify-content-between flex-wrap gap-3'>
                  <div>
                    <div className='badge bg-primary-subtle text-primary mb-2'>
                      <Icon icon='mdi:video-wireless-outline' className='me-1' />
                      Custom live host
                    </div>
                    <h4 className='mb-2'>Go live in any course</h4>
                    <p className='text-muted mb-3'>
                      No Zoom or YouTube embed. Turn on camera and mic, share the join link, and keep
                      learners inside your own platform.
                    </p>
                    <ul className='go-live-points'>
                      <li>
                        <Icon icon='mdi:shield-check-outline' className='text-success me-2' />
                        Streams stay in-browser using WebRTC capture
                      </li>
                      <li>
                        <Icon icon='mdi:rocket-launch-outline' className='text-success me-2' />
                        One-click start and stop with course-aware context
                      </li>
                      <li>
                        <Icon icon='mdi:link-variant' className='text-success me-2' />
                        Shareable, revocable join link for learners
                      </li>
                    </ul>
                  </div>
                  <div className={`go-live-status-pill ${statusClass(status)}`}>
                    <span className='status-dot' />
                    {statusLabel(status)}
                  </div>
                </div>

                <div className='row g-3 align-items-stretch mt-2'>
                  <div className='col-lg-6'>
                    <form onSubmit={handleGoLive} className='go-live-form card shadow-sm border-0 h-100'>
                      <div className='card-body'>
                        <div className='d-flex align-items-center justify-content-between mb-3'>
                          <div>
                            <p className='text-muted small mb-0'>Host</p>
                            <strong>{admin?.firstName ? `${admin.firstName} ${admin.lastName || ''}`.trim() : admin?.email || 'Admin'}</strong>
                          </div>
                          <span className='badge bg-dark text-white'>Browser broadcast</span>
                        </div>
                        <div className='mb-3'>
                          <label className='form-label'>Course</label>
                          <select
                            className='form-select'
                            name='courseId'
                            value={form.courseId}
                            onChange={handleFieldChange}
                            required
                          >
                            <option value=''>Select course</option>
                            {courses.map((course) => (
                              <option key={course.id || course._id} value={course.id || course._id}>
                                {course.name || course.title} {course.programme ? `- ${course.programme}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className='mb-3'>
                          <label className='form-label'>Session title</label>
                          <input
                            type='text'
                            name='title'
                            value={form.title}
                            onChange={handleFieldChange}
                            className='form-control'
                            placeholder={defaultTitle}
                          />
                        </div>
                        <div className='mb-3'>
                          <label className='form-label'>What will you cover?</label>
                          <textarea
                            name='description'
                            value={form.description}
                            onChange={handleFieldChange}
                            className='form-control'
                            rows={3}
                            placeholder="Share today's agenda, demo link, or prep notes"
                          />
                        </div>
                        <div className='mb-3'>
                          <label className='form-label'>Schedule (optional)</label>
                          <input
                            type='datetime-local'
                            name='scheduledAt'
                            value={form.scheduledAt}
                            onChange={handleFieldChange}
                            className='form-control'
                          />
                        </div>
                        <div className='d-flex gap-2'>
                          <button type='submit' className='btn btn-primary w-100' disabled={saving}>
                            <Icon icon='mdi:radio-tower' className='me-1' />
                            {status === 'live' ? 'Live now' : 'Go live'}
                          </button>
                          {status === 'live' && (
                            <button
                              type='button'
                              className='btn btn-outline-danger'
                              onClick={() => handleEndSession(currentSession)}
                              disabled={saving}
                            >
                              End
                            </button>
                          )}
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className='col-lg-6'>
                    <div className='go-live-video card shadow-sm border-0 h-100'>
                      <div className='card-header d-flex justify-content-between align-items-center'>
                        <div className='d-flex align-items-center gap-2'>
                          <span className='live-pill'>
                            <span className='dot' /> {statusLabel(status)}
                          </span>
                          <span className='text-muted small'>
                            Camera + mic stay inside the browser. Preview is muted for you.
                          </span>
                        </div>
                        {shareUrl ? (
                          <button
                            type='button'
                            className='btn btn-sm btn-outline-primary'
                            onClick={() => copyShareLink(shareUrl)}
                          >
                            <Icon icon='mdi:content-copy' className='me-1' />
                            Copy join link
                          </button>
                        ) : null}
                      </div>
                      <div className='card-body'>
                        <div className='video-grid'>
                          <div className='video-tile host'>
                            <div className='tile-label'>
                              <Icon icon='mdi:account-voice' className='me-1' />
                              Host preview
                            </div>
                            <video ref={videoRef} muted playsInline autoPlay className='live-video-el' />
                            {!previewStream && (
                              <div className='video-placeholder'>
                                <Icon icon='mdi:video-outline' className='me-2' />
                                Tap "Go live" to enable camera &amp; mic
                              </div>
                            )}
                          </div>
                          <div className='video-tile audience'>
                            <div className='tile-label'>
                              <Icon icon='mdi:account-group-outline' className='me-1' />
                              Audience view
                            </div>
                            <video ref={audienceRef} playsInline autoPlay className='live-video-el' />
                            <div className='video-placeholder subtle'>
                              <Icon icon='mdi:radar' className='me-2' />
                              This mirrors what learners receive from our custom host.
                            </div>
                          </div>
                        </div>
                        <div className='mt-3 p-3 bg-light rounded text-muted small'>
                          <strong>How it works:</strong> we capture your camera/mic via WebRTC in the
                          browser, issue a private viewer code, and keep all traffic inside Gradus. You
                          can revoke access anytime by ending the session.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='col-xxl-12'>
            <div className='card shadow-sm border-0 h-100'>
              <div className='card-header d-flex justify-content-between align-items-center'>
                <div>
                  <p className='text-muted small mb-0'>Recent sessions</p>
                  <strong>Live room snapshots</strong>
                </div>
                <Icon icon='mdi:history' className='text-muted fs-4' />
              </div>
              <div className='table-responsive'>
                <table className='table align-middle mb-0'>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Status</th>
                      <th>Schedule</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan='4' className='text-muted small'>
                          Nothing yet. Start a live class to see it here.
                        </td>
                      </tr>
                    )}
                    {sessions.slice(0, 6).map((session) => {
                      const rowShareUrl =
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/live/${session.viewerCode || session.id}`
                          : '';
                      return (
                        <tr key={session.id}>
                          <td>
                            <div className='fw-semibold small'>{session.title}</div>
                            <div className='text-muted extra-small'>{session.courseTitle}</div>
                          </td>
                          <td>
                            <span className={`badge ${statusClass(session.status)}`}>
                              {statusLabel(session.status)}
                            </span>
                          </td>
                          <td className='text-muted extra-small'>
                            {session.scheduledAt
                              ? new Date(session.scheduledAt).toLocaleString()
                              : 'Instant'}
                          </td>
                          <td className='text-end'>
                            {session.status === 'ready' && (
                              <button
                                className='btn btn-sm btn-outline-primary me-2'
                                onClick={() => startExistingSession(session.id)}
                                disabled={saving}
                              >
                                Start
                              </button>
                            )}
                            {session.status === 'live' && (
                              <button
                                className='btn btn-sm btn-outline-danger me-2'
                                onClick={() => handleEndSession(session)}
                                disabled={saving}
                              >
                                End
                              </button>
                            )}
                            {rowShareUrl && (
                              <button
                                className='btn btn-sm btn-outline-secondary'
                                onClick={() => copyShareLink(rowShareUrl)}
                              >
                                Copy link
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {currentSession && (
                <div className='card-footer bg-white'>
                  <div className='small text-muted'>Active join link</div>
                  <div className='d-flex align-items-center gap-2'>
                    <code className='flex-grow-1 text-break'>{shareUrl}</code>
                    <button
                      type='button'
                      className='btn btn-sm btn-outline-primary'
                      onClick={() => copyShareLink(shareUrl)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className='text-center text-muted small mt-3'>
            <div className='spinner-border text-primary me-2 spinner-border-sm' role='status' />
            Preparing the live host...
          </div>
        )}
      </div>
    </MasterLayout>
  );
};

export default GoLivePage;
