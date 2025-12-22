const { AnalyticsErrors } = require("../../errors/analyticsErrors");
const { AppError } = require("../../utils/error");
const { Analytics } = require("./analytics.model");
const { DailyAnalytics } = require("./dailyAnalytics.model");
const { MonthlyAnalytics } = require("./monthlyAnalytics.model");
const mongoose = require("mongoose");

// Helper to compute % change
function calcChange(newVal, oldVal) {
  if (oldVal === 0) return 0;
  return ((newVal - oldVal) / oldVal) * 100;
}

// Create new analytics for a user
async function createAnalytics(userId) {
  let analytics = await Analytics.findOne({ userId });
  if (!analytics) {
    analytics = await Analytics.create([{ userId }]);
    // Handle both array (Mongoose default for list input) and object (mocks/single input)
    analytics = Array.isArray(analytics) ? analytics[0] : analytics;
  }
  return analytics;
}

// Get analytics document by userId
async function getAnalytics(userId) {
  let analytics = await Analytics.findOne({ userId });
  if (!analytics) {
    analytics = await createAnalytics(userId);
  }

  // Check and perform rollover if needed (Read-Time Rollover)
  rolloverPeriods(analytics, new Date());
  if (analytics.isModified()) {
    await analytics.save();
  }

  return analytics;
}

/**
 * Roll over periods if needed
 */
function rolloverPeriods(analytics, date) {
  const now = new Date(date); // use provided date instead of current date

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // Month rollover
  if (
    !analytics.lastUpdated.month ||
    analytics.lastUpdated.month < monthStart
  ) {
    analytics.previousIncome.month = analytics.income.month;
    analytics.previousExpenses.month = analytics.expenses.month;
    analytics.previousInvestments.month = analytics.investments.month;

    analytics.income.month = 0;
    analytics.expenses.month = 0;
    analytics.cashFlow.month = 0;
    analytics.investments.month = 0;

    analytics.lastUpdated.month = now;
  }

  // Quarter rollover
  if (
    !analytics.lastUpdated.quarter ||
    analytics.lastUpdated.quarter < quarterStart
  ) {
    analytics.previousIncome.quarter = analytics.income.quarter;
    analytics.previousExpenses.quarter = analytics.expenses.quarter;
    analytics.previousCashFlow.quarter = analytics.cashFlow.quarter;
    analytics.previousInvestments.quarter = analytics.investments.quarter;

    analytics.income.quarter = 0;
    analytics.expenses.quarter = 0;
    analytics.cashFlow.quarter = 0;
    analytics.investments.quarter = 0;

    analytics.lastUpdated.quarter = now;
  }

  // Year rollover
  if (!analytics.lastUpdated.year || analytics.lastUpdated.year < yearStart) {
    analytics.previousIncome.annual = analytics.income.annual;
    analytics.previousExpenses.annual = analytics.expenses.annual;
    analytics.previousCashFlow.annual = analytics.cashFlow.annual;
    analytics.previousInvestments.annual = analytics.investments.annual;

    analytics.income.annual = 0;
    analytics.expenses.annual = 0;
    analytics.cashFlow.annual = 0;
    analytics.investments.annual = 0;

    analytics.lastUpdated.year = now;
  }
}

/**
 * Update Time Series Data (Daily & Monthly)
 */
async function updateTimeSeries(userId, date, type, amount, category) {
  const safeCategory = category || "Uncategorized"; // Prevent empty field name error

  const txnDate = new Date(date);
  const startOfDay = new Date(
    Date.UTC(txnDate.getFullYear(), txnDate.getMonth(), txnDate.getDate())
  );
  const year = txnDate.getFullYear();
  const month = txnDate.getMonth() + 1; // 1-12

  const options = { upsert: true, new: true };

  // Update Daily
  await DailyAnalytics.findOneAndUpdate(
    { userId, date: startOfDay },
    {
      $inc: {
        [`totals.${type}`]: amount,
        [`${type}Categories.${safeCategory}`]: amount,
      },
    },
    options
  );

  // Update Monthly
  await MonthlyAnalytics.findOneAndUpdate(
    { userId, year, month },
    {
      $inc: {
        [`totals.${type}`]: amount, // e.g. totals.income
        [`${type}Categories.${safeCategory}`]: amount, // e.g. incomeCategories.Salary
      },
    },
    options
  );
}

/**
 * Incrementally update analytics when income or expense is added
 */
