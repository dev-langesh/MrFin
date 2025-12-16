import { transactionsApi } from "@/api/transactionsApi";

// Add a single transaction
async function addTransaction(data) {
  try {
    const { data: res } = await transactionsApi.addTransaction(data);
    return res;
  } catch (err) {
    throw new Error(err.response?.data?.message || "Failed to add transaction");
  }
}

// Add multiple transactions (bulk insert)
async function addTransactions(data) {
  try {
    const { data: res } = await transactionsApi.addTransactions(data);
    return res;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to add multiple transactions"
    );
  }
}

// Helper to serialize params for arrays (e.g. category=A&category=B)
const paramsSerializer = (params) => {
  const searchParams = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    if (Array.isArray(params[key])) {
      params[key].forEach((val) => searchParams.append(key, val));
    } else if (params[key] !== undefined && params[key] !== null) {
      searchParams.append(key, params[key]);
    }
  });
  return searchParams.toString();
};

// Get all transactions with filters/pagination
async function getTransactions(filters) {
  try {
    const params = {};
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== "all" || key === "limit") {
        params[key] = filters[key];
      }
    });
    const { data: res } = await transactionsApi.getTransactions({
      params,
      paramsSerializer,
    });
    return res;
  } catch (err) {
    console.log(err);

    throw new Error(
      err.response?.data?.message || "Failed to fetch transactions"
    );
  }
}

// Get a single transaction by ID
async function getTransaction(id) {
  try {
    const { data: res } = await transactionsApi.getTransaction(id);
    return res;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to fetch transaction"
    );
  }
}

// Update a transaction by ID
async function editTransaction(id, data) {
  try {
    const { data: res } = await transactionsApi.editTransaction(id, data);
    return res;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to update transaction"
    );
  }
}

// Delete a transaction by ID
async function deleteTransaction(id) {
  try {
    const { data: res } = await transactionsApi.deleteTransaction(id);
    return res;
  } catch (err) {
    throw new Error(
      err.response?.data?.message || "Failed to delete transaction"
    );
  }
}

export const transactionService = {
  addTransaction,
  addTransactions,
  getTransactions,
  editTransaction,
  deleteTransaction,
};
