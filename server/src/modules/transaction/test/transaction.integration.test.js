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
const { MonthlyAnalytics } = require("../../analytics/monthlyAnalytics.model");
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
    await MonthlyAnalytics.deleteMany({});
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

    it("should create a transfer transaction and NOT update analytics", async () => {
      const payload = {
        amount: 250,
        txnType: "transfer",
        category: "Bank Transfer",
        txnDate: new Date().toISOString(),
        description: "Moving Money",
      };

      const res = await request(app).post("/api/transactions").send(payload);
      expect(res.status).toBe(201);
      expect(res.body.txnType).toBe("transfer");

      // Verify Transaction Created
      const txn = await Transaction.findOne({ description: "Moving Money" });
      expect(txn).toBeDefined();

      // Verify Analytics UNTOUCHED
      const analytics = await Analytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });

      expect(analytics.income.total).toBe(0);
      expect(analytics.expenses.total).toBe(0);
      expect(analytics.investments.total).toBe(0);
      expect(analytics.cashFlow.total).toBe(0);

      const daily = await DailyAnalytics.findOne({
        userId: "507f1f77bcf86cd799439011",
      });
      expect(daily).toBeNull();
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
});
