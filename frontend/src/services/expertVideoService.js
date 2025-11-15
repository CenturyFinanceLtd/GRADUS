import apiClient from './apiClient';

export const listExpertVideos = async () => {
  const data = await apiClient.get('/expert-videos');
  return data?.items || [];
};

export default { listExpertVideos };

