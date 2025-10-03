import { revenueApi } from "@/api/revenueApi";

async function addRevenue(payload) {
  try {
    const { data } = await revenueApi.addRevenue(payload);
    return data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to add revenue");
  }
}

async function getRevenues(filters = {}) {
  try {
    const payload = {};
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== "all") {
        payload[key] = filters[key];
      }
    });
    const { data } = await revenueApi.getRevenues(payload);
    return data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to fetch revenues");
  }
}

async function getRevenue(id) {
  try {
    const { data } = await revenueApi.getRevenue(id);
    return data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to fetch revenue");
  }
}

async function editRevenue(id, payload) {
  try {
    const { data } = await revenueApi.editRevenue(id, payload);
    return data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to update revenue");
  }
}

async function deleteRevenue(id) {
  try {
    const { data } = await revenueApi.deleteRevenue(id);
    return data;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to delete revenue");
  }
}
export const revenueService = {
  addRevenue,
  getRevenues,
  getRevenue,
  editRevenue,
  deleteRevenue,
};
