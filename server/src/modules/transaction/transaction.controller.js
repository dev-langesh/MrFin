const asyncHandler = require("express-async-handler");
const { transactionService } = require("./transaction.service");

// Create a single transaction
async function createTransaction(req, res) {
  const { amount, txnType, category, description, txnDate } = req.body;
  const data = {
    amount,
    txnType,
    category,
    description,
    txnDate,
    userId: req.user.id,
  };
  const txn = await transactionService.createTransaction(data);
  res.status(201).json(txn);
}

// Create multiple transactions
async function createTransactions(req, res) {
  const transactions = req.body.map((txn) => ({
    ...txn,
    userId: req.user.id,
  }));
  const txns = await transactionService.createTransactions(transactions);
  res.status(201).json(txns);
}

// Get all transactions with filters + pagination
async function getTransactions(req, res) {
  const { page, limit, ...filters } = req.query;
  const result = await transactionService.getTransactions(
    { ...filters, userId: req.user.id },
    {
      page: Number(page) || 1,
      limit: limit === "all" ? 0 : Number(limit) || 10,
    }
  );
  res.json(result);
}

// Get a single transaction by ID
async function getTransaction(req, res) {
  const txn = await transactionService.getTransaction(
    req.params.id,
    req.user.id
  );
  res.json(txn);
}

// Update a transaction by ID
async function updateTransaction(req, res) {
  const { amount, txnType, category, description, txnDate } = req.body;
  const updates = {};
  if (amount !== undefined) updates.amount = amount;
  if (txnType !== undefined) updates.txnType = txnType;
  if (category !== undefined) updates.category = category;
  if (description !== undefined) updates.description = description;
  if (txnDate !== undefined) updates.txnDate = txnDate;

  const updatedTxn = await transactionService.updateTransaction(
    req.params.id,
    req.user.id,
    updates
  );
  res.json(updatedTxn);
}

// Delete a transaction by ID
async function deleteTransaction(req, res) {
  const deletedTxn = await transactionService.deleteTransaction(
    req.params.id,
    req.user.id
  );
  res.json(deletedTxn);
}

// Attach all methods to object with asyncHandler
const transactionController = {
  createTransaction: asyncHandler(createTransaction),
  createTransactions: asyncHandler(createTransactions),
  getTransactions: asyncHandler(getTransactions),
  getTransaction: asyncHandler(getTransaction),
  updateTransaction: asyncHandler(updateTransaction),
  deleteTransaction: asyncHandler(deleteTransaction),
};

module.exports = { transactionController };
