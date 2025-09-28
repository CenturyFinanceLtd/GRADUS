import apiClient from "./apiClient";

export const fetchCoursePage = () => apiClient.get("/courses/page");

export const fetchCourseOptions = () => apiClient.get("/courses");

export default {
  fetchCoursePage,
  fetchCourseOptions,
};
