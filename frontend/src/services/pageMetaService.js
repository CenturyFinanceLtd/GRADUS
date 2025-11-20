import apiClient from './apiClient';

export const fetchPublicPageMeta = async ({ signal } = {}) => {
  const data = await apiClient.get('/page-meta', { signal });
  return {
    defaultMeta: data?.defaultMeta || null,
    items: Array.isArray(data?.items) ? data.items : [],
  };
};

export default {
  fetchPublicPageMeta,
};
