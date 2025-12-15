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
    if (txn.txnType === "revenue") {
      await analyticsService.updateAnalyticsOnAdd(
        { earnings: txn.amount },
        txn.userId,
        txn.txnDate
      );
    } else if (txn.txnType === "investment") {
      await analyticsService.updateAnalyticsOnAdd(
        { investments: txn.amount },
        txn.userId,
        txn.txnDate
      );
    } else {
      await analyticsService.updateAnalyticsOnAdd(
        { expenses: txn.amount },
        txn.userId,
        txn.txnDate
      );
    }
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
    await analyticsService.updateAnalyticsBatch(
      savedTxns,
      transactions[0].userId
    );

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

  console.log(query);

  const totalDocuments = await Transaction.countDocuments(query);

  if (totalDocuments === 0) return { transactions: [], total: 0 };

  const txns = await Transaction.find(query)
    .sort({ txnDate: filters.sort === "asc" ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { transactions: txns, total: totalDocuments };
}

async function getTransactionsToVisualize(filters = {}) {
  const query = {};
  let yearDifference = undefined;
  let unit = "day";

  if (filters.txnType) query.txnType = filters.txnType;
  if (filters.category) query.category = filters.category;
  if (filters.userId)
    query.userId = new mongoose.Types.ObjectId(filters.userId); // aggregation matches need objectId often if usually stored as such, but mongoose handles it if schema is defined. But in aggregation $match, auto-casting might not happen if not going through model find? Transaction.aggregate... usually requires correct type. userId is ObjectId.
  if (filters.startDate && filters.endDate) {
    filters.startDate = new Date(filters.startDate);
    filters.endDate = new Date(filters.endDate);

    query.txnDate = {
      $gte: filters.startDate,
      $lte: filters.endDate,
    };

    yearDifference =
      filters.endDate.getFullYear() - filters.startDate.getFullYear();
  }

  if (yearDifference <= 1) {
    unit = "day";
  } else if (yearDifference < 3) {
    unit = "week";
  } else if (!yearDifference || yearDifference > 3) {
    unit = "month";
  }

  const txns = await Transaction.aggregate([
    {
      $match: query,
    },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: "$txnDate",
            unit,
            timezone: "Asia/Kolkata",
          },
        },
        amount: { $sum: "$amount" },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  return { transactions: txns };
}

async function getTransactionsDistribution(filters = {}) {
  const query = {};

  if (filters.txnType) query.txnType = filters.txnType;
  if (filters.category) query.category = filters.category;
  if (filters.userId)
    query.userId = new mongoose.Types.ObjectId(filters.userId);

  if (filters.startDate && filters.endDate) {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);

    query.txnDate = {
      $gte: startDate,
      $lte: endDate,
    };
  }

  const distribution = await Transaction.aggregate([
    {
      $match: query,
    },
    {
      $group: {
        _id: "$category",
        value: { $sum: "$amount" },
      },
    },
    {
      $project: {
        _id: 0,
        name: "$_id",
        value: 1,
      },
    },
    {
      $sort: {
        value: -1,
      },
    },
  ]);

  return { distribution };
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

  const oldAmount = txn.amount;
  const oldType = txn.txnType;
  const oldDate = txn.txnDate;

  Object.assign(txn, data);

  try {
    const savedTxn = await txn.save();

    // Update analytics
    // Prepare analytics update params
    const updateParams = {
      oldEarnings: 0,
      newEarnings: 0,
      oldExpenses: 0,
      newExpenses: 0,
      oldInvestments: 0,
      newInvestments: 0,
      oldDate,
      newDate: savedTxn.txnDate,
    };

    if (oldType === "revenue") updateParams.oldEarnings = oldAmount;
    else if (oldType === "expense") updateParams.oldExpenses = oldAmount;
    else if (oldType === "investment") updateParams.oldInvestments = oldAmount;

    if (savedTxn.txnType === "revenue")
      updateParams.newEarnings = savedTxn.amount;
    else if (savedTxn.txnType === "expense")
      updateParams.newExpenses = savedTxn.amount;
    else if (savedTxn.txnType === "investment")
      updateParams.newInvestments = savedTxn.amount;

    await analyticsService.updateAnalyticsOnEdit(updateParams, savedTxn.userId);

    return savedTxn;
  } catch (err) {
    throw new AppError(TransactionErrors.UPDATE_FAILED);
  }
}

async function deleteTransaction(id) {
  validateId(id);
  const txn = await Transaction.findById(id);
  if (!txn) throw new AppError(TransactionErrors.NOT_FOUND);

  try {
    await txn.deleteOne();
    if (txn.txnType === "revenue") {
      await analyticsService.updateAnalyticsOnDelete(
        { earnings: txn.amount },
        txn.userId,
        txn.txnDate
      );
    } else if (txn.txnType === "investment") {
      await analyticsService.updateAnalyticsOnDelete(
        { investments: txn.amount },
        txn.userId,
        txn.txnDate
      );
    } else {
      await analyticsService.updateAnalyticsOnDelete(
        { expenses: txn.amount },
        txn.userId,
        txn.txnDate
      );
    }
    return txn;
  } catch (err) {
    console.log(err);
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
  getTransactionsToVisualize,
  getTransactionsDistribution,
};

module.exports = { transactionService };
