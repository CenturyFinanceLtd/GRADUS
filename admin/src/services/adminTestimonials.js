import apiClient from './apiClient';

export const listAdminTestimonials = async ({ token } = {}) => {
  const data = await apiClient('/admin/testimonials', { token });
  return data?.items || [];
};

export const createAdminTestimonial = async ({ token, file, name, role, active = true, order = 0 }) => {
  const form = new FormData();
  form.append('video', file);
  form.append('name', name);
  if (role) form.append('role', role);
  form.append('active', String(Boolean(active)));
  form.append('order', String(order));

  const data = await apiClient('/admin/testimonials', { method: 'POST', data: form, token });
  return data?.item;
};

export const updateAdminTestimonial = async ({ token, id, patch }) => {
  const data = await apiClient(`/admin/testimonials/${id}`, { method: 'PATCH', data: patch, token });
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

