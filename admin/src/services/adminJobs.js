import apiClient from "./apiClient";

export const fetchJobs = async ({ token }) => {
  const data = await apiClient("/admin/jobs", { method: "GET", token });
  return data?.items || [];
};

export const upsertJob = async ({ token, jobId, payload }) => {
  const url = jobId ? `/admin/jobs/${jobId}` : "/admin/jobs";
  const data = await apiClient(url, { method: jobId ? "PUT" : "POST", data: payload, token });
  return data?.job || null;
};

export const fetchApplications = async ({ token, jobId }) => {
  const data = await apiClient(`/admin/jobs/${jobId}/applications`, { method: "GET", token });
  return data?.items || [];
};

export const updateApplicationStatus = async ({ token, applicationId, status }) => {
  const data = await apiClient(`/admin/jobs/applications/${applicationId}/status`, {
    method: "PUT",
    data: { status },
    token,
  });
  return data?.application || null;
};

const adminJobs = { fetchJobs, upsertJob, fetchApplications, updateApplicationStatus };
export default adminJobs;
