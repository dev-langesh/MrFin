const { analyticsService } = require("../analytics.service");
const { Analytics } = require("../analytics.model");
const { AnalyticsErrors } = require("../../../errors/analyticsErrors");

jest.mock("../analytics.model");
jest.mock("../dailyAnalytics.model", () => ({
  DailyAnalytics: {
    findOneAndUpdate: jest.fn().mockResolvedValue(true),
    find: jest.fn(),
    aggregate: jest.fn(),
    bulkWrite: jest.fn(),
  },
}));
jest.mock("../monthlyAnalytics.model", () => ({
  MonthlyAnalytics: {
    findOneAndUpdate: jest.fn().mockResolvedValue(true),
    find: jest.fn(),
    aggregate: jest.fn(),
    bulkWrite: jest.fn(),
  },
}));

describe("Analytics Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockAnalytics = () => ({
    userId: "507f1f77bcf86cd799439011",
    income: { total: 1000, month: 100, quarter: 300, annual: 1000 },
    expenses: { total: 500, month: 50, quarter: 150, annual: 500 },
    investments: { total: 200, month: 20, quarter: 60, annual: 200 },
    cashFlow: { total: 500, month: 50, quarter: 150, annual: 500 },
    previousIncome: { month: 0, quarter: 0, annual: 0 },
    previousExpenses: { month: 0, quarter: 0, annual: 0 },
    previousInvestments: { month: 0, quarter: 0, annual: 0 },
    previousCashFlow: { month: 0, quarter: 0, annual: 0 },
    incomeChange: { month: 0, quarter: 0, annual: 0 },
    expensesChange: { month: 0, quarter: 0, annual: 0 },
    cashFlowChange: { month: 0, quarter: 0, annual: 0 },
    investmentsChange: { month: 0, quarter: 0, annual: 0 },
    lastUpdated: {
      month: new Date(),
      quarter: new Date(),
      year: new Date(),
    },
    save: jest.fn().mockResolvedValue(true),
    isModified: jest.fn().mockReturnValue(false),
  });

  const setupAnalyticsMock = (mock) => {
    Analytics.findOne.mockResolvedValue(mock);
    Analytics.findOneAndUpdate.mockImplementation((query, update) => {
      if (update.$inc) {
        for (const [key, val] of Object.entries(update.$inc)) {
          const parts = key.split(".");
          if (parts.length === 1) mock[parts[0]] += val;
          else if (parts.length === 2) mock[parts[0]][parts[1]] += val;
        }
      }
      return Promise.resolve(mock);
    });
  };

  describe("getAnalytics", () => {
    it("should return analytics if found", async () => {
      const mock = createMockAnalytics();
      setupAnalyticsMock(mock);
      const res = await analyticsService.getAnalytics(
        "507f1f77bcf86cd799439011"
      );
      expect(res).toBe(mock);
    });

    it("should create if not found", async () => {
      Analytics.findOne.mockResolvedValue(null);
      // createAnalytics is called, which calls findOne (again/null) then create
      Analytics.create.mockResolvedValue([createMockAnalytics()]);

      const res = await analyticsService.getAnalytics(
        "507f1f77bcf86cd799439011"
      );
      expect(res).toBeDefined();
    });
  });

  describe("updateAnalyticsOnAdd", () => {
    it("should update totals and current period values", async () => {
      const mock = createMockAnalytics();
      setupAnalyticsMock(mock);

      const incomeToAdd = 100;
      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: incomeToAdd,
          txnType: "income",
          userId: "507f1f77bcf86cd799439011",
        },
        "507f1f77bcf86cd799439011"
      );

      expect(mock.income.total).toBe(1100);
      expect(mock.income.month).toBe(200); // 100 + 100
      expect(mock.save).toHaveBeenCalled();
    });

    it("should update previous period directly if transaction is backdated to last month", async () => {
      const mock = createMockAnalytics();
      setupAnalyticsMock(mock);

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 50,
          txnType: "income",
          userId: "507f1f77bcf86cd799439011",
          txnDate: lastMonth,
        },
        "507f1f77bcf86cd799439011",
        lastMonth
      );

      // Should update previousIncome.month, NOT income.month
      expect(mock.previousIncome.month).toBe(50); // 0 + 50
      expect(mock.income.month).toBe(100); // Unchanged
    });
  });

  describe("updateAnalyticsOnEdit", () => {
    it("should update difference if period is same", async () => {
      const mock = createMockAnalytics();
      setupAnalyticsMock(mock);

      const oldTxn = {
        amount: 100,
        txnType: "income",
        userId: "507f1f77bcf86cd799439011",
        txnDate: new Date(),
      };
      const newTxn = {
        amount: 150,
        txnType: "income",
        userId: "507f1f77bcf86cd799439011",
        txnDate: new Date(),
      };

      await analyticsService.updateAnalyticsOnEdit(oldTxn, newTxn);

      // Should add 50 to income
      expect(mock.income.total).toBe(1050);
      expect(mock.income.month).toBe(150);
    });

    it("should move values if date changed period", async () => {
      const mock = createMockAnalytics();
      setupAnalyticsMock(mock);

      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 1); // Last month
      const newDate = new Date(); // This month

      // Mock logic: last month was handled, so lastUpdated is clean?
      // Actually updateAnalyticsOnAdd handles the logic.
      // We expect: subtract from old period, add to new period.

      const oldTxn = {
        amount: 100,
        txnType: "income",
        userId: "507f1f77bcf86cd799439011",
        txnDate: oldDate,
      };
      const newTxn = {
        amount: 100,
        txnType: "income",
        userId: "507f1f77bcf86cd799439011",
        txnDate: newDate,
      };

      await analyticsService.updateAnalyticsOnEdit(oldTxn, newTxn);

      // subtract 100 from old period (which is previous month relative to now)
      // add 100 to new period (current month)

      expect(mock.previousIncome.month).toBe(-100); // 0 - 100
      expect(mock.income.month).toBe(200); // 100 + 100
    });
  });
  describe("Rollover Logic", () => {
    it("should handle Year Rollover correctly (Dec -> Jan)", async () => {
      const mock = createMockAnalytics();
      // Last updated Dec 31st last year
      const lastYearDec = new Date();
      lastYearDec.setFullYear(lastYearDec.getFullYear() - 1);
      lastYearDec.setMonth(11); // Dec
      lastYearDec.setDate(31);

      mock.lastUpdated.month = lastYearDec;
      mock.lastUpdated.quarter = lastYearDec;
      mock.lastUpdated.year = lastYearDec;

      // Setup mock values to verify move
      mock.income.annual = 1000;
      mock.income.quarter = 300;
      mock.income.month = 100;

      // Mock Mongoose document methods
      mock.isModified = jest.fn().mockReturnValue(true); // Simulate change
      mock.save = jest.fn().mockResolvedValue(true);

      setupAnalyticsMock(mock);

      // Trigger Read-Time Rollover
      await analyticsService.getAnalytics("507f1f77bcf86cd799439011");

      // Check Year Rollover
      expect(mock.previousIncome.annual).toBe(1000); // Moved from income.annual
      expect(mock.income.annual).toBe(0); // Reset

      // Check Quarter Rollover
      expect(mock.previousIncome.quarter).toBe(300); // Moved from income.quarter
      expect(mock.income.quarter).toBe(0); // Reset

      // Check Month Rollover
      expect(mock.previousIncome.month).toBe(100); // Moved from income.month
      expect(mock.income.month).toBe(0); // Reset

      expect(mock.save).toHaveBeenCalled();
    });

    it("should handle Quarter Rollover correctly (Mar -> Apr)", async () => {
      // Mock System Time to April 1st
      const currentYear = new Date().getFullYear();
      const aprilDate = new Date(currentYear, 3, 1); // Apr 1
      jest.useFakeTimers().setSystemTime(aprilDate);

      const mock = createMockAnalytics();
      // Setup dates so last update was March (Q1)
      const marchDate = new Date(currentYear, 2, 31); // Mar 31
      mock.lastUpdated.month = marchDate;
      mock.lastUpdated.quarter = marchDate;
      mock.lastUpdated.year = marchDate; // Same year

      // Setup initial values
      mock.expenses.annual = 500;
      mock.expenses.quarter = 150;
      mock.expenses.month = 50;

      mock.isModified = jest.fn().mockReturnValue(true);
      mock.save = jest.fn().mockResolvedValue(true);

      setupAnalyticsMock(mock);

      // Trigger Read-Time Rollover
      await analyticsService.getAnalytics("507f1f77bcf86cd799439011");

      // Year should NOT rollover
      expect(mock.previousExpenses.annual).toBe(0); // Assuming 0 init
      expect(mock.expenses.annual).toBe(500); // Unchanged

      // Quarter SHOULD rollover
      expect(mock.previousExpenses.quarter).toBe(150); // Moved
      expect(mock.expenses.quarter).toBe(0); // Reset

      // Month SHOULD rollover
      expect(mock.previousExpenses.month).toBe(50); // Moved
      expect(mock.expenses.month).toBe(0); // Reset

      jest.useRealTimers();
    });
  });

  describe("Edge Case Dates", () => {
    it("should update ONLY totals for Deep Backdated transactions (2 years ago)", async () => {
      const mock = createMockAnalytics();
      setupAnalyticsMock(mock);

      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 5000,
          txnType: "income",
          userId: "507f1f77bcf86cd799439011",
          txnDate: twoYearsAgo,
        },
        "507f1f77bcf86cd799439011"
      );

      expect(mock.income.total).toBe(6000); // 1000 + 5000
      // Current buckets untouched
      expect(mock.income.annual).toBe(1000);
      expect(mock.income.month).toBe(100);
      // Previous buckets untouched (only track n-1)
      expect(mock.previousIncome.annual).toBe(0);
    });

    it("should update ONLY totals for Future transactions (Next Month)", async () => {
      const mock = createMockAnalytics();
      setupAnalyticsMock(mock);

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 500,
          txnType: "income",
          userId: "507f1f77bcf86cd799439011",
          txnDate: nextMonth,
        },
        "507f1f77bcf86cd799439011"
      );

      expect(mock.income.total).toBe(1500);
      // Should NOT affect current month bucket
      expect(mock.income.month).toBe(100);
    });
  });

  describe("Batch Operations", () => {
    it("should correctly aggregate mixed transactions", async () => {
      const mock = createMockAnalytics();
      setupAnalyticsMock(mock);

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
          ), // Old
        },
      ];

      await analyticsService.updateAnalyticsBatch(
        txns,
        "507f1f77bcf86cd799439011"
      );

      // Check Totals
      expect(mock.income.total).toBe(2100); // 1000 + 100 + 1000
      expect(mock.expenses.total).toBe(550); // 500 + 50
      expect(mock.investments.total).toBe(400); // 200 + 200

      // Check Current Month (Only current txns)
      expect(mock.income.month).toBe(200); // 100 (existing) + 100 (new)
      expect(mock.expenses.month).toBe(100); // 50 + 50
    });
  });

  describe("Calculations & Deletes", () => {
    it("should handle updateAnalyticsOnDelete correctly", async () => {
      const mock = createMockAnalytics();
      setupAnalyticsMock(mock);

      await analyticsService.updateAnalyticsOnDelete(
        {
          amount: 100,
          txnType: "income",
          userId: "507f1f77bcf86cd799439011",
          txnDate: new Date(),
        },
        "507f1f77bcf86cd799439011"
      );

      expect(mock.income.total).toBe(900); // 1000 - 100
      expect(mock.income.month).toBe(0); // 100 - 100
    });

    // Calc logic is internal but verified via output effects in % changes
    // We can indirectly verify division by zero safely handling if we mock previous to 0
    it("should handle zero denominator in % change calculation", async () => {
      const mock = createMockAnalytics();
      mock.previousIncome.month = 0; // Force zero denom
      setupAnalyticsMock(mock);

      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 100,
          txnType: "income",
          userId: "507f1f77bcf86cd799439011",
          txnDate: new Date(),
        }, // Current becomes 200
        "507f1f77bcf86cd799439011"
      );

      expect(mock.incomeChange.month).toBe(0); // Should be 0 if prev is 0
    });

    it("should calculate valid percentage change (Growth)", async () => {
      const mock = createMockAnalytics();
      mock.previousIncome.month = 50;
      mock.income.month = 0; // Reset from default 100
      setupAnalyticsMock(mock);

      // Add 100. Current becomes 100.
      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 100,
          txnType: "income",
          userId: "507f1f77bcf86cd799439011",
          txnDate: new Date(),
        },
        "507f1f77bcf86cd799439011"
      );

      // Current: 100, Prev: 50
      // Change: (100 - 50) / 50 * 100 = 100%
      expect(mock.incomeChange.month).toBe(100);
    });

    it("should calculate valid percentage change (Decline)", async () => {
      const mock = createMockAnalytics();
      mock.previousIncome.month = 200;
      mock.income.month = 0; // Reset from default 100
      setupAnalyticsMock(mock);

      // Add 100. Current becomes 100.
      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 100,
          txnType: "income",
          userId: "507f1f77bcf86cd799439011",
          txnDate: new Date(),
        },
        "507f1f77bcf86cd799439011"
      );

      // Current: 100, Prev: 200
      // Change: (100 - 200) / 200 * 100 = -50%
      expect(mock.incomeChange.month).toBe(-50);
    });
  });

  describe("Schema Verification", () => {
    it("should write to daily analytics with split category fields", async () => {
      const mock = createMockAnalytics();
      setupAnalyticsMock(mock);
      const { DailyAnalytics } = require("../dailyAnalytics.model");

      await analyticsService.updateAnalyticsOnAdd(
        {
          amount: 100,
          txnType: "income",
          userId: "507f1f77bcf86cd799439011",
          category: "Salary",
          txnDate: new Date(),
        },
        "507f1f77bcf86cd799439011"
      );

      // Verify bulkWrite or findOneAndUpdate called with correct fields
      // updateTimeSeries uses bulkWrite for efficiency now in updateAnalyticsBatch?
      // No, updateAnalyticsOnAdd uses `updateTimeSeries` helper which calls `DailyAnalytics.findOneAndUpdate`.

      expect(DailyAnalytics.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $inc: expect.objectContaining({
            "totals.income": 100,
            "incomeCategories.Salary": 100,
          }),
        }),
        expect.anything()
      );
    });
  });

  describe("Query Methods", () => {
    describe("getTimeSeries", () => {
      it("should call DailyAnalytics.find with correct default date range", async () => {
        const { DailyAnalytics } = require("../dailyAnalytics.model");
        DailyAnalytics.find.mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        });

        await analyticsService.getTimeSeries("507f1f77bcf86cd799439011");

        // Defaults: End = Now, Start = Now - 30 days
        expect(DailyAnalytics.find).toHaveBeenCalledWith({
          userId: "507f1f77bcf86cd799439011",
          date: { $gte: expect.any(Date), $lte: expect.any(Date) },
        });
      });

      it("should Switch to MonthlyAnalytics if range > 1 year", async () => {
        const { DailyAnalytics } = require("../dailyAnalytics.model");
        const { MonthlyAnalytics } = require("../monthlyAnalytics.model");

        MonthlyAnalytics.aggregate.mockResolvedValue([]);

        const start = new Date("2020-01-01");
        const end = new Date("2023-01-01"); // 3 years

        await analyticsService.getTimeSeries(
          "507f1f77bcf86cd799439011",
          start,
          end
        );

        expect(MonthlyAnalytics.aggregate).toHaveBeenCalled();
        expect(DailyAnalytics.find).not.toHaveBeenCalled();
      });

      it("should Switch to MonthlyAnalytics if allTime is true", async () => {
        const { DailyAnalytics } = require("../dailyAnalytics.model");
        const { MonthlyAnalytics } = require("../monthlyAnalytics.model");

        MonthlyAnalytics.aggregate.mockResolvedValue([]);

        // Even with short date range, allTime=true should force Monthly
        const start = new Date();
        const end = new Date();

        await analyticsService.getTimeSeries(
          "507f1f77bcf86cd799439011",
          start,
          end,
          true // allTime
        );

        expect(MonthlyAnalytics.aggregate).toHaveBeenCalled();
        expect(DailyAnalytics.find).not.toHaveBeenCalled();

        // Check filtering optimization: Should NOT include date range in match
        const pipeline = MonthlyAnalytics.aggregate.mock.calls[0][0];
        // 1. Initial match (userId)
        // 2. addFields (date)
        // 3. sort
        // Should NOT have a second match stage for date
        const matchStages = pipeline.filter((s) => s.$match);
        expect(matchStages.length).toBe(1); // Only userId match
        expect(matchStages[0].$match.date).toBeUndefined();
      });
    });

    describe("getCategoryDistribution", () => {
      it("should aggregate from DailyAnalytics with default date range", async () => {
        const { DailyAnalytics } = require("../dailyAnalytics.model");
        DailyAnalytics.aggregate.mockResolvedValue([]);

        await analyticsService.getCategoryDistribution(
          "507f1f77bcf86cd799439011",
          undefined,
          undefined,
          "income"
        );

        expect(DailyAnalytics.aggregate).toHaveBeenCalled();
        // Check if $project uses incomeCategories
        const pipeline = DailyAnalytics.aggregate.mock.calls[0][0];
        const projectStage = pipeline.find((s) => s.$project);
        expect(projectStage.$project.byCategory.$objectToArray).toBe(
          "$incomeCategories"
        );
      });

      it("should use correct field for expense type", async () => {
        const { DailyAnalytics } = require("../dailyAnalytics.model");
        DailyAnalytics.aggregate.mockResolvedValue([]);

        await analyticsService.getCategoryDistribution(
          "507f1f77bcf86cd799439011",
          undefined,
          undefined,
          "expense"
        );

        const pipeline = DailyAnalytics.aggregate.mock.calls[0][0];
        const projectStage = pipeline.find((s) => s.$project);
        expect(projectStage.$project.byCategory.$objectToArray).toBe(
          "$expenseCategories"
        );
      });

      it("should return empty array for transfer type", async () => {
        const result = await analyticsService.getCategoryDistribution(
          "507f1f77bcf86cd799439011",
          undefined,
          undefined,
          "transfer"
        );
        expect(result).toEqual([]);
      });

      it("should switch to MonthlyAnalytics if allTime is true", async () => {
        const { DailyAnalytics } = require("../dailyAnalytics.model");
        const { MonthlyAnalytics } = require("../monthlyAnalytics.model");

        MonthlyAnalytics.aggregate.mockResolvedValue([]);

        const start = new Date();
        const end = new Date();

        await analyticsService.getCategoryDistribution(
          "507f1f77bcf86cd799439011",
          start,
          end,
          "income",
          true // allTime
        );

        expect(MonthlyAnalytics.aggregate).toHaveBeenCalled();
        expect(DailyAnalytics.aggregate).not.toHaveBeenCalled();

        // Check filtering optimization
        const pipeline = MonthlyAnalytics.aggregate.mock.calls[0][0];
        // Ensure NO date filtering match stage exists
        const matchStages = pipeline.filter((s) => s.$match && s.$match.date);
        expect(matchStages.length).toBe(0);
      });
    });
  });
});
