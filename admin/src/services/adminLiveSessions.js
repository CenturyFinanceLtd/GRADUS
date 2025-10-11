import apiClient from './apiClient';

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const fetchLiveCourses = ({ token }) =>
  apiClient('/admin/live-sessions/courses', {
    method: 'GET',
    token,
  });

export const fetchCourseRoster = ({ token, courseId }) =>
  apiClient(`/admin/live-sessions/courses/${courseId}/roster`, {
    method: 'GET',
    token,
  });

export const fetchLiveSessions = ({ token, filters = {} }) =>
  apiClient(`/admin/live-sessions${buildQueryString(filters)}`, {
    method: 'GET',
    token,
  });

export const createLiveSession = ({ token, data }) =>
  apiClient('/admin/live-sessions', {
    method: 'POST',
    token,
    data,
  });

export const startLiveSession = ({ token, sessionId, data }) =>
  apiClient(`/admin/live-sessions/${sessionId}/start`, {
    method: 'POST',
    token,
    data,
  });

export const endLiveSession = ({ token, sessionId }) =>
  apiClient(`/admin/live-sessions/${sessionId}/end`, {
    method: 'POST',
    token,
  });

export const fetchLiveSession = ({ token, sessionId }) =>
  apiClient(`/admin/live-sessions/${sessionId}`, {
    method: 'GET',
    token,
  });

export default {
  fetchLiveCourses,
  fetchCourseRoster,
  fetchLiveSessions,
  createLiveSession,
  startLiveSession,
  endLiveSession,
  fetchLiveSession,
};