async function updateAnalyticsOnAdd(txn, userId_manual) {
  let income = 0;
  let expenses = 0;
  let investments = 0;

  const userId = txn.userId || userId_manual;
  const date = txn.txnDate || new Date();
  const amount = Number(txn.amount) || 0;
  const category = txn.category || "Uncategorized";
  const type = txn.txnType;

  if (type === "transfer") return; // Skip analytics for transfers

  if (type === "income") income = amount;
  else if (type === "expense") expenses = amount;
  else if (type === "investment") investments = amount;

  // Update Time Series
  await updateTimeSeries(userId, date, type, amount, category);

  // Update Summary (using helper to avoid duplication)
  // Ensure txn has userId (legacy support)
  const txnWithUser = txn.userId ? txn : { ...txn, userId };
  return await updateAnalyticsOnAdd_SummaryOnly(txnWithUser);
}

/**
 * Update analytics on deletion (subtract amounts)
 */
async function updateAnalyticsOnDelete(txn) {
  // Negative update for Time Series
  if (txn.txnType !== "transfer") {
    await updateTimeSeries(
      txn.userId,
      txn.txnDate,
      txn.txnType,
      -Number(txn.amount),
      txn.category
    );
  }

  // Create a negative wrapper for summary update
  const negTxn = {
    ...(txn.toObject ? txn.toObject() : txn),
    amount: -Number(txn.amount),
    txnType: txn.txnType, // maintain type so it updates correct bucket
  };

  return await updateAnalyticsOnAdd_SummaryOnly(negTxn);
}

/**
 * Internal helper to update Abstract Analytics (Summary) only
 * Refactored from original updateAnalyticsOnAdd
 */
