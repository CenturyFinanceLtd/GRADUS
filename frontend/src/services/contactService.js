import apiClient from './apiClient';

export const submitContactInquiry = async ({
  name,
  email,
  phone,
  region,
  institution,
  course,
  message,
}) => {
  return apiClient.post('/inquiries', {
    name,
    email,
    phone,
    region,
    institution,
    course,
    message,
  });
};

export default {
  submitContactInquiry,
};
