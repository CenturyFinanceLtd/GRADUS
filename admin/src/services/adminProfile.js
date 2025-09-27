import apiClient from "./apiClient";

export const fetchAdminProfile = (token) =>
  apiClient("/admin/auth/me", {
    token,
  });

export const updateAdminProfile = (data, token) =>
  apiClient("/admin/auth/me", {
    method: "PUT",
    data,
    token,
  });

export const updateAdminPassword = (data, token) =>
  apiClient("/admin/auth/me/password", {
    method: "PUT",
    data,
    token,
  });

export const startAdminEmailChange = (data, token) =>
  apiClient("/admin/auth/email/change/start", {
    method: "POST",
    data,
    token,
  });

export const verifyAdminEmailChangeCurrent = (data, token) =>
  apiClient("/admin/auth/email/change/verify-current", {
    method: "POST",
    data,
    token,
  });

export const verifyAdminEmailChangeNew = (data, token) =>
  apiClient("/admin/auth/email/change/verify-new", {
    method: "POST",
    data,
    token,
  });