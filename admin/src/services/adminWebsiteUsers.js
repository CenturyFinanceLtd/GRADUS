import apiClient from "./apiClient";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set("search", params.search.trim());
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const fetchWebsiteUsers = (token, params = {}) =>
  apiClient(`/admin/website-users${buildQueryString(params)}`, {
    token,
  });
