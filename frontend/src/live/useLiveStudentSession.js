import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchLiveSession, joinLiveSession, fetchLiveChatMessages } from "./liveApi";

const resolveServerInfo = () => {
  const override = import.meta.env.VITE_SIGNALING_BASE_URL;
  try {
    const parsed = new URL(override || API_BASE_URL);
    return { protocol: parsed.protocol, host: parsed.host };
  } catch (_) {
    if (typeof window !== "undefined") {
      return { protocol: window.location.protocol, host: window.location.host };
    }
    return { protocol: "http:", host: "localhost:5000" };
  }
};

const SERVER_INFO = resolveServerInfo();

const buildWebSocketUrl = (path, sessionId, participantId, key) => {
  const wsProtocol = SERVER_INFO.protocol === "https:" ? "wss:" : "ws:";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const search = new URLSearchParams({
    sessionId,
    participantId,
    key,
  }).toString();
  return `${wsProtocol}//${SERVER_INFO.host}${normalizedPath}?${search}`;
};

const useLiveStudentSession = (sessionId) => {
  const { token, user } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stageStatus, setStageStatus] = useState("idle");
  const [stageError, setStageError] = useState(null);
  const [instructorStream, setInstructorStream] = useState(null);
  const [instructorIsScreen, setInstructorIsScreen] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [localMediaState, setLocalMediaState] = useState({ audio: true, video: true });
  const [screenShareActive, setScreenShareActive] = useState(false);

  const participantRef = useRef(null);
  const hostParticipantRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const signalingRef = useRef({ socket: null, hostId: null });
  const sessionSnapshotRef = useRef(null);
  const initialMeetingTokenRef = useRef(
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mt") : null
  );
  const pendingIceCandidatesRef = useRef([]);
  const participantShareAllowedRef = useRef(true);
  const [participantShareAllowed, setParticipantShareAllowed] = useState(true);
  const participantMediaAllowedRef = useRef({ audio: true, video: true });
  const [participantMediaAllowed, setParticipantMediaAllowed] = useState({ audio: true, video: true });
  const [chatMessages, setChatMessages] = useState([]);
  const [lastReaction, setLastReaction] = useState(null);
  const [spotlightParticipantId, setSpotlightParticipantId] = useState(null);
  const signalingConfigRef = useRef(null);
  const addChatMessage = useCallback((msg) => {
    setChatMessages((prev) => [...prev, msg].slice(-200));
  }, []);

  const sendShareState = useCallback(
    (active) => {
      const socket = signalingRef.current.socket;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(
        JSON.stringify({
          type: "share:state",
          data: { active: Boolean(active) },
        })
      );
    },
    []
  );

  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId || !token) return;
      try {
        const resp = await fetchLiveChatMessages(sessionId, { token, limit: 200 });
        if (Array.isArray(resp?.messages)) {
          setChatMessages(resp.messages);
        }
      } catch (_) {
        // ignore history errors
      }
    };
    loadHistory();
  }, [sessionId, token]);

  const loadSession = useCallback(async () => {
    if (!sessionId || !token) {
      return;
    }

    setLoading(true);
    setStageError(null);
    try {
      const response = await fetchLiveSession(sessionId, { token });
      const sessionData = response?.session || null;
      setSession(sessionData);
      sessionSnapshotRef.current = sessionData;
    } catch (error) {
      setStageError(error?.message || "Unable to load class details.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, token]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const ensureCameraStream = useCallback(async () => {
    if (cameraStreamRef.current) {
      return cameraStreamRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Your browser does not support live classes.");
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
    const snapshot = sessionSnapshotRef.current;
    if (enabled) {
      if (kind === "audio") {
        if (snapshot?.allowStudentAudio === false || participantMediaAllowedRef.current.audio === false) {
          setStageError("Instructor has muted student microphones.");
          return;
        }
      }
      if (kind === "video") {
        if (snapshot?.allowStudentVideo === false || participantMediaAllowedRef.current.video === false) {
          setStageError("Instructor has disabled student cameras.");
          return;
        }
        if (screenShareActive && snapshot?.allowStudentScreenShare === false) {
          setStageError("Instructor has disabled student screen sharing.");
          return;
        }
      }
    }
    const targetStream = localStreamRef.current || cameraStreamRef.current;
    if (targetStream) {
      targetStream.getTracks().forEach((track) => {
        if (track.kind === kind) {
          track.enabled = enabled;
        }
      });
    }
    setLocalMediaState((prev) => ({ ...prev, [kind === "video" ? "video" : "audio"]: enabled }));
    setStageError(null);
  }, [screenShareActive]);

  const teardownConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (_) {
        // ignore
      }
    }
    peerConnectionRef.current = null;
    setInstructorStream(null);
    setInstructorIsScreen(false);
  }, []);

  const disconnectSignaling = useCallback(() => {
    if (signalingRef.current.socket) {
      try {
        signalingRef.current.socket.close();
      } catch (_) {
        // ignore
      }
    }
    signalingRef.current = { socket: null, hostId: null };
  }, []);

  const leaveSession = useCallback(() => {
    disconnectSignaling();
    teardownConnection();
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
    setScreenShareActive(false);
    setLocalStream(null);
    setInstructorStream(null); setInstructorIsScreen(false);
    participantRef.current = null;
    hostParticipantRef.current = null;
    setStageStatus("idle");
    setStageError(null);
  }, [disconnectSignaling, teardownConnection]);

  const sendSignal = useCallback((message) => {
    const socket = signalingRef.current.socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  const createPeerConnection = useCallback(
    (hostId) => {
      const configuration = signalingRef.current.iceServers?.length
        ? { iceServers: signalingRef.current.iceServers }
        : {};
      const pc = new RTCPeerConnection(configuration);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "webrtc-ice-candidate",
            target: hostId,
            data: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          setInstructorStream(stream);
          const track = stream.getVideoTracks ? stream.getVideoTracks()[0] : null;
          const isScreen = !!(track && /screen|display|window/i.test(track.label || ""));
          setInstructorIsScreen(isScreen);
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [sendSignal]
  );

  const beginNegotiation = useCallback(async () => {
    const instructor = hostParticipantRef.current;
    if (!instructor?.id || !instructor.connected) {
      return;
    }
    if (!participantRef.current) {
      return;
    }
    const socket = signalingRef.current.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    if (peerConnectionRef.current) {
      return;
    }

    try {
      await ensureCameraStream();
      const pc = createPeerConnection(instructor.id);
      if (!pc) {
        return;
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({
        type: "webrtc-offer",
        target: instructor.id,
        data: offer,
      });
    } catch (error) {
      console.warn("[live] Failed to start negotiation", error);
    }
  }, [createPeerConnection, ensureCameraStream, sendSignal]);

  const handleSessionUpdate = useCallback(
    (sessionPayload) => {
      if (!sessionPayload) {
        return;
      }

      sessionSnapshotRef.current = sessionPayload;
      setSession(sessionPayload);
      if (sessionPayload.waitingRoomEnabled && sessionPayload.status !== "live") {
        setStageStatus("waiting");
        setStageError("Waiting for instructor to start the class.");
      } else if (stageStatus === "waiting" && sessionPayload.status === "live") {
        setStageError(null);
        setStageStatus((prev) => (prev === "waiting" ? "idle" : prev));
      }

      const instructorList = Array.isArray(sessionPayload.participants) ? sessionPayload.participants : [];
      const connectedInstructor =
        instructorList.find((participant) => participant.role === "instructor" && participant.connected) ||
        instructorList.find((participant) => participant.role === "instructor") ||
        null;
      hostParticipantRef.current = connectedInstructor || null;
      participantRef.current = sessionPayload.participants?.find((p) => p.id === participantRef.current?.id) || participantRef.current;

      if ((!connectedInstructor || !connectedInstructor.connected) && peerConnectionRef.current) {
        teardownConnection();
      }

      if (connectedInstructor?.connected) {
        beginNegotiation();
      }
    },
    [beginNegotiation, teardownConnection, stageStatus]
  );

  const handleAnswer = useCallback((payload) => {
    if (!payload?.data || !peerConnectionRef.current) {
      return;
    }
    peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.data)).catch(
      (error) => {
        console.warn("[live] Failed to accept instructor answer", error);
      }
    );
  }, []);

  const handleOfferResponse = useCallback(
    async (payload) => {
      if (!payload?.data || !payload?.from) {
        return;
      }
      await ensureCameraStream();
      let pc = peerConnectionRef.current;
      if (!pc) {
        pc = createPeerConnection(payload.from);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      // Apply any queued ICE candidates now that a remote description exists
      if (pendingIceCandidatesRef.current.length) {
        const queue = [...pendingIceCandidatesRef.current];
        pendingIceCandidatesRef.current = [];
        for (const ice of queue) {
          try {
            await pc.addIceCandidate(ice);
          } catch (error) {
            console.warn("[live] Failed to apply queued ICE candidate", error);
          }
        }
      }
      sendSignal({
        type: "webrtc-answer",
        target: payload.from,
        data: answer,
      });
    },
    [createPeerConnection, ensureCameraStream, sendSignal]
  );

  const handleIceCandidate = useCallback((payload) => {
    if (!payload?.data || !peerConnectionRef.current) {
      return;
    }
    const pc = peerConnectionRef.current;
    const candidate = new RTCIceCandidate(payload.data);
    if (pc.remoteDescription && pc.remoteDescription.type) {
      pc.addIceCandidate(candidate).catch((error) => {
        console.warn("[live] Failed to apply ICE candidate", error);
      });
    } else {
      pendingIceCandidatesRef.current.push(candidate);
    }
  }, []);

  const handleSignalingPayload = useCallback(
    async (payload) => {
      if (!payload) {
        return;
      }

      switch (payload.type) {
        case "session:update":
          handleSessionUpdate(payload.session);
          break;
        case "webrtc-answer":
          handleAnswer(payload);
          break;
        case "webrtc-offer":
          await handleOfferResponse(payload);
          break;
        case "webrtc-ice-candidate":
          handleIceCandidate(payload);
          break;
        case "chat:message":
          addChatMessage({
            from: payload.from,
            displayName: payload.displayName || "Participant",
            text: payload.text || payload.data?.text || "",
            timestamp: payload.timestamp || Date.now(),
          });
          break;
        case "reaction":
          setLastReaction({ from: payload.from, data: payload.data || {}, timestamp: payload.timestamp || Date.now() });
          break;
        case "hand-raise":
          setLastReaction({
            from: payload.from,
            data: { type: "hand-raise", ...(payload.data || {}) },
            timestamp: payload.timestamp || Date.now(),
          });
          break;
        case "spotlight":
          setSpotlightParticipantId(payload.data?.participantId || null);
          break;
        case "share:owner": {
          const ownerId = payload.participantId || null;
          sessionSnapshotRef.current = sessionSnapshotRef.current
            ? { ...sessionSnapshotRef.current, screenShareOwner: ownerId }
            : sessionSnapshotRef.current;
          setSession((prev) => (prev ? { ...prev, screenShareOwner: ownerId } : prev));
          break;
        }
        case "share:denied":
          setStageError("Another screen share is in progress.");
          break;
        case "media-state":
          if (payload.data) {
            const { audio, video, screenShare } = payload.data;
            if (audio === false && localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
              setLocalMediaState((prev) => ({ ...prev, audio: false }));
              setStageError("Host muted your microphone.");
              participantMediaAllowedRef.current.audio = false;
              setParticipantMediaAllowed((prev) => ({ ...prev, audio: false }));
            }
            if (audio === true) {
              participantMediaAllowedRef.current.audio = true;
              setParticipantMediaAllowed((prev) => ({ ...prev, audio: true }));
            }
            if (video === false && localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
              setLocalMediaState((prev) => ({ ...prev, video: false }));
              setStageError("Host stopped your camera.");
              participantMediaAllowedRef.current.video = false;
              setParticipantMediaAllowed((prev) => ({ ...prev, video: false }));
            }
            if (video === true) {
              participantMediaAllowedRef.current.video = true;
              setParticipantMediaAllowed((prev) => ({ ...prev, video: true }));
            }
            if (screenShare === false && screenShareActive) {
              stopScreenShare({ silent: true });
              setStageError("Host stopped your screen share.");
            }
            if (screenShare !== undefined) {
              const allowed = screenShare !== false;
              participantShareAllowedRef.current = allowed;
              setParticipantShareAllowed(allowed);
            }
          }
          break;
        case "kick":
          setStageError("You have been removed from this live class.");
          leaveSession();
          break;
        case "waiting-room":
          setStageStatus("waiting");
          setStageError("Waiting for instructor to admit you.");
          break;
        default:
          break;
      }
    },
    [handleSessionUpdate, handleAnswer, handleOfferResponse, handleIceCandidate]
  );

  const replaceVideoTrackForHost = useCallback((nextTrack) => {
    const pc = peerConnectionRef.current;
    if (!pc || !nextTrack) {
      return;
    }
    const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
    if (sender) {
      sender.replaceTrack(nextTrack).catch((error) => {
        console.warn("[live] Failed to replace track", error?.message);
      });
    } else {
      pc.addTrack(nextTrack, localStreamRef.current || cameraStreamRef.current || new MediaStream([nextTrack]));
    }
  }, []);

  const stopScreenShare = useCallback(
    async ({ silent } = {}) => {
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

      const cameraStream = cameraStreamRef.current || (await ensureCameraStream());
      const cameraVideoTrack = cameraStream?.getVideoTracks()?.[0] || null;
      if (cameraVideoTrack) {
        replaceVideoTrackForHost(cameraVideoTrack);
      }

      localStreamRef.current = cameraStream;
      setLocalStream(cameraStream || null);
      setScreenShareActive(false);
      sendShareState(false);

      if (!silent && !cameraVideoTrack) {
        setStageError("Unable to restore camera after screen sharing.");
      }
    },
    [ensureCameraStream, replaceVideoTrackForHost, sendShareState]
  );

  const startScreenShare = useCallback(async () => {
    const snapshot = sessionSnapshotRef.current;
    if (snapshot?.allowStudentScreenShare === false || !participantShareAllowedRef.current) {
      setStageError("Instructor has disabled student screen sharing.");
      return;
    }
    const currentOwner = snapshot?.screenShareOwner;
    if (currentOwner && participantRef.current && currentOwner !== participantRef.current.id) {
      setStageError("Another screen share is already active.");
      return;
    }
    if (screenShareActive) {
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStageError("Your browser does not support screen sharing.");
      return;
    }

    const cameraStream = await ensureCameraStream();
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const [screenTrack] = screenStream.getVideoTracks();
    if (!screenTrack) {
      setStageError("Screen share did not provide a video track.");
      return;
    }

    const audioTracks = cameraStream?.getAudioTracks ? cameraStream.getAudioTracks() : [];
    const combined = new MediaStream([...audioTracks, screenTrack]);

    screenTrack.onended = () => stopScreenShare({ silent: true });

    localStreamRef.current = combined;
    setLocalStream(combined);
    screenStreamRef.current = screenStream;
    setScreenShareActive(true);

    replaceVideoTrackForHost(screenTrack);
    sendShareState(true);
  }, [ensureCameraStream, replaceVideoTrackForHost, screenShareActive, stopScreenShare, sendShareState]);

  useEffect(() => {
    if (!session) {
      return;
    }
    if (session.allowStudentAudio === false && localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      setLocalMediaState((prev) => (prev.audio ? { ...prev, audio: false } : prev));
      participantMediaAllowedRef.current.audio = false;
      setParticipantMediaAllowed((prev) => ({ ...prev, audio: false }));
    }
    if (session.allowStudentVideo === false && localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
      setLocalMediaState((prev) => (prev.video ? { ...prev, video: false } : prev));
      participantMediaAllowedRef.current.video = false;
      setParticipantMediaAllowed((prev) => ({ ...prev, video: false }));
    }
    if (session.allowStudentScreenShare === false) {
      participantShareAllowedRef.current = false;
      setParticipantShareAllowed(false);
    } else {
      participantShareAllowedRef.current = true;
      setParticipantShareAllowed(true);
    }
    if (session.allowStudentScreenShare === false && screenShareActive) {
      stopScreenShare({ silent: true });
    }
    if (session.allowStudentAudio !== false && session.allowStudentVideo !== false) {
      // restore allowed flags when globally enabled
      participantMediaAllowedRef.current = { audio: true, video: true };
      setParticipantMediaAllowed({ audio: true, video: true });
    }
  }, [session?.allowStudentAudio, session?.allowStudentVideo, session?.allowStudentScreenShare, screenShareActive, stopScreenShare]);

  const connectSignaling = useCallback(
    (signaling, participant) => {
      if (!signaling?.path || !signaling?.key || !participant?.id) {
        throw new Error("Missing signaling configuration.");
      }

      disconnectSignaling();

      setStageStatus("connecting");
      const url = buildWebSocketUrl(signaling.path, sessionId, participant.id, signaling.key);
      const socket = new WebSocket(url);
      signalingRef.current = {
        socket,
        hostId: null,
        iceServers: Array.isArray(signaling.iceServers) ? signaling.iceServers : [],
      };

      socket.onopen = () => {
        setStageStatus("live");
        beginNegotiation();
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleSignalingPayload(payload);
        } catch (error) {
          console.warn("[live] Signaling parse error", error);
        }
      };

      socket.onclose = () => {
        setStageStatus("idle");
        setStageError("Connection closed.");
        teardownConnection();
      };

      socket.onerror = () => {
        setStageStatus("error");
        setStageError("Could not connect to live class.");
      };
    },
    [beginNegotiation, disconnectSignaling, handleSignalingPayload, sessionId, teardownConnection]
  );

  useEffect(() => {
    if (stageStatus !== "waiting-room" || !sessionId || !token || !participantRef.current) {
      return undefined;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const resp = await fetchLiveSession(sessionId, { token });
        const sessionData = resp?.session;
        if (!sessionData) return;
        sessionSnapshotRef.current = sessionData;
        setSession(sessionData);
        const self = Array.isArray(sessionData.participants)
          ? sessionData.participants.find((p) => p.id === participantRef.current.id)
          : null;
        if (!self) {
          setStageStatus("error");
          setStageError("You were removed from the waiting room.");
          return;
        }
        if (!self.waiting) {
          setStageError(null);
          setStageStatus("joining");
          await ensureCameraStream();
          connectSignaling(signalingConfigRef.current, participantRef.current);
        }
      } catch (_) {
        // ignore transient poll errors
      }
    };

    const interval = setInterval(() => {
      if (!cancelled) poll();
    }, 4000);
    poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stageStatus, sessionId, token, ensureCameraStream, connectSignaling]);

  const joinClass = useCallback(
    async ({ displayName, passcode } = {}) => {
      if (!token) {
        throw new Error("Please sign in to join the class.");
      }

      setStageStatus("joining");
      setStageError(null);

      try {
        const response = await joinLiveSession(
          sessionId,
          {
            displayName: displayName || user?.firstName || user?.personalDetails?.studentName,
            passcode: passcode || undefined,
            meetingToken: initialMeetingTokenRef.current || undefined,
          },
          { token }
        );

        if (!response?.participant || !response?.session) {
          throw new Error("Unable to join this live session.");
        }

        participantRef.current = response.participant;
        setSession(response.session);
        sessionSnapshotRef.current = response.session;
        signalingConfigRef.current = response.signaling || null;

        if (response.participant.waiting) {
          setStageStatus("waiting-room");
          setStageError("Waiting for instructor to admit you.");
          return null;
        }

        await ensureCameraStream();
        connectSignaling(response.signaling, response.participant);
      } catch (error) {
        const status = error?.status;
        const message =
          status === 404
            ? "This live session is no longer available. Please refresh or rejoin from the course page."
            : error?.message || "Unable to join this live session.";
        setStageStatus("error");
        setStageError(message);
        return null;
      }
    },
    [connectSignaling, ensureCameraStream, sessionId, token, user]
  );

  const statusLabel = useMemo(() => {
    if (stageStatus === "live") {
      return "Connected";
    }
    if (stageStatus === "waiting-room") {
      return "Waiting for host";
    }
    if (stageStatus === "joining" || stageStatus === "connecting") {
      return "Connecting…";
    }
    if (stageStatus === "error") {
      return "Connection error";
    }
    return "Not connected";
  }, [stageStatus]);

  return {
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
    sendChatMessage: useCallback(
      (text) => {
        const socket = signalingRef.current.socket;
        const trimmed = (text || "").trim();
        if (!trimmed || !socket || socket.readyState !== WebSocket.OPEN) {
          return;
        }
        socket.send(JSON.stringify({ type: "chat:message", data: { text: trimmed } }));
      },
      []
    ),
    sendReaction: useCallback((emoji) => {
      const socket = signalingRef.current.socket;
      if (!emoji || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(JSON.stringify({ type: "reaction", data: { emoji } }));
    }, []),
    sendHandRaise: useCallback(() => {
      const socket = signalingRef.current.socket;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(JSON.stringify({ type: "hand-raise", data: { state: "raised" } }));
    }, []),
    lastReaction,
    spotlightParticipantId,
    participantId: participantRef.current ? participantRef.current.id : null,
    user,
  };
};

export default useLiveStudentSession;

