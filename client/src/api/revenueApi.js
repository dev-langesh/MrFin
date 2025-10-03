import { protectedApi } from "./axios";

export const revenueApi = {
  // Add new revenue
  addRevenue: (data) => protectedApi.post("/revenues", data),

  // Get all revenues with optional filters (date range, gateway, source, sort, pagination)
  getRevenues: (params) => protectedApi.get("/revenues", { params }),

  // Get single revenue by ID
  getRevenue: (id) => protectedApi.get(`/revenues/${id}`),

  // Edit revenue by ID
  editRevenue: (id, data) => protectedApi.put(`/revenues/${id}`, data),

  // Delete revenue by ID
  deleteRevenue: (id) => protectedApi.delete(`/revenues/${id}`),
};
