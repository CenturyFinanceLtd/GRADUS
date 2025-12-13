import apiClient from "./apiClient";

export const fetchAssignments = async ({ courseSlug, token }) => {
  const { data } = await apiClient.get("/admin/assignments", {
    token,
    params: courseSlug ? { courseSlug } : {},
  });
  return data?.items || [];
};

export const createAssignment = async ({ payload, token }) => {
  const { data } = await apiClient.post("/admin/assignments", payload, { token });
  return data?.assignment || null;
};

export const fetchSubmissions = async ({ assignmentId, token }) => {
  const { data } = await apiClient.get(`/admin/assignments/${assignmentId}/submissions`, { token });
  return data?.items || [];
};

export const gradeSubmission = async ({ submissionId, score, feedback, token }) => {
  const { data } = await apiClient.put(
    `/admin/assignments/submissions/${submissionId}/grade`,
    { score, feedback },
    { token }
  );
  return data?.submission || null;
};

const adminAssignments = {
  fetchAssignments,
  createAssignment,
  fetchSubmissions,
  gradeSubmission,
};

export default adminAssignments;
