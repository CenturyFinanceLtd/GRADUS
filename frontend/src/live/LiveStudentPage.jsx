import { useEffect, useMemo, useRef, useState } from "react";
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
    instructorIsScreen,
    localStream,
    localMediaState,
    joinClass,
    leaveSession,
    toggleMediaTrack,
    startScreenShare,
    stopScreenShare,
    screenShareActive,
    participantShareAllowed,
    participantMediaAllowed,
    chatMessages,
    sendChatMessage,
    sendHandRaise,
    sendReaction,
    participantId: selfParticipantId,
    spotlightParticipantId,
    user,
  } = useLiveStudentSession(sessionId);
  const [passcode, setPasscode] = useState("");
  const [chatInput, setChatInput] = useState("");

  const instructorVideoRef = useRef(null);
  const localVideoRef = useRef(null);

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
    await joinClass({ displayName, passcode });
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

  const shareAllowed = session?.allowStudentScreenShare !== false && participantShareAllowed !== false;
  const audioAllowed = session?.allowStudentAudio !== false && participantMediaAllowed?.audio !== false;
  const videoAllowed = session?.allowStudentVideo !== false && participantMediaAllowed?.video !== false;
  const participantId = selfParticipantId;
  const handleShareToggle = () => {
    if (screenShareActive) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };
  const mainLabel = instructorStream ? (instructorIsScreen ? "Screen share" : "Instructor") : null;

  useEffect(() => {
    if (instructorVideoRef.current && instructorStream) {
      instructorVideoRef.current.srcObject = instructorStream;
    }
  }, [instructorStream]);

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
                {session?.requiresPasscode ? (
                  <div className='mb-3'>
                    <label className='form-label'>Passcode</label>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='Enter the passcode shared by your instructor'
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      disabled={connected}
                    />
                  </div>
                ) : null}
                <div className='live-stage-video'>
                  {instructorStream ? (
                    <>
                      <div className='live-embed-main__label'>{mainLabel}</div>
                      <video
                        ref={instructorVideoRef}
                        autoPlay
                        playsInline
                        className={`live-video ${instructorIsScreen ? "live-video--no-mirror" : "live-video--instructor"}`}
                      />
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
                    disabled={!connected && !localStream || !videoAllowed}
                    title={localMediaState.video ? "Stop video" : "Start video"}
                  >
                    <i
                      className={`ri-video-line ${!videoAllowed || !localMediaState.video ? "text-danger" : ""}`}
                    />
                  </button>
                  <button
                    type='button'
                    className={`btn btn-${localMediaState.audio ? "primary" : "outline-secondary"} ${
                      !audioAllowed ? "btn-danger" : ""
                    }`}
                    onClick={() => toggleMediaTrack("audio", !localMediaState.audio)}
                    disabled={!connected && !localStream || !audioAllowed}
                    title={localMediaState.audio ? "Mute" : "Unmute"}
                  >
                    <i className={`ri-${localMediaState.audio ? "mic-line" : "mic-off-line"}`} />
                  </button>
                  <button
                    type='button'
                    className={`btn btn-${screenShareActive ? "primary" : "outline-secondary"} ${
                      !shareAllowed ? "btn-danger" : ""
                    }`}
                    onClick={handleShareToggle}
                    disabled={!connected || !shareAllowed}
                    title={screenShareActive ? "Stop share" : "Share screen"}
                  >
                    <i className='ri-computer-line' />
                  </button>
                  <div className='spacer' />
                  {connected ? (
                    <button className='btn btn-outline-danger' type='button' onClick={leaveSession} title='Leave'>
                      <i className='ri-logout-box-r-line' />
                    </button>
                  ) : (
                    <button className='btn btn-primary' type='button' onClick={startClass} disabled={disabled}>
                      {disabled ? "Joining..." : "Join"}
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
                  <h5>Class chat</h5>
                  <div className='live-chat-box'>
                    <div className='live-chat-messages'>
                      {chatMessages.length === 0 ? (
                        <p className='text-muted small mb-2'>No messages yet.</p>
                      ) : (
                        chatMessages.map((msg, idx) => {
                          const isSelf = participantId && msg.from && msg.from === participantId;
                          const baseName =
                            msg.senderRole === "instructor" ? "Instructor" : msg.displayName || "Participant";
                          const name = isSelf ? `${baseName} (You)` : baseName;
                          return (
                            <div key={`${msg.timestamp}-${idx}`} className='live-chat-message'>
                              <strong>{name}:</strong> {msg.text}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className='live-chat-input d-flex gap-2 mt-2'>
                      <input
                        type='text'
                        className='form-control form-control-sm'
                        placeholder='Type a message'
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                      />
                      <button
                        type='button'
                        className='btn btn-sm btn-primary'
                        onClick={() => {
                          sendChatMessage(chatInput);
                          setChatInput("");
                        }}
                        disabled={!chatInput.trim()}
                      >
                        Send
                      </button>
                      <button
                        type='button'
                        className='btn btn-sm btn-outline-secondary'
                        title='Raise hand'
                        onClick={() => sendHandRaise()}
                      >
                        ✋
                      </button>
                    </div>
                    <div className='d-flex gap-2 mt-2 flex-wrap'>
                      <button type='button' className='btn btn-xs btn-outline-secondary' onClick={() => sendReaction("👍")}>
                        👍
                      </button>
                      <button type='button' className='btn btn-xs btn-outline-secondary' onClick={() => sendReaction("🎉")}>
                        🎉
                      </button>
                      <button type='button' className='btn btn-xs btn-outline-secondary' onClick={() => sendReaction("🙌")}>
                        🙌
                      </button>
                    </div>
                  </div>
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
