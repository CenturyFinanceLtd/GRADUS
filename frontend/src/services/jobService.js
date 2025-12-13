import apiClient from "./apiClient";

const PUBLIC_API_URL = "/jobs";
const ADMIN_API_URL = "/admin/jobs";

// Fetch all jobs
const fetchJobs = async (params) => {
  // Pass params like query, mode, type, etc if needed.
  // The current UI passes { query, mode, type... } but the basic getJobs backend might not support filtering yet.
  // We'll pass them anyway if apiClient supports query params merge, or appending.
  return apiClient.get(PUBLIC_API_URL, { params });
};

// Alias for compatibility
const listJobs = fetchJobs;

// Fetch single job by ID
const fetchJobById = async (id) => {
  return apiClient.get(`${PUBLIC_API_URL}/${id}`);
};

// Student: List my applications
const listMyApplications = async ({ token }) => {
  return apiClient.get(`${PUBLIC_API_URL}/applications/me`, { token });
};

// Student: Apply to job
const applyToJob = async ({ jobId, resumeData, coverLetter, token }) => {
  return apiClient.post(
    `${PUBLIC_API_URL}/${jobId}/apply`,
    { resumeData, coverLetter },
    { token }
  );
};

// Admin: List applications
// If jobId is provided, lists for that job. If null, endpoint logic would need to handle all (optional).
// Currently controller expects jobId in path: /admin/jobs/:jobId/applications
const listApplications = async (jobId, token) => {
  if (!jobId) throw new Error("Job ID required");
  const data = await apiClient.get(`${ADMIN_API_URL}/${jobId}/applications`, { token });
  return data?.items || [];
};

// Admin: Update application status
const updateApplicationStatus = async (applicationId, status, token) => {
  return apiClient.put(
    `${ADMIN_API_URL}/applications/${applicationId}/status`,
    { status },
    { token }
  );
};

const jobService = {
  fetchJobs,
  listJobs,
  fetchJobById,
  listApplications,
  listMyApplications,
  updateApplicationStatus,
  applyToJob,
};

export default jobService;
