import { protectedApi } from "./axios";

export const analyticsApi = {
  getAnalytics: () => protectedApi.get(`/analytics/`),
  getTimeSeries: (config) => protectedApi.get(`/analytics/time-series`, config),
  getCategoryDistribution: (config) =>
    protectedApi.get(`/analytics/distribution`, config),
};
