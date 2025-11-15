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
  qualification,
  eventDetails,
}) => {
  const payload = {
    name,
    email,
    phone,
    state,
    region,
    institution,
    course,
    message,
    qualification,
  };

  if (eventDetails) {
    payload.eventDetails = eventDetails;
  }

  return apiClient.post('/inquiries', payload);
};

export default {
  submitContactInquiry,
};
