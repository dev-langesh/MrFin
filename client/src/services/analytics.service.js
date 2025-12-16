const { analyticsApi } = require("@/api/analyticsApi");

async function getAnalytics() {
  try {
    const { data } = await analyticsApi.getAnalytics();
    return data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to fetch analytics");
  }
}

async function getTimeSeries(filters) {
  try {
    const params = {
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    const { data } = await analyticsApi.getTimeSeries({ params });
    return data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to fetch time series data"
    );
  }
}

async function getCategoryDistribution(filters) {
  try {
    const params = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      txnType: filters.txnType,
    };
    const { data } = await analyticsApi.getCategoryDistribution({ params });
    return data;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to fetch category distribution"
    );
  }
}

export const analyticsService = {
  getAnalytics,
  getTimeSeries,
  getCategoryDistribution,
};
