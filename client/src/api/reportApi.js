import api from "./axios";

export const getDailyReport = async (date) => {
  const response = await api.get("/reports/daily", {
    params: { date },
  });

  return response.data;
};

export const getMonthToDateReport = async (date) => {
  const response = await api.get("/reports/month-to-date", {
    params: { date },
  });

  return response.data;
};

export const getMonthlyReport = async (date) => {
  const response = await api.get("/reports/monthly", {
    params: { date },
  });

  return response.data;
};
