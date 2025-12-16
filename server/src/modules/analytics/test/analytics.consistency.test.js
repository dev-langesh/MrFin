const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { analyticsService } = require("../analytics.service");
const { transactionService } = require("../../transaction/transaction.service");
const { Transaction } = require("../../transaction/transaction.model");
const { Analytics } = require("../analytics.model");
const { DailyAnalytics } = require("../dailyAnalytics.model");
const { MonthlyAnalytics } = require("../monthlyAnalytics.model");
const { User } = require("../../user/user.model");

// Mock validateToken middleware is not needed here as we use services directly
// But we need DB connection.

describe("Analytics System Rigorous Consistency Suite", () => {
  let mongoServer;
  let userId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all data
    await Transaction.deleteMany({});
    await Analytics.deleteMany({});
    await DailyAnalytics.deleteMany({});
    await MonthlyAnalytics.deleteMany({});

    // Create a dummy user
    userId = new mongoose.Types.ObjectId();
    await Analytics.create({ userId });
  });

  /**
   * Helper: Get full system state for a user
   * Returns: Summary, Daily[], Monthly[], Transactions[], and Aggregated Totals for comparison
   */
  async function getSystemState(uid) {
    const summary = await Analytics.findOne({ userId: uid }).lean();
    const daily = await DailyAnalytics.find({ userId: uid })
      .sort({ date: 1 })
      .lean();
    const monthly = await MonthlyAnalytics.find({ userId: uid })
      .sort({ year: 1, month: 1 })
      .lean();
    const transactions = await Transaction.find({ userId: uid }).lean();

    // Aggregate Daily Totals
    const dailyAgg = {
      income: daily.reduce((sum, d) => sum + d.totals.income, 0),
      expense: daily.reduce((sum, d) => sum + d.totals.expense, 0),
      investment: daily.reduce((sum, d) => sum + d.totals.investment, 0),
    };

    // Aggregate Monthly Totals
    const monthlyAgg = {
      income: monthly.reduce((sum, m) => sum + m.totals.income, 0),
      expense: monthly.reduce((sum, m) => sum + m.totals.expense, 0),
      investment: monthly.reduce((sum, m) => sum + m.totals.investment, 0),
    };

    // Aggregate Transactions (Truth)
    const txnAgg = {
      income: transactions
        .filter((t) => t.txnType === "income")
        .reduce((sum, t) => sum + t.amount, 0),
      expense: transactions
        .filter((t) => t.txnType === "expense")
        .reduce((sum, t) => sum + t.amount, 0),
      investment: transactions
        .filter((t) => t.txnType === "investment")
        .reduce((sum, t) => sum + t.amount, 0),
    };

    return {
      summary,
      daily,
      monthly,
      transactions,
      totals: {
        daily: dailyAgg,
        monthly: monthlyAgg,
        truth: txnAgg,
        summary: {
          income: summary.income.total,
          expense: summary.expenses.total,
          investment: summary.investments.total,
        },
      },
    };
  }

  describe("Time Series Model Field Verification", () => {
    it("should store and update income, expense, and investment categories correctly in DailyAnalytics", async () => {
      const date = new Date("2025-06-15");

      // 1. Income
      await transactionService.createTransaction({
        userId,
        amount: 1000,
        txnType: "income",
        category: "Salary",
        txnDate: date,
      });

      // 2. Expense
      await transactionService.createTransaction({
        userId,
        amount: 50,
        txnType: "expense",
        category: "Groceries",
        txnDate: date,
      });

      // 3. Investment
      await transactionService.createTransaction({
        userId,
        amount: 500,
        txnType: "investment",
        category: "Stocks",
        txnDate: date,
      });

      const state = await getSystemState(userId);
      const day = state.daily[0];

      // Verify Totals
      expect(day.totals.income).toBe(1000);
      expect(day.totals.expense).toBe(50);
      expect(day.totals.investment).toBe(500);

      // Verify Specific Category Fields
      // Note: Mongoose Maps use .get()
      expect(day.incomeCategories["Salary"]).toBe(1000);
      expect(day.expenseCategories["Groceries"]).toBe(50);
      expect(day.investmentCategories["Stocks"]).toBe(500);

      // Ensure cross-contamination didn't happen
      expect(day.incomeCategories["Groceries"]).toBeUndefined();
      expect(day.expenseCategories["Salary"]).toBeUndefined();
    });

    it("should store and update all fields in DailyAnalytics (Categories)", async () => {
      const date = new Date("2025-05-20");
      await transactionService.createTransaction({
        userId,
        amount: 100,
        txnType: "income",
        category: "Bonus",
        txnDate: date,
      });

      await transactionService.createTransaction({
        userId,
        amount: 50,
        txnType: "expense",
        category: "Food",
        txnDate: date,
      });

      const state = await getSystemState(userId);

      expect(state.daily.length).toBe(1);
      const day = state.daily[0];

      // Verify Date handling
      expect(new Date(day.date).toISOString()).toEqual(
        new Date(Date.UTC(2025, 4, 20)).toISOString()
      );

      // Verify Totals
      expect(day.totals.income).toBe(100);
      expect(day.totals.expense).toBe(50);

      // Verify Category Map
      // Using Mongoose Map or POJO? Schema defined as Map, lean() returns POJO usually or Map
      // Let's check accessing property
      expect(day.incomeCategories["Bonus"]).toBe(100);
      expect(day.expenseCategories["Food"]).toBe(50);
    });

    it("should store and update income, expense, and investment categories correctly in MonthlyAnalytics", async () => {
      const date = new Date("2025-05-20");

      // 1. Income
      await transactionService.createTransaction({
        userId,
        amount: 1000,
        txnType: "income",
        category: "Bonus",
        txnDate: date,
      });

      // 2. Expense
      await transactionService.createTransaction({
        userId,
        amount: 50,
        txnType: "expense",
        category: "Food",
        txnDate: date,
      });

      // 3. Investment
      await transactionService.createTransaction({
        userId,
        amount: 200,
        txnType: "investment",
        category: "Stocks",
        txnDate: date,
      });

      const state = await getSystemState(userId);

      expect(state.monthly.length).toBe(1);
      const month = state.monthly[0];

      expect(month.year).toBe(2025);
      expect(month.month).toBe(5);

      // Verify Totals
      expect(month.totals.income).toBe(1000);
      expect(month.totals.expense).toBe(50);
      expect(month.totals.investment).toBe(200);

      // Verify Category Fields
      expect(month.incomeCategories["Bonus"]).toBe(1000);
      expect(month.expenseCategories["Food"]).toBe(50);
      expect(month.investmentCategories["Stocks"]).toBe(200);
    });
  });

  describe("Mixed Mixed Operations & Consistency", () => {
    it("should pass the 'Senior QA' Chaos Test: Bulk Create -> Random Updates -> Deletes", async () => {
      // 1. Bulk Create
      const bulkData = [
        {
          userId,
          amount: 100,
          txnType: "income",
          category: "A",
          txnDate: new Date("2025-01-01"),
        },
        {
          userId,
          amount: 200,
          txnType: "income",
          category: "B",
          txnDate: new Date("2025-01-02"),
        },
        {
          userId,
          amount: 50,
          txnType: "expense",
          category: "X",
          txnDate: new Date("2025-01-01"),
        },
        {
          userId,
          amount: 500,
          txnType: "investment",
          category: "I",
          txnDate: new Date("2025-02-01"),
        }, // Diff month
      ];

      const txns = await transactionService.createTransactions(bulkData);
      let state = await getSystemState(userId);

      // Verify Totals
      expect(state.totals.truth.income).toBe(300);
      expect(state.totals.summary.income).toBe(300);
      expect(state.totals.daily.income).toBe(300);
      expect(state.totals.monthly.income).toBe(300);

      // 2. Complex Update: Move 'B' (200) from Jan to Feb and change to Expense
      const txnB = txns.find((t) => t.category === "B");
      await transactionService.updateTransaction(txnB._id, {
        txnDate: new Date("2025-02-15"),
        txnType: "expense",
        category: "Y", // Change category too
      });

      state = await getSystemState(userId);

      // Expected Truth:
      // Income: 100 ('A')
      // Expense: 50 ('X') + 200 ('B->Y') = 250
      // Investment: 500 ('I')

      expect(state.totals.truth.income).toBe(100);
      expect(state.totals.summary.income).toBe(100);
      expect(state.totals.daily.income).toBe(100);
      expect(state.totals.monthly.income).toBe(100);

      expect(state.totals.truth.expense).toBe(250);
      expect(state.totals.summary.expense).toBe(250);
      expect(state.totals.daily.expense).toBe(250);
      expect(state.totals.monthly.expense).toBe(250);

      // Check Granular:
      // Jan Monthly: Income 100, Expense 50
      const janM = state.monthly.find((m) => m.month === 1);
      expect(janM.totals.income).toBe(100);
      expect(janM.totals.expense).toBe(50);

      // Feb Monthly: Expense 200 ("Y"), Investment 500
      const febM = state.monthly.find((m) => m.month === 2);
      expect(febM.totals.expense).toBe(200);
      expect(febM.totals.investment).toBe(500);
      expect(febM.expenseCategories["Y"]).toBe(200); // Check category shift

      // 3. Delete: Remove 'I' (500 Investment)
      const txnI = txns.find((t) => t.category === "I");
      await transactionService.deleteTransaction(txnI._id);

      state = await getSystemState(userId);

      expect(state.totals.truth.investment).toBe(0);
      expect(state.totals.summary.investment).toBe(0);
      expect(state.totals.daily.investment).toBe(0);
      expect(state.totals.monthly.investment).toBe(0);
    });
  });

  describe("Concurrency & ACID Compliance", () => {
    it("should handle parallel insertions without Race Conditions", async () => {
      // Using atomic $inc in service, this should pass.
      // We create 50 parallel requests.
      const CONCURRENCY = 50;
      const AMOUNT = 10;
      const promises = [];

      for (let i = 0; i < CONCURRENCY; i++) {
        promises.push(
          transactionService.createTransaction({
            userId,
            amount: AMOUNT,
            txnType: "income",
            category: "Race",
            txnDate: new Date(),
          })
        );
      }

      await Promise.all(promises);

      const state = await getSystemState(userId);
      const EXPECTED = CONCURRENCY * AMOUNT;

      // Check Transactions
      expect(state.transactions.length).toBe(CONCURRENCY);

      // Check Summary (This failed before fix)
      expect(state.totals.summary.income).toBe(EXPECTED);

      // Check Time Series
      expect(state.totals.daily.income).toBe(EXPECTED);
      expect(state.totals.monthly.income).toBe(EXPECTED);

      // Check Category Consistency in Time Series
      // All 50 went to "Race" category
      // Daily doc for today should have Race: 50 * 10
      const today = state.daily[0]; // Assuming all landed on same UTC day (test runs fast)
      expect(today.incomeCategories["Race"]).toBe(EXPECTED);
    });
  });
});