async function updateAnalyticsOnAdd_SummaryOnly(txn) {
  const userId = txn.userId;
  const date = txn.txnDate || new Date();
  const amount = Number(txn.amount) || 0;
  const type = txn.txnType;

  if (type === "transfer") return;

  let income = 0;
  let expenses = 0;
  let investments = 0;

  if (type === "income") income = amount;
  else if (type === "expense") expenses = amount;
  else if (type === "investment") investments = amount;

  const analytics = await getAnalytics(userId);

  const txDate = new Date(date);
  const txMonth = txDate.getMonth();
  const txQuarter = Math.floor(txMonth / 3);
  const txYear = txDate.getFullYear();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  const currentYear = now.getFullYear();

  // Atomic Update for Summary Analytics
  // This replaces the read-modify-save pattern which is not concurrency safe.

  const incUpdate = {};

  // Totals
  if (income) incUpdate["income.total"] = income;
  if (expenses) incUpdate["expenses.total"] = expenses;
  if (investments) incUpdate["investments.total"] = investments;
  if (income || expenses) incUpdate["cashFlow.total"] = income - expenses;

  // Period specific logic
  // We only increment current/previous period buckets if the transaction falls in them.
  // Note: This logic assumes the "current" wall-clock time aligns with the transaction time for "current" buckets.
  // If transaction is backdated, we only update totals and potentially "previous" buckets if it aligns.

  // Actually, strictly speaking, legacy logic updated "month" bucket only if txDate matches current month.

  if (txYear === currentYear) {
    if (typeof income === "number")
      incUpdate["income.annual"] = (incUpdate["income.annual"] || 0) + income;
    if (typeof expenses === "number")
      incUpdate["expenses.annual"] =
        (incUpdate["expenses.annual"] || 0) + expenses;
    if (typeof investments === "number")
      incUpdate["investments.annual"] =
        (incUpdate["investments.annual"] || 0) + investments;
    if (income || expenses)
      incUpdate["cashFlow.annual"] =
        (incUpdate["cashFlow.annual"] || 0) + (income - expenses);

    if (txQuarter === currentQuarter) {
      if (typeof income === "number")
        incUpdate["income.quarter"] =
          (incUpdate["income.quarter"] || 0) + income;
      if (typeof expenses === "number")
        incUpdate["expenses.quarter"] =
          (incUpdate["expenses.quarter"] || 0) + expenses;
      if (typeof investments === "number")
        incUpdate["investments.quarter"] =
          (incUpdate["investments.quarter"] || 0) + investments;
      if (income || expenses)
        incUpdate["cashFlow.quarter"] =
          (incUpdate["cashFlow.quarter"] || 0) + (income - expenses);
    }

    if (txMonth === currentMonth) {
      if (typeof income === "number")
        incUpdate["income.month"] = (incUpdate["income.month"] || 0) + income;
      if (typeof expenses === "number")
        incUpdate["expenses.month"] =
          (incUpdate["expenses.month"] || 0) + expenses;
      if (typeof investments === "number")
        incUpdate["investments.month"] =
          (incUpdate["investments.month"] || 0) + investments;
      if (income || expenses)
        incUpdate["cashFlow.month"] =
          (incUpdate["cashFlow.month"] || 0) + (income - expenses);
    }
  }

  // Previous Period Updates (if backdated to exactly the previous period relative to NOW)

  // Previous Period Updates (if backdated to exactly the previous period relative to NOW)
  if (txYear === currentYear - 1) {
    if (typeof income === "number")
      incUpdate["previousIncome.annual"] =
        (incUpdate["previousIncome.annual"] || 0) + income;
    if (typeof expenses === "number")
      incUpdate["previousExpenses.annual"] =
        (incUpdate["previousExpenses.annual"] || 0) + expenses;
    if (income || expenses)
      incUpdate["previousCashFlow.annual"] =
        (incUpdate["previousCashFlow.annual"] || 0) + (income - expenses);
    if (typeof investments === "number")
      incUpdate["previousInvestments.annual"] =
        (incUpdate["previousInvestments.annual"] || 0) + investments;
  }

  // Previous Quarter Check (Handles year rollover)
  const isPreviousQuarter =
    (currentQuarter > 0 &&
      txYear === currentYear &&
      txQuarter === currentQuarter - 1) ||
    (currentQuarter === 0 && txYear === currentYear - 1 && txQuarter === 3);

  if (isPreviousQuarter) {
    if (typeof income === "number")
      incUpdate["previousIncome.quarter"] =
        (incUpdate["previousIncome.quarter"] || 0) + income;
    if (typeof expenses === "number")
      incUpdate["previousExpenses.quarter"] =
        (incUpdate["previousExpenses.quarter"] || 0) + expenses;
    if (income || expenses)
      incUpdate["previousCashFlow.quarter"] =
        (incUpdate["previousCashFlow.quarter"] || 0) + (income - expenses);
    if (typeof investments === "number")
      incUpdate["previousInvestments.quarter"] =
        (incUpdate["previousInvestments.quarter"] || 0) + investments;
  }

  // Previous Month Check (Handles year rollover)
  const isPreviousMonth =
    (currentMonth > 0 &&
      txYear === currentYear &&
      txMonth === currentMonth - 1) ||
    (currentMonth === 0 && txYear === currentYear - 1 && txMonth === 11);

  if (isPreviousMonth) {
    if (typeof income === "number")
      incUpdate["previousIncome.month"] =
        (incUpdate["previousIncome.month"] || 0) + income;
    if (typeof expenses === "number")
      incUpdate["previousExpenses.month"] =
        (incUpdate["previousExpenses.month"] || 0) + expenses;
    if (income || expenses)
      incUpdate["previousCashFlow.month"] =
        (incUpdate["previousCashFlow.month"] || 0) + (income - expenses);
    if (typeof investments === "number")
      incUpdate["previousInvestments.month"] =
        (incUpdate["previousInvestments.month"] || 0) + investments;
  }

  const updatedAnalytics = await Analytics.findOneAndUpdate(
    { userId },
    { $inc: incUpdate },
    { new: true }
  );

  if (updatedAnalytics) {
    updateCalculatedChanges(updatedAnalytics);
    await updatedAnalytics.save(); // This save is safer because it only updates derivative fields (percentages) which are less critical than mony totals.
    return updatedAnalytics;
  }
  return updatedAnalytics;
}

