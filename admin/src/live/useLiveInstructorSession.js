import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  API_BASE_URL,
  PUBLIC_SITE_BASE,
  SIGNALING_BASE_URL,
} from "../config/env";
import { useAuthContext } from "../context/AuthContext";
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
} from "./liveApi";

const normalizeBasePath = (pathname) => {
  if (!pathname || pathname === "/") {
    return "";
  }
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "/" ? "" : trimmed;
};

const isLocalHost = (host) => {
  if (!host) return false;
  const normalized = host.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.startsWith("localhost:") ||
    normalized === "127.0.0.1" ||
    normalized.startsWith("127.0.0.1:") ||
    normalized === "[::1]" ||
    normalized.endsWith(".local")
  );
};

const resolveServerInfo = () => {
  try {
    const parsed = new URL(SIGNALING_BASE_URL || API_BASE_URL);
    return {
      protocol: parsed.protocol,
      host: parsed.host,
      basePath: normalizeBasePath(parsed.pathname),
    };
  } catch (_) {
    if (typeof window !== "undefined") {
      return {
        protocol: window.location.protocol,
        host: window.location.host,
        basePath: "",
      };
    }
    return { protocol: "http:", host: "localhost:5000", basePath: "" };
  }
};

const SERVER_INFO = resolveServerInfo();

const deriveBrowserPublicBase = () => {
  if (typeof window === "undefined") {
    return `${SERVER_INFO.protocol}//${SERVER_INFO.host}`;
  }

  const { protocol, hostname, port } = window.location;

  if (port === "5174") {
    return `${protocol}//${hostname}:5173`;
  }

  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
};

const DEFAULT_PUBLIC_BASE = PUBLIC_SITE_BASE || deriveBrowserPublicBase();

const buildWebSocketUrl = (path, sessionId, participantId, key) => {
  const wsProtocol = SERVER_INFO.protocol === "https:" ? "wss:" : "ws:";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const basePath =
    SERVER_INFO.basePath || (!isLocalHost(SERVER_INFO.host) ? "/api" : "");
  const combinedPath =
    basePath && !normalizedPath.startsWith(basePath)
      ? `${basePath}${normalizedPath}`
      : normalizedPath;
  const cleanPath = combinedPath.replace(/\/{2,}/g, "/");
  const searchParams = new URLSearchParams({
    sessionId,
    participantId,
    key,
  }).toString();
  return `${wsProtocol}//${SERVER_INFO.host}${cleanPath}?${searchParams}`;
};

const buildStudentLink = (sessionId, meetingToken) =>
  `${DEFAULT_PUBLIC_BASE}/live/${sessionId}${
    meetingToken ? `?mt=${encodeURIComponent(meetingToken)}` : ""
  }`;

const emptyArray = [];

const useLiveInstructorSession = () => {
  const { token } = useAuthContext();
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);

  const [stageStatus, setStageStatus] = useState("idle");
  const [stageError, setStageError] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const sessionSecretsRef = useRef(new Map());

  const mergeSessionIntoList = useCallback((session) => {
    if (!session) return;
    setSessions((prev) => {
      const index = prev.findIndex((item) => item.id === session.id);
      if (index === -1) return [session, ...prev];
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
      setSessionsError(error?.message || "Unable to load live sessions.");
    } finally {
      setSessionsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const leaveStage = useCallback(() => {
    setActiveSession(null);
    setStageStatus("idle");
    setStageError(null);
  }, []);

  const createSessionHandler = useCallback(
    async ({
      title,
      scheduledFor,
      course,
      passcode,
      waitingRoomEnabled,
      locked,
    }) => {
      if (!token) throw new Error("Authentication required");
      const courseIdentifier = course?.id || course?._id || course?.slug;
      if (!courseIdentifier) throw new Error("Course selection is required.");

      const payload = {
        title: title?.trim() || "",
        scheduledFor: scheduledFor || null,
        courseId: courseIdentifier,
        courseName: course.name || course.slug || "Course",
        courseSlug: course.slug || null,
        passcode: passcode || "",
        waitingRoomEnabled: Boolean(waitingRoomEnabled),
        locked: Boolean(locked),
      };
      const response = await createLiveSession(payload, token);

      if (response?.instructor?.hostSecret && response?.session?.id) {
        sessionSecretsRef.current.set(
          response.session.id,
          response.instructor.hostSecret
        );
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
      if (!token) throw new Error("Authentication required");
      if (sessionSecretsRef.current.has(sessionId)) {
        return sessionSecretsRef.current.get(sessionId);
      }
      const response = await fetchLiveSession(sessionId, token);
      const hostSecret = response?.session?.hostSecret;
      if (hostSecret) {
        sessionSecretsRef.current.set(sessionId, hostSecret);
      }
      return hostSecret;
    },
    [token]
  );

  const joinSession = useCallback(
    async (sessionId) => {
      if (!token) throw new Error("Authentication required");
      setStageStatus("joining");
      setStageError(null);
      try {
        const hostSecret = await getHostSecret(sessionId);
        const response = await joinLiveSessionAsInstructor(
          sessionId,
          { hostSecret },
          token
        );
        setActiveSession(response);
        setStageStatus("live");
      } catch (error) {
        setStageStatus("error");
        setStageError(error?.message || "Failed to join session.");
      }
    },
    [token, getHostSecret]
  );

  const endActiveSession = useCallback(async () => {
    if (activeSession?.id) {
      await updateLiveSession(activeSession.id, { status: "ended" }, token);
      setStageStatus("ended");
      setActiveSession(null);
    }
  }, [activeSession, token]);

  const updateSessionStatus = async (id, status) => {
    await updateLiveSession(id, { status }, token);
    loadSessions();
  };

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
    publicJoinLink: activeSession
      ? buildStudentLink(activeSession.id, activeSession.meetingToken)
      : null,
    buildStudentLink,
    // No-ops / Nulls for omitted functionality (handled by LiveKit)
    remoteParticipants: [],
    toggleMediaTrack: () => {},
    localMediaState: { audio: true, video: true },
    localStream: null,
    updateStudentMediaPermissions: () => {},
    updateSessionSecurity: () => {},
    startScreenShare: () => {},
    stopScreenShare: () => {},
    screenShareActive: false,
    sendParticipantMediaCommand: () => {},
    removeParticipant: () => {},
    chatMessages: [],
    sendChatMessage: () => {},
    sendReaction: () => {},
    sendHandRaise: () => {},
    instructorParticipantId: null,
    sendSpotlight: () => {},
    spotlightParticipantId: null,
    admitWaitingParticipant: () => {},
    denyWaitingParticipant: () => {},
    uploadRecording: () => {},
    fetchAttendance: async () => [],
    fetchSessionEvents: async () => [],
  };
};

export default useLiveInstructorSession;
