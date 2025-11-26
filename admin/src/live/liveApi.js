import apiClient from '../services/apiClient';

export const listLiveSessions = (token) =>
  apiClient('/live/sessions', {
    token,
  });

export const createLiveSession = (payload, token) =>
  apiClient('/live/sessions', {
    method: 'POST',
    data: payload,
    token,
  });

export const fetchLiveSession = (sessionId, token) =>
  apiClient(`/live/sessions/${encodeURIComponent(sessionId)}`, {
    token,
  });

export const updateLiveSession = (sessionId, payload, token) =>
  apiClient(`/live/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    data: payload,
    token,
  });

export const joinLiveSessionAsInstructor = (sessionId, payload, token) =>
  apiClient(`/live/sessions/${encodeURIComponent(sessionId)}/instructor/join`, {
    method: 'POST',
    data: payload,
    token,
  });

export const updateParticipantMediaState = (sessionId, participantId, payload, token) =>
  apiClient(`/live/sessions/${encodeURIComponent(sessionId)}/participants/${encodeURIComponent(participantId)}/media`, {
    method: 'POST',
    data: payload,
    token,
  });

export const kickParticipant = (sessionId, participantId, payload, token) =>
  apiClient(`/live/sessions/${encodeURIComponent(sessionId)}/participants/${encodeURIComponent(participantId)}/kick`, {
    method: 'POST',
    data: payload,
    token,
  });

export const admitParticipant = (sessionId, participantId, token) =>
  apiClient(`/live/sessions/${encodeURIComponent(sessionId)}/participants/${encodeURIComponent(participantId)}/admit`, {
    method: 'POST',
    token,
  });

export const denyParticipant = (sessionId, participantId, token) =>
  apiClient(`/live/sessions/${encodeURIComponent(sessionId)}/participants/${encodeURIComponent(participantId)}/deny`, {
    method: 'POST',
    token,
  });

export const uploadLiveRecording = (sessionId, file, { participantId, durationMs } = {}, token) => {
  const form = new FormData();
  form.append('file', file);
  if (participantId) {
    form.append('participantId', participantId);
  }
  if (durationMs !== undefined) {
    form.append('durationMs', durationMs);
  }
  return apiClient(`/live/sessions/${encodeURIComponent(sessionId)}/recordings`, {
    method: 'POST',
    data: form,
    token,
  });
};

export const fetchAttendance = (sessionId, token) =>
  apiClient(`/live/sessions/${encodeURIComponent(sessionId)}/attendance`, { token });

export const fetchSessionEvents = (sessionId, token, { limit = 500 } = {}) =>
  apiClient(`/live/sessions/${encodeURIComponent(sessionId)}/events?limit=${limit}`, { token });

export const fetchLiveChatMessages = (sessionId, token, { limit = 200 } = {}) =>
  apiClient(`/live/sessions/${encodeURIComponent(sessionId)}/chat/admin?limit=${limit}`, {
    token,
  });