function updateCalculatedChanges(analytics) {
  analytics.incomeChange.month = calcChange(
    analytics.income.month,
    analytics.previousIncome.month
  );
  analytics.incomeChange.quarter = calcChange(
    analytics.income.quarter,
    analytics.previousIncome.quarter
  );
  analytics.incomeChange.annual = calcChange(
    analytics.income.annual,
    analytics.previousIncome.annual
  );

  analytics.expensesChange.month = calcChange(
    analytics.expenses.month,
    analytics.previousExpenses.month
  );
  analytics.expensesChange.quarter = calcChange(
    analytics.expenses.quarter,
    analytics.previousExpenses.quarter
  );
  analytics.expensesChange.annual = calcChange(
    analytics.expenses.annual,
    analytics.previousExpenses.annual
  );

  analytics.cashFlowChange.month = calcChange(
    analytics.cashFlow.month,
    analytics.previousCashFlow.month
  );
  analytics.cashFlowChange.quarter = calcChange(
    analytics.cashFlow.quarter,
    analytics.previousCashFlow.quarter
  );
  analytics.cashFlowChange.annual = calcChange(
    analytics.cashFlow.annual,
    analytics.previousCashFlow.annual
  );

  analytics.investmentsChange.month = calcChange(
    analytics.investments.month,
    analytics.previousInvestments.month
  );
  analytics.investmentsChange.quarter = calcChange(
    analytics.investments.quarter,
    analytics.previousInvestments.quarter
  );
  analytics.investmentsChange.annual = calcChange(
    analytics.investments.annual,
    analytics.previousInvestments.annual
  );
}

/**
 * Update analytics on edit
 */
/**
 * Update analytics on edit
 */
async function updateAnalyticsOnEdit(oldTxn, newTxn) {
  // Revert old
  await updateAnalyticsOnDelete(oldTxn);
  // Add new
  return await updateAnalyticsOnAdd(newTxn, null);
}

/**
 * Batch update analytics for multiple transactions
 * Optimized to minimize database reads/writes
 */
