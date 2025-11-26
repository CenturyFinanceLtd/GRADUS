import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

const EMPTY_ARRAY = [];

const RemoteParticipantTile = ({ participant }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className='live-participant'>
      {participant.stream ? (
        <video ref={videoRef} autoPlay playsInline className='live-participant-video' />
      ) : (
        <div className='live-participant-placeholder'>
          <span>{participant.displayName?.[0] || '?'}</span>
        </div>
      )}
      <div className='live-participant-meta'>
        <strong>{participant.displayName || 'Participant'}</strong>
        <span className={participant.connected ? 'text-success' : 'text-muted'}>
          {participant.connected ? 'Connected' : 'Offline'}
        </span>
      </div>
    </div>
  );
};

RemoteParticipantTile.propTypes = {
  participant: PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string,
    role: PropTypes.string,
    stream: PropTypes.object,
    connected: PropTypes.bool,
    waiting: PropTypes.bool,
  }).isRequired,
};

const LiveStage = ({
  stageStatus,
  stageError,
  session,
  remoteParticipants = EMPTY_ARRAY,
  localStream,
  localMediaState,
  toggleMediaTrack,
  onLeave,
  onEnd,
  publicJoinLink,
  onToggleStudentAudio,
  onToggleStudentVideo,
  onToggleStudentScreenShare,
  onStartScreenShare,
  onStopScreenShare,
  screenShareActive,
  onToggleWaitingRoom,
  onToggleLocked,
  onUpdatePasscode,
  onRotateMeetingToken,
  onCommandParticipantMedia,
  onRemoveParticipant,
  chatMessages,
  onSendChat,
  onSendReaction,
  onSendHandRaise,
  instructorParticipantId,
  onSendSpotlight,
  spotlightParticipantId = null,
  onAdmitWaiting,
  onDenyWaiting,
  onDownloadAttendance,
}) => {
  const localVideoRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordStreamRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [lastRecordingUrl, setLastRecordingUrl] = useState('');
  const [recordingError, setRecordingError] = useState('');
  const [isDownloadingAttendance, setIsDownloadingAttendance] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [controlStates, setControlStates] = useState({});
  const hasLocalVideo = !!localStream?.getVideoTracks?.()?.length;
  const allowStudentAudio = session?.allowStudentAudio !== false;
  const allowStudentVideo = session?.allowStudentVideo !== false;
  const allowStudentScreenShare = session?.allowStudentScreenShare !== false;

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play?.().catch(() => {
        /* autoplay might be blocked; ignore */
      });
    }
  }, [localStream]);

  const handleStartRecording = () => {
    const fallbackStream = localStream;
    const startWithStream = (stream, warningMessage) => {
      try {
        setRecordingError(warningMessage || '');
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
        recorder.ondataavailable = (event) => {
          if (event.data?.size) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.onstop = async () => {
          stream.getTracks?.().forEach((t) => t.stop());
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          setIsSavingRecording(true);
          try {
            const filename = `live-recording-${session?.id || 'session'}-${Date.now()}.webm`;
            const url = URL.createObjectURL(blob);
            if (lastRecordingUrl) {
              URL.revokeObjectURL(lastRecordingUrl);
            }
            setLastRecordingUrl(url);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } catch (error) {
            console.warn('Failed to save recording', error);
            setRecordingError(error?.message || 'Failed to save recording locally.');
          } finally {
            setIsSavingRecording(false);
          }
        };
        recorder.start();
        recorderRef.current = recorder;
        setIsRecording(true);
      } catch (error) {
        console.warn('Recording failed to start', error);
        setRecordingError(error?.message || 'Unable to start recording.');
      }
    };

    if (navigator.mediaDevices?.getDisplayMedia) {
      navigator.mediaDevices
        .getDisplayMedia({ video: { frameRate: 30 }, audio: true })
        .then((displayStream) => {
          recordStreamRef.current = displayStream;
          startWithStream(displayStream);
        })
        .catch((err) => {
          console.warn('Screen capture failed', err);
          if (fallbackStream) {
            startWithStream(fallbackStream, err?.message || 'Screen capture blocked; recording camera instead.');
          } else {
            setRecordingError(err?.message || 'Unable to start recording.');
          }
        });
    } else if (fallbackStream) {
      startWithStream(fallbackStream, 'Screen capture unsupported; recording camera instead.');
    } else {
      setRecordingError('No stream to record yet.');
    }
  };

  const handleStopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    if (recordStreamRef.current) {
      recordStreamRef.current.getTracks().forEach((t) => t.stop());
      recordStreamRef.current = null;
    }
    setIsRecording(false);
  };

  const handleDownloadAttendance = async () => {
    if (!onDownloadAttendance || isDownloadingAttendance) return;
    setIsDownloadingAttendance(true);
    try {
      const rows = await onDownloadAttendance();
      if (!rows?.length) {
        alert('No attendance data yet.');
        return;
      }
      const header = ['id', 'name', 'role', 'joinedAt', 'lastSeenAt', 'connected', 'waiting'];
      const csv = [header.join(',')].concat(
        rows.map((r) =>
          [
            r.id,
            `"${(r.displayName || '').replace(/"/g, '""')}"`,
            r.role,
            r.joinedAt,
            r.lastSeenAt,
            r.connected,
            r.waiting,
          ].join(',')
        )
      );
      const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${session?.id || 'session'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Attendance download failed', error);
      alert(error?.message || 'Unable to download attendance.');
    } finally {
      setIsDownloadingAttendance(false);
    }
  };

  useEffect(() => {
    // Initialize control states for participants if not present; default all off until manually enabled.
    setControlStates((prev) => {
      const next = { ...prev };
      remoteParticipants.forEach((p) => {
        if (!next[p.id]) {
          next[p.id] = { audio: false, video: false, share: false };
        }
      });
      return next;
    });
  }, [remoteParticipants]);

  // When a global default flips off, force all per-participant states off and disable controls.
  useEffect(() => {
    if (allowStudentAudio) return;
    setControlStates((prev) => {
      const next = {};
      Object.entries(prev).forEach(([id, val]) => {
        next[id] = { ...val, audio: false };
      });
      return next;
    });
  }, [allowStudentAudio]);

  useEffect(() => {
    if (allowStudentVideo) return;
    setControlStates((prev) => {
      const next = {};
      Object.entries(prev).forEach(([id, val]) => {
        next[id] = { ...val, video: false };
      });
      return next;
    });
  }, [allowStudentVideo]);

  useEffect(() => {
    if (allowStudentScreenShare) return;
    setControlStates((prev) => {
      const next = {};
      Object.entries(prev).forEach(([id, val]) => {
        next[id] = { ...val, share: false };
      });
      return next;
    });
  }, [allowStudentScreenShare]);

  const updateControlState = (participantId, key, value) => {
    setControlStates((prev) => ({
      ...prev,
      [participantId]: { ...(prev[participantId] || { audio: true, video: true, share: true }), [key]: value },
    }));
  };

  const copyJoinLink = async () => {
    if (!publicJoinLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(publicJoinLink);
    } catch (_) {
      // ignore clipboard issues
    }
  };

  const statusBadgeClass =
    stageStatus === 'live' ? 'bg-success text-white' : stageStatus === 'error' ? 'bg-danger text-white' : 'bg-warning';

  const participantsList = remoteParticipants.filter((participant) => participant.connected);
  const waitingList = remoteParticipants.filter((participant) => participant.waiting);
  const showSidePanels = showParticipants || showChat;
  const waitingRoomEnabled = session?.waitingRoomEnabled || false;
  const locked = session?.locked || false;
  // Per-participant controls can be turned on even when global defaults are off; global toggles remain unchanged.

  const toggleParticipantMedia = async (participantId, key, nextValue) => {
    const payloadKey =
      key === 'audio' ? 'audio' : key === 'video' ? 'video' : key === 'share' ? 'screenShare' : null;
    if (!payloadKey) return;

    // Respect global blocks: if the global toggle is off, do not allow enabling per-user.
    if (
      (key === 'audio' && !allowStudentAudio && nextValue) ||
      (key === 'video' && !allowStudentVideo && nextValue) ||
      (key === 'share' && !allowStudentScreenShare && nextValue)
    ) {
      return;
    }

    // Update UI immediately
    updateControlState(participantId, key, nextValue);

    // If global default is off, lift it so the backend accepts the command (UI global toggle may show on).
    const needsAudioLift = key === 'audio' && nextValue && !allowStudentAudio;
    const needsVideoLift = key === 'video' && nextValue && !allowStudentVideo;
    const needsShareLift = key === 'share' && nextValue && !allowStudentScreenShare;

    try {
      if (needsAudioLift) await Promise.resolve(onToggleStudentAudio?.(true));
      if (needsVideoLift) await Promise.resolve(onToggleStudentVideo?.(true));
      if (needsShareLift) await Promise.resolve(onToggleStudentScreenShare?.(true));

      await Promise.resolve(onCommandParticipantMedia?.(session?.id, participantId, { [payloadKey]: nextValue }));
    } catch (error) {
      console.warn('Failed to update participant media', error);
      // rollback UI if command failed
      updateControlState(participantId, key, !nextValue);
    }
  };

  return (
    <div className='card host-live-card'>
      <div className='card-body host-live-body'>
        <div className='host-live-header'>
          <div>
            <p className='text-uppercase text-muted small mb-1'>Live classroom</p>
            <h4 className='card-title mb-1 d-flex align-items-center gap-2 flex-wrap'>
              {session?.title || 'Live session'}
              <span className={`badge ${statusBadgeClass}`}>{stageStatus}</span>
            </h4>
            {session?.courseName && (
              <p className='text-muted mb-0'>
                {session.courseName}
                {session.courseSlug ? <span className='ms-1 text-lowercase'>({session.courseSlug})</span> : null}
              </p>
            )}
            <div className='d-flex flex-wrap gap-2 mt-2'>
              {session?.requiresPasscode ? <span className='badge bg-secondary text-white'>Passcode</span> : null}
              {waitingRoomEnabled ? <span className='badge bg-warning text-dark'>Waiting room</span> : null}
              {locked ? <span className='badge bg-danger'>Locked</span> : null}
            </div>
          </div>
          <div className='d-flex align-items-center gap-2 flex-wrap'>
            <button className='btn btn-outline-warning btn-sm' type='button' onClick={onLeave}>
              Leave stage
            </button>
            <button className='btn btn-danger btn-sm' type='button' onClick={onEnd}>
              End session
            </button>
          </div>
        </div>

        {stageError && <div className='alert alert-danger mb-3'>{stageError}</div>}

        <div className='host-live-perms'>
          <div className='perm-item perm-item--stack'>
            <span className='label'>Students</span>
            <div className='d-flex align-items-center gap-2 flex-wrap'>
              <div className='perm-action'>
                <span className='perm-meta small text-muted'>Audio</span>
                <button
                  type='button'
                  className={`perm-btn ${allowStudentAudio ? 'is-on' : 'is-off'}`}
                  onClick={() => onToggleStudentAudio?.(!allowStudentAudio)}
                  aria-label={allowStudentAudio ? 'Mute students (defaults)' : 'Allow student audio (defaults)'}
                >
                  <span className='knob' />
                </button>
              </div>
              <div className='perm-action'>
                <span className='perm-meta small text-muted'>Video</span>
                <button
                  type='button'
                  className={`perm-btn ${allowStudentVideo ? 'is-on' : 'is-off'}`}
                  onClick={() => onToggleStudentVideo?.(!allowStudentVideo)}
                  aria-label={allowStudentVideo ? 'Disable student video (defaults)' : 'Enable student video (defaults)'}
                >
                  <span className='knob' />
                </button>
              </div>
              <div className='perm-action'>
                <span className='perm-meta small text-muted'>Screen share</span>
                <button
                  type='button'
                  className={`perm-btn ${allowStudentScreenShare ? 'is-on' : 'is-off'}`}
                  onClick={() => onToggleStudentScreenShare?.(!allowStudentScreenShare)}
                  aria-label={
                    allowStudentScreenShare
                      ? 'Disable student screen share (defaults)'
                      : 'Enable student screen share (defaults)'
                  }
                >
                  <span className='knob' />
                </button>
              </div>
            </div>
          </div><div className='perm-item'>
            <span className='label'>Waiting room</span>
            <div className='perm-action'>
              <button
                type='button'
                className={`perm-btn ${waitingRoomEnabled ? 'is-on' : 'is-off'}`}
                onClick={() => onToggleWaitingRoom?.(!waitingRoomEnabled)}
                aria-label={waitingRoomEnabled ? 'Disable waiting room' : 'Enable waiting room'}
              >
                <span className='knob' />
              </button>
            </div>
          </div>
          <div className='perm-item'>
            <span className='label'>Lock meeting</span>
            <div className='perm-action'>
              <button
                type='button'
                className={`perm-btn ${locked ? 'is-on' : 'is-off'}`}
                onClick={() => onToggleLocked?.(!locked)}
                aria-label={locked ? 'Unlock meeting' : 'Lock meeting'}
              >
                <span className='knob' />
              </button>
            </div>
          </div>
          <div className='perm-item'>
            <span className='label'>Recording</span>
            <div className='d-flex align-items-center gap-2 flex-wrap'>
              <button
                type='button'
                className='btn btn-sm btn-primary d-inline-flex align-items-center gap-1'
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isSavingRecording}
                title={isRecording ? 'Stop recording' : 'Start recording'}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <i className={`ri-${isRecording ? 'pause-circle-line' : 'record-circle-line'}`} />
              </button>
              {isSavingRecording ? (
                <span className='small text-muted d-inline-flex align-items-center gap-1'>
                  <i className='ri-save-3-line' />
                  Saving locally...
                </span>
              ) : null}
              {isRecording ? (
                <span className='small text-danger d-inline-flex align-items-center gap-1'>
                  <i className='ri-record-circle-line' />
                  Recording...
                </span>
              ) : null}
              {lastRecordingUrl ? (
                <a href={lastRecordingUrl} target='_blank' rel='noreferrer' className='small'>
                  Last recording
                </a>
              ) : null}
              {recordingError ? <span className='small text-danger'>{recordingError}</span> : null}
            </div>
          </div>
          <div className='perm-item'>
            <span className='label'>Attendance</span>
            <div className='d-flex align-items-center gap-2 flex-wrap'>
              <button
                type='button'
                className='btn btn-sm btn-secondary d-inline-flex align-items-center gap-1'
                onClick={handleDownloadAttendance}
                disabled={isDownloadingAttendance}
                title={isDownloadingAttendance ? 'Preparing CSV' : 'Download attendance CSV'}
                aria-label={isDownloadingAttendance ? 'Preparing CSV' : 'Download attendance CSV'}
              >
                <i className='ri-download-2-line' />
              </button>
            </div>
          </div>
          
          <div className='perm-item perm-item--wide'>
            <span className='label'>Passcode</span>
            <div className='d-flex gap-2 flex-wrap align-items-center'>
              <input
                type='text'
                className='form-control form-control-sm'
                placeholder={session?.requiresPasscode ? 'Update passcode' : 'Set a passcode'}
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value)}
                style={{ maxWidth: 220 }}
              />
              <button
                type='button'
                className='btn btn-sm btn-outline-primary'
                onClick={() => {
                  onUpdatePasscode?.(newPasscode);
                  setNewPasscode('');
                }}
              >
                Save
              </button>
              <button
                type='button'
                className='btn btn-sm btn-outline-secondary'
                onClick={() => {
                  onUpdatePasscode?.('');
                  setNewPasscode('');
                }}
              >
                Clear
              </button>
            </div>
          </div>
          {session?.meetingToken ? (
            <div className='perm-item perm-item--wide'>
              <span className='label'>Meeting token</span>
              <div className='d-flex gap-2 flex-wrap align-items-center'>
                <code className='small text-break'>{session.meetingToken}</code>
                <button
                  type='button'
                  className='btn btn-sm btn-outline-secondary'
                  onClick={() => navigator.clipboard?.writeText(session.meetingToken)}
                >
                  Copy
                </button>
                <button
                  type='button'
                  className='btn btn-sm btn-outline-danger'
                  onClick={() => onRotateMeetingToken?.()}
                >
                  Rotate
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className={`host-live-grid ${showSidePanels ? 'with-side' : 'single'}`}>
          <div className='host-live-main'>
            {hasLocalVideo ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`host-live-video ${screenShareActive ? 'no-mirror' : 'mirror'}`}
              />
            ) : (
              <div className='host-live-placeholder'>
                <p className='mb-0 text-muted'>
                  Camera is off or blocked. Check browser permission and camera toggle.
                </p>
              </div>
            )}
            <div className='host-live-overlay d-flex align-items-center gap-3'>
              <span className='badge bg-success'>You • Instructor</span>
              <span className='badge bg-dark'>{participantsList.length + 1} participants</span>
            </div>
          </div>
          {showSidePanels ? (
            <div className='host-live-side'>
              {showParticipants ? (
                <div className='host-live-panel'>
                  <div className='d-flex align-items-center justify-content-between mb-2'>
                    <span className='text-uppercase small text-muted'>Participants</span>
                    <button
                      type='button'
                      className='btn btn-sm btn-outline-light'
                      onClick={() => setShowParticipants(false)}
                    >
                      Hide
                    </button>
                  </div>
                  {waitingList.length ? (
                    <div className='mb-3'>
                      <div className='d-flex align-items-center justify-content-between mb-2'>
                        <span className='text-uppercase small text-muted'>Waiting room ({waitingList.length})</span>
                      </div>
                      <ul className='host-live-participants'>
                        {waitingList.map((p) => (
                          <li key={`wait-${p.id}`} className='is-online'>
                            <span className='dot' />
                            <span className='name'>{p.displayName || 'Participant'}</span>
                            <div className='host-live-participant-actions'>
                              <button
                                type='button'
                                className='btn btn-xs icon-btn'
                                onClick={() => onAdmitWaiting?.(session?.id, p.id)}
                                title='Admit'
                              >
                                <i className='ri-checkbox-circle-line' />
                              </button>
                              <button
                                type='button'
                                className='btn btn-xs btn-outline-danger icon-btn'
                                onClick={() => onDenyWaiting?.(session?.id, p.id)}
                                title='Deny'
                              >
                                <i className='ri-close-circle-line' />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <ul className='host-live-participants'>
                    <li className='is-online'>
                      <span className='dot' />
                      <span className='name'>You (Instructor)</span>
                      <span className='role'>Host</span>
                    </li>
                    {participantsList.map((p) => {
                      const name = p.role === 'instructor' ? 'Instructor' : p.displayName || 'Participant';
                      const isHost = p.role === 'instructor';
                      const controls = controlStates[p.id] || { audio: true, video: true, share: true };
                      const audioAllowed = controls.audio;
                      const videoAllowed = controls.video;
                      const shareAllowed = controls.share;
                      return (
                        <li key={p.id} className={p.connected ? 'is-online' : ''}>
                          <span className='dot' />
                          <span className='name'>{name}</span>
                          <span className='role'>{isHost ? 'Host' : 'Attendee'}</span>
                          {!isHost ? (
                            <div className='host-live-participant-actions'>
                              <button
                                type='button'
                                className={`btn btn-xs icon-btn ${audioAllowed ? 'is-on' : 'is-off'}`}
                                onClick={() => toggleParticipantMedia(p.id, 'audio', !controls.audio)}
                                disabled={!allowStudentAudio}
                                title={controls.audio ? 'Mute mic' : 'Unmute mic'}
                              >
                                <i className={`ri-${controls.audio ? 'mic-line' : 'mic-off-line'}`} />
                              </button>
                              <button
                                type='button'
                                className={`btn btn-xs icon-btn ${videoAllowed ? 'is-on' : 'is-off'}`}
                                onClick={() => toggleParticipantMedia(p.id, 'video', !controls.video)}
                                disabled={!allowStudentVideo}
                                title={videoAllowed ? 'Stop camera' : 'Start camera'}
                              >
                                <i className={`ri-${controls.video ? 'video-line' : 'video-off-line'}`} />
                              </button>
                              <button
                                type='button'
                                className={`btn btn-xs icon-btn ${shareAllowed ? 'is-on' : 'is-off'}`}
                                onClick={() => toggleParticipantMedia(p.id, 'share', !controls.share)}
                                disabled={!allowStudentScreenShare}
                                title={shareAllowed ? 'Stop screen share' : 'Allow screen share'}
                              >
                                <i className={`ri-computer-line`} />
                              </button>
                              <button
                                type='button'
                                className={`btn btn-xs icon-btn ${spotlightParticipantId === p.id ? 'is-on' : 'is-off'}`}
                                onClick={() => onSendSpotlight?.(spotlightParticipantId === p.id ? null : p.id)}
                                title='Spotlight participant'
                              >
                                <i className='ri-pushpin-line' />
                              </button>
                              <button
                                type='button'
                                className='btn btn-xs btn-outline-danger icon-btn'
                                onClick={() => onRemoveParticipant?.(session?.id, p.id, { ban: false })}
                                title='Remove'
                              >
                                <i className='ri-delete-bin-6-line' />
                              </button>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                    {participantsList.length === 0 ? (
                      <li className='text-muted small'>No students connected yet.</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {showChat ? (
                <div className='host-live-panel'>
                  <div className='d-flex align-items-center justify-content-between mb-2'>
                    <span className='text-uppercase small text-muted'>Chat</span>
                    <button
                      type='button'
                      className='btn btn-sm btn-outline-light'
                      onClick={() => setShowChat(false)}
                    >
                      Hide
                    </button>
                  </div>
                  <div className='host-live-chat'>
                    <div className='host-live-chat-messages'>
                      {chatMessages?.length ? (
                        chatMessages.map((msg) => {
                          const isSelf = instructorParticipantId && msg.from && msg.from === instructorParticipantId;
                          const name = isSelf
                            ? 'You'
                            : msg.senderRole === 'instructor'
                              ? 'Instructor'
                              : msg.displayName || 'Participant';
                          return (
                            <div key={`${msg.timestamp}-${msg.id || msg.from || Math.random()}`} className='chat-line'>
                              <strong>{name}:</strong> {msg.text}
                            </div>
                          );
                        })
                      ) : (
                        <p className='text-muted small mb-2'>No messages yet.</p>
                      )}
                    </div>
                    <div className='d-flex gap-2 mt-2'>
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
                          onSendChat?.(chatInput);
                          setChatInput('');
                        }}
                        disabled={!chatInput.trim()}
                      >
                        Send
                      </button>
                    </div>
                    <div className='d-flex gap-2 mt-2 flex-wrap'>
                      <button type='button' className='btn btn-xs btn-outline-secondary' onClick={() => onSendReaction?.('👍')}>
                        👍
                      </button>
                      <button type='button' className='btn btn-xs btn-outline-secondary' onClick={() => onSendReaction?.('🎉')}>
                        🎉
                      </button>
                      <button type='button' className='btn btn-xs btn-outline-secondary' onClick={() => onSendReaction?.('🙌')}>
                        🙌
                      </button>
                      <button type='button' className='btn btn-xs btn-outline-secondary' onClick={() => onSendHandRaise?.()}>
                        Raise hand
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className='host-live-toolbar'>
          <button
            type='button'
            className={`tbtn ${localMediaState.audio ? '' : 'is-off'}`}
            onClick={() => toggleMediaTrack('audio', !localMediaState.audio)}
            title={localMediaState.audio ? 'Mute mic' : 'Unmute mic'}
          >
            <i className={`ri-${localMediaState.audio ? 'mic-line' : 'mic-off-line'}`} />
          </button>
          <button
            type='button'
            className={`tbtn ${localMediaState.video ? '' : 'is-off'}`}
            onClick={() => toggleMediaTrack('video', !localMediaState.video)}
            title={localMediaState.video ? 'Stop video' : 'Start video'}
          >
            <i className={`ri-${localMediaState.video ? 'video-line' : 'video-off-line'}`} />
          </button>
          <button
            type='button'
            className='tbtn'
            onClick={() => setShowParticipants((prev) => !prev)}
            title={showParticipants ? 'Hide participants' : 'Show participants'}
          >
            <i className='ri-user-3-line' />
          </button>
          <button
            type='button'
            className='tbtn'
            onClick={() => setShowChat((prev) => !prev)}
            title={showChat ? 'Hide chat' : 'Show chat'}
          >
            <i className='ri-chat-3-line' />
          </button>
          <button
            type='button'
            className='tbtn'
            onClick={() => (screenShareActive ? onStopScreenShare?.() : onStartScreenShare?.())}
            disabled={!onStartScreenShare}
            title={screenShareActive ? 'Stop share' : 'Share screen'}
          >
            <i className='ri-computer-line' />
          </button>
          <button
            type='button'
            className='tbtn'
            onClick={() => alert('Reactions coming soon')}
            title='Reactions'
          >
            <i className='ri-emotion-line' />
          </button>
          <button type='button' className='tbtn end' onClick={onEnd} title='End session'>
            <i className='ri-logout-box-r-line' />
          </button>
        </div>
      </div>
    </div>
  );
};

LiveStage.propTypes = {
  stageStatus: PropTypes.string.isRequired,
  stageError: PropTypes.string,
  session: PropTypes.object,
  remoteParticipants: PropTypes.arrayOf(PropTypes.object),
  localStream: PropTypes.object,
  localMediaState: PropTypes.shape({
    audio: PropTypes.bool,
    video: PropTypes.bool,
  }).isRequired,
  toggleMediaTrack: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
  onEnd: PropTypes.func.isRequired,
  publicJoinLink: PropTypes.string,
  onToggleStudentAudio: PropTypes.func,
  onToggleStudentVideo: PropTypes.func,
  onToggleStudentScreenShare: PropTypes.func,
  onStartScreenShare: PropTypes.func,
  onStopScreenShare: PropTypes.func,
  screenShareActive: PropTypes.bool,
  onToggleWaitingRoom: PropTypes.func,
  onToggleLocked: PropTypes.func,
  onUpdatePasscode: PropTypes.func,
  onRotateMeetingToken: PropTypes.func,
  onCommandParticipantMedia: PropTypes.func,
  onRemoveParticipant: PropTypes.func,
  chatMessages: PropTypes.arrayOf(PropTypes.object),
  onSendChat: PropTypes.func,
  onSendReaction: PropTypes.func,
  onSendHandRaise: PropTypes.func,
  onSendSpotlight: PropTypes.func,
  spotlightParticipantId: PropTypes.string,
  onAdmitWaiting: PropTypes.func,
  onDenyWaiting: PropTypes.func,
  onDownloadAttendance: PropTypes.func,
};

export default LiveStage;
