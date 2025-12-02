import apiClient from './apiClient';

export const listAssessments = async ({ token, courseSlug } = {}) => {
  const slug = courseSlug ? encodeURIComponent(courseSlug) : '';
  const endpoint = slug ? `/admin/assessments/${slug}` : '/admin/assessments';
  const data = await apiClient(endpoint, { token });
  return data?.items || [];
};

export const generateAssessment = async ({ token, courseSlug, programmeSlug, questionCount } = {}) => {
  if (!courseSlug) {
    throw new Error('courseSlug is required');
  }
  const baseSlug = encodeURIComponent(courseSlug);
  const programmePart = programmeSlug ? `${encodeURIComponent(programmeSlug)}/` : '';
  const endpoint = `/admin/assessments/${programmePart}${baseSlug}/generate`;
  const body = {};
  if (Number.isFinite(questionCount)) {
    body.questionCount = questionCount;
  }
  const data = await apiClient(endpoint, { method: 'POST', data: body, token });
  return data?.assessment || null;
};

export default {
  listAssessments,
  generateAssessment,
};
