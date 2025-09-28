import apiClient from "./apiClient";

export const fetchMyEnrollments = ({ token } = {}) =>
  apiClient.get("/users/me/enrollments", { token });

export default {
  fetchMyEnrollments,
};
