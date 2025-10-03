const { analyticsApi } = require("@/api/analyticsApi");

async function getAnalytics() {
  try {
    const { data } = await analyticsApi.getAnalytics();
    return data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to fetch analytics");
  }
}

export const analyticsService = {
  getAnalytics,
};
