const asyncHandler = require("express-async-handler");
const { transactionService } = require("./transaction.service");

// Create a single transaction
async function createTransaction(req, res) {
  const txn = await transactionService.createTransaction(req.body);
  res.status(201).json(txn);
}

// Create multiple transactions
async function createTransactions(req, res) {
  const txns = await transactionService.createTransactions(req.body);
  res.status(201).json(txns);
}

// Get all transactions with filters + pagination
async function getTransactions(req, res) {
  const { page, limit, ...filters } = req.query;
  const result = await transactionService.getTransactions(filters, {
    page: Number(page) || 1,
    limit: Number(limit) || 10,
  });
  res.json(result);
}

// Get all transactions for visualization
async function getTransactionsToVisualize(req, res) {
  const result = await transactionService.getTransactionsToVisualize(req.query);
  res.json(result);
}

// Get a single transaction by ID
async function getTransaction(req, res) {
  const txn = await transactionService.getTransaction(req.params.id);
  res.json(txn);
}

// Update a transaction by ID
async function updateTransaction(req, res) {
  const updatedTxn = await transactionService.updateTransaction(
    req.params.id,
    req.body
  );
  res.json(updatedTxn);
}

// Delete a transaction by ID
async function deleteTransaction(req, res) {
  const deletedTxn = await transactionService.deleteTransaction(req.params.id);
  res.json(deletedTxn);
}

// Attach all methods to object with asyncHandler
const transactionController = {
  createTransaction: asyncHandler(createTransaction),
  createTransactions: asyncHandler(createTransactions),
  getTransactions: asyncHandler(getTransactions),
  getTransactionsToVisualize: asyncHandler(getTransactionsToVisualize),
  getTransaction: asyncHandler(getTransaction),
  updateTransaction: asyncHandler(updateTransaction),
  deleteTransaction: asyncHandler(deleteTransaction),
};

module.exports = { transactionController };
