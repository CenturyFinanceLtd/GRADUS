import apiClient from "./apiClient";

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  if (params.search && params.search.trim()) {
    searchParams.set("search", params.search.trim());
  }

  if (params.region && params.region.trim()) {
    searchParams.set("region", params.region.trim());
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const fetchContactInquiries = ({ token, search, region } = {}) =>
  apiClient(`/inquiries${buildQueryString({ search, region })}`, {
    token,
  });

export const updateContactInquiry = ({ token, inquiryId, data } = {}) =>
  apiClient(`/inquiries/${inquiryId}`, {
    method: 'PATCH',
    token,
    data,
  });
