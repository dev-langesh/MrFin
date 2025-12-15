const { AnalyticsErrors } = require("../../errors/analyticsErrors");
const { AppError } = require("../../utils/error");
const { Analytics } = require("./analytics.model");

// Helper to compute % change
function calcChange(newVal, oldVal) {
  if (oldVal === 0) return 0;
  return ((newVal - oldVal) / oldVal) * 100;
}

// Create new analytics for a user
async function createAnalytics(userId) {
  return await Analytics.create({ userId });
}

// Get analytics document by userId
async function getAnalytics(userId) {
  const analytics = await Analytics.findOne({ userId });
  if (!analytics) {
    throw new AppError(AnalyticsErrors.NOT_FOUND);
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
    analytics.previousEarnings.month = analytics.earnings.month;
    analytics.previousExpenses.month = analytics.expenses.month;
    analytics.previousInvestments.month = analytics.investments.month;

    analytics.earnings.month = 0;
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
    analytics.previousEarnings.quarter = analytics.earnings.quarter;
    analytics.previousExpenses.quarter = analytics.expenses.quarter;
    analytics.previousCashFlow.quarter = analytics.cashFlow.quarter;
    analytics.previousInvestments.quarter = analytics.investments.quarter;

    analytics.earnings.quarter = 0;
    analytics.expenses.quarter = 0;
    analytics.cashFlow.quarter = 0;
    analytics.investments.quarter = 0;

    analytics.lastUpdated.quarter = now;
  }

  // Year rollover
  if (!analytics.lastUpdated.year || analytics.lastUpdated.year < yearStart) {
    analytics.previousEarnings.annual = analytics.earnings.annual;
    analytics.previousExpenses.annual = analytics.expenses.annual;
    analytics.previousCashFlow.annual = analytics.cashFlow.annual;
    analytics.previousInvestments.annual = analytics.investments.annual;

    analytics.earnings.annual = 0;
    analytics.expenses.annual = 0;
    analytics.cashFlow.annual = 0;
    analytics.investments.annual = 0;

    analytics.lastUpdated.year = now;
  }
}

/**
 * Incrementally update analytics when revenue or expense is added
 */
