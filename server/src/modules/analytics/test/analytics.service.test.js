const { analyticsService } = require("../analytics.service");
const { timeSeriesService } = require("../timeSeries.service");
const { Analytics } = require("../analytics.model");
const { DailyAnalytics } = require("../dailyAnalytics.model");
const { MonthlyAnalytics } = require("../monthlyAnalytics.model");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

describe("Analytics Service", () => {
  let mongoServer;
  const userId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    // Ensure indexes are created to enforce uniqueness
    await Analytics.ensureIndexes();
    await DailyAnalytics.ensureIndexes();
    await MonthlyAnalytics.ensureIndexes();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Analytics.deleteMany({});
    await DailyAnalytics.deleteMany({});
    await MonthlyAnalytics.deleteMany({});
  });

  describe("getAnalytics", () => {
    it("should return analytics if found", async () => {
      await Analytics.create({
        userId,
        income: { total: 1000 },
      });

      const res = await analyticsService.getAnalytics(userId);
      expect(res).toBeDefined();
      expect(res.income.total).toBe(1000);
      expect(res.userId.toString()).toBe(userId);
    });

    it("should create if not found", async () => {
      const res = await analyticsService.getAnalytics(userId);
      expect(res).toBeDefined();
      expect(res.income.total).toBe(0);
      expect(res.userId.toString()).toBe(userId);

      const dbRecord = await Analytics.findOne({ userId });
      expect(dbRecord).toBeDefined();
    });
  });

  describe("updateAnalyticsOnAdd", () => {
    it("should update totals and current period values", async () => {
      // Initialize analytics
      await analyticsService.createAnalytics(userId);

      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 100,
          txnType: "income",
          userId,
          txnDate: new Date(),
        },
        userId
      );

      const updated = await Analytics.findOne({ userId });
      expect(updated.income.total).toBe(100);
      expect(updated.income.month).toBe(100);
    });

    it("should update previous period directly if transaction is backdated to last month", async () => {
      await analyticsService.createAnalytics(userId);

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 50,
          txnType: "income",
          userId,
          txnDate: lastMonth,
        },
        userId,
        lastMonth
      );

      const updated = await Analytics.findOne({ userId });
      expect(updated.previousIncome.month).toBe(50);
      expect(updated.income.month).toBe(0); // Current month unchanged
    });
  });

  describe("updateAnalyticsOnEdit", () => {
    it("should update difference if period is same", async () => {
      await analyticsService.createAnalytics(userId);

      // Setup initial state: 100 income
      // CRITICAL: Must initialize lastUpdated dates to prevent rollover reset in getAnalytics
      const doc = await Analytics.findOne({ userId });
      doc.income.total = 100;
      doc.income.month = 100;
      const now = new Date();
      doc.lastUpdated = { month: now, quarter: now, year: now };
      await doc.save();

      const oldTxn = {
        amount: 100,
        txnType: "income",
        userId,
        txnDate: new Date(),
      };
      const newTxn = {
        amount: 150,
        txnType: "income",
        userId,
        txnDate: new Date(),
      };

      await analyticsService.updateAnalyticsOnEdit(oldTxn, newTxn);

      const updated = await Analytics.findOne({ userId });
      expect(updated.income.total).toBe(150); // 100 + (150-100)
      expect(updated.income.month).toBe(150);
    });

    it("should move values if date changed period", async () => {
      await analyticsService.createAnalytics(userId);

      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 1); // Last month
      const newDate = new Date(); // This month

      // Note: updateAnalyticsOnEdit essentially removes old and adds new.
      // If we assume start state 0, removing old (-100 prev) adds new (+100 curr).
      // We don't need to seed partial state necessarily, starting from clean 0 works
      // if we accept negative prev (since we didn't seed the old txn existence).
      // This matches real "edit" flow where old txn DID exist in DB logic but maybe not in analytics state if we just created it.

      const oldTxn = {
        amount: 100,
        txnType: "income",
        userId,
        txnDate: oldDate,
      };
      const newTxn = {
        amount: 100,
        txnType: "income",
        userId,
        txnDate: newDate,
      };

      await analyticsService.updateAnalyticsOnEdit(oldTxn, newTxn);

      const updated = await Analytics.findOne({ userId });
      // -100 in previous because we deducted an old txn that wasn't counted before (start 0)
      expect(updated.previousIncome.month).toBe(-100);
      // +100 in current
      expect(updated.income.month).toBe(100);
    });
  });

  describe("Rollover Logic", () => {
    it("should handle Year Rollover correctly (Dec -> Jan)", async () => {
      // Last updated Dec 31st last year
      const lastYearDec = new Date();
      lastYearDec.setFullYear(lastYearDec.getFullYear() - 1);
      lastYearDec.setMonth(11); // Dec
      lastYearDec.setDate(31);

      await Analytics.create({
        userId,
        lastUpdated: {
          month: lastYearDec,
          quarter: lastYearDec,
          year: lastYearDec,
        },
        income: {
          total: 1000,
          annual: 1000,
          quarter: 300,
          month: 100,
        },
      });

      // Trigger Read-Time Rollover
      await analyticsService.getAnalytics(userId);

      const updated = await Analytics.findOne({ userId });

      // Check Year Rollover
      expect(updated.previousIncome.annual).toBe(1000);
      expect(updated.income.annual).toBe(0);

      // Check Quarter Rollover
      expect(updated.previousIncome.quarter).toBe(300);
      expect(updated.income.quarter).toBe(0);

      // Check Month Rollover
      expect(updated.previousIncome.month).toBe(100);
      expect(updated.income.month).toBe(0);

      // Last updated should be now (approx)
      expect(updated.lastUpdated.year.getFullYear()).toBe(
        new Date().getFullYear()
      );
    });
  });

  describe("Edge Case Dates", () => {
    it("should update ONLY totals for Deep Backdated transactions (2 years ago)", async () => {
      await analyticsService.createAnalytics(userId);

      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 5000,
          txnType: "income",
          userId,
          txnDate: twoYearsAgo,
        },
        userId
      );

      const updated = await Analytics.findOne({ userId });
      expect(updated.income.total).toBe(5000);
      // Buckets untouched
      expect(updated.income.annual).toBe(0);
      expect(updated.income.month).toBe(0);
      expect(updated.previousIncome.annual).toBe(0);
    });

    it("should update ONLY totals for Future transactions (Next Month)", async () => {
      await analyticsService.createAnalytics(userId);

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 500,
          txnType: "income",
          userId,
          txnDate: nextMonth,
        },
        userId
      );

      const updated = await Analytics.findOne({ userId });
      expect(updated.income.total).toBe(500);
      expect(updated.income.month).toBe(0);
    });
  });

  describe("Batch Operations", () => {
    it("should correctly aggregate mixed transactions", async () => {
      await analyticsService.createAnalytics(userId);

      const txns = [
        {
          amount: 100,
          txnType: "income",
          txnDate: new Date(), // Current
        },
        {
          amount: 50,
          txnType: "expense",
          txnDate: new Date(), // Current
        },
        {
          amount: 200,
          txnType: "investment",
          txnDate: new Date(), // Current
        },
        {
          amount: 1000,
          txnType: "income",
          txnDate: new Date(
            new Date().setFullYear(new Date().getFullYear() - 2)
          ), // Old (deep backdate)
        },
      ];

      await analyticsService.updateAnalyticsBatch(txns, userId);

      const updated = await Analytics.findOne({ userId });
      expect(updated.income.total).toBe(1100); // 100 + 1000
      expect(updated.expenses.total).toBe(50);
      expect(updated.investments.total).toBe(200);

      // Current Month
      expect(updated.income.month).toBe(100);
      expect(updated.expenses.month).toBe(50);
    });
  });

  describe("Calculations & Deletes", () => {
    it("should handle updateAnalyticsOnDelete correctly", async () => {
      await analyticsService.createAnalytics(userId);
      // Prep with some data
      const doc = await Analytics.findOne({ userId });
      doc.income.total = 1000;
      doc.income.month = 100;
      const now = new Date();
      doc.lastUpdated = { month: now, quarter: now, year: now };
      await doc.save();

      await analyticsService.updateAnalyticsOnDelete(
        {
          amount: 100,
          txnType: "income",
          userId,
          txnDate: new Date(),
        },
        userId
      );

      const updated = await Analytics.findOne({ userId });
      expect(updated.income.total).toBe(900);
      expect(updated.income.month).toBe(0);
    });

    it("should calculate valid percentage change (Growth)", async () => {
      await analyticsService.createAnalytics(userId);
      // Prep keys
      const doc = await Analytics.findOne({ userId });
      doc.previousIncome.month = 50;
      doc.income.month = 0;
      const now = new Date();
      doc.lastUpdated = { month: now, quarter: now, year: now };
      await doc.save();

      // Add 100 income
      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 100,
          txnType: "income",
          userId,
          txnDate: new Date(),
        },
        userId
      );

      const updated = await Analytics.findOne({ userId });
      // (100 - 50) / 50 * 100 = 100%
      expect(updated.incomeChange.month).toBe(100);
    });
  });

  describe("Schema Verification", () => {
    it("should write to daily analytics with split category fields", async () => {
      await analyticsService.createAnalytics(userId);

      const today = new Date();
      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 100,
          txnType: "income",
          userId,
          category: "Salary",
          txnDate: today,
        },
        userId
      );

      const daily = await DailyAnalytics.findOne({ userId });
      expect(daily).toBeDefined();
      expect(daily.totals.income).toBe(100);
      expect(daily.incomeCategories.get("Salary")).toBe(100);
    });
  });

  describe("Query Methods (TimeSeries Service)", () => {
    describe("getTimeSeries", () => {
      beforeEach(async () => {
        // Seed some daily data
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        await DailyAnalytics.create([
          { userId, date: today, totals: { income: 100 } },
          { userId, date: yesterday, totals: { income: 50 } },
        ]);

        await MonthlyAnalytics.create({
          userId,
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          totals: { income: 500 },
        });
      });

      it("should call DailyAnalytics.find with correct default date range", async () => {
        const res = await timeSeriesService.getTimeSeries(userId);
        // Should find both daily records (last 30 days default)
        expect(res).toHaveLength(2);
        expect(res[0].totals.income).toBe(50); // Yesterday (sorted asc)
        expect(res[1].totals.income).toBe(100); // Today
      });

      it("should Switch to MonthlyAnalytics if allTime is true", async () => {
        const res = await timeSeriesService.getTimeSeries(
          userId,
          null,
          null,
          true
        );
        expect(res).toHaveLength(1);
        expect(res[0].totals.income).toBe(500);
      });
    });

    describe("getCategoryDistribution", () => {
      beforeEach(async () => {
        // Seed data
        await DailyAnalytics.create({
          userId,
          date: new Date(),
          incomeCategories: { Salary: 100 },
          expenseCategories: { Food: 50 },
        });
      });

      it("should aggregate from DailyAnalytics with default date range", async () => {
        const res = await timeSeriesService.getCategoryDistribution(
          userId,
          undefined,
          undefined,
          "income"
        );
        expect(res).toHaveLength(1);
        expect(res[0].name).toBe("Salary");
        expect(res[0].value).toBe(100);
      });

      it("should use correct field for expense type", async () => {
        const res = await timeSeriesService.getCategoryDistribution(
          userId,
          undefined,
          undefined,
          "expense"
        );
        expect(res).toHaveLength(1);
        expect(res[0].name).toBe("Food");
        expect(res[0].value).toBe(50);
      });

      it("should return empty array for transfer type", async () => {
        const res = await timeSeriesService.getCategoryDistribution(
          userId,
          undefined,
          undefined,
          "transfer"
        );
        expect(res).toEqual([]);
      });
    });
  });
});
