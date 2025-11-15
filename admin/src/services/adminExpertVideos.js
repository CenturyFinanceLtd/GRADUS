import apiClient from './apiClient';

export const listAdminExpertVideos = async ({ token } = {}) => {
  const data = await apiClient('/admin/expert-videos', { token });
  return data?.items || [];
};

export const createAdminExpertVideo = async ({ token, file, title, subtitle, description, active = true, order = 0 }) => {
  const form = new FormData();
  form.append('video', file);
  form.append('title', title);
  if (subtitle) form.append('subtitle', subtitle);
  if (description) form.append('description', description);
  form.append('active', String(Boolean(active)));
  form.append('order', String(order));

  const data = await apiClient('/admin/expert-videos', { method: 'POST', data: form, token });
  return data?.item;
};

export const updateAdminExpertVideo = async ({ token, id, patch }) => {
  const data = await apiClient(`/admin/expert-videos/${id}`, { method: 'PATCH', data: patch, token });
  return data?.item;
};

export const deleteAdminExpertVideo = async ({ token, id }) => {
  const data = await apiClient(`/admin/expert-videos/${id}`, { method: 'DELETE', token });
  return data?.message === 'Deleted';
};

export default {
  listAdminExpertVideos,
  createAdminExpertVideo,
  updateAdminExpertVideo,
  deleteAdminExpertVideo,
};

