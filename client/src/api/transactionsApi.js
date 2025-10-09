import { protectedApi } from "./axios";

export const transactionsApi = {
  // Add a new transaction
  addTransaction: (data) => protectedApi.post("/transactions", data),

  // Add multiple transactions (bulk insert)
  addTransactions: (data) => protectedApi.post("/transactions/bulk", data),

  // Get all transactions with optional filters and pagination
  getTransactions: (params) => protectedApi.get("/transactions", { params }),

  // Get a single transaction by ID
  getTransaction: (id) => protectedApi.get(`/transactions/${id}`),

  // Update a transaction by ID
  editTransaction: (id, data) => protectedApi.put(`/transactions/${id}`, data),

  // Delete a transaction by ID
  deleteTransaction: (id) => protectedApi.delete(`/transactions/${id}`),
};
