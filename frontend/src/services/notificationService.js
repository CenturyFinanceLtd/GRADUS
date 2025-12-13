import apiClient from "./apiClient";

export const fetchNotifications = async ({ token }) => {
  const { data } = await apiClient.get("/notifications", { token });
  return data || [];
};

export const fetchUnreadCount = async ({ token }) => {
  const { data } = await apiClient.get("/notifications/unread-count", { token });
  return data?.count || 0;
};

export const markRead = async ({ id, token }) => {
  await apiClient.put(`/notifications/${id}/read`, {}, { token });
};

export const markAllRead = async ({ token }) => {
  await apiClient.put("/notifications/read-all", {}, { token });
};

const notificationService = { fetchNotifications, fetchUnreadCount, markRead, markAllRead };
export default notificationService;
