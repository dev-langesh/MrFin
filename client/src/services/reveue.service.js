import { revenueApi } from "@/api/revenueAPI";

export const revenueService = {
  async addRevenue(payload) {
    try {
      const { data } = await revenueApi.addRevenue(payload);
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.message || "Failed to add revenue");
    }
  },

  async getRevenues(filters = {}) {
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
      throw new Error(
        err.response?.data?.message || "Failed to fetch revenues"
      );
    }
  },

  async getRevenue(id) {
    try {
      const { data } = await revenueApi.getRevenue(id);
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.message || "Failed to fetch revenue");
    }
  },

  async editRevenue(id, payload) {
    try {
      const { data } = await revenueApi.editRevenue(id, payload);
      return data;
    } catch (err) {
      throw new Error(
        err.response?.data?.message || "Failed to update revenue"
      );
    }
  },

  async deleteRevenue(id) {
    try {
      const { data } = await revenueApi.deleteRevenue(id);
      return data;
    } catch (err) {
      throw new Error(
        err.response?.data?.message || "Failed to delete revenue"
      );
    }
  },
};
