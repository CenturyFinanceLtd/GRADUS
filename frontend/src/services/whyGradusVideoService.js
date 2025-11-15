import apiClient from "./apiClient";

export const fetchWhyGradusVideo = async () => {
  const data = await apiClient.get("/why-gradus-video");
  return data?.item || null;
};

export default { fetchWhyGradusVideo };

