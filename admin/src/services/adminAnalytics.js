import apiClient from './apiClient';

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    query.append(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

export const fetchBlogEngagement = ({ token, limit } = {}) =>
  apiClient(`/admin/analytics/blogs/engagement${buildQueryString({ limit })}`, {
    token,
  });

export const fetchPageViewStats = ({ token, range, limit } = {}) =>
  apiClient(`/admin/analytics/page-views${buildQueryString({ range, limit })}`, {
    token,
  });

export const fetchVisitorSummary = ({ token } = {}) =>
  apiClient('/admin/analytics/visitors/summary', { token });

export const fetchMonthlyVisitors = ({ token, months } = {}) =>
  apiClient(`/admin/analytics/visitors/monthly${buildQueryString({ months })}`, {
    token,
  });

export const fetchVisitorLocationStats = ({ token } = {}) =>
  apiClient('/admin/analytics/visitors/locations', { token });

export default {
  fetchBlogEngagement,
  fetchPageViewStats,
  fetchVisitorSummary,
  fetchMonthlyVisitors,
  fetchVisitorLocationStats,
};
