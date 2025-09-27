import apiClient from "./apiClient";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set("search", params.search.trim());
  }

  if (params.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const fetchAdminUsers = (token, params = {}) =>
  apiClient(`/admin/users${buildQueryString(params)}`, {
    token,
  });

export const updateAdminUserStatus = ({ userId, status, token }) =>
  apiClient(`/admin/users/${userId}/status`, {
    method: "PATCH",
    data: { status },
    token,
  });

export const deleteAdminUser = ({ userId, token }) =>
  apiClient(`/admin/users/${userId}`, {
    method: "DELETE",
    token,
  });

export const updateAdminUserRole = ({ userId, role, token }) =>
  apiClient(`/admin/users/${userId}/role`, {
    method: "PATCH",
    data: { role },
    token,
  });
