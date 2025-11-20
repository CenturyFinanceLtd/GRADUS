import { useEffect, useState } from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import useLiveInstructorSession from './useLiveInstructorSession';
import LiveSessionList from './LiveSessionList';
import LiveStage from './LiveStage';
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
  } = useLiveInstructorSession();

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

  return (
    <MasterLayout>
      <div className='container-fluid live-classroom-page'>
        {courseError && <div className='alert alert-warning mb-3'>{courseError}</div>}
        <div className='row g-4'>
          <div className='col-xl-5'>
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
          <div className='col-xl-7'>
            <LiveStage
              stageStatus={stageStatus}
              stageError={stageError}
              session={activeSession}
              remoteParticipants={remoteParticipants}
              localStream={localStream}
              localMediaState={localMediaState}
              toggleMediaTrack={toggleMediaTrack}
              onLeave={leaveStage}
              onEnd={endActiveSession}
              publicJoinLink={publicJoinLink}
            />
          </div>
        </div>
      </div>
    </MasterLayout>
  );
};

export default LiveInstructorPage;
