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

export const getContactInquiry = ({ token, inquiryId } = {}) =>
  apiClient(`/inquiries/${inquiryId}`, {
    token,
  });

export const createContactInquiryAdmin = ({ token, data } = {}) =>
  apiClient(`/inquiries`, {
    method: "POST",
    token,
    data,
  });

export const updateContactInquiry = ({ token, inquiryId, data } = {}) =>
  apiClient(`/inquiries/${inquiryId}`, {
    method: "PATCH",
    token,
    data,
  });

export const deleteContactInquiry = ({ token, inquiryId } = {}) =>
  apiClient(`/inquiries/${inquiryId}`, {
    method: "DELETE",
    token,
  });
