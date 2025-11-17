import apiClient from './apiClient';

export const listAdminPartners = async ({ token } = {}) => {
  const data = await apiClient('/admin/partners', { token });
  return data?.items || [];
};

export const createAdminPartner = async ({
  token,
  file,
  name,
  website,
  programs,
  order = 0,
  active = true,
}) => {
  const form = new FormData();
  form.append('logo', file);
  form.append('name', name);
  if (website) form.append('website', website);
  if (typeof programs !== 'undefined') {
    const normalizedPrograms = Array.isArray(programs) ? programs.join(',') : programs;
    form.append('programs', normalizedPrograms);
  }
  form.append('order', String(order || 0));
  form.append('active', String(Boolean(active)));

  const data = await apiClient('/admin/partners', { method: 'POST', data: form, token });
  return data?.item || data;
};

export const bulkUploadAdminPartners = async ({
  token,
  files = [],
  defaultPrograms,
  defaultActive = true,
  orderStart = 0,
}) => {
  const form = new FormData();
  files.forEach((file) => form.append('logos', file));
  if (typeof defaultPrograms !== 'undefined') {
    const normalizedPrograms = Array.isArray(defaultPrograms)
      ? defaultPrograms.join(',')
      : defaultPrograms;
    form.append('defaultPrograms', normalizedPrograms);
  }
  form.append('defaultActive', String(Boolean(defaultActive)));
  form.append('orderStart', String(orderStart || 0));

  const data = await apiClient('/admin/partners', { method: 'POST', data: form, token });
  return data?.items || [];
};

export const updateAdminPartner = async ({ token, id, patch = {}, file } = {}) => {
  const hasFile = Boolean(file);
  const payload = hasFile ? new FormData() : patch;

  if (hasFile) {
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (typeof value === 'undefined') return;
      payload.append(key, value);
    });
    payload.append('logo', file);
  }

  const data = await apiClient(`/admin/partners/${id}`, {
    method: 'PATCH',
    data: payload,
    token,
  });
  return data?.item || data;
};

export const deleteAdminPartner = async ({ token, id }) => {
  const data = await apiClient(`/admin/partners/${id}`, { method: 'DELETE', token });
  return data?.message === 'Deleted';
};

export default {
  listAdminPartners,
  createAdminPartner,
  bulkUploadAdminPartners,
  updateAdminPartner,
  deleteAdminPartner,
};
