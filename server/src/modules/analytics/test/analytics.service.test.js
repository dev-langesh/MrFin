const { analyticsService } = require("../analytics.service");
const { Analytics } = require("../analytics.model");
const { AnalyticsErrors } = require("../../../errors/analyticsErrors");

jest.mock("../analytics.model");

describe("Analytics Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockAnalytics = () => ({
    userId: "user123",
    earnings: { total: 1000, month: 100, quarter: 300, annual: 1000 },
    expenses: { total: 500, month: 50, quarter: 150, annual: 500 },
    investments: { total: 200, month: 20, quarter: 60, annual: 200 },
    cashFlow: { total: 500, month: 50, quarter: 150, annual: 500 },
    previousEarnings: { month: 0, quarter: 0, annual: 0 },
    previousExpenses: { month: 0, quarter: 0, annual: 0 },
    previousInvestments: { month: 0, quarter: 0, annual: 0 },
    previousCashFlow: { month: 0, quarter: 0, annual: 0 },
    earningsChange: { month: 0, quarter: 0, annual: 0 },
    expensesChange: { month: 0, quarter: 0, annual: 0 },
    cashFlowChange: { month: 0, quarter: 0, annual: 0 },
    investmentsChange: { month: 0, quarter: 0, annual: 0 },
    lastUpdated: {
      month: new Date(),
      quarter: new Date(),
      year: new Date(),
    },
    save: jest.fn().mockResolvedValue(true),
  });

  describe("getAnalytics", () => {
    it("should return analytics if found", async () => {
      const mock = createMockAnalytics();
      Analytics.findOne.mockResolvedValue(mock);
      const res = await analyticsService.getAnalytics("user123");
      expect(res).toBe(mock);
    });

    it("should throw NOT_FOUND", async () => {
      Analytics.findOne.mockResolvedValue(null);
      await expect(analyticsService.getAnalytics("user123")).rejects.toThrow(
        AnalyticsErrors.NOT_FOUND.message
      );
    });
  });

  describe("updateAnalyticsOnAdd", () => {
    it("should update totals and current period values", async () => {
      const mock = createMockAnalytics();
      Analytics.findOne.mockResolvedValue(mock);

      const earningsToAdd = 100;
      await analyticsService.updateAnalyticsOnAdd(
        { earnings: earningsToAdd },
        "user123"
      );

      expect(mock.earnings.total).toBe(1100);
      expect(mock.earnings.month).toBe(200); // 100 + 100
      expect(mock.save).toHaveBeenCalled();
    });

    it("should handle rollover if new transaction is in next month", async () => {
      const mock = createMockAnalytics();
      // Set lastUpdated to previous month
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      mock.lastUpdated.month = lastMonth; // Force rollover

      Analytics.findOne.mockResolvedValue(mock);

      await analyticsService.updateAnalyticsOnAdd(
        { earnings: 100 },
        "user123",
        new Date()
      ); // Today

      // Rollover should happen first: current -> previous, current = 0
      // Then add 100 to current

      // Verify previous moved
      expect(mock.previousEarnings.month).toBe(100); // Was 100 initially

      // Verify current updated
      expect(mock.earnings.month).toBe(100); // 0 (reset) + 100 (new)
    });

    it("should update previous period directly if transaction is backdated to last month", async () => {
      const mock = createMockAnalytics();
      Analytics.findOne.mockResolvedValue(mock);

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      await analyticsService.updateAnalyticsOnAdd(
        { earnings: 50 },
        "user123",
        lastMonth
      );

      // Should update previousEarnings.month, NOT earnings.month
      expect(mock.previousEarnings.month).toBe(50); // 0 + 50
      expect(mock.earnings.month).toBe(100); // Unchanged
    });
  });

  describe("updateAnalyticsOnEdit", () => {
    it("should update difference if period is same", async () => {
      const mock = createMockAnalytics();
      Analytics.findOne.mockResolvedValue(mock);

      await analyticsService.updateAnalyticsOnEdit(
        {
          oldEarnings: 100,
          newEarnings: 150,
          oldDate: new Date(),
          newDate: new Date(),
        },
        "user123"
      );

      // Should add 50 to earnings
      expect(mock.earnings.total).toBe(1050);
      expect(mock.earnings.month).toBe(150);
    });

    it("should move values if date changed period", async () => {
      const mock = createMockAnalytics();
      Analytics.findOne.mockResolvedValue(mock);

      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 1); // Last month
      const newDate = new Date(); // This month

      // Mock logic: last month was handled, so lastUpdated is clean?
      // Actually updateAnalyticsOnAdd handles the logic.
      // We expect: subtract from old period, add to new period.

      await analyticsService.updateAnalyticsOnEdit(
        {
          oldEarnings: 100,
          newEarnings: 100, // Amount same, just moved date
          oldDate: oldDate,
          newDate: newDate,
        },
        "user123"
      );

      // subtract 100 from old period (which is previous month relative to now)
      // add 100 to new period (current month)

      expect(mock.previousEarnings.month).toBe(-100); // 0 - 100
      expect(mock.earnings.month).toBe(200); // 100 + 100
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

      Analytics.findOne.mockResolvedValue(mock);

      // Add transaction for Now (Jan)
      await analyticsService.updateAnalyticsOnAdd(
        { earnings: 100 },
        "user123",
        new Date()
      );

      // Check Year Rollover
      expect(mock.previousEarnings.annual).toBe(1000); // Moved from earnings.annual
      expect(mock.earnings.annual).toBe(100); // 0 (reset) + 100 (new)

      // Check Quarter Rollover
      expect(mock.previousEarnings.quarter).toBe(300); // Moved from earnings.quarter
      expect(mock.earnings.quarter).toBe(100); // 0 + 100

      // Check Month Rollover
      expect(mock.previousEarnings.month).toBe(100); // Moved from earnings.month
      expect(mock.earnings.month).toBe(100); // 0 + 100
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

      Analytics.findOne.mockResolvedValue(mock);

      await analyticsService.updateAnalyticsOnAdd(
        { expenses: 50 },
        "user123",
        aprilDate
      );

      // Year should NOT rollover
      expect(mock.previousExpenses.annual).toBe(0); // Assuming 0 init
      expect(mock.expenses.annual).toBe(550); // 500 (existing) + 50 (new)

      // Quarter SHOULD rollover
      expect(mock.previousExpenses.quarter).toBe(150); // Moved
      expect(mock.expenses.quarter).toBe(50); // 0 + 50

      // Month SHOULD rollover
      expect(mock.previousExpenses.month).toBe(50); // Moved
      expect(mock.expenses.month).toBe(50); // 0 + 50

      jest.useRealTimers();
    });
  });

  describe("Edge Case Dates", () => {
    it("should update ONLY totals for Deep Backdated transactions (2 years ago)", async () => {
      const mock = createMockAnalytics();
      Analytics.findOne.mockResolvedValue(mock);

      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      await analyticsService.updateAnalyticsOnAdd(
        { earnings: 5000 },
        "user123",
        twoYearsAgo
      );

      expect(mock.earnings.total).toBe(6000); // 1000 + 5000
      // Current buckets untouched
      expect(mock.earnings.annual).toBe(1000);
      expect(mock.earnings.month).toBe(100);
      // Previous buckets untouched (only track n-1)
      expect(mock.previousEarnings.annual).toBe(0);
    });

    it("should update ONLY totals for Future transactions (Next Month)", async () => {
      const mock = createMockAnalytics();
      Analytics.findOne.mockResolvedValue(mock);

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await analyticsService.updateAnalyticsOnAdd(
        { earnings: 500 },
        "user123",
        nextMonth
      );

      expect(mock.earnings.total).toBe(1500);
      // Should NOT affect current month bucket
      expect(mock.earnings.month).toBe(100);
    });
  });

  describe("Batch Operations", () => {
    it("should correctly aggregate mixed transactions", async () => {
      const mock = createMockAnalytics();
      Analytics.findOne.mockResolvedValue(mock);

      const txns = [
        {
          amount: 100,
          txnType: "revenue",
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
          txnType: "revenue",
          txnDate: new Date(
            new Date().setFullYear(new Date().getFullYear() - 2)
          ), // Old
        },
      ];

      await analyticsService.updateAnalyticsBatch(txns, "user123");

      // Check Totals
      expect(mock.earnings.total).toBe(2100); // 1000 + 100 + 1000
      expect(mock.expenses.total).toBe(550); // 500 + 50
      expect(mock.investments.total).toBe(400); // 200 + 200

      // Check Current Month (Only current txns)
      expect(mock.earnings.month).toBe(200); // 100 (existing) + 100 (new)
      expect(mock.expenses.month).toBe(100); // 50 + 50
    });
  });

  describe("Calculations & Deletes", () => {
    it("should handle updateAnalyticsOnDelete correctly", async () => {
      const mock = createMockAnalytics();
      Analytics.findOne.mockResolvedValue(mock);

      await analyticsService.updateAnalyticsOnDelete(
        { earnings: 100 },
        "user123",
        new Date()
      );

      expect(mock.earnings.total).toBe(900); // 1000 - 100
      expect(mock.earnings.month).toBe(0); // 100 - 100
    });

    // Calc logic is internal but verified via output effects in % changes
    // We can indirectly verify division by zero safely handling if we mock previous to 0
    it("should handle zero denominator in % change calculation", async () => {
      const mock = createMockAnalytics();
      mock.previousEarnings.month = 0; // Force zero denom
      Analytics.findOne.mockResolvedValue(mock);

      await analyticsService.updateAnalyticsOnAdd(
        { earnings: 100 }, // Current becomes 200
        "user123",
        new Date()
      );

      expect(mock.earningsChange.month).toBe(0); // Should be 0 if prev is 0
    });

    it("should calculate valid percentage change (Growth)", async () => {
      const mock = createMockAnalytics();
      mock.previousEarnings.month = 50;
      mock.earnings.month = 0; // Reset from default 100
      Analytics.findOne.mockResolvedValue(mock);

      // Add 100. Current becomes 100.
      await analyticsService.updateAnalyticsOnAdd(
        { earnings: 100 },
        "user123",
        new Date()
      );

      // Current: 100, Prev: 50
      // Change: (100 - 50) / 50 * 100 = 100%
      expect(mock.earningsChange.month).toBe(100);
    });

    it("should calculate valid percentage change (Decline)", async () => {
      const mock = createMockAnalytics();
      mock.previousEarnings.month = 200;
      mock.earnings.month = 0; // Reset from default 100
      Analytics.findOne.mockResolvedValue(mock);

      // Add 100. Current becomes 100.
      await analyticsService.updateAnalyticsOnAdd(
        { earnings: 100 },
        "user123",
        new Date()
      );

      // Current: 100, Prev: 200
      // Change: (100 - 200) / 200 * 100 = -50%
      expect(mock.earningsChange.month).toBe(-50);
    });
  });
});
