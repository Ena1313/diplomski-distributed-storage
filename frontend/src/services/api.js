import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000",
});

export const fetchFiles = async () => {
  const res = await api.get("/files");
  return res.data;
};

export const fetchNodes = async () => {
  const res = await api.get("/nodes");
  return res.data;
};

export const fetchFileDetails = async (fileId) => {
  const response = await api.get(`/files/${fileId}/details`);
  return response.data;
};

export const fetchNodesOverview = async () => {
  const response = await api.get("/nodes/overview");
  return response.data;
};

export const fetchSystemOverview = async () => {
  const response = await api.get("/system/overview");
  return response.data;
};

export const fetchAllFileDetails = async () => {
  const files = await fetchFiles();

  const details = await Promise.all(
    files.map(async (file) => {
      const detailsResponse = await fetchFileDetails(file.id);

      return {
        file: detailsResponse.file || file,
        segments: detailsResponse.segments || [],
        replicas: detailsResponse.replicas || [],
      };
    })
  );

  return details;
};

export default api;