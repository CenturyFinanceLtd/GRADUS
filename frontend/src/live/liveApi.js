import apiClient from "../services/apiClient";

export const fetchLiveSession = (sessionId, { token }) =>
  apiClient.get(`/live/sessions/${encodeURIComponent(sessionId)}/public`, { token });

export const joinLiveSession = (sessionId, { displayName }, { token }) =>
  apiClient.post(
    `/live/sessions/${encodeURIComponent(sessionId)}/join`,
    { displayName },
    { token }
  );
