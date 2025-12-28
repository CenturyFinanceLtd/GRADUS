import apiClient from "./apiClient";

export const fetchCallbackRequests = async ({ token } = {}) => {
  const data = await apiClient("/admin/callback-requests/callback-requests", {
    token,
  });
  return (data?.items || []).map((item) => ({ ...item, _id: item.id }));
};
