import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchLiveSession, joinLiveSession } from "./liveApi";

const useLiveStudentSession = (sessionId) => {
  const { token, user } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stageStatus, setStageStatus] = useState("idle");
  const [stageError, setStageError] = useState(null);

  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId || !token) return;
      setLoading(true);
      try {
        const response = await fetchLiveSession(sessionId, { token });
        setSession(response?.session);
      } catch (error) {
        setStageError(error?.message || "Failed to load class info.");
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [sessionId, token]);

  const joinClass = useCallback(async ({ displayName, passcode }) => {
    if (!sessionId || !token) return;
    setStageStatus("joining");
    setStageError(null);
    try {
        const response = await joinLiveSession(sessionId, { 
            token, 
            displayName, 
            passcode 
        });
        
        setStageStatus("live");
        return response; // Contains { session, participant, signaling: { liveKitToken, liveKitUrl } }
    } catch (error) {
        setStageStatus("error");
        setStageError(error?.message || "Failed to join class.");
        return null;
    }
  }, [sessionId, token]);

  return {
    session,
    loading,
    stageStatus,
    stageError,
    joinClass,
    user
  };
};

export default useLiveStudentSession;      setStageStatus("joining");
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

        // Default student media to disabled until instructor explicitly allows per-user
        participantMediaAllowedRef.current = { audio: false, video: false };
        participantShareAllowedRef.current = false;
        setParticipantMediaAllowed({ audio: false, video: false });
        setParticipantShareAllowed(false);
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
          localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = false));
          setLocalMediaState((prev) => ({ ...prev, audio: false, video: false }));
        }
        if (screenShareActive) {
          stopScreenShare({ silent: true });
        }

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

        // If the session is gone/ended, surface a clean ended state instead of an error banner.
        if (status === 410 || /ended/i.test(message || "")) {
          setStageStatus("ended");
          setStageError(null);
        } else {
          setStageStatus("error");
          setStageError(message);
        }
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
    if (stageStatus === "ended" || session?.status === "ended") {
      return "Ended";
    }
    return "Not connected";
  }, [stageStatus, session?.status]);

  return {
    session,
    loading,
    stageStatus,
    stageError,
    endedNoticeVisible,
    dismissEndedNotice: () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
      setEndedNoticeVisible(false);
      redirectToHome();
    },
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
    uiAudioAllowed: participantMediaAllowed.audio === true,
    uiVideoAllowed: participantMediaAllowed.video === true,
    uiShareAllowed: participantShareAllowed === true,
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
