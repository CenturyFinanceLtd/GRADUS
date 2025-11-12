import apiClient from "./apiClient";

export const fetchMyEnrollments = ({ token } = {}) =>
  apiClient.get("/users/me/enrollments", { token });

export const updateProfile = ({ token, data }) =>
  apiClient.put("/users/me", data, { token });

export default {
  fetchMyEnrollments,
  updateProfile,
};
