import apiClient from "./apiClient";

export const fetchCoursePage = ({ token }) =>
  apiClient("/admin/courses/page", {
    method: "GET",
    token,
  });

export const updateCourseHero = ({ token, data }) =>
  apiClient("/admin/courses/page/hero", {
    method: "PUT",
    token,
    data,
  });

export const createCourse = ({ token, data }) =>
  apiClient("/admin/courses", {
    method: "POST",
    token,
    data,
  });

export const updateCourse = ({ token, courseId, data }) =>
  apiClient(`/admin/courses/${courseId}`, {
    method: "PUT",
    token,
    data,
  });

export const deleteCourse = ({ token, courseId }) =>
  apiClient(`/admin/courses/${courseId}`, {
    method: "DELETE",
    token,
  });

export const fetchCourseEnrollments = ({ token }) =>
  apiClient("/admin/courses/enrollments", {
    method: "GET",
    token,
  });

export default {
  fetchCoursePage,
  updateCourseHero,
  createCourse,
  updateCourse,
  deleteCourse,
  fetchCourseEnrollments,
};
