import apiClient from "./apiClient";

const getMyResume = async ({ token }) => {
  const { data } = await apiClient.get("/resume/me", { token });
  return data?.resume || null;
};

const saveMyResume = async ({ token, resume }) => {
  const { data } = await apiClient.put("/resume/me", resume, { token });
  return data?.resume || null;
};

const resumeService = { getMyResume, saveMyResume };
export default resumeService;
