import { useEffect, useState } from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import useLiveInstructorSession from './useLiveInstructorSession';
import LiveSessionList from './LiveSessionList';
import { LiveInstructorRoom } from './LiveInstructorRoom';
import './live.css';
import useAuth from '../hook/useAuth';
import { listAdminCourses } from '../services/adminCourses';

const LiveInstructorPage = () => {
  const { token } = useAuth();
  const [courseOptions, setCourseOptions] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseError, setCourseError] = useState('');
  const {
    sessions,
    sessionsLoading,
    sessionsError,
    createSession,
    refreshSessions,
    joinSession,
    leaveStage,
    endActiveSession,
    updateSessionStatus,
    stageStatus,
    stageError,
    activeSession,
    publicJoinLink,
    remoteParticipants,
    toggleMediaTrack,
    localMediaState,
    localStream,
    buildStudentLink,
    updateStudentMediaPermissions,
    updateSessionSecurity,
    startScreenShare,
    stopScreenShare,
    screenShareActive,
    sendParticipantMediaCommand,
    removeParticipant,
    chatMessages,
    sendChatMessage,
    sendReaction,
    sendHandRaise,
    instructorParticipantId,
    sendSpotlight,
    spotlightParticipantId,
    admitWaitingParticipant,
    denyWaitingParticipant,
    uploadRecording,
    fetchAttendance,
  } = useLiveInstructorSession();
  const showLiveStage = Boolean(activeSession);

  useEffect(() => {
    if (!token) {
      setCourseOptions([]);
      return;
    }

    let cancelled = false;
    const loadCourses = async () => {
      try {
        setCoursesLoading(true);
        setCourseError('');
        const list = await listAdminCourses({ token });
        if (!cancelled) {
          setCourseOptions(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        if (!cancelled) {
          setCourseError(error?.message || 'Unable to load courses for live classes.');
          setCourseOptions([]);
        }
      } finally {
        if (!cancelled) {
          setCoursesLoading(false);
        }
      }
    };

    loadCourses();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const endSessionFromList = async (sessionId) => {
    await updateSessionStatus(sessionId, 'ended');
  };

  const handleStudentAudioToggle = async (nextValue) => {
    if (!activeSession?.id) {
      return;
    }
    await updateStudentMediaPermissions(activeSession.id, { allowStudentAudio: nextValue });
  };

  const handleStudentVideoToggle = async (nextValue) => {
    if (!activeSession?.id) {
      return;
    }
    await updateStudentMediaPermissions(activeSession.id, { allowStudentVideo: nextValue });
  };

  const handleStudentScreenShareToggle = async (nextValue) => {
    if (!activeSession?.id) {
      return;
    }
    await updateStudentMediaPermissions(activeSession.id, { allowStudentScreenShare: nextValue });
  };

  const handleWaitingRoomToggle = async (nextValue) => {
    if (!activeSession?.id) {
      return;
    }
    await updateSessionSecurity(activeSession.id, { waitingRoomEnabled: nextValue });
  };

  const handleLockToggle = async (nextValue) => {
    if (!activeSession?.id) {
      return;
    }
    await updateSessionSecurity(activeSession.id, { locked: nextValue });
  };

  const handlePasscodeUpdate = async (nextValue) => {
    if (!activeSession?.id) {
      return;
    }
    await updateSessionSecurity(activeSession.id, { passcode: nextValue });
  };

  const handleRotateMeetingToken = async () => {
    if (!activeSession?.id) {
      return;
    }
    await updateSessionSecurity(activeSession.id, { rotateMeetingToken: true });
  };

  return (
    <MasterLayout>
      <div className='container-fluid live-classroom-page'>
        {courseError && <div className='alert alert-warning mb-3'>{courseError}</div>}
        {activeSession && activeSession.signaling && activeSession.signaling.liveKitToken ? (
          <div style={{ height: 'calc(100vh - 100px)', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            <LiveInstructorRoom
              token={activeSession.signaling.liveKitToken}
              serverUrl={activeSession.signaling.liveKitUrl}
              onDisconnect={leaveStage}
            />
          </div>
        ) : (
          <div className='row g-4'>
            <div className='col-xl-12 col-lg-12'>
              <LiveSessionList
                sessions={sessions}
                loading={sessionsLoading}
                error={sessionsError}
                courses={courseOptions}
                coursesLoading={coursesLoading}
                onCreate={createSession}
                onJoin={joinSession}
                onRefresh={refreshSessions}
                onEnd={endSessionFromList}
                buildStudentLink={buildStudentLink}
              />
            </div>
          </div>
        )}
      </div>
    </MasterLayout>
  );
};

export default LiveInstructorPage;
