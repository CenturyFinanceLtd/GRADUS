import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../services/apiClient";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchLiveSession, joinLiveSession } from "./liveApi";

const resolveServerInfo = () => {
  try {
    const parsed = new URL(API_BASE_URL);
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
  const [localStream, setLocalStream] = useState(null);
  const [localMediaState, setLocalMediaState] = useState({ audio: true, video: true });

  const participantRef = useRef(null);
  const hostParticipantRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const signalingRef = useRef({ socket: null, hostId: null });
  const sessionSnapshotRef = useRef(null);

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

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Your browser does not support live classes.");
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
    setLocalMediaState((prev) => ({ ...prev, [kind === "video" ? "video" : "audio"]: enabled }));
  }, []);

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
      await ensureLocalMedia();
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
  }, [createPeerConnection, ensureLocalMedia, sendSignal]);

  const handleSessionUpdate = useCallback(
    (sessionPayload) => {
      if (!sessionPayload) {
        return;
      }

      sessionSnapshotRef.current = sessionPayload;
      setSession(sessionPayload);

      const instructorList = Array.isArray(sessionPayload.participants) ? sessionPayload.participants : [];
      const connectedInstructor =
        instructorList.find((participant) => participant.role === "instructor" && participant.connected) ||
        instructorList.find((participant) => participant.role === "instructor") ||
        null;
      hostParticipantRef.current = connectedInstructor || null;

      if ((!connectedInstructor || !connectedInstructor.connected) && peerConnectionRef.current) {
        teardownConnection();
      }

      beginNegotiation();
    },
    [beginNegotiation, teardownConnection]
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
      await ensureLocalMedia();
      let pc = peerConnectionRef.current;
      if (!pc) {
        pc = createPeerConnection(payload.from);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({
        type: "webrtc-answer",
        target: payload.from,
        data: answer,
      });
    },
    [createPeerConnection, ensureLocalMedia, sendSignal]
  );

  const handleIceCandidate = useCallback((payload) => {
    if (!payload?.data || !peerConnectionRef.current) {
      return;
    }
    peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.data)).catch((error) => {
      console.warn("[live] Failed to apply ICE candidate", error);
    });
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
        default:
          break;
      }
    },
    [handleSessionUpdate, handleAnswer, handleOfferResponse, handleIceCandidate]
  );

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

  const joinClass = useCallback(
    async ({ displayName } = {}) => {
      if (!token) {
        throw new Error("Please sign in to join the class.");
      }

      setStageStatus("joining");
      setStageError(null);

      const response = await joinLiveSession(
        sessionId,
        { displayName: displayName || user?.firstName || user?.personalDetails?.studentName },
        { token }
      );

      participantRef.current = response?.participant || null;
      setSession(response?.session || null);
      sessionSnapshotRef.current = response?.session || null;

      await ensureLocalMedia();
      connectSignaling(response?.signaling, response?.participant);
    },
    [connectSignaling, ensureLocalMedia, sessionId, token, user]
  );

  const statusLabel = useMemo(() => {
    if (stageStatus === "live") {
      return "Connected";
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
    localStream,
    localMediaState,
    joinClass,
    leaveSession,
    toggleMediaTrack,
    user,
  };
};

export default useLiveStudentSession;
