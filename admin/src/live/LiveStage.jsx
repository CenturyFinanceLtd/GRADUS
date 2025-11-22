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
}) => {
  const localVideoRef = useRef(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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
  const showSidePanels = showParticipants || showChat;
  const allowStudentAudio = session?.allowStudentAudio !== false;
  const allowStudentVideo = session?.allowStudentVideo !== false;
  const allowStudentScreenShare = session?.allowStudentScreenShare !== false;

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
          <div className='perm-item'>
            <span className='label'>Student audio</span>
            <button
              type='button'
              className={`perm-btn ${allowStudentAudio ? 'is-on' : 'is-off'}`}
              onClick={() => onToggleStudentAudio?.(!allowStudentAudio)}
            >
              {allowStudentAudio ? 'Allowed' : 'Muted'}
            </button>
          </div>
          <div className='perm-item'>
            <span className='label'>Student video</span>
            <button
              type='button'
              className={`perm-btn ${allowStudentVideo ? 'is-on' : 'is-off'}`}
              onClick={() => onToggleStudentVideo?.(!allowStudentVideo)}
            >
              {allowStudentVideo ? 'Allowed' : 'Disabled'}
            </button>
          </div>
          <div className='perm-item'>
            <span className='label'>Student screen share</span>
            <button
              type='button'
              className={`perm-btn ${allowStudentScreenShare ? 'is-on' : 'is-off'}`}
              onClick={() => onToggleStudentScreenShare?.(!allowStudentScreenShare)}
            >
              {allowStudentScreenShare ? 'Allowed' : 'Blocked'}
            </button>
          </div>
        </div>

        <div className={`host-live-grid ${showSidePanels ? 'with-side' : 'single'}`}>
          <div className='host-live-main'>
            {localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`host-live-video ${screenShareActive ? 'no-mirror' : 'mirror'}`}
              />
            ) : (
              <div className='host-live-placeholder'>
                <p className='mb-0 text-muted'>Camera is off</p>
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
                <ul className='host-live-participants'>
                  <li className='is-online'>
                    <span className='dot' />
                    <span className='name'>You (Instructor)</span>
                    <span className='role'>Host</span>
                  </li>
                  {participantsList.map((p) => {
                    const name = p.role === 'instructor' ? 'Instructor' : p.displayName || 'Participant';
                    return (
                      <li key={p.id} className={p.connected ? 'is-online' : ''}>
                        <span className='dot' />
                        <span className='name'>{name}</span>
                        <span className='role'>{p.role === 'instructor' ? 'Host' : 'Attendee'}</span>
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
                  <div className='host-live-chat placeholder'>
                    <p className='text-muted small mb-2'>Chat coming soon.</p>
                    <button className='btn btn-sm btn-outline-light w-100' type='button' disabled>
                      Type a message
                    </button>
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
          >
            {localMediaState.audio ? 'Mute' : 'Unmute'}
          </button>
          <button
            type='button'
            className={`tbtn ${localMediaState.video ? '' : 'is-off'}`}
            onClick={() => toggleMediaTrack('video', !localMediaState.video)}
          >
            {localMediaState.video ? 'Stop Video' : 'Start Video'}
          </button>
          <button type='button' className='tbtn' onClick={() => setShowParticipants((prev) => !prev)}>
            Participants
          </button>
          <button type='button' className='tbtn' onClick={() => setShowChat((prev) => !prev)}>
            Chat
          </button>
          <button
            type='button'
            className='tbtn'
            onClick={() => (screenShareActive ? onStopScreenShare?.() : onStartScreenShare?.())}
            disabled={!onStartScreenShare}
          >
            {screenShareActive ? 'Stop Share' : 'Share Screen'}
          </button>
          <button type='button' className='tbtn' onClick={() => alert('Reactions coming soon')}>
            Reactions
          </button>
          <button type='button' className='tbtn end' onClick={onEnd}>
            End
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
};

export default LiveStage;
