import apiClient from './apiClient';

export const listBanners = async () => {
  const data = await apiClient.get('/banners');
  return Array.isArray(data?.items) ? data.items : [];
};

export default { listBanners };

