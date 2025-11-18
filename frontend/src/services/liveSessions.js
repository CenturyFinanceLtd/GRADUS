import { API_BASE_URL } from './apiClient';

export const fetchActiveLiveSession = async ({ courseSlug, courseId, programme } = {}) => {
  const params = new URLSearchParams();
  if (courseSlug) params.append('courseSlug', courseSlug);
  if (courseId) params.append('courseId', courseId);
  if (programme) params.append('programme', programme);
  const response = await fetch(`${API_BASE_URL}/live-sessions/active${params.toString() ? `?${params.toString()}` : ''}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Unable to load live session status');
  }
  const payload = await response.json();
  return payload?.session || null;
};

export const fetchLiveSessionByCode = async (viewerCode) => {
  if (!viewerCode) return null;
  const response = await fetch(`${API_BASE_URL}/live-sessions/code/${encodeURIComponent(viewerCode)}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Unable to load live session');
  }
  const payload = await response.json();
  return payload?.session || null;
};

export default {
  fetchActiveLiveSession,
  fetchLiveSessionByCode,
};

