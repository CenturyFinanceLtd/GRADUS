import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, PUBLIC_SITE_BASE, SIGNALING_BASE_URL } from '../config/env';
import { useAuthContext } from '../context/AuthContext';
import {
  createLiveSession,
  listLiveSessions,
  fetchLiveSession,
  updateLiveSession,
  joinLiveSessionAsInstructor,
} from './liveApi';

const resolveServerInfo = () => {
  try {
    const parsed = new URL(SIGNALING_BASE_URL || API_BASE_URL);
    return { protocol: parsed.protocol, host: parsed.host };
  } catch (_) {
    if (typeof window !== 'undefined') {
      return { protocol: window.location.protocol, host: window.location.host };
    }
    return { protocol: 'http:', host: 'localhost:5000' };
  }
};

const SERVER_INFO = resolveServerInfo();

const deriveBrowserPublicBase = () => {
  if (typeof window === 'undefined') {
    return `${SERVER_INFO.protocol}//${SERVER_INFO.host}`;
  }

  const { protocol, hostname, port } = window.location;

  if (port === '5174') {
    return `${protocol}//${hostname}:5173`;
  }

  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const DEFAULT_PUBLIC_BASE = PUBLIC_SITE_BASE || deriveBrowserPublicBase();

const buildWebSocketUrl = (path, sessionId, participantId, key) => {
  const wsProtocol = SERVER_INFO.protocol === 'https:' ? 'wss:' : 'ws:';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const searchParams = new URLSearchParams({
    sessionId,
    participantId,
    key,
  }).toString();
  return `${wsProtocol}//${SERVER_INFO.host}${normalizedPath}?${searchParams}`;
};

const buildStudentLink = (sessionId) => `${DEFAULT_PUBLIC_BASE}/live/${sessionId}`;

const emptyArray = [];

const useLiveInstructorSession = () => {
  const { token } = useAuthContext();
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);

  const [stageStatus, setStageStatus] = useState('idle');
  const [stageError, setStageError] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState(emptyArray);
  const [localStream, setLocalStream] = useState(null);
  const [localMediaState, setLocalMediaState] = useState({ audio: true, video: true });

  const sessionSecretsRef = useRef(new Map());
  const peerConnectionsRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const signalingRef = useRef({ socket: null, sessionId: null, participantId: null, iceServers: [] });
  const sessionSnapshotRef = useRef(null);
  const instructorParticipantRef = useRef(null);

  const mergeSessionIntoList = useCallback((session) => {
    if (!session) {
      return;
    }

    setSessions((prev) => {
      const index = prev.findIndex((item) => item.id === session.id);
      if (index === -1) {
        return [session, ...prev];
      }
      const copy = [...prev];
      copy[index] = { ...prev[index], ...session };
      return copy;
    });
  }, []);

  const loadSessions = useCallback(async () => {
    if (!token) {
      setSessions(emptyArray);
      return;
    }

    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const response = await listLiveSessions(token);
      const list = Array.isArray(response?.sessions) ? response.sessions : [];
      setSessions(list);
    } catch (error) {
      setSessionsError(error?.message || 'Unable to load live sessions.');
    } finally {
      setSessionsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Browser does not support media capture.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const toggleMediaTrack = useCallback((kind, enabled) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        if (track.kind === kind) {
          track.enabled = enabled;
        }
      });
    }

    setLocalMediaState((prev) => ({
      ...prev,
      [kind === 'video' ? 'video' : 'audio']: enabled,
    }));
  }, []);

  const teardownLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {
          // ignore
        }
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);
  }, []);

  const cleanupPeerConnections = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch (_) {
        // ignore
      }
    });
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    setRemoteParticipants(emptyArray);
  }, []);

  const disconnectSignaling = useCallback(() => {
    if (signalingRef.current.socket) {
      try {
        signalingRef.current.socket.onopen = null;
        signalingRef.current.socket.onmessage = null;
        signalingRef.current.socket.onclose = null;
        signalingRef.current.socket.onerror = null;
        signalingRef.current.socket.close();
      } catch (_) {
        // ignore
      }
    }
    signalingRef.current = { socket: null, sessionId: null, participantId: null, iceServers: [] };
  }, []);

  const leaveStage = useCallback(() => {
    disconnectSignaling();
    cleanupPeerConnections();
    teardownLocalMedia();
    sessionSnapshotRef.current = null;
    instructorParticipantRef.current = null;
    setActiveSession(null);
    setStageStatus('idle');
    setStageError(null);
  }, [cleanupPeerConnections, disconnectSignaling, teardownLocalMedia]);

  const createSessionHandler = useCallback(
    async ({ title, scheduledFor, course }) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      const courseIdentifier = course?.id || course?._id || course?.slug;
      if (!courseIdentifier) {
        throw new Error('Course selection is required.');
      }
      const payload = {
        title: title?.trim() || '',
        scheduledFor: scheduledFor || null,
        courseId: courseIdentifier,
        courseName: course.name || course.slug || 'Course',
        courseSlug: course.slug || null,
      };
      const response = await createLiveSession(payload, token);

      if (response?.instructor?.hostSecret && response?.session?.id) {
        sessionSecretsRef.current.set(response.session.id, response.instructor.hostSecret);
      }

      if (response?.session) {
        mergeSessionIntoList(response.session);
      }

      return response?.session;
    },
    [token, mergeSessionIntoList]
  );

  const getHostSecret = useCallback(
    async (sessionId) => {
      if (!token) {
        throw new Error('Authentication required');
      }

      if (sessionSecretsRef.current.has(sessionId)) {
        return sessionSecretsRef.current.get(sessionId);
      }

      const response = await fetchLiveSession(sessionId, token);
      const hostSecret = response?.session?.hostSecret;
      if (hostSecret) {
        sessionSecretsRef.current.set(sessionId, hostSecret);
      }

      if (response?.session) {
        mergeSessionIntoList(response.session);
      }

      return hostSecret;
    },
    [token, mergeSessionIntoList]
  );

  const buildRemoteParticipantSnapshot = useCallback((session) => {
    if (!session || !Array.isArray(session.participants)) {
      return [];
    }

    const currentId = instructorParticipantRef.current?.id;
    return session.participants
      .filter((participant) => participant.id && participant.id !== currentId)
      .map((participant) => ({
        ...participant,
        stream: remoteStreamsRef.current.get(participant.id) || null,
      }));
  }, []);

  const sendSignal = useCallback((message) => {
    const socket = signalingRef.current.socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  const createPeerConnection = useCallback(
    (remoteParticipantId) => {
      const configuration = {};
      if (signalingRef.current.iceServers && signalingRef.current.iceServers.length > 0) {
        configuration.iceServers = signalingRef.current.iceServers;
      }

      const pc = new RTCPeerConnection(configuration);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: 'webrtc-ice-candidate',
            target: remoteParticipantId,
            data: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          remoteStreamsRef.current.set(remoteParticipantId, stream);
          setRemoteParticipants((prev) => {
            const snapshot = sessionSnapshotRef.current
              ? buildRemoteParticipantSnapshot(sessionSnapshotRef.current)
              : prev;
            return snapshot;
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          peerConnectionsRef.current.delete(remoteParticipantId);
          remoteStreamsRef.current.delete(remoteParticipantId);
          setRemoteParticipants((prev) => {
            const snapshot = sessionSnapshotRef.current
              ? buildRemoteParticipantSnapshot(sessionSnapshotRef.current)
              : prev;
            return snapshot;
          });
        }
      };

      peerConnectionsRef.current.set(remoteParticipantId, pc);
      return pc;
    },
    [sendSignal, buildRemoteParticipantSnapshot]
  );

  const handleRemoteOffer = useCallback(
    async (payload) => {
      const remoteParticipantId = payload?.from;
      if (!remoteParticipantId || !payload?.data) {
        return;
      }

      await ensureLocalMedia();

      let pc = peerConnectionsRef.current.get(remoteParticipantId);
      if (!pc) {
        pc = createPeerConnection(remoteParticipantId);
      }
      if (!pc) {
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({
        type: 'webrtc-answer',
        target: remoteParticipantId,
        data: answer,
      });
    },
    [createPeerConnection, ensureLocalMedia, sendSignal]
  );

  const handleRemoteAnswer = useCallback((payload) => {
    const remoteParticipantId = payload?.from;
    if (!remoteParticipantId || !payload?.data) {
      return;
    }

    const pc = peerConnectionsRef.current.get(remoteParticipantId);
    if (!pc) {
      return;
    }

    pc.setRemoteDescription(new RTCSessionDescription(payload.data)).catch((error) => {
      console.warn('[live] Failed to set remote description', error);
    });
  }, []);

  const handleRemoteIceCandidate = useCallback((payload) => {
    const remoteParticipantId = payload?.from;
    if (!remoteParticipantId || !payload?.data) {
      return;
    }

    const pc = peerConnectionsRef.current.get(remoteParticipantId);
    if (!pc) {
      return;
    }

    pc.addIceCandidate(new RTCIceCandidate(payload.data)).catch((error) => {
      console.warn('[live] Failed to add ICE candidate', error);
    });
  }, []);

  const handleSessionUpdate = useCallback(
    (session) => {
      if (!session) {
        return;
      }

      sessionSnapshotRef.current = session;
      setActiveSession(session);
      setRemoteParticipants(buildRemoteParticipantSnapshot(session));
      mergeSessionIntoList(session);

      const stillConnectedIds = new Set(
        Array.isArray(session.participants)
          ? session.participants.filter((participant) => participant.connected).map((participant) => participant.id)
          : []
      );

      peerConnectionsRef.current.forEach((pc, participantId) => {
        if (!stillConnectedIds.has(participantId)) {
          try {
            pc.close();
          } catch (_) {
            // ignore
          }
          peerConnectionsRef.current.delete(participantId);
          remoteStreamsRef.current.delete(participantId);
        }
      });
    },
    [buildRemoteParticipantSnapshot, mergeSessionIntoList]
  );

  const handleSignalingPayload = useCallback(
    async (payload) => {
      if (!payload) {
        return;
      }

      switch (payload.type) {
        case 'session:update':
          handleSessionUpdate(payload.session);
          break;
        case 'webrtc-offer':
          await handleRemoteOffer(payload);
          break;
        case 'webrtc-answer':
          handleRemoteAnswer(payload);
          break;
        case 'webrtc-ice-candidate':
          handleRemoteIceCandidate(payload);
          break;
        case 'target-unavailable':
          console.warn('[live] Target unavailable', payload.target);
          break;
        case 'error':
          console.warn('[live] Signaling error', payload.message);
          break;
        default:
          break;
      }
    },
    [handleSessionUpdate, handleRemoteOffer, handleRemoteAnswer, handleRemoteIceCandidate]
  );

  const connectSignaling = useCallback(
    (signaling, sessionId, participant) => {
      if (!signaling?.path || !signaling?.key || !participant?.id) {
        throw new Error('Missing signaling configuration');
      }

      disconnectSignaling();

      const url = buildWebSocketUrl(signaling.path, sessionId, participant.id, signaling.key);
      const socket = new WebSocket(url);
      signalingRef.current = {
        socket,
        sessionId,
        participantId: participant.id,
        iceServers: Array.isArray(signaling.iceServers) ? signaling.iceServers : [],
      };

      setStageStatus('connecting');

      socket.onopen = () => {
        setStageStatus('live');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleSignalingPayload(payload);
        } catch (error) {
          console.warn('[live] Failed to parse signaling message', error);
        }
      };

      socket.onclose = () => {
        setStageStatus((prev) => (prev === 'idle' ? 'idle' : 'error'));
        setStageError('Signaling connection closed.');
        cleanupPeerConnections();
      };

      socket.onerror = () => {
        setStageStatus('error');
        setStageError('Signaling error occurred.');
      };
    },
    [cleanupPeerConnections, disconnectSignaling, handleSignalingPayload]
  );

  const joinSession = useCallback(
    async (sessionId) => {
      if (!token) {
        throw new Error('Authentication required');
      }

      setStageStatus('joining');
      setStageError(null);

      const hostSecret = await getHostSecret(sessionId);
      if (!hostSecret) {
        throw new Error('Unable to resolve host secret for this session.');
      }

      const response = await joinLiveSessionAsInstructor(
        sessionId,
        { hostSecret },
        token
      );

      if (!response?.participant) {
        throw new Error('Failed to join the live session.');
      }

      instructorParticipantRef.current = response.participant;
      setActiveSession(response.session);
      sessionSnapshotRef.current = response.session;
      mergeSessionIntoList(response.session);

      await ensureLocalMedia();
      connectSignaling(response.signaling, sessionId, response.participant);
      await updateLiveSession(sessionId, { status: 'live' }, token);
    },
    [token, getHostSecret, ensureLocalMedia, connectSignaling, mergeSessionIntoList]
  );

  const updateSessionStatus = useCallback(
    async (sessionId, status) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      const session = await updateLiveSession(sessionId, { status }, token);
      if (session) {
        mergeSessionIntoList(session);
        if (activeSession?.id === session.id) {
          setActiveSession(session);
          sessionSnapshotRef.current = session;
        }
      }
      return session;
    },
    [token, activeSession?.id, mergeSessionIntoList]
  );

  const endActiveSession = useCallback(async () => {
    if (!activeSession?.id) {
      return;
    }
    await updateSessionStatus(activeSession.id, 'ended');
    leaveStage();
  }, [activeSession?.id, leaveStage, updateSessionStatus]);

  const publicJoinLink = useMemo(() => {
    if (!activeSession?.id) {
      return '';
    }
    return buildStudentLink(activeSession.id);
  }, [activeSession?.id]);

  return {
    sessions,
    sessionsLoading,
    sessionsError,
    createSession: createSessionHandler,
    refreshSessions: loadSessions,
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
  };
};

export default useLiveInstructorSession;