async function updateAnalyticsBatch(transactions, userId) {
  if (!transactions || transactions.length === 0) return;

  const analytics = await getAnalytics(userId);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  const currentYear = now.getFullYear();

  // Aggregate totals by period
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalInvestments = 0;

  // Track changes for current periods
  let monthIncome = 0;
  let monthExpenses = 0;
  let quarterIncome = 0;
  let quarterExpenses = 0;
  let annualIncome = 0;
  let annualExpenses = 0;
  let annualInvestments = 0;
  let monthInvestments = 0;
  let quarterInvestments = 0;

  // Track changes for previous periods (if transactions are backdated)
  let prevMonthIncome = 0;
  let prevMonthExpenses = 0;
  let prevQuarterIncome = 0;
  let prevQuarterExpenses = 0;
  let prevAnnualIncome = 0;
  let prevAnnualExpenses = 0;
  let prevAnnualInvestments = 0;
  let prevMonthInvestments = 0;
  let prevQuarterInvestments = 0;

  // Ensure periods are rolled over to current time
  rolloverPeriods(analytics, new Date());

  // Prepare aggregations for Time Series Batch Update
  const dailyAgg = {}; // YYYY-MM-DD -> { date, totals: {...}, incomeCategories: {...}, expenseCategories: {...}, investmentCategories: {...} }
  const monthlyAgg = {}; // YYYY-MM -> { year, month, totals: {...}, incomeCategories: {...}, expenseCategories: {...}, investmentCategories: {...} }

  for (const txn of transactions) {
    // Skip transfer for analytics
    if (txn.txnType === "transfer") continue;

    const amount = Number(txn.amount);
    const date = new Date(txn.txnDate);
    const category = txn.category || "Uncategorized"; // Safe default

    // Summary Analytics Logic (Existing)
    const month = date.getMonth();
    const quarter = Math.floor(month / 3);
    const year = date.getFullYear();

    if (txn.txnType === "income") {
      totalIncome += amount;
      if (year === currentYear) {
        annualIncome += amount;
        if (month === currentMonth) monthIncome += amount;
        if (quarter === currentQuarter) quarterIncome += amount;
      }
      if (year === currentYear - 1) prevAnnualIncome += amount;
      if (month === currentMonth - 1) prevMonthIncome += amount;
      if (quarter === currentQuarter - 1) prevQuarterIncome += amount;
    } else if (txn.txnType === "expense") {
      totalExpenses += amount;
      if (year === currentYear) {
        annualExpenses += amount;
        if (month === currentMonth) monthExpenses += amount;
        if (quarter === currentQuarter) quarterExpenses += amount;
      }
      if (year === currentYear - 1) prevAnnualExpenses += amount;
      if (month === currentMonth - 1) prevMonthExpenses += amount;
      if (quarter === currentQuarter - 1) prevQuarterExpenses += amount;
    } else if (txn.txnType === "investment") {
      totalInvestments += amount;
      if (year === currentYear) {
        annualInvestments += amount;
        if (month === currentMonth) monthInvestments += amount;
        if (quarter === currentQuarter) quarterInvestments += amount;
      }
      if (year === currentYear - 1) prevAnnualInvestments += amount;
      if (month === currentMonth - 1) prevMonthInvestments += amount;
      if (quarter === currentQuarter - 1) prevQuarterInvestments += amount;
    }

    // Time Series Aggregation
    const dayKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const monthKey = `${year}-${month + 1}`; // YYYY-M

    // Daily Aggregation
    if (!dailyAgg[dayKey]) {
      dailyAgg[dayKey] = {
        date: new Date(Date.UTC(year, month, date.getDate())),
        totals: { income: 0, expense: 0, investment: 0 },
        incomeCategories: {},
        expenseCategories: {},
        investmentCategories: {},
      };
    }
    if (txn.txnType === "income") {
      dailyAgg[dayKey].totals.income += amount;
      if (!dailyAgg[dayKey].incomeCategories[category])
        dailyAgg[dayKey].incomeCategories[category] = 0;
      dailyAgg[dayKey].incomeCategories[category] += amount;
    }
    if (txn.txnType === "expense") {
      dailyAgg[dayKey].totals.expense += amount;
      if (!dailyAgg[dayKey].expenseCategories[category])
        dailyAgg[dayKey].expenseCategories[category] = 0;
      dailyAgg[dayKey].expenseCategories[category] += amount;
    }
    if (txn.txnType === "investment") {
      dailyAgg[dayKey].totals.investment += amount;
      if (!dailyAgg[dayKey].investmentCategories[category])
        dailyAgg[dayKey].investmentCategories[category] = 0;
      dailyAgg[dayKey].investmentCategories[category] += amount;
    }

    // Monthly Aggregation
    if (!monthlyAgg[monthKey]) {
      monthlyAgg[monthKey] = {
        year,
        month: month + 1,
        totals: { income: 0, expense: 0, investment: 0 },
        incomeCategories: {},
        expenseCategories: {},
        investmentCategories: {},
      };
    }
    if (txn.txnType === "income") {
      monthlyAgg[monthKey].totals.income += amount;
      if (!monthlyAgg[monthKey].incomeCategories[category])
        monthlyAgg[monthKey].incomeCategories[category] = 0;
      monthlyAgg[monthKey].incomeCategories[category] += amount;
    }
    if (txn.txnType === "expense") {
      monthlyAgg[monthKey].totals.expense += amount;
      if (!monthlyAgg[monthKey].expenseCategories[category])
        monthlyAgg[monthKey].expenseCategories[category] = 0;
      monthlyAgg[monthKey].expenseCategories[category] += amount;
    }
    if (txn.txnType === "investment") {
      monthlyAgg[monthKey].totals.investment += amount;
      if (!monthlyAgg[monthKey].investmentCategories[category])
        monthlyAgg[monthKey].investmentCategories[category] = 0;
      monthlyAgg[monthKey].investmentCategories[category] += amount;
    }
  }

  // Apply updates
  analytics.income.total += totalIncome;
  analytics.expenses.total += totalExpenses;
  analytics.investments.total += totalInvestments;

  analytics.income.month += monthIncome;
  analytics.expenses.month += monthExpenses;
  analytics.income.quarter += quarterIncome;
  analytics.expenses.quarter += quarterExpenses;
  analytics.income.annual += annualIncome;
  analytics.expenses.annual += annualExpenses;
  analytics.investments.month += monthInvestments;
  analytics.investments.quarter += quarterInvestments;
  analytics.investments.annual += annualInvestments;

  analytics.previousIncome.month += prevMonthIncome;
  analytics.previousExpenses.month += prevMonthExpenses;
  analytics.previousIncome.quarter += prevQuarterIncome;
  analytics.previousExpenses.quarter += prevQuarterExpenses;
  analytics.previousIncome.annual += prevAnnualIncome;
  analytics.previousExpenses.annual += prevAnnualExpenses;
  analytics.previousInvestments.month += prevMonthInvestments;
  analytics.previousInvestments.quarter += prevQuarterInvestments;
  analytics.previousInvestments.annual += prevAnnualInvestments;

  // Recalculate Cash Flows
  analytics.cashFlow.total = analytics.income.total - analytics.expenses.total;
  analytics.cashFlow.month = analytics.income.month - analytics.expenses.month;
  analytics.cashFlow.quarter =
    analytics.income.quarter - analytics.expenses.quarter;
  analytics.cashFlow.annual =
    analytics.income.annual - analytics.expenses.annual;

  analytics.previousCashFlow.month =
    analytics.previousIncome.month - analytics.previousExpenses.month;
  analytics.previousCashFlow.quarter =
    analytics.previousIncome.quarter - analytics.previousExpenses.quarter;
  analytics.previousCashFlow.annual =
    analytics.previousIncome.annual - analytics.previousExpenses.annual;

  // Recalculate Changes
  analytics.incomeChange.month = calcChange(
    analytics.income.month,
    analytics.previousIncome.month
  );
  analytics.incomeChange.quarter = calcChange(
    analytics.income.quarter,
    analytics.previousIncome.quarter
  );
  analytics.incomeChange.annual = calcChange(
    analytics.income.annual,
    analytics.previousIncome.annual
  );

  analytics.expensesChange.month = calcChange(
    analytics.expenses.month,
    analytics.previousExpenses.month
  );
  analytics.expensesChange.quarter = calcChange(
    analytics.expenses.quarter,
    analytics.previousExpenses.quarter
  );
  analytics.expensesChange.annual = calcChange(
    analytics.expenses.annual,
    analytics.previousExpenses.annual
  );

  analytics.cashFlowChange.month = calcChange(
    analytics.cashFlow.month,
    analytics.previousCashFlow.month
  );
  analytics.cashFlowChange.quarter = calcChange(
    analytics.cashFlow.quarter,
    analytics.previousCashFlow.quarter
  );
  analytics.cashFlowChange.annual = calcChange(
    analytics.cashFlow.annual,
    analytics.previousCashFlow.annual
  );

  analytics.investmentsChange.month = calcChange(
    analytics.investments.month,
    analytics.previousInvestments.month
  );
  analytics.investmentsChange.quarter = calcChange(
    analytics.investments.quarter,
    analytics.previousInvestments.quarter
  );
  analytics.investmentsChange.annual = calcChange(
    analytics.investments.annual,
    analytics.previousInvestments.annual
  );

  // Execute bulk updates for Time Series
  const dailyOps = Object.values(dailyAgg).map((item) => ({
    updateOne: {
      filter: { userId, date: item.date },
      update: {
        $inc: {
          "totals.income": item.totals.income,
          "totals.expense": item.totals.expense,
          "totals.investment": item.totals.investment,
          ...Object.entries(item.incomeCategories).reduce((acc, [cat, val]) => {
            acc[`incomeCategories.${cat}`] = val;
            return acc;
          }, {}),
          ...Object.entries(item.expenseCategories).reduce(
            (acc, [cat, val]) => {
              acc[`expenseCategories.${cat}`] = val;
              return acc;
            },
            {}
          ),
          ...Object.entries(item.investmentCategories).reduce(
            (acc, [cat, val]) => {
              acc[`investmentCategories.${cat}`] = val;
              return acc;
            },
            {}
          ),
        },
      },
      upsert: true,
    },
  }));

  const monthlyOps = Object.values(monthlyAgg).map((item) => ({
    updateOne: {
      filter: { userId, year: item.year, month: item.month },
      update: {
        $inc: {
          "totals.income": item.totals.income,
          "totals.expense": item.totals.expense,
          "totals.investment": item.totals.investment,
          ...Object.entries(item.incomeCategories).reduce((acc, [cat, val]) => {
            acc[`incomeCategories.${cat}`] = val;
            return acc;
          }, {}),
          ...Object.entries(item.expenseCategories).reduce(
            (acc, [cat, val]) => {
              acc[`expenseCategories.${cat}`] = val;
              return acc;
            },
            {}
          ),
          ...Object.entries(item.investmentCategories).reduce(
            (acc, [cat, val]) => {
              acc[`investmentCategories.${cat}`] = val;
              return acc;
            },
            {}
          ),
        },
      },
      upsert: true,
    },
  }));

  if (dailyOps.length > 0) await DailyAnalytics.bulkWrite(dailyOps);
  if (monthlyOps.length > 0) await MonthlyAnalytics.bulkWrite(monthlyOps);

  return await analytics.save();
}

const analyticsService = {
  createAnalytics,
  getAnalytics,
  updateAnalyticsOnAdd,
  updateAnalyticsOnDelete,
  updateAnalyticsOnEdit,
  updateAnalyticsBatch,
};

module.exports = { analyticsService };
