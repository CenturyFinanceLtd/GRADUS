import apiClient from "./apiClient";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  if (params.search && params.search.trim()) {
    searchParams.set("search", params.search.trim());
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const fetchContactInquiries = ({ token, search } = {}) =>
  apiClient(`/inquiries${buildQueryString({ search })}`, {
    token,
  });
