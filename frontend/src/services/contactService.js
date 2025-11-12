import apiClient from './apiClient';

export const submitContactInquiry = async ({
  name,
  email,
  phone,
  state,
  region,
  institution,
  course,
  message,
}) => {
  return apiClient.post('/inquiries', {
    name,
    email,
    phone,
    state,
    region,
    institution,
    course,
    message,
  });
};

export default {
  submitContactInquiry,
};
