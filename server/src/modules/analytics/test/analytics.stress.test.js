const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { analyticsService } = require("../analytics.service");
const { transactionService } = require("../../transaction/transaction.service");
const { Transaction } = require("../../transaction/transaction.model");
const { Analytics } = require("../analytics.model");
const { DailyAnalytics } = require("../dailyAnalytics.model");
const { MonthlyAnalytics } = require("../monthlyAnalytics.model");
const { User } = require("../../user/user.model");

describe("Analytics System Stress & Consistency Tests", () => {
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

  // Helper to fetch all analytics states
  async function getSystemState(uid) {
    const summary = await Analytics.findOne({ userId: uid }).lean();
    const daily = await DailyAnalytics.find({ userId: uid })
      .sort({ date: 1 })
      .lean();
    const monthly = await MonthlyAnalytics.find({ userId: uid })
      .sort({ year: 1, month: 1 })
      .lean();
    const transactions = await Transaction.find({ userId: uid }).lean();

    // Aggregations from Daily
    const dailyTotalIncome = daily.reduce((sum, d) => sum + d.totals.income, 0);
    const dailyTotalExpense = daily.reduce(
      (sum, d) => sum + d.totals.expense,
      0
    );

    // Aggregations from Monthly
    const monthlyTotalIncome = monthly.reduce(
      (sum, m) => sum + m.totals.income,
      0
    );
    const monthlyTotalExpense = monthly.reduce(
      (sum, m) => sum + m.totals.expense,
      0
    );

    // Aggregations from Transactions (Truth)
    const txnTotalIncome = transactions
      .filter((t) => t.txnType === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const txnTotalExpense = transactions
      .filter((t) => t.txnType === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      summary,
      daily,
      monthly,
      transactions,
      totals: {
        summary: {
          income: summary.income.total,
          expense: summary.expenses.total,
        },
        daily: { income: dailyTotalIncome, expense: dailyTotalExpense },
        monthly: { income: monthlyTotalIncome, expense: monthlyTotalExpense },
        truth: { income: txnTotalIncome, expense: txnTotalExpense },
      },
    };
  }

  describe("Consistency & Integrity", () => {
    it("should maintain consistency across all layers after Bulk Insert", async () => {
      const txns = [];
      const COUNT = 50;

      // Generate mixed transactions
      for (let i = 0; i < COUNT; i++) {
        txns.push({
          userId,
          amount: 100,
          txnType: i % 2 === 0 ? "income" : "expense",
          category: i % 2 === 0 ? "Salary" : "Food",
          txnDate: new Date(),
          description: `Bulk txn ${i}`,
        });
      }

      await transactionService.createTransactions(txns);

      const state = await getSystemState(userId);

      // Verify Truth vs Summary
      expect(state.totals.summary.income).toBe(state.totals.truth.income);
      expect(state.totals.summary.expense).toBe(state.totals.truth.expense);

      // Verify Truth vs Daily
      expect(state.totals.daily.income).toBe(state.totals.truth.income);
      expect(state.totals.daily.expense).toBe(state.totals.truth.expense);

      // Verify Truth vs Monthly
      expect(state.totals.monthly.income).toBe(state.totals.truth.income);
      expect(state.totals.monthly.expense).toBe(state.totals.truth.expense);
    });

    it("should maintain consistency through Complex Mutations (The 'Chaos' Transaction)", async () => {
      // 1. Create Income
      let txn = await transactionService.createTransaction({
        userId,
        amount: 1000,
        txnType: "income",
        category: "Freelance",
        txnDate: new Date("2025-01-15"), // Fixed date
        description: "Chaos Txn",
      });

      let state = await getSystemState(userId);
      expect(state.totals.summary.income).toBe(1000);
      expect(state.totals.daily.income).toBe(1000);

      // 2. Update Amount (1000 -> 2500)
      txn = await transactionService.updateTransaction(txn._id, userId, {
        amount: 2500,
      });
      state = await getSystemState(userId);
      expect(state.totals.summary.income).toBe(2500);
      expect(state.totals.daily.income).toBe(2500);
      expect(state.daily[0].totals.income).toBe(2500);

      // 3. Move Date (Jan -> Feb)
      // This should clear Jan Daily/Monthly and populate Feb
      txn = await transactionService.updateTransaction(txn._id, userId, {
        txnDate: new Date("2025-02-15"),
      });
      state = await getSystemState(userId);

      // Totals should match
      expect(state.totals.summary.income).toBe(2500);
      expect(state.totals.daily.income).toBe(2500);

      // Check granular distribution
      const janDocs = state.daily.filter((d) =>
        d.date.toISOString().includes("2025-01")
      );
      const febDocs = state.daily.filter((d) =>
        d.date.toISOString().includes("2025-02")
      );

      // Jan should be 0 or effectively removed (depending on implementation, upsert=true might leave doc with 0 or we check sum)
      const janSum = janDocs.reduce((s, d) => s + d.totals.income, 0);
      const febSum = febDocs.reduce((s, d) => s + d.totals.income, 0);

      expect(janSum).toBe(0);
      expect(febSum).toBe(2500);

      // 4. Change Type (Income -> Expense)
      txn = await transactionService.updateTransaction(txn._id, userId, {
        txnType: "expense",
        category: "Rent",
      });
      state = await getSystemState(userId);

      expect(state.totals.summary.income).toBe(0);
      expect(state.totals.summary.expense).toBe(2500);
      expect(state.totals.daily.income).toBe(0);
      expect(state.totals.daily.expense).toBe(2500);

      // 5. Delete
      await transactionService.deleteTransaction(txn._id, userId);
      state = await getSystemState(userId);

      expect(state.totals.summary.income).toBe(0);
      expect(state.totals.summary.expense).toBe(0);
      expect(state.totals.daily.income).toBe(0);
      expect(state.totals.daily.expense).toBe(0);
    });

    it("should handle Parallel Operations correctly (Race Condition Stress Test)", async () => {
      // NOTE: This test might FAIL if backend isn't atomic.
      // If it fails, we identified a bug.

      const CONCURRENCY = 10;
      const promises = [];

      for (let i = 0; i < CONCURRENCY; i++) {
        promises.push(
          transactionService.createTransaction({
            userId,
            amount: 100,
            txnType: "income",
            category: "Concurrent",
            txnDate: new Date(),
            description: `Parallel ${i}`,
          })
        );
      }

      await Promise.all(promises);

      const state = await getSystemState(userId);
      const EXPECTED_TOTAL = CONCURRENCY * 100;

      // Verify Transaction Count
      expect(state.transactions.length).toBe(CONCURRENCY);

      // Verify Summary
      // If logic is 'read-modify-write' without lock/inc, this might be < 1000
      // We expect it to be 1000 if robust.
      console.log(
        `Parallel Test Result: Expected ${EXPECTED_TOTAL}, Got Summary ${state.totals.summary.income}, Daily ${state.totals.daily.income}`
      );

      expect(state.totals.daily.income).toBe(EXPECTED_TOTAL); // Daily uses $inc, should be safe

      // This assertion checks if the Summary Analytics (legacy) is ACID safe.
      // It might fail. If it strictly must pass, we need to refactor usage of $inc in summary updates.
      // For now, let's assert it matches.
      expect(state.totals.summary.income).toBe(EXPECTED_TOTAL);
    });
  });
});
