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

  const joinClass = useCallback(
    async ({ displayName, passcode }) => {
      if (!sessionId || !token) return;
      setStageStatus("joining");
      setStageError(null);
      try {
        const response = await joinLiveSession(sessionId, {
          token,
          displayName,
          passcode,
        });

        setStageStatus("live");
        return response; // Contains { session, participant, signaling: { liveKitToken, liveKitUrl } }
      } catch (error) {
        setStageStatus("error");
        setStageError(error?.message || "Failed to join class.");
        return null;
      }
    },
    [sessionId, token]
  );

  return {
    session,
    loading,
    stageStatus,
    stageError,
    joinClass,
    user,
  };
};

export default useLiveStudentSession;
