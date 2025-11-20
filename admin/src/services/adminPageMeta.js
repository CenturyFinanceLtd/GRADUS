import apiClient from './apiClient';

export const listAdminPageMeta = async ({ token } = {}) => {
  const data = await apiClient('/admin/page-meta', { token });
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    defaultMeta: data?.defaultMeta || null,
  };
};

export const createAdminPageMeta = async ({ token, payload }) => {
  if (!payload) {
    throw new Error('payload is required');
  }
  const data = await apiClient('/admin/page-meta', {
    method: 'POST',
    data: payload,
    token,
  });
  return data?.item;
};

export const updateAdminPageMeta = async ({ token, id, payload }) => {
  if (!id) {
    throw new Error('id is required');
  }
  const data = await apiClient(`/admin/page-meta/${id}`, {
    method: 'PATCH',
    data: payload,
    token,
  });
  return data?.item;
};

export const deleteAdminPageMeta = async ({ token, id }) => {
  if (!id) {
    throw new Error('id is required');
  }
  const data = await apiClient(`/admin/page-meta/${id}`, {
    method: 'DELETE',
    token,
  });
  return data?.message === 'Deleted';
};

export default {
  listAdminPageMeta,
  createAdminPageMeta,
  updateAdminPageMeta,
  deleteAdminPageMeta,
};
