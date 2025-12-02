import apiClient from "./apiClient";

export const fetchAssessmentsForCourse = ({ courseSlug = "", programmeSlug = "", token } = {}) => {
  const courseKey = courseSlug.toString().trim().toLowerCase();
  const programmeKey = programmeSlug.toString().trim().toLowerCase();
  const encodedCourse = encodeURIComponent(courseKey);
  const encodedProgramme = encodeURIComponent(programmeKey);

  if (courseKey && programmeKey) {
    return apiClient.get(`/courses/${encodedProgramme}/${encodedCourse}/assessments`, { token });
  }
  if (courseKey) {
    return apiClient.get(`/courses/${encodedCourse}/assessments`, { token });
  }
  return Promise.resolve({ items: [] });
};

export default {
  fetchAssessmentsForCourse,
};
