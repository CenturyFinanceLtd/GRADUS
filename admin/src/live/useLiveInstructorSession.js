import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, PUBLIC_SITE_BASE, SIGNALING_BASE_URL } from '../config/env';
import { useAuthContext } from '../context/AuthContext';
import {
  createLiveSession,
  listLiveSessions,
  fetchLiveSession,
  updateLiveSession,
  joinLiveSessionAsInstructor,
  updateParticipantMediaState,
  kickParticipant,
  fetchLiveChatMessages,
  admitParticipant,
  denyParticipant,
  uploadLiveRecording,
  fetchAttendance as fetchAttendanceApi,
  fetchSessionEvents as fetchSessionEventsApi,
} from './liveApi';

const normalizeBasePath = (pathname) => {
  if (!pathname || pathname === '/') {
    return '';
  }
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '/' ? '' : trimmed;
};

const isLocalHost = (host) => {
  if (!host) return false;
  const normalized = host.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized.startsWith('localhost:') ||
    normalized === '127.0.0.1' ||
    normalized.startsWith('127.0.0.1:') ||
    normalized === '[::1]' ||
    normalized.endsWith('.local')
  );
};

const resolveServerInfo = () => {
  try {
    const parsed = new URL(SIGNALING_BASE_URL || API_BASE_URL);
    return { protocol: parsed.protocol, host: parsed.host, basePath: normalizeBasePath(parsed.pathname) };
  } catch (_) {
    if (typeof window !== 'undefined') {
      return { protocol: window.location.protocol, host: window.location.host, basePath: '' };
    }
    return { protocol: 'http:', host: 'localhost:5000', basePath: '' };
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
  const basePath = SERVER_INFO.basePath || (!isLocalHost(SERVER_INFO.host) ? '/api' : '');
  const combinedPath =
    basePath && !normalizedPath.startsWith(basePath) ? `${basePath}${normalizedPath}` : normalizedPath;
  const cleanPath = combinedPath.replace(/\/{2,}/g, '/');
  const searchParams = new URLSearchParams({
    sessionId,
    participantId,
    key,
  }).toString();
  return `${wsProtocol}//${SERVER_INFO.host}${cleanPath}?${searchParams}`;
};

const buildStudentLink = (sessionId, meetingToken) =>
  `${DEFAULT_PUBLIC_BASE}/live/${sessionId}${meetingToken ? `?mt=${encodeURIComponent(meetingToken)}` : ''}`;

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
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [lastReaction, setLastReaction] = useState(null);
  const [spotlightParticipantId, setSpotlightParticipantId] = useState(null);

  const sessionSecretsRef = useRef(new Map());
  const peerConnectionsRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraEnabledBeforeShareRef = useRef(true);
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
    if (cameraStreamRef.current) {
      return cameraStreamRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Browser does not support media capture.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    cameraStreamRef.current = stream;
    if (!screenShareActive) {
      localStreamRef.current = stream;
      setLocalStream(stream);
    }
    return stream;
  }, [screenShareActive]);

  const toggleMediaTrack = useCallback((kind, enabled) => {
    const targetStream = localStreamRef.current || cameraStreamRef.current;
    if (targetStream) {
      targetStream.getTracks().forEach((track) => {
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

  // If we are joining/connecting/live but somehow don't have a local stream, re-request camera/mic.
  useEffect(() => {
    const needLocal = ['joining', 'connecting', 'live'].includes(stageStatus) && !localStream;
    if (!needLocal) return;
    ensureLocalMedia().catch((err) => {
      setStageError(err?.message || 'Unable to access camera/mic.');
    });
  }, [stageStatus, localStream, ensureLocalMedia]);

  const teardownLocalMedia = useCallback(() => {
    const stopTracks = (stream) => {
      if (!stream) return;
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {
          // ignore
        }
      });
    };

    stopTracks(localStreamRef.current);
    stopTracks(cameraStreamRef.current);
    stopTracks(screenStreamRef.current);

    localStreamRef.current = null;
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    cameraEnabledBeforeShareRef.current = true;
    setScreenShareActive(false);
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

  const addChatMessage = useCallback((msg) => {
    setChatMessages((prev) => [...prev, msg].slice(-200));
  }, []);

  const loadChatHistory = useCallback(
    async (sessionId) => {
      if (!token || !sessionId) return;
      try {
        const resp = await fetchLiveChatMessages(sessionId, token, { limit: 200 });
        const messages = Array.isArray(resp?.messages) ? resp.messages : [];
        setChatMessages(messages);
      } catch (_) {
        // ignore history fetch errors
      }
    },
    [token]
  );

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
    async ({ title, scheduledFor, course, passcode, waitingRoomEnabled, locked }) => {
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
        passcode: passcode || '',
        waitingRoomEnabled: Boolean(waitingRoomEnabled),
        locked: Boolean(locked),
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

  const sendChatMessage = useCallback(
    (text) => {
      const socket = signalingRef.current.socket;
      const trimmed = (text || '').trim();
      if (!trimmed || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(JSON.stringify({ type: 'chat:message', data: { text: trimmed } }));
    },
    []
  );

  const sendReaction = useCallback((emoji) => {
    const socket = signalingRef.current.socket;
    if (!emoji || !socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify({ type: 'reaction', data: { emoji } }));
  }, []);

  const sendHandRaise = useCallback(() => {
    const socket = signalingRef.current.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify({ type: 'hand-raise', data: { state: 'raised' } }));
  }, []);

  const sendSpotlight = useCallback(
    (participantId) => {
      const socket = signalingRef.current.socket;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      setSpotlightParticipantId(participantId || null);
      socket.send(
        JSON.stringify({
          type: 'spotlight',
          data: { participantId: participantId || null },
        })
      );
    },
    []
  );

  const sendShareState = useCallback(
    (active) => {
      const socket = signalingRef.current.socket;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(
        JSON.stringify({
          type: 'share:state',
          data: { active: Boolean(active) },
        })
      );
    },
    []
  );

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

  const replaceVideoTrackForAll = useCallback((nextTrack) => {
    peerConnectionsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(nextTrack).catch((error) => {
          console.warn('[live] Failed to replace track', error?.message);
        });
      } else if (nextTrack) {
        pc.addTrack(nextTrack, localStreamRef.current || cameraStreamRef.current || nextTrack);
      }
    });
  }, []);

  const stopScreenShare = useCallback(
    async ({ silent } = {}) => {
      const shouldRestoreCamera = cameraEnabledBeforeShareRef.current;
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {
            // ignore
          }
        });
        screenStreamRef.current = null;
      }

      const cameraStream = cameraStreamRef.current || (await ensureLocalMedia());
      const cameraVideoTrack = shouldRestoreCamera
        ? cameraStream?.getVideoTracks()?.[0] || null
        : null;

      if (cameraVideoTrack) {
        replaceVideoTrackForAll(cameraVideoTrack);
      }

      localStreamRef.current = cameraVideoTrack ? cameraStream : null;
      setLocalStream(cameraVideoTrack ? cameraStream : null);
      setScreenShareActive(false);
      if (!shouldRestoreCamera) {
        setLocalMediaState((prev) => ({ ...prev, video: false }));
      }
      sendShareState(false);

      if (!silent && !cameraVideoTrack) {
        setStageError('Unable to restore camera after screen sharing.');
      }
    },
    [ensureLocalMedia, replaceVideoTrackForAll, sendShareState]
  );

  const startScreenShare = useCallback(async () => {
    if (screenShareActive) {
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Screen sharing is not supported in this browser.');
    }

    try {
      const cameraStream = await ensureLocalMedia();
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const [screenTrack] = screenStream.getVideoTracks();
      if (!screenTrack) {
        throw new Error('Screen share did not provide a video track.');
      }

      screenTrack.onended = () => stopScreenShare({ silent: true });

      // Send the screen stream (with camera audio) as the active outbound stream
      const audioTracks = cameraStream?.getAudioTracks ? cameraStream.getAudioTracks() : [];
      const combined = new MediaStream([...audioTracks, screenTrack]);

      // Remember camera state and turn video off while sharing
      cameraEnabledBeforeShareRef.current = localMediaState.video;
      if (cameraStream && !localMediaState.video) {
        cameraStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }

      screenStreamRef.current = screenStream;
      setScreenShareActive(true);
      localStreamRef.current = combined;
      setLocalStream(combined);
      replaceVideoTrackForAll(screenTrack);
      sendShareState(true);
    } catch (error) {
      setStageError(error?.message || 'Screen sharing was blocked.');
      setStageStatus((prev) => (prev === 'connecting' ? 'idle' : prev));
    }
  }, [ensureLocalMedia, replaceVideoTrackForAll, screenShareActive, stopScreenShare, localMediaState.video, sendShareState]);

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

      if (session.status === 'ended') {
        mergeSessionIntoList(session);
        leaveStage();
        setStageStatus('ended');
        setStageError('Session has ended.');
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

      setRemoteParticipants(buildRemoteParticipantSnapshot(session));
    },
    [buildRemoteParticipantSnapshot, mergeSessionIntoList, leaveStage]
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
        case 'chat:message':
          addChatMessage({
            from: payload.from,
            displayName: payload.displayName || 'Participant',
            text: payload.text || payload.data?.text || '',
            timestamp: payload.timestamp || Date.now(),
          });
          break;
        case 'reaction':
          setLastReaction({ from: payload.from, data: payload.data || {}, timestamp: payload.timestamp || Date.now() });
          break;
        case 'hand-raise':
          setLastReaction({
            from: payload.from,
            data: { type: 'hand-raise', ...(payload.data || {}) },
            timestamp: payload.timestamp || Date.now(),
          });
          break;
        case 'spotlight':
          setSpotlightParticipantId(payload.data?.participantId || null);
          break;
        case 'share:owner': {
          const ownerId = payload.participantId || null;
          sessionSnapshotRef.current = sessionSnapshotRef.current
            ? { ...sessionSnapshotRef.current, screenShareOwner: ownerId }
            : sessionSnapshotRef.current;
          setActiveSession((prev) => (prev ? { ...prev, screenShareOwner: ownerId } : prev));
          break;
        }
        case 'share:denied':
          setStageError('Screen share unavailable right now.');
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
      loadChatHistory(sessionId);
    },
    [token, getHostSecret, ensureLocalMedia, connectSignaling, mergeSessionIntoList, loadChatHistory, updateLiveSession]
  );

  const applySessionUpdate = useCallback(
    async (sessionId, changes) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      const session = await updateLiveSession(sessionId, changes, token);
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

  const updateSessionStatus = useCallback(
    async (sessionId, status) => {
      const session = await applySessionUpdate(sessionId, { status });
      if (session && status === 'ended') {
        stopScreenShare({ silent: true });
      }
      return session;
    },
    [applySessionUpdate, stopScreenShare]
  );

  const updateStudentMediaPermissions = useCallback(
    async (sessionId, changes) => applySessionUpdate(sessionId, changes),
    [applySessionUpdate]
  );

  const updateSessionSecurity = useCallback(
    async (sessionId, changes) => applySessionUpdate(sessionId, changes),
    [applySessionUpdate]
  );

  const sendParticipantMediaCommand = useCallback(
    async (sessionId, participantId, changes) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      return updateParticipantMediaState(sessionId, participantId, changes, token);
    },
    [token]
  );

  const removeParticipant = useCallback(
    async (sessionId, participantId, options = {}) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      return kickParticipant(sessionId, participantId, options, token);
    },
    [token]
  );

  const admitWaitingParticipant = useCallback(
    async (sessionId, participantId) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      return admitParticipant(sessionId, participantId, token);
    },
    [token]
  );

  const denyWaitingParticipant = useCallback(
    async (sessionId, participantId) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      return denyParticipant(sessionId, participantId, token);
    },
    [token]
  );

  const uploadRecording = useCallback(
    async ({ sessionId, file, durationMs, participantId }) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      return uploadLiveRecording(sessionId, file, { durationMs, participantId }, token);
    },
    [token]
  );

  const endActiveSession = useCallback(async () => {
    if (!activeSession?.id) {
      return;
    }
    setStageStatus('ending');
    try {
      await updateSessionStatus(activeSession.id, 'ended');
    } catch (error) {
      setStageError(error?.message || 'Unable to end session.');
    } finally {
      leaveStage();
      setStageStatus('ended');
    }
  }, [activeSession?.id, leaveStage, updateSessionStatus]);

  const publicJoinLink = useMemo(() => {
    if (!activeSession?.id) {
      return '';
    }
    return buildStudentLink(activeSession.id, activeSession.meetingToken);
  }, [activeSession?.id, activeSession?.meetingToken]);

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
    updateStudentMediaPermissions,
    updateSessionSecurity,
    sendParticipantMediaCommand,
    removeParticipant,
    startScreenShare,
    stopScreenShare,
    screenShareActive,
    chatMessages,
    sendChatMessage,
    sendReaction,
    sendHandRaise,
    lastReaction,
    sendSpotlight,
    spotlightParticipantId,
    instructorParticipantId: instructorParticipantRef.current ? instructorParticipantRef.current.id : null,
    admitWaitingParticipant,
    denyWaitingParticipant,
    uploadRecording,
    fetchAttendance: async () => {
      if (!token || !activeSession?.id) throw new Error('Authentication required');
      const resp = await fetchAttendanceApi(activeSession.id, token);
      return resp?.attendance || [];
    },
    fetchSessionEvents: async ({ limit = 500 } = {}) => {
      if (!token || !activeSession?.id) throw new Error('Authentication required');
      const resp = await fetchSessionEventsApi(activeSession.id, token, { limit });
      return resp?.events || [];
    },
  };
};

export default useLiveInstructorSession;
