const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { analyticsService: AnalyticsService } = require("../analytics.service");
const { Analytics } = require("../analytics.model");
const { DailyAnalytics } = require("../dailyAnalytics.model");
const { MonthlyAnalytics } = require("../monthlyAnalytics.model");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Analytics.deleteMany({});
  await DailyAnalytics.deleteMany({});
  await MonthlyAnalytics.deleteMany({});
  // Restore Date
  if (global.Date.__original) {
    global.Date = global.Date.__original;
  }
});

// Helper to reliably mock Date for all operations
function mockDate(date) {
  const originalDate = global.Date;
  global.Date = class extends Date {
    constructor(...args) {
      if (args.length > 0) return new originalDate(...args);
      return date;
    }
    static now() {
      return date.getTime();
    }
  };
  global.Date.__original = originalDate;
}

describe("Analytics Module: The 'Production Ready' Audit Suite", () => {
  // 1. Time Traveler Suite: Testing transitions across Year, Quarter, and Month boundaries
  describe("Time Traveler Suite: Temporal Transitions", () => {
    it("should correctly handle moving a transaction from Previous Year (Q4) to Current Year (Q1)", async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsService.createAnalytics(userId);

      // Current Time: Feb 15, 2025 (Q1 2025)
      const now = new Date(2025, 1, 15);
      mockDate(now);

      // 1. Create in 2024 (Dec 31, 2024) -> Should fall in Previous Income
      const oldDate = new Date(2024, 11, 31);
      const txn = {
        userId,
        amount: 1000,
        txnType: "income",
        txnDate: oldDate,
        category: "Bonus 2024",
      };

      await AnalyticsService.updateAnalyticsOnAdd(txn);
      let analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.income.total).toBe(1000);
      expect(analytics.income.annual).toBe(0); // Not current year
      expect(analytics.previousIncome.annual).toBe(1000); // 2024 is previous year
      expect(analytics.previousIncome.quarter).toBe(1000); // Q4 2024 is previous quarter relative to Q1 2025

      // 2. Update to 2025 (Jan 1, 2025) -> Should Move to Current Income
      const newDate = new Date(2025, 0, 1);
      const newTxn = { ...txn, txnDate: newDate };

      // Simulate Update: Use logic representing `updateTransaction` flow
      await AnalyticsService.updateAnalyticsOnEdit(txn, newTxn);

      analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.income.total).toBe(1000);
      expect(analytics.previousIncome.annual).toBe(0); // No longer in 2024
      expect(analytics.previousIncome.quarter).toBe(0); // Jan 2025 is Current Quarter (Q1), so Prev Qtr (Q4 2024) is empty

      expect(analytics.income.annual).toBe(1000); // Now in 2025
      expect(analytics.income.quarter).toBe(1000); // Now in Q1
      expect(analytics.income.month).toBe(0); // Jan is Prev Month relative to Feb
      expect(analytics.previousIncome.month).toBe(1000); // Jan is prev month
    });

    it("should handle Quarter-to-Quarter updates (Same Year)", async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsService.createAnalytics(userId);

      // Current: June 15, 2025 (Q2)
      const now = new Date(2025, 5, 15);
      mockDate(now);

      // 1. Create in Q1 (March 15)
      const oldDate = new Date(2025, 2, 15);
      const txn = {
        userId,
        amount: 500,
        txnType: "expense",
        txnDate: oldDate,
        category: "Q1 Expense",
      };

      await AnalyticsService.updateAnalyticsOnAdd(txn);
      let analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.expenses.quarter).toBe(0); // Current Q2 != Q1
      expect(analytics.previousExpenses.quarter).toBe(500); // Q1 is Prev of Q2

      // 2. Move to Q2 (May 15)
      const newDate = new Date(2025, 4, 15);
      const newTxn = { ...txn, txnDate: newDate };

      await AnalyticsService.updateAnalyticsOnEdit(txn, newTxn);

      analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.previousExpenses.quarter).toBe(0); // Moved out of Q1
      expect(analytics.expenses.quarter).toBe(500); // Moved into Q2 (Current)
      expect(analytics.expenses.annual).toBe(500); // Still 2025
    });

    it("should handle Month-to-Month updates (Same Quarter)", async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsService.createAnalytics(userId);

      // Current: May 20, 2025 (Q2)
      const now = new Date(2025, 4, 20);
      mockDate(now);

      // 1. Create in April (Prev Month)
      const oldDate = new Date(2025, 3, 20); // April
      const txn = {
        userId,
        amount: 200,
        txnType: "investment",
        txnDate: oldDate,
        category: "Stocks",
      };

      await AnalyticsService.updateAnalyticsOnAdd(txn);
      let analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.investments.month).toBe(0);
      expect(analytics.previousInvestments.month).toBe(200);

      // 2. Move to May (Current Month)
      const newTxn = { ...txn, txnDate: now };

      await AnalyticsService.updateAnalyticsOnEdit(txn, newTxn);

      analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.previousInvestments.month).toBe(0);
      expect(analytics.investments.month).toBe(200);
      expect(analytics.investments.quarter).toBe(200); // Both Apr and May turn Q2
    });
  });

  // 2. Metamorphosis Suite: Updating ALL fields simultaneously
  describe("Metamorphosis Suite: Simultaneous Field Updates", () => {
    it("should handle changing Type, Amount, Category, and Date in one go", async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsService.createAnalytics(userId);

      // Current: July 1, 2025 (Q3)
      const now = new Date(2025, 6, 1);
      mockDate(now);

      // 1. Original: Income / 1000 / Salary / June (Prev Month)
      const oldTxn = {
        userId,
        txnType: "income",
        amount: 1000,
        category: "Salary",
        txnDate: new Date(2025, 5, 15), // June
      };

      await AnalyticsService.updateAnalyticsOnAdd(oldTxn);
      let analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.income.total).toBe(1000);
      expect(analytics.previousIncome.month).toBe(1000); // June is prev of July
      expect(analytics.expenses.total).toBe(0);

      // 2. Update to: Expense / 5000 / Car / July (Current Month)
      const newTxn = {
        userId,
        txnType: "expense",
        amount: 5000,
        category: "Car",
        txnDate: now, // July
      };

      // Service `updateAnalyticsOnEdit` does exactly this: Delete Old -> Add New
      await AnalyticsService.updateAnalyticsOnEdit(oldTxn, newTxn);
      analytics = await AnalyticsService.getAnalytics(userId);

      // Verify Income Cleared
      expect(analytics.income.total).toBe(0);
      expect(analytics.previousIncome.month).toBe(0);

      // Verify Expense Populated
      expect(analytics.expenses.total).toBe(5000);
      expect(analytics.expenses.month).toBe(5000); // Current Month
      expect(analytics.expenses.annual).toBe(5000);

      // Verify Cash Flow
      expect(analytics.cashFlow.total).toBe(-5000);
    });

    it("should handle Transfer toggling (Impact -> No Impact -> Impact)", async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsService.createAnalytics(userId);
      const now = new Date(2025, 0, 1);
      mockDate(now);

      // 1. Start as Income
      const txn1 = {
        userId,
        txnType: "income",
        amount: 100,
        txnDate: now,
      };
      await AnalyticsService.updateAnalyticsOnAdd(txn1);
      let analytics = await AnalyticsService.getAnalytics(userId);
      expect(analytics.income.total).toBe(100);

      // 2. Change to Transfer (Should disappear from analytics)
      const txn2 = { ...txn1, txnType: "transfer" };
      await AnalyticsService.updateAnalyticsOnEdit(txn1, txn2);

      analytics = await AnalyticsService.getAnalytics(userId);
      expect(analytics.income.total).toBe(0);

      // 3. Change to Expense (Should reappear)
      const txn3 = { ...txn2, txnType: "expense", amount: 50 };
      await AnalyticsService.updateAnalyticsOnEdit(txn2, txn3);

      analytics = await AnalyticsService.getAnalytics(userId);
      expect(analytics.income.total).toBe(0);
      expect(analytics.expenses.total).toBe(50);
    });
  });

  // 3. The Void Suite: Complex Deletions
  describe("The Void Suite: Complex Deletions", () => {
    it("should cleanly delete a transaction that was previously moved across periods", async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsService.createAnalytics(userId);
      const now = new Date(2025, 0, 15); // Jan 15
      mockDate(now);

      // 1. Create in Jan
      const txn = {
        userId,
        txnType: "income",
        amount: 100,
        txnDate: now,
      };
      await AnalyticsService.updateAnalyticsOnAdd(txn);

      // 2. Move to Feb (Future relative to now, but let's say we change Date)
      // Note: Future dates are just tracked as "Annual" if same year, but won't be in "Month" if not current month.
      const febDate = new Date(2025, 1, 15);
      const txnMoved = { ...txn, txnDate: febDate };

      await AnalyticsService.updateAnalyticsOnEdit(txn, txnMoved);

      let analytics = await AnalyticsService.getAnalytics(userId);
      expect(analytics.income.month).toBe(0); // Moved out of Jan
      expect(analytics.income.annual).toBe(100); // Still 2025

      // 3. Delete the FEB transaction
      await AnalyticsService.updateAnalyticsOnDelete(txnMoved);

      analytics = await AnalyticsService.getAnalytics(userId);
      expect(analytics.income.annual).toBe(0);
      expect(analytics.income.total).toBe(0);
    });
  });

  // 4. Strict Bug Reproduction Suite (Merged from analytics.repro.test.js)
  describe("Strict Bug Reproduction Suite", () => {
    it("should NOT update previous quarter analytics when transaction is from previous year", async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsService.createAnalytics(userId);

      // Mock Dec 15, 2025
      const currentDate = new Date(2025, 11, 15);
      mockDate(currentDate);

      const txn = {
        userId,
        amount: 1000,
        txnType: "income",
        txnDate: new Date(2024, 8, 15), // Sep 15, 2024
        category: "Salary",
      };

      await AnalyticsService.updateAnalyticsOnAdd(txn);
      const analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.previousIncome.quarter).toBe(0);
      expect(analytics.income.quarter).toBe(0);
      expect(analytics.previousIncome.annual).toBe(1000);
    });

    it("should correctly update previous quarter if transaction is actually in previous quarter of same year", async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsService.createAnalytics(userId);

      const currentDate = new Date(2025, 11, 15); // Dec 2025
      mockDate(currentDate);

      const txn = {
        userId,
        amount: 500,
        txnType: "income",
        txnDate: new Date(2025, 7, 15), // Aug 2025 (Q3)
        category: "Salary",
      };

      await AnalyticsService.updateAnalyticsOnAdd(txn);
      const analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.previousIncome.quarter).toBe(500);
    });

    it("should handle year rollover for previous quarter (Current Q1, Prev Q4 of last year)", async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsService.createAnalytics(userId);

      const currentDate = new Date(2025, 1, 15); // Feb 2025 (Q1)
      mockDate(currentDate);

      const txn = {
        userId,
        amount: 700,
        txnType: "income",
        txnDate: new Date(2024, 11, 15), // Dec 2024 (Q4)
        category: "Bonus",
      };

      await AnalyticsService.updateAnalyticsOnAdd(txn);
      const analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.previousIncome.quarter).toBe(700);
    });

    it("should NOT update previous quarter if transaction is same quarter last year (Q1 2024 vs Q1 2025)", async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsService.createAnalytics(userId);

      const currentDate = new Date(2025, 1, 15); // Feb 2025
      mockDate(currentDate);

      const txn = {
        userId,
        amount: 300,
        txnType: "income",
        txnDate: new Date(2024, 1, 15), // Feb 2024
        category: "Old",
      };

      await AnalyticsService.updateAnalyticsOnAdd(txn);
      const analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.previousIncome.quarter).toBe(0);
      expect(analytics.income.quarter).toBe(0);
      expect(analytics.previousIncome.annual).toBe(300);
    });

    it("should handle month update across year boundary (Jan 2025 -> Prev Dec 2024)", async () => {
      const userId = new mongoose.Types.ObjectId();
      await AnalyticsService.createAnalytics(userId);

      const currentDate = new Date(2025, 0, 15); // Jan 2025
      mockDate(currentDate);

      const txn = {
        userId,
        amount: 100,
        txnType: "expense",
        txnDate: new Date(2024, 11, 20), // Dec 2024
        category: "Gifts",
      };

      await AnalyticsService.updateAnalyticsOnAdd(txn);
      const analytics = await AnalyticsService.getAnalytics(userId);

      expect(analytics.previousExpenses.month).toBe(100);
    });
  });
});