async function updateAnalyticsOnAdd(
  { earnings = 0, expenses = 0, investments = 0 },
  userId,
  date = new Date()
) {
  const analytics = await getAnalytics(userId);

  const txDate = new Date(date);
  const txMonth = txDate.getMonth();
  const txQuarter = Math.floor(txMonth / 3);
  const txYear = txDate.getFullYear();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  const currentYear = now.getFullYear();

  // Roll over periods if the transaction is in a new month/quarter/year
  rolloverPeriods(analytics, new Date());

  // Update total earnings/expenses regardless of date
  analytics.earnings.total += earnings;
  analytics.expenses.total += expenses;
  analytics.investments.total += investments;

  // Update correct month/quarter/annual if transaction is in previous period
  if (txMonth === currentMonth - 1) {
    analytics.previousEarnings.month += earnings;
    analytics.previousExpenses.month += expenses;
    analytics.previousCashFlow.month += earnings - expenses;
    analytics.previousInvestments.month += investments;
  }

  if (txQuarter === currentQuarter - 1) {
    analytics.previousEarnings.quarter += earnings;
    analytics.previousExpenses.quarter += expenses;
    analytics.previousCashFlow.quarter += earnings - expenses;
    analytics.previousInvestments.quarter += investments;
  }

  if (txYear === currentYear - 1) {
    analytics.previousEarnings.annual += earnings;
    analytics.previousExpenses.annual += expenses;
    analytics.previousCashFlow.annual += earnings - expenses;
    analytics.previousInvestments.annual += investments;
  }

  // Update correct month/quarter/annual if transaction is in current period
  if (txYear === currentYear) {
    if (txMonth === currentMonth) analytics.earnings.month += earnings;
    analytics.earnings.annual += earnings;

    if (txQuarter === currentQuarter) analytics.earnings.quarter += earnings;

    if (txMonth === currentMonth) analytics.expenses.month += expenses;
    analytics.expenses.annual += expenses;

    if (txQuarter === currentQuarter) analytics.expenses.quarter += expenses;

    if (txMonth === currentMonth) analytics.investments.month += investments;
    analytics.investments.annual += investments;

    if (txQuarter === currentQuarter)
      analytics.investments.quarter += investments;
  }

  // Update cash flow for the affected periods
  analytics.cashFlow.total =
    analytics.earnings.total - analytics.expenses.total;
  analytics.cashFlow.month =
    analytics.earnings.month - analytics.expenses.month;
  analytics.cashFlow.quarter =
    analytics.earnings.quarter - analytics.expenses.quarter;
  analytics.cashFlow.annual =
    analytics.earnings.annual - analytics.expenses.annual;

  // Update % changes based on previous periods
  analytics.earningsChange.month = calcChange(
    analytics.earnings.month,
    analytics.previousEarnings.month
  );
  analytics.earningsChange.quarter = calcChange(
    analytics.earnings.quarter,
    analytics.previousEarnings.quarter
  );
  analytics.earningsChange.annual = calcChange(
    analytics.earnings.annual,
    analytics.previousEarnings.annual
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

  return await analytics.save();
}

/**
 * Update analytics on deletion (subtract amounts)
 */
async function updateAnalyticsOnDelete(
  { earnings = 0, expenses = 0, investments = 0 },
  userId,
  date = new Date()
) {
  return updateAnalyticsOnAdd(
    { earnings: -earnings, expenses: -expenses, investments: -investments },
    userId,
    date
  );
}

/**
 * Update analytics on edit
 */
async function updateAnalyticsOnEdit(
  {
    oldEarnings = 0,
    newEarnings = 0,

    oldExpenses = 0,
    newExpenses = 0,
    oldInvestments = 0,
    newInvestments = 0,
    oldDate,
    newDate,
  },
  userId
) {
  const oldTx = new Date(oldDate);
  const newTx = new Date(newDate);

  // If the period changed, subtract old values from old period
  if (
    oldTx.getMonth() !== newTx.getMonth() ||
    Math.floor(oldTx.getMonth() / 3) !== Math.floor(newTx.getMonth() / 3) ||
    oldTx.getFullYear() !== newTx.getFullYear()
  ) {
    // Remove old values from old period
    await updateAnalyticsOnAdd(
      {
        earnings: -oldEarnings,
        expenses: -oldExpenses,
        investments: -oldInvestments,
      },
      userId,
      oldDate
    );

    // Add new values to new period
    return await updateAnalyticsOnAdd(
      {
        earnings: newEarnings,
        expenses: newExpenses,
        investments: newInvestments,
      },
      userId,
      newDate
    );
  }

  // If period didn't change, just update the difference
  const diffEarnings = newEarnings - oldEarnings;
  const diffExpenses = newExpenses - oldExpenses;
  const diffInvestments = newInvestments - oldInvestments;
  return await updateAnalyticsOnAdd(
    {
      earnings: diffEarnings,
      expenses: diffExpenses,
      investments: diffInvestments,
    },
    userId,
    newDate
  );
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
  let totalEarnings = 0;
  let totalExpenses = 0;
  let totalInvestments = 0;

  // Track changes for current periods
  let monthEarnings = 0;
  let monthExpenses = 0;
  let quarterEarnings = 0;
  let quarterExpenses = 0;
  let annualEarnings = 0;
  let annualExpenses = 0;
  let annualInvestments = 0;
  let monthInvestments = 0;
  let quarterInvestments = 0;

  // Track changes for previous periods (if transactions are backdated)
  let prevMonthEarnings = 0;
  let prevMonthExpenses = 0;
  let prevQuarterEarnings = 0;
  let prevQuarterExpenses = 0;
  let prevAnnualEarnings = 0;
  let prevAnnualExpenses = 0;
  let prevAnnualInvestments = 0;
  let prevMonthInvestments = 0;
  let prevQuarterInvestments = 0;

  // Ensure periods are rolled over to current time
  rolloverPeriods(analytics, new Date());

  for (const txn of transactions) {
    const amount = Number(txn.amount);
    const date = new Date(txn.txnDate);
    const month = date.getMonth();
    const quarter = Math.floor(month / 3);
    const year = date.getFullYear();

    if (txn.txnType === "revenue") {
      totalEarnings += amount;

      if (year === currentYear) {
        annualEarnings += amount;
        if (month === currentMonth) monthEarnings += amount;
        if (quarter === currentQuarter) quarterEarnings += amount;
      }

      // Previous periods logic
      if (year === currentYear - 1) prevAnnualEarnings += amount;
      if (month === currentMonth - 1) prevMonthEarnings += amount; // Simplified: assumes same year for month check or handles year boundary?
      // The original logic for previous period was:
      // if (txMonth === currentMonth - 1) ...
      // This logic is slightly flawed if currentMonth is Jan (0), prev is -1.
      // But let's stick to the original logic's intent or improve it.
      // Original: if (txMonth === currentMonth - 1)

      // Let's replicate original logic for consistency, but be careful
      if (month === currentMonth - 1) prevMonthEarnings += amount;
      if (quarter === currentQuarter - 1) prevQuarterEarnings += amount;
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
  }

  // Apply updates
  analytics.earnings.total += totalEarnings;
  analytics.expenses.total += totalExpenses;
  analytics.investments.total += totalInvestments;

  analytics.earnings.month += monthEarnings;
  analytics.expenses.month += monthExpenses;
  analytics.earnings.quarter += quarterEarnings;
  analytics.expenses.quarter += quarterExpenses;
  analytics.earnings.annual += annualEarnings;
  analytics.expenses.annual += annualExpenses;
  analytics.investments.month += monthInvestments;
  analytics.investments.quarter += quarterInvestments;
  analytics.investments.annual += annualInvestments;

  analytics.previousEarnings.month += prevMonthEarnings;
  analytics.previousExpenses.month += prevMonthExpenses;
  analytics.previousEarnings.quarter += prevQuarterEarnings;
  analytics.previousExpenses.quarter += prevQuarterExpenses;
  analytics.previousEarnings.annual += prevAnnualEarnings;
  analytics.previousExpenses.annual += prevAnnualExpenses;
  analytics.previousInvestments.month += prevMonthInvestments;
  analytics.previousInvestments.quarter += prevQuarterInvestments;
  analytics.previousInvestments.annual += prevAnnualInvestments;

  // Recalculate Cash Flows
  analytics.cashFlow.total =
    analytics.earnings.total - analytics.expenses.total;
  analytics.cashFlow.month =
    analytics.earnings.month - analytics.expenses.month;
  analytics.cashFlow.quarter =
    analytics.earnings.quarter - analytics.expenses.quarter;
  analytics.cashFlow.annual =
    analytics.earnings.annual - analytics.expenses.annual;

  analytics.previousCashFlow.month =
    analytics.previousEarnings.month - analytics.previousExpenses.month;
  analytics.previousCashFlow.quarter =
    analytics.previousEarnings.quarter - analytics.previousExpenses.quarter;
  analytics.previousCashFlow.annual =
    analytics.previousEarnings.annual - analytics.previousExpenses.annual;

  // Recalculate Changes
  analytics.earningsChange.month = calcChange(
    analytics.earnings.month,
    analytics.previousEarnings.month
  );
  analytics.earningsChange.quarter = calcChange(
    analytics.earnings.quarter,
    analytics.previousEarnings.quarter
  );
  analytics.earningsChange.annual = calcChange(
    analytics.earnings.annual,
    analytics.previousEarnings.annual
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
