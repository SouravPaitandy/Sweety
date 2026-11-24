import api from "./axios";

export const getReadings = async (params = {}) => {
  const response = await api.get("/readings", { params });
  return response.data;
};

export const getReading = async (id) => {
  const response = await api.get(`/readings/${id}`);
  return response.data;
};

export const createReading = async (readingData) => {
  const response = await api.post("/readings", readingData);
  return response.data;
};

export const updateReading = async (id, readingData) => {
  const response = await api.put(`/readings/${id}`, readingData);
  return response.data;
};

export const deleteReading = async (id) => {
  const response = await api.delete(`/readings/${id}`);
  return response.data;
};
