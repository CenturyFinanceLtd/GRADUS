/*
  Assessment question bank (front-end only)
  - Lightweight fallback only (primary source now comes from backend AI generation)
*/

export const defaultAssessmentSets = [];

const courseAssessmentBank = {
  // Example for a course slug override:
  // "gradus-x/javascript-mastery": [custom questions...]
};

const normalizeSlug = (value = "") => value.toString().trim().toLowerCase();

export const getAssessmentsForCourse = ({ courseSlug = "", programmeSlug = "" } = {}) => {
  const courseKey = normalizeSlug(courseSlug);
  const programmeKey = normalizeSlug(programmeSlug);
  const combinedKey = courseKey && programmeKey ? `${programmeKey}/${courseKey}` : courseKey;

  if (combinedKey && courseAssessmentBank[combinedKey]) {
    return courseAssessmentBank[combinedKey];
  }
  if (courseKey && courseAssessmentBank[courseKey]) {
    return courseAssessmentBank[courseKey];
  }
  return defaultAssessmentSets;
};

export default getAssessmentsForCourse;
