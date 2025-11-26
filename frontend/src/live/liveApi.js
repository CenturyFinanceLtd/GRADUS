import apiClient from "../services/apiClient";

export const fetchLiveSession = (sessionId, { token }) =>
  apiClient.get(`/live/sessions/${encodeURIComponent(sessionId)}/public`, { token });

export const joinLiveSession = (sessionId, { displayName, passcode, meetingToken }, { token }) =>
  apiClient.post(
    `/live/sessions/${encodeURIComponent(sessionId)}/join`,
    { displayName, passcode, meetingToken },
    { token }
  );

export const fetchActiveLiveSessionForCourse = (courseKey, { token }) =>
  apiClient.get(`/live/sessions/course/${encodeURIComponent(courseKey)}/active`, { token });

export const fetchLiveChatMessages = (sessionId, { token, limit = 200 }) =>
  apiClient.get(`/live/sessions/${encodeURIComponent(sessionId)}/chat?limit=${limit}`, { token });
