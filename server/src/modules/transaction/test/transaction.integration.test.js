const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const cookieParser = require("cookie-parser");
const { transactionRouter } = require("../transaction.routes");
const { errorHandler } = require("../../../middleware/errorHandler.middleware");
const { User } = require("../../user/user.model");
const { Transaction } = require("../transaction.model");
const { Analytics } = require("../../analytics/analytics.model"); // Needed as transactions update analytics
const { DailyAnalytics } = require("../../analytics/dailyAnalytics.model");
const { analyticsService } = require("../../analytics/analytics.service"); // Real service
const { tokenService } = require("../../../lib/jwt/token.service");

// We need to bypass validateToken for integration tests simply, OR we generate a valid token
// Strategy: Create a real user, generate a real token, use it in headers.

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  next();
});

jest.mock("../../../middleware/validateToken.middleware", () => ({
  validateToken: (req, res, next) => {
    req.user = { id: "507f1f77bcf86cd799439011" }; // user1
    next();
  },
}));

app.use("/api/transactions", transactionRouter);
app.use(errorHandler);

describe("Transaction Integration", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Transaction.deleteMany({});
    await Analytics.deleteMany({});
    await DailyAnalytics.deleteMany({});
    // Setup initial analytics for the test user
    await Analytics.create({ userId: "507f1f77bcf86cd799439011" });
  });

  describe("POST /api/transactions", () => {
    it("should create a income transaction and update analytics", async () => {
      const payload = {
        amount: 1000,
        txnType: "income",
        category: "Salary",

        txnDate: new Date().toISOString(),
        description: "Monthly Salary",
      };

      const res = await request(app).post("/api/transactions").send(payload);

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(1000);
      expect(res.body.txnType).toBe("income");

      // Verify DB Side effect
      const txn = await Transaction.findOne({ description: "Monthly Salary" });
      expect(txn).toBeDefined();

      // Verify Analytics Side effect
      const analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.income.total).toBe(1000);

      // Verify Time Series Side effect
      const daily = await DailyAnalytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(daily).toBeDefined();
      expect(daily.totals.income).toBe(1000);
      expect(daily.incomeCategories.get("Salary")).toBe(1000); // Access map via get if Schema uses Map, or dot access if POJO. Mongoose Map uses .get()
    });

    it("should create an expense transaction", async () => {
      const payload = {
        amount: 50,
        txnType: "expense",
        category: "Food",

        txnDate: new Date().toISOString(),
        description: "Lunch",
      };

      const res = await request(app).post("/api/transactions").send(payload);
      expect(res.status).toBe(201);

      const analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.expenses.total).toBe(50);
    });

    it("should create an investment transaction", async () => {
      const payload = {
        amount: 500,
        txnType: "investment",
        category: "Stocks",

        txnDate: new Date().toISOString(),
        description: "Stock Purchase",
      };

      const res = await request(app).post("/api/transactions").send(payload);
      expect(res.status).toBe(201);

      const analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.investments.total).toBe(500);
    });

    it("should return 400 for invalid data", async () => {
      const res = await request(app).post("/api/transactions").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/transactions", () => {
    beforeEach(async () => {
      // Seed some data
      await Transaction.create([
        {
          userId: "507f1f77bcf86cd799439011",
          amount: 100,
          txnType: "income",
          category: "Salary",
          txnDate: new Date("2023-01-01"),
        },
        {
          userId: "507f1f77bcf86cd799439011",
          amount: 50,
          txnType: "expense",
          category: "Food",
          txnDate: new Date("2023-01-02"),
        },
        {
          userId: "507f1f77bcf86cd799439011",
          amount: 200,
          txnType: "income",
          category: "Bonus",
          txnDate: new Date("2023-01-03"),
        },
        {
          userId: "507f1f77bcf86cd799439099",
          amount: 999,
          txnType: "income",
          category: "Salary",
          txnDate: new Date("2023-01-01"),
        },
      ]);
    });

    it("should return list of transactions for user", async () => {
      const res = await request(app).get("/api/transactions");
      expect(res.status).toBe(200);
      expect(res.body.transactions.length).toBe(3);
      expect(res.body.total).toBe(3);
    });

    it("should filter by type", async () => {
      const res = await request(app).get("/api/transactions?txnType=expense");
      expect(res.status).toBe(200);
      expect(res.body.transactions.length).toBe(1);
      expect(res.body.transactions[0].txnType).toBe("expense");
    });

    it("should filter by date range", async () => {
      const res = await request(app).get(
        "/api/transactions?startDate=2023-01-02&endDate=2023-01-02"
      );
      expect(res.body.transactions.length).toBe(1);
      expect(res.body.transactions[0].amount).toBe(50);
    });

    it("should sort transactions desc by default (or as logic defines)", async () => {
      // Service default is desc (-1) if sort prop is not asc
      const res = await request(app).get("/api/transactions");
      const dates = res.body.transactions.map((t) =>
        new Date(t.txnDate).getTime()
      );
      // Expect desc: 3rd, 2nd, 1st
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
    });
  });

  describe("GET /api/transactions/:id", () => {
    it("should return a transaction by id", async () => {
      const txn = await Transaction.create({
        userId: "507f1f77bcf86cd799439011",
        amount: 100,
        txnType: "income",
        category: "Salary",
        txnDate: new Date(),
      });

      const res = await request(app).get(`/api/transactions/${txn._id}`);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(txn._id.toString());
    });

    it("should return 404 for unknown id", async () => {
      const res = await request(app).get(
        "/api/transactions/507f1f77bcf86cd799439999"
      );
      expect(res.status).toBe(404);
    });

    it("should return 500/400 for invalid id format", async () => {
      // validateId in service throws INVALID_ID which is 400 usually, or 500 if AppError map?
      // Checking TransactionErrors.INVALID_ID
      const res = await request(app).get("/api/transactions/invalid-id");
      // If AppError is handled, it should be mapped. Let's see.
      // Usually 400 for bad request.
      expect(res.status).not.toBe(200);
    });
  });

  describe("POST /api/transactions/bulk", () => {
    it("should create multiple transactions", async () => {
      const payload = [
        {
          amount: 100,
          txnType: "income",
          category: "A",
          txnDate: new Date().toISOString(),
        },
        {
          amount: 200,
          txnType: "expense",
          category: "B",
          txnDate: new Date().toISOString(),
        },
      ];

      const res = await request(app)
        .post("/api/transactions/bulk")
        .send(payload);
      expect(res.status).toBe(201);
      expect(res.body.length).toBe(2);

      const analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.income.total).toBe(100);
      expect(analytics.expenses.total).toBe(200);
    });
  });

  describe("PATCH /api/transactions/:id", () => {
    it("should update transaction and adjust analytics", async () => {
      const txn = await Transaction.create({
        userId: "507f1f77bcf86cd799439011",
        amount: 100,
        txnType: "income",
        category: "Salary",
        txnDate: new Date(),
      });

      await analyticsService.updateAnalyticsOnAdd(txn);

      const res = await request(app).put(`/api/transactions/${txn._id}`).send({
        amount: 200,
      });

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(200);

      const analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      // Old 100 removed, New 200 added -> Total 200
      expect(analytics.income.total).toBe(200);
    });
  });

  describe("DELETE /api/transactions/:id", () => {
    it("should delete transaction and revert analytics", async () => {
      // Use API to create so logic is consistent
      const createRes = await request(app).post("/api/transactions").send({
        amount: 100,
        txnType: "income",
        category: "Salary",

        txnDate: new Date().toISOString(),
        description: "To Delete",
      });
      const txnId = createRes.body._id;

      const res = await request(app).delete(`/api/transactions/${txnId}`);
      expect(res.status).toBe(200);

      const check = await Transaction.findById(txnId);
      expect(check).toBeNull();

      const analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.income.total).toBe(0);
    });
  });
  describe("Complex Scenarios", () => {
    it("Scenario 1: Full Transaction Lifecycle (Create -> Update Amount -> Change Type -> Delete)", async () => {
      // 1. Create Income
      const createRes = await request(app).post("/api/transactions").send({
        amount: 1000,
        txnType: "income",
        category: "Salary",

        txnDate: new Date().toISOString(),
        description: "Lifecycle Test",
      });
      const txnId = createRes.body._id;
      let analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.income.total).toBe(1000);
      expect(analytics.income.month).toBe(1000);
      expect(analytics.income.annual).toBe(1000);
      expect(analytics.cashFlow.total).toBe(1000);

      // 2. Update Amount (1000 -> 2000)
      await request(app).put(`/api/transactions/${txnId}`).send({
        amount: 2000,
      });
      analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.income.total).toBe(2000);

      // 3. Change Type (Income -> Expense)
      await request(app).put(`/api/transactions/${txnId}`).send({
        txnType: "expense",
        category: "Rent",
      });
      analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.income.total).toBe(0);
      expect(analytics.expenses.total).toBe(2000);

      // 4. Change Type (Expense -> Investment)
      await request(app).put(`/api/transactions/${txnId}`).send({
        txnType: "investment",
        category: "Stocks",
      });
      analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.expenses.total).toBe(0);
      expect(analytics.investments.total).toBe(2000);

      // 5. Delete
      await request(app).delete(`/api/transactions/${txnId}`);
      analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.investments.total).toBe(0);
    });

    it("Scenario 2: Cross-Period Logic (Past Month -> Current Month)", async () => {
      // Setup dates
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const lastMonthDate = new Date();
      lastMonthDate.setDate(1); // avoid 31st rollover issues
      lastMonthDate.setMonth(currentMonth - 1); // safe now

      // 1. Create in Last Month
      const createRes = await request(app).post("/api/transactions").send({
        amount: 500,
        txnType: "income",
        category: "Old Salary",

        txnDate: lastMonthDate.toISOString(),
      });
      const txnId = createRes.body._id;

      let analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      // Should affect TOTAL but NOT current month

      expect(analytics.income.total).toBe(500);
      expect(analytics.income.month).toBe(0);

      // 2. Move to Current Month
      await request(app).put(`/api/transactions/${txnId}`).send({
        txnDate: now.toISOString(),
      });

      analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.income.total).toBe(500); // Total unchanged
      expect(analytics.income.month).toBe(500); // Now in current month
      expect(analytics.income.quarter).toBeGreaterThan(0); // Should be in quarter
      expect(analytics.income.annual).toBe(500); // Should be in annual

      // Verify Cash Flow logic
      expect(analytics.cashFlow.month).toBe(500);
      expect(analytics.cashFlow.total).toBe(500);
    });

    it("Scenario 3: Regressive Mixed Workload (The 'Chaos' Test)", async () => {
      // 1. Initial Bulk Load
      // Rev: 1000 (Current)
      // Exp: 500 (Current)
      // Inv: 200 (Current)
      const payload = [
        {
          amount: 1000,
          txnType: "income",
          category: "Salary",

          txnDate: new Date().toISOString(),
        },
        {
          amount: 500,
          txnType: "expense",
          category: "Food",
          txnDate: new Date().toISOString(),
        },
        {
          amount: 200,
          txnType: "investment",
          category: "Stocks",
          txnDate: new Date().toISOString(),
        },
      ];

      const bulkRes = await request(app)
        .post("/api/transactions/bulk")
        .send(payload);
      expect(bulkRes.status).toBe(201);
      const revId = bulkRes.body[0]._id;
      const expId = bulkRes.body[1]._id;

      let analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });

      // Verify Initial State
      expect(analytics.income.total).toBe(1000);
      expect(analytics.expenses.total).toBe(500);
      expect(analytics.investments.total).toBe(200);
      expect(analytics.cashFlow.total).toBe(500); // 1000 - 500

      // 2. Complex Update on Income Transaction
      // A. Change Amount (1000 -> 2000)
      await request(app).put(`/api/transactions/${revId}`).send({
        amount: 2000,
      });
      analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(analytics.income.total).toBe(2000);
      expect(analytics.cashFlow.total).toBe(1500); // 2000 - 500

      // B. Change Date (Current -> Last Month)
      // This should Move 2000 from current income to previous income
      const lastMonth = new Date();
      lastMonth.setDate(1);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      await request(app).put(`/api/transactions/${revId}`).send({
        txnDate: lastMonth.toISOString(),
      });
      analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      // Totals remain same
      expect(analytics.income.total).toBe(2000);
      // Current Month Buckets should NOT have the 2000 anymore
      expect(analytics.income.month).toBe(0);
      // Previous Month Buckets SHOULD have the 2000
      expect(analytics.previousIncome.month).toBe(2000); // Assuming clean state initially

      // C. Change Type (Income -> Expense) WHILE in Last Month
      await request(app).put(`/api/transactions/${revId}`).send({
        txnType: "expense",
      });
      analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });

      // income should be gone completely
      expect(analytics.income.total).toBe(0);
      expect(analytics.previousIncome.month).toBe(0);
      expect(analytics.income.month).toBe(0);

      // Expenses should increase by 2000 (total 2500)
      // The 2000 is in Last Month, 500 is in Current Month
      expect(analytics.expenses.total).toBe(2500);
      expect(analytics.expenses.month).toBe(500);
      expect(analytics.previousExpenses.month).toBe(2000);

      // Cash Flow should plummet
      // income (0) - Expenses (2500) = -2500
      expect(analytics.cashFlow.total).toBe(-2500);

      // 3. Partial Delete
      // Delete the original Expense (500) which is in Current Month
      await request(app).delete(`/api/transactions/${expId}`);
      analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });

      // Expenses Total: 2500 - 500 = 2000
      expect(analytics.expenses.total).toBe(2000);
      // Expenses Current: 500 - 500 = 0
      expect(analytics.expenses.month).toBe(0);
      // Expenses Previous: Remains 2000
      expect(analytics.previousExpenses.month).toBe(2000);

      // Final Check of ALL fields
      expect(analytics.income.total).toBe(0);
      expect(analytics.previousIncome.total).toBeUndefined(); // Field doesn't exist on schema
      expect(analytics.income.month).toBe(0);
      expect(analytics.income.annual).toBe(0);

      expect(analytics.expenses.total).toBe(2000);
      expect(analytics.expenses.month).toBe(0);
      // Previous expenses are in annual bucket logic too?
      // Since last month is likely this year (unless Jan test), prevExpenses.annual depends on if last month is same year.
      // Assuming test runs not in Jan for simplicity, or we check year equality.
      // If last month was Dec 2024 and now is Jan 2025, annual would be 0.
      // Let's stick to Month assertions which are safer for relative checks.
      expect(analytics.previousExpenses.month).toBe(2000);

      expect(analytics.investments.total).toBe(200); // Touched once
      expect(analytics.investments.month).toBe(200);
    });

    it("Scenario 4: Zero-Sum & Calculations", async () => {
      // 1. Add Income 1000
      await request(app).post("/api/transactions").send({
        amount: 1000,
        txnType: "income",
        category: "Salary",
        txnDate: new Date().toISOString(),
      });

      // 2. Add Expense 1000
      await request(app).post("/api/transactions").send({
        amount: 1000,
        txnType: "expense",
        category: "Rent",
        txnDate: new Date().toISOString(),
      });

      const analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });

      // 3. Verify Zero Sum
      expect(analytics.income.total).toBe(1000);
      expect(analytics.expenses.total).toBe(1000);

      expect(analytics.cashFlow.total).toBe(0);
      // Logic check: cashFlow.month might be 0 if both are this month
      expect(analytics.cashFlow.month).toBe(0);

      // 4. Verify % Calculation (Change)
      // Since previous period is 0 (fresh db), change from 0 is handled as 0 in our logic
      expect(analytics.incomeChange.month).toBe(0);
      expect(analytics.expensesChange.month).toBe(0);
      expect(analytics.cashFlowChange.month).toBe(0);
    });
  });
});
