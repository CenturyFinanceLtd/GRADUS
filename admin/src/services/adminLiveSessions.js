import apiClient from './apiClient';

export const listAdminLiveSessions = async ({ token, status, courseId } = {}) => {
  const params = new URLSearchParams();
  if (status) {
    params.append('status', status);
  }
  if (courseId) {
    params.append('courseId', courseId);
  }
  const query = params.toString();
  const data = await apiClient(`/admin/live-sessions${query ? `?${query}` : ''}`, { token });
  return data?.items || [];
};

export const createAdminLiveSession = async ({ token, data }) => {
  const response = await apiClient('/admin/live-sessions', { method: 'POST', data, token });
  return response?.session || null;
};

export const updateAdminLiveSession = async ({ token, id, data }) => {
  const response = await apiClient(`/admin/live-sessions/${id}`, { method: 'PATCH', data, token });
  return response?.session || null;
};

export const startAdminLiveSession = async ({ token, id }) => {
  const response = await apiClient(`/admin/live-sessions/${id}/start`, { method: 'POST', token });
  return response?.session || null;
};

export const endAdminLiveSession = async ({ token, id }) => {
  const response = await apiClient(`/admin/live-sessions/${id}/end`, { method: 'POST', token });
  return response?.session || null;
};

export default {
  listAdminLiveSessions,
  createAdminLiveSession,
  updateAdminLiveSession,
  startAdminLiveSession,
  endAdminLiveSession,
};

