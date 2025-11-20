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
