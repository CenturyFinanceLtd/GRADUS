import apiClient from './apiClient';

const qs = (params = {}) => {
  const sp = new URLSearchParams();
  if (params.status) sp.set('status', params.status);
  if (params.priority) sp.set('priority', params.priority);
  if (params.search && params.search.trim()) sp.set('search', params.search.trim());
  if (params.outcome) sp.set('outcome', params.outcome);
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export const listTickets = ({ token, status, priority, search, outcome } = {}) =>
  apiClient(`/admin/tickets${qs({ status, priority, search, outcome })}`, { token });

export const getTicketDetails = ({ token, id } = {}) =>
  apiClient(`/admin/tickets/${id}`, { token });

export const replyToTicket = ({ token, id, body, newStatus } = {}) =>
  apiClient(`/admin/tickets/${id}/reply`, { method: 'POST', data: { body, newStatus }, token });

export const updateTicket = ({ token, id, data } = {}) =>
  apiClient(`/admin/tickets/${id}`, { method: 'PATCH', data, token });

export const requestClosure = ({ token, id } = {}) =>
  apiClient(`/admin/tickets/${id}/request-closure`, { method: 'POST', token });

export const confirmClosure = ({ token, id, otp, solved } = {}) =>
  apiClient(`/admin/tickets/${id}/confirm-closure`, { method: 'POST', data: { otp, solved }, token });

export const requestAssignment = ({ token, id, toAdminId } = {}) =>
  apiClient(`/admin/tickets/${id}/assign/request`, { method: 'POST', data: { toAdminId }, token });

export const acceptAssignment = ({ token, id } = {}) =>
  apiClient(`/admin/tickets/${id}/assign/accept`, { method: 'POST', token });

export const declineAssignment = ({ token, id } = {}) =>
  apiClient(`/admin/tickets/${id}/assign/decline`, { method: 'POST', token });
