const mongoose = require("mongoose");
const { Transaction } = require("./transaction.model");
const { analyticsService } = require("../analytics/analytics.service");
const { AppError } = require("../../utils/error");
const { TransactionErrors } = require("../../errors/transactionErrors");

function validateId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(TransactionErrors.INVALID_ID);
  }
}

async function createTransaction(data) {
  try {
    const txn = await Transaction.create(data);
    await analyticsService.updateAnalyticsOnAdd(txn);
    return txn;
  } catch (err) {
    throw new AppError(TransactionErrors.CREATE_FAILED);
  }
}

async function createTransactions(transactions) {
  try {
    const savedTxns = await Transaction.insertMany(transactions, {
      ordered: false,
    });

    if (savedTxns.length > 0) {
      // Assuming all transactions belong to the same user (bulk import context)
      // or grouped. But here we send all. updateAnalyticsBatch handles array.
      // But updateAnalyticsBatch requires userId as 2nd arg.
      // We assume single user bulk create based on typical use case.
      await analyticsService.updateAnalyticsBatch(
        savedTxns,
        savedTxns[0].userId
      );
    }

    return savedTxns;
  } catch (err) {
    throw new AppError(TransactionErrors.CREATE_FAILED);
  }
}

async function getTransactions(filters = {}, { page = 1, limit = 10 }) {
  const query = {};

  if (filters.txnType) {
    query.txnType = Array.isArray(filters.txnType)
      ? { $in: filters.txnType }
      : filters.txnType;
  }

  if (filters.category) {
    query.category = Array.isArray(filters.category)
      ? { $in: filters.category }
      : filters.category;
  }

  if (filters.startDate && filters.endDate) {
    query.txnDate = {
      $gte: new Date(filters.startDate),
      $lte: new Date(filters.endDate),
    };
  }

  if (filters.userId) {
    query.userId = filters.userId;
  }

  if (filters.description) {
    query.description = { $regex: filters.description, $options: "i" };
  }

  const skip = (page - 1) * limit;

  // console.log(query);

  const totalDocuments = await Transaction.countDocuments(query);

  if (totalDocuments === 0) return { transactions: [], total: 0 };

  const txns = await Transaction.find(query)
    .sort({ txnDate: filters.sort === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { transactions: txns, total: totalDocuments };
}

async function getTransaction(id) {
  validateId(id);
  const txn = await Transaction.findById(id).lean();
  if (!txn) throw new AppError(TransactionErrors.NOT_FOUND);
  return txn;
}

async function updateTransaction(id, data) {
  validateId(id);

  const txn = await Transaction.findById(id);
  if (!txn) throw new AppError(TransactionErrors.NOT_FOUND);

  const oldTxnState = {
    userId: txn.userId,
    amount: txn.amount,
    txnType: txn.txnType,
    txnDate: txn.txnDate,
    category: txn.category,
  };

  Object.assign(txn, data);

  try {
    const savedTxn = await txn.save();
    await analyticsService.updateAnalyticsOnEdit(oldTxnState, savedTxn);

    return savedTxn;
  } catch (err) {
    console.log(err);
    if (err instanceof AppError) throw err; // Re-throw known errors
    throw new AppError(TransactionErrors.UPDATE_FAILED);
  }
}

async function deleteTransaction(id) {
  validateId(id);

  const txn = await Transaction.findById(id);
  if (!txn) throw new AppError(TransactionErrors.NOT_FOUND);

  try {
    await txn.deleteOne();
    await analyticsService.updateAnalyticsOnDelete(txn);
    return txn;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(TransactionErrors.DELETE_FAILED);
  }
}

const transactionService = {
  createTransaction,
  createTransactions,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
};

module.exports = { transactionService };
