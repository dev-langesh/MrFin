import { protectedApi } from "./axios";

export const analyticsApi = {
  getAnalytics: () => protectedApi.get(`/analytics/`),
};
