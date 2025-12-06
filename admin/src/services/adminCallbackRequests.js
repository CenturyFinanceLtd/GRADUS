import apiClient from "./apiClient";

export const fetchCallbackRequests = ({ token } = {}) =>
  apiClient("/callback-requests", {
    token,
  });
