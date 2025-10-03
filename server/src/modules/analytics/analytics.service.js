const { Analytics } = require("./analytics.model");

// Helper to compute % change
function calcChange(newVal, oldVal) {
  if (oldVal === 0) return 0;
  return ((newVal - oldVal) / oldVal) * 100;
}

// Get or create analytics document
async function getAnalytics() {
  let analytics = await Analytics.findOne();
  if (!analytics) {
    analytics = await Analytics.create({});
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
    analytics.previousCashFlow.month = analytics.cashFlow.month;

    analytics.earnings.month = 0;
    analytics.expenses.month = 0;
    analytics.cashFlow.month = 0;

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

    analytics.earnings.quarter = 0;
    analytics.expenses.quarter = 0;
    analytics.cashFlow.quarter = 0;

    analytics.lastUpdated.quarter = now;
  }

  // Year rollover
  if (!analytics.lastUpdated.year || analytics.lastUpdated.year < yearStart) {
    analytics.previousEarnings.annual = analytics.earnings.annual;
    analytics.previousExpenses.annual = analytics.expenses.annual;
    analytics.previousCashFlow.annual = analytics.cashFlow.annual;

    analytics.earnings.annual = 0;
    analytics.expenses.annual = 0;
    analytics.cashFlow.annual = 0;

    analytics.lastUpdated.year = now;
  }
}

/**
 * Incrementally update analytics when revenue or expense is added
 */
async function updateAnalyticsOnAdd(
  { earnings = 0, expenses = 0 },
  date = new Date()
) {
  const analytics = await getAnalytics();

  const txDate = new Date(date);
  const txMonth = txDate.getMonth();
  const txQuarter = Math.floor(txMonth / 3);
  const txYear = txDate.getFullYear();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  const currentYear = now.getFullYear();

  // Roll over periods if the transaction is in a new month/quarter/year
  rolloverPeriods(analytics, txDate);

  // Update total earnings/expenses regardless of date
  analytics.earnings.total += earnings;
  analytics.expenses.total += expenses;

  // Update correct month/quarter/annual if transaction is in current period
  if (txYear === currentYear) {
    if (txMonth === currentMonth) analytics.earnings.month += earnings;
    analytics.earnings.annual += earnings;

    if (txQuarter === currentQuarter) analytics.earnings.quarter += earnings;

    if (txMonth === currentMonth) analytics.expenses.month += expenses;
    analytics.expenses.annual += expenses;

    if (txQuarter === currentQuarter) analytics.expenses.quarter += expenses;
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

  return await analytics.save();
}

/**
 * Update analytics on deletion (subtract amounts)
 */
async function updateAnalyticsOnDelete(
  { earnings = 0, expenses = 0 },
  date = new Date()
) {
  return updateAnalyticsOnAdd(
    { earnings: -earnings, expenses: -expenses },
    date
  );
}

/**
 * Update analytics on edit
 */
async function updateAnalyticsOnEdit({
  oldEarnings = 0,
  newEarnings = 0,
  oldExpenses = 0,
  newExpenses = 0,
  oldDate,
  newDate,
}) {
  const analytics = await getAnalytics();

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
      { earnings: -oldEarnings, expenses: -oldExpenses },
      oldDate
    );

    // Add new values to new period
    return await updateAnalyticsOnAdd(
      { earnings: newEarnings, expenses: newExpenses },
      newDate
    );
  }

  // If period didn't change, just update the difference
  const diffEarnings = newEarnings - oldEarnings;
  const diffExpenses = newExpenses - oldExpenses;
  return await updateAnalyticsOnAdd(
    { earnings: diffEarnings, expenses: diffExpenses },
    newDate
  );
}

const analyticsService = {
  getAnalytics,
  updateAnalyticsOnAdd,
  updateAnalyticsOnDelete,
  updateAnalyticsOnEdit,
};

module.exports = { analyticsService };
