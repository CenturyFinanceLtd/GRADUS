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

const buildCoursePath = (courseSlug = "", programmeSlug = "") => {
  const courseKey = courseSlug.toString().trim().toLowerCase();
  const programmeKey = programmeSlug.toString().trim().toLowerCase();
  const encodedCourse = encodeURIComponent(courseKey);
  const encodedProgramme = encodeURIComponent(programmeKey);
  if (courseKey && programmeKey) {
    return `/courses/${encodedProgramme}/${encodedCourse}`;
  }
  if (courseKey) {
    return `/courses/${encodedCourse}`;
  }
  throw new Error("courseSlug is required");
};

export const startAssessmentAttempt = ({
  courseSlug = "",
  programmeSlug = "",
  moduleIndex,
  weekIndex,
  token,
} = {}) => {
  const basePath = buildCoursePath(courseSlug, programmeSlug);
  return apiClient.post(
    `${basePath}/assessments/attempts`,
    { moduleIndex, weekIndex },
    { token }
  );
};

export const submitAssessmentAttempt = ({
  courseSlug = "",
  programmeSlug = "",
  attemptId = "",
  answers = [],
  token,
} = {}) => {
  const basePath = buildCoursePath(courseSlug, programmeSlug);
  const encodedAttemptId = encodeURIComponent(attemptId);
  return apiClient.post(
    `${basePath}/assessments/attempts/${encodedAttemptId}/submit`,
    { answers },
    { token }
  );
};

export default {
  fetchAssessmentsForCourse,
  startAssessmentAttempt,
  submitAssessmentAttempt,
};
