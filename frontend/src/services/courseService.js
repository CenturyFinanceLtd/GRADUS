import apiClient from "./apiClient";

export const fetchCoursePage = ({ token } = {}) =>
  apiClient.get("/courses/page", { token });

export const fetchCourseOptions = () => apiClient.get("/courses");

export const enrollInCourse = ({ slug, token }) =>
  apiClient.post(`/courses/${slug}/enroll`, {}, { token });

export const fetchCourseBySlug = ({ slug, token } = {}) =>
  apiClient.get(`/courses/${slug}`, { token });

export default {
  fetchCoursePage,
  fetchCourseOptions,
  enrollInCourse,
  fetchCourseBySlug,
};
