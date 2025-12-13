import apiClient from "./apiClient";

const listForCourse = async ({ courseSlug, token }) => {
  const { data } = await apiClient.get(`/assignments/${encodeURIComponent(courseSlug)}`, { token });
  return data?.items || [];
};

const submit = async ({ assignmentId, content, attachmentUrl, attachmentName, attachmentType, attachmentSize, attachmentData, token }) => {
  const { data } = await apiClient.post(
    `/assignments/${encodeURIComponent(assignmentId)}/submit`,
    { content, attachmentUrl, attachmentName, attachmentType, attachmentSize, attachmentData },
    { token }
  );
  return data?.submission || null;
};

const listMySubmissions = async ({ token }) => {
  const { data } = await apiClient.get(`/assignments`, { token });
  return data?.items || [];
};

const assignmentService = { listForCourse, submit, listMySubmissions };
export default assignmentService;
