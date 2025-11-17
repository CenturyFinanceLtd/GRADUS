import apiClient from './apiClient';

export const listAdminTestimonials = async ({ token } = {}) => {
  const data = await apiClient('/admin/testimonials', { token });
  return data?.items || [];
};

export const createAdminTestimonial = async ({
  token,
  file,
  thumbnailFile,
  name,
  role,
  active = true,
  order = 0,
}) => {
  const form = new FormData();
  form.append('video', file);
  form.append('name', name);
  if (role) form.append('role', role);
  form.append('active', String(Boolean(active)));
  form.append('order', String(order));
  if (thumbnailFile) form.append('thumbnail', thumbnailFile);

  const data = await apiClient('/admin/testimonials', { method: 'POST', data: form, token });
  return data?.item;
};

export const updateAdminTestimonial = async ({ token, id, patch = {}, thumbnailFile } = {}) => {
  const hasFile = Boolean(thumbnailFile);

  // Send multipart when replacing thumbnail; otherwise default to JSON.
  const payload = hasFile ? new FormData() : patch;

  if (hasFile) {
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (typeof value === 'undefined') return;
      payload.append(key, value);
    });
    payload.append('thumbnail', thumbnailFile);
  }

  const data = await apiClient(`/admin/testimonials/${id}`, { method: 'PATCH', data: payload, token });
  return data?.item;
};

export const deleteAdminTestimonial = async ({ token, id }) => {
  const data = await apiClient(`/admin/testimonials/${id}`, { method: 'DELETE', token });
  return data?.message === 'Deleted';
};

export default {
  listAdminTestimonials,
  createAdminTestimonial,
  updateAdminTestimonial,
  deleteAdminTestimonial,
};
