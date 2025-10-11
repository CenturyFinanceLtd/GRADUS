import apiClient from './apiClient';

export const fetchActiveSession = ({ courseSlug, token } = {}) =>
  apiClient.get(`/live-sessions/courses/${courseSlug}/active`, { token });

export const joinLiveSession = ({ sessionId, token }) =>
  apiClient.post(`/live-sessions/${sessionId}/join`, undefined, { token });

export const pingLiveSession = ({ sessionId, elapsedMs, token }) =>
  apiClient.post(
    `/live-sessions/${sessionId}/ping`,
    { elapsedMs },
    { token }
  );

export const leaveLiveSession = ({ sessionId, token }) =>
  apiClient.post(`/live-sessions/${sessionId}/leave`, undefined, { token });

export default {
  fetchActiveSession,
  joinLiveSession,
  pingLiveSession,
  leaveLiveSession,
};
