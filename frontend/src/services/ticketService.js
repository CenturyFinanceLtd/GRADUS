import apiClient from './apiClient';

export const listMyTickets = ({ token, status } = {}) =>
  apiClient.get(`/tickets${status ? `?status=${encodeURIComponent(status)}` : ''}`, { token });

export const createTicket = ({ token, subject, category, priority, description }) =>
  apiClient.post('/tickets', { subject, category, priority, description }, { token });

export const getTicketDetails = ({ token, id }) => apiClient.get(`/tickets/${id}`, { token });

export const addTicketMessage = ({ token, id, body }) =>
  apiClient.post(`/tickets/${id}/messages`, { body }, { token });

export const closeTicket = ({ token, id }) => apiClient.put(`/tickets/${id}/close`, undefined, { token });

