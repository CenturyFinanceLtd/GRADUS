import { useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import useLiveStudentSession from "./useLiveStudentSession";
import "./live.css";

const LiveStudentPage = () => {
  const { sessionId } = useParams();
  const {
    session,
    loading,
    stageStatus,
    stageError,
    statusLabel,
    instructorStream,
    localStream,
    localMediaState,
    joinClass,
    leaveSession,
    toggleMediaTrack,
    startScreenShare,
    stopScreenShare,
    screenShareActive,
    user,
  } = useLiveStudentSession(sessionId);

  const instructorVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  useEffect(() => {
    if (instructorVideoRef.current && instructorStream) {
      instructorVideoRef.current.srcObject = instructorStream;
    }
  }, [instructorStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const disabled = useMemo(() => stageStatus === "joining" || stageStatus === "connecting", [stageStatus]);
  const connected = stageStatus === "live";

  const startClass = async () => {
    const displayName =
      user?.personalDetails?.studentName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.email;
    await joinClass({ displayName });
  };

  const formattedSchedule = useMemo(() => {
    if (!session?.scheduledFor) {
      return null;
    }
    const date = new Date(session.scheduledFor);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleString();
  }, [session?.scheduledFor]);

  const shareAllowed = session?.allowStudentScreenShare !== false;
  const handleShareToggle = () => {
    if (screenShareActive) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };
  const mainLabel = instructorStream ? "Instructor" : null;

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={"Live Classroom"} />
      <section className='live-student-section section-padding'>
        <div className='container'>
          {loading ? (
            <div className='text-center text-muted py-5'>Loading class details...</div>
          ) : (
            <div className='live-student-grid'>
              <div className='live-stage-card'>
                <div className='live-stage-status'>
                  <div>
                    <h2>{session?.courseName || session?.title || "Live class"}</h2>
                    {session?.courseName && session?.title && session.courseName !== session.title ? (
                      <p className='text-muted mb-1'>{session.title}</p>
                    ) : null}
                    <p className='text-muted mb-0'>
                      {formattedSchedule ? `Scheduled for ${formattedSchedule}` : "Join to get started"}
                    </p>
                  </div>
                  <div className='status-pill'>{statusLabel}</div>
                </div>
                {stageError && <div className='alert alert-danger mt-3'>{stageError}</div>}
                <div className='live-stage-video'>
                  {instructorStream ? (
                    <>
                      <div className='live-embed-main__label'>{mainLabel}</div>
                      <video ref={instructorVideoRef} autoPlay playsInline className='live-video live-video--instructor' />
                    </>
                  ) : (
                    <div className='live-video-placeholder'>
                      <p>{connected ? "Waiting for instructor video..." : "Click join when your instructor goes live."}</p>
                    </div>
                  )}
                </div>
                <div className='live-stage-controls'>
                  <button
                    type='button'
                    className={`btn btn-${localMediaState.video ? "primary" : "outline-secondary"}`}
                    onClick={() => toggleMediaTrack("video", !localMediaState.video)}
                    disabled={!connected && !localStream}
                  >
                    {localMediaState.video ? "Camera on" : "Camera off"}
                  </button>
                  <button
                    type='button'
                    className={`btn btn-${localMediaState.audio ? "primary" : "outline-secondary"}`}
                    onClick={() => toggleMediaTrack("audio", !localMediaState.audio)}
                    disabled={!connected && !localStream}
                  >
                    {localMediaState.audio ? "Mic on" : "Mic muted"}
                  </button>
                  <button
                    type='button'
                    className={`btn btn-${screenShareActive ? "primary" : "outline-secondary"}`}
                    onClick={handleShareToggle}
                    disabled={!connected || !shareAllowed}
                  >
                    {screenShareActive ? "Stop share" : "Share screen"}
                  </button>
                  <div className='spacer' />
                  {connected ? (
                    <button className='btn btn-outline-danger' type='button' onClick={leaveSession}>
                      Leave class
                    </button>
                  ) : (
                    <button className='btn btn-primary' type='button' onClick={startClass} disabled={disabled}>
                      {disabled ? "Joining..." : "Join class"}
                    </button>
                  )}
                </div>
              </div>

              <div className='live-sidebar-card'>
                <h4>Your preview</h4>
                <div className='live-preview'>
                  {localStream ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`live-video ${screenShareActive ? "live-video--no-mirror" : "live-video--self"}`}
                    />
                  ) : (
                    <div className='live-video-placeholder'>
                      <p>Enable camera/mic after joining.</p>
                    </div>
                  )}
                </div>
                <div className='live-sidebar-info'>
                  <h5>How it works</h5>
                  <ul>
                    <li>Join the class when your instructor shares the session link.</li>
                    <li>Allow browser permissions for camera and microphone.</li>
                    <li>Mute your mic when you are not speaking to keep the session crisp.</li>
                    <li>Use the leave button if you need to step out.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <FooterOne />
    </>
  );
};

export default LiveStudentPage;
