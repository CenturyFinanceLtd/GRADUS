import apiClient from "./apiClient";

export const fetchCoursePage = ({ token } = {}) =>
  apiClient.get("/courses/page", { token });

export const fetchCourseOptions = () => apiClient.get("/courses");

export const enrollInCourse = ({ slug, token }) =>
  apiClient.post(`/courses/${slug}/enroll`, {}, { token });

export default {
  fetchCoursePage,
  fetchCourseOptions,
  enrollInCourse,
};
