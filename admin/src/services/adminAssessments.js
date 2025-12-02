import apiClient from './apiClient';

export const listAssessments = async ({ token, courseSlug } = {}) => {
  const slug = courseSlug ? encodeURIComponent(courseSlug) : '';
  const endpoint = slug ? `/admin/assessments/${slug}` : '/admin/assessments';
  const data = await apiClient(endpoint, { token });
  return data?.items || [];
};

export const generateAssessment = async ({
  token,
  courseSlug,
  programmeSlug,
  questionCount,
  level,
  moduleIndex,
  weekIndex,
} = {}) => {
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
   if (level) {
    body.level = level;
  }
  if (Number.isFinite(moduleIndex) && moduleIndex > 0) {
    body.moduleIndex = moduleIndex;
  }
  if (Number.isFinite(weekIndex) && weekIndex > 0) {
    body.weekIndex = weekIndex;
  }
  const data = await apiClient(endpoint, { method: 'POST', data: body, token });
  return data; // return full job payload
};

export const uploadSyllabusAssessments = async ({ token, courseSlug, programmeSlug, syllabus } = {}) => {
  if (!courseSlug) {
    throw new Error('courseSlug is required');
  }
  if (!syllabus) {
    throw new Error('syllabus JSON is required');
  }
  const baseSlug = encodeURIComponent(courseSlug);
  const programmePart = programmeSlug ? `${encodeURIComponent(programmeSlug)}/` : '';
  const endpoint = `/admin/assessments/${programmePart}${baseSlug}/syllabus`;
  const data = await apiClient(endpoint, { method: 'POST', data: { syllabus }, token });
  return data;
};

export const deleteAssessmentSet = async ({ token, assessmentId } = {}) => {
  if (!assessmentId) {
    throw new Error('assessmentId is required');
  }
  const endpoint = `/admin/assessments/set/${encodeURIComponent(assessmentId)}`;
  const data = await apiClient(endpoint, { method: 'DELETE', token });
  return data;
};

export const fetchAssessmentProgress = async ({ token, courseSlug, moduleIndex, weekIndex, programmeSlug } = {}) => {
  if (!courseSlug) {
    throw new Error('courseSlug is required');
  }
  const baseSlug = encodeURIComponent(courseSlug);
  const programmePart = programmeSlug ? `${encodeURIComponent(programmeSlug)}/` : '';
  const endpoint = `/admin/assessments/${programmePart}${baseSlug}/progress`;
  const params = new URLSearchParams();
  if (Number.isFinite(moduleIndex)) params.set('moduleIndex', moduleIndex);
  if (Number.isFinite(weekIndex)) params.set('weekIndex', weekIndex);
  const data = await apiClient(`${endpoint}?${params.toString()}`, { token });
  return data?.job || null;
};

export const cancelAssessmentJob = async ({ token, courseSlug, moduleIndex, weekIndex, programmeSlug } = {}) => {
  if (!courseSlug) {
    throw new Error('courseSlug is required');
  }
  const baseSlug = encodeURIComponent(courseSlug);
  const programmePart = programmeSlug ? `${encodeURIComponent(programmeSlug)}/` : '';
  const endpoint = `/admin/assessments/${programmePart}${baseSlug}/cancel`;
  const payload = {};
  if (Number.isFinite(moduleIndex)) payload.moduleIndex = moduleIndex;
  if (Number.isFinite(weekIndex)) payload.weekIndex = weekIndex;
  const data = await apiClient(endpoint, { method: 'POST', data: payload, token });
  return data?.job || null;
};

export default {
  listAssessments,
  generateAssessment,
  uploadSyllabusAssessments,
  deleteAssessmentSet,
  fetchAssessmentProgress,
};
