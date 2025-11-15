import apiClient from './apiClient';

export const listAdminWhyGradusVideo = async ({ token } = {}) => {
  const data = await apiClient('/admin/why-gradus-video', { token });
  return data?.items || [];
};

export const createAdminWhyGradusVideo = async ({ token, file, title, subtitle, description, ctaLabel, ctaHref, active = true, order = 0 }) => {
  const form = new FormData();
  form.append('video', file);
  if (title) form.append('title', title);
  if (subtitle) form.append('subtitle', subtitle);
  if (description) form.append('description', description);
  if (ctaLabel) form.append('ctaLabel', ctaLabel);
  if (ctaHref) form.append('ctaHref', ctaHref);
  form.append('active', String(Boolean(active)));
  form.append('order', String(order));

  const data = await apiClient('/admin/why-gradus-video', { method: 'POST', data: form, token });
  return data?.item;
};

export const updateAdminWhyGradusVideo = async ({ token, id, patch }) => {
  const data = await apiClient(`/admin/why-gradus-video/${id}`, { method: 'PATCH', data: patch, token });
  return data?.item;
};

export const deleteAdminWhyGradusVideo = async ({ token, id }) => {
  const data = await apiClient(`/admin/why-gradus-video/${id}`, { method: 'DELETE', token });
  return data?.message === 'Deleted';
};

export default {
  listAdminWhyGradusVideo,
  createAdminWhyGradusVideo,
  updateAdminWhyGradusVideo,
  deleteAdminWhyGradusVideo,
};

