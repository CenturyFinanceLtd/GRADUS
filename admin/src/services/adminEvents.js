import apiClient from "./apiClient";

export const listAdminEvents = async ({ token } = {}) => {
  const data = await apiClient("/admin/events", { token });
  return data?.items || [];
};

export const createAdminEvent = async ({ token, payload }) => {
  if (!payload?.title) {
    throw new Error("Title is required");
  }
  return apiClient("/admin/events", {
    method: "POST",
    data: payload,
    token,
  });
};

export const updateAdminEvent = async ({ token, id, payload }) => {
  if (!id) throw new Error("Event id is required");
  return apiClient(`/admin/events/${id}`, {
    method: "PATCH",
    data: payload,
    token,
  });
};

export const deleteAdminEvent = async ({ token, id }) => {
  if (!id) throw new Error("Event id is required");
  return apiClient(`/admin/events/${id}`, {
    method: "DELETE",
    token,
  });
};

export default {
  listAdminEvents,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent,
};

