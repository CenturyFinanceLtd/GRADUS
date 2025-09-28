import apiClient from "./apiClient";

export const fetchMyPermissions = (token) =>
  apiClient("/admin/permissions/me", {
    token,
  });

export const fetchRolePermissions = (token) =>
  apiClient("/admin/permissions", {
    token,
  });

export const updateRolePermissions = ({ role, allowedPages, token }) =>
  apiClient(`/admin/permissions/${role}`, {
    method: "PUT",
    data: { allowedPages },
    token,
  });
