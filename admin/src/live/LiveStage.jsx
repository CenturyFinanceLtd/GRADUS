import { useEffect, useRef } from 'react';
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
        <video ref={videoRef} autoPlay playsInline />
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
}) => {
  const localVideoRef = useRef(null);

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

  return (
    <div className='live-stage card'>
      <div className='card-body live-stage-body'>
        <div className='live-stage-header'>
          <div>
            <h4 className='card-title mb-1'>{session?.title || 'Live classroom'}</h4>
            {session?.courseName && (
              <p className='text-muted mb-0'>
                Course:&nbsp;
                <strong>{session.courseName}</strong>
                {session.courseSlug ? <span className='ms-1 text-lowercase'>({session.courseSlug})</span> : null}
              </p>
            )}
            <p className='text-muted mb-0 mt-1'>
              Status:&nbsp;
              <strong className={`text-${stageStatus === 'live' ? 'success' : stageStatus === 'error' ? 'danger' : 'warning'}`}>
                {stageStatus}
              </strong>
            </p>
          </div>
          <div className='live-stage-actions'>
            {publicJoinLink && (
              <button className='btn btn-outline-secondary btn-sm' type='button' onClick={copyJoinLink}>
                Copy student link
              </button>
            )}
            <button className='btn btn-outline-danger btn-sm' type='button' onClick={onEnd}>
              End session
            </button>
            <button className='btn btn-outline-secondary btn-sm' type='button' onClick={onLeave}>
              Leave stage
            </button>
          </div>
        </div>

        {stageError && <div className='alert alert-danger mt-3'>{stageError}</div>}

        <div className='live-stage-video-grid'>
          <div className='live-participant local-stream'>
            {localStream ? (
              <video ref={localVideoRef} autoPlay playsInline muted />
            ) : (
              <div className='live-participant-placeholder'>
                <span>You</span>
              </div>
            )}
            <div className='live-participant-meta'>
              <strong>Instructor</strong>
              <span>{localStream ? 'Camera on' : 'Camera disabled'}</span>
            </div>
          </div>
          {remoteParticipants.map((participant) => (
            <RemoteParticipantTile key={participant.id} participant={participant} />
          ))}
        </div>

        <div className='live-stage-controls'>
          <button
            type='button'
            className={`btn btn-${localMediaState.video ? 'primary' : 'outline-secondary'}`}
            onClick={() => toggleMediaTrack('video', !localMediaState.video)}
          >
            {localMediaState.video ? 'Camera on' : 'Camera off'}
          </button>
          <button
            type='button'
            className={`btn btn-${localMediaState.audio ? 'primary' : 'outline-secondary'}`}
            onClick={() => toggleMediaTrack('audio', !localMediaState.audio)}
          >
            {localMediaState.audio ? 'Mic on' : 'Mic muted'}
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
};

export default LiveStage;
