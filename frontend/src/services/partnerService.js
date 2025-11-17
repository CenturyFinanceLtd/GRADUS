import apiClient from './apiClient';

export const fetchPartnerLogos = async () => {
  const data = await apiClient.get('/partners');
  return data?.items || [];
};

export default {
  fetchPartnerLogos,
};
