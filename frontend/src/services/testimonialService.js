import apiClient from './apiClient';

export const listTestimonials = async () => {
  const data = await apiClient.get('/testimonials');
  return data?.items || [];
};

export default { listTestimonials };

