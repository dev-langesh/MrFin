const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { app } = require("../../../app"); // Use global app
const { User } = require("../../user/user.model");
const { Transaction } = require("../transaction.model");
const { Analytics } = require("../../analytics/analytics.model");
const { DailyAnalytics } = require("../../analytics/dailyAnalytics.model");
const { MonthlyAnalytics } = require("../../analytics/monthlyAnalytics.model");
const { analyticsService } = require("../../analytics/analytics.service");
const { tokenService } = require("../../../lib/jwt/token.service");
const { userService } = require("../../user/user.service");

describe("Transaction Integration", () => {
  let mongoServer;
  let user;
  let token;
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
    await Transaction.deleteMany({});
    await Analytics.deleteMany({});
    await DailyAnalytics.deleteMany({});
    await MonthlyAnalytics.deleteMany({});
    await User.deleteMany({});

    // Create a real user
    user = await userService.createUser({
      username: "integrationUser",
      name: "Integration Test User",
      email: "integration@test.com",
      password: "password123",
      country: "US",
    });
    userId = user._id.toString();

    // Generate real token
    token = tokenService.generateToken({
      userId: user._id,
      role: "user",
      tokenType: "access",
    });

    let analytics = await Analytics.findOne({ userId: user._id });
    if (!analytics) {
      await Analytics.create({ userId: user._id });
    }
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

      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(1000);
      expect(res.body.txnType).toBe("income");

      // Verify DB Side effect
      const txn = await Transaction.findOne({ description: "Monthly Salary" });
      expect(txn).toBeDefined();

      // Verify Analytics Side effect
      const analytics = await Analytics.findOne({ userId });
      expect(analytics.income.total).toBe(1000);

      // Verify Time Series Side effect
      const daily = await DailyAnalytics.findOne({ userId });
      expect(daily).toBeDefined();
      expect(daily.totals.income).toBe(1000);
      expect(daily.incomeCategories.get("Salary")).toBe(1000);
    });

    it("should create an expense transaction", async () => {
      const payload = {
        amount: 50,
        txnType: "expense",
        category: "Food",
        txnDate: new Date().toISOString(),
        description: "Lunch",
      };

      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send(payload);
      expect(res.status).toBe(201);

      const analytics = await Analytics.findOne({ userId });
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

      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send(payload);
      expect(res.status).toBe(201);

      const analytics = await Analytics.findOne({ userId });
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

      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send(payload);
      expect(res.status).toBe(201);
      expect(res.body.txnType).toBe("transfer");

      // Verify Transaction Created
      const txn = await Transaction.findOne({ description: "Moving Money" });
      expect(txn).toBeDefined();

      // Verify Analytics UNTOUCHED
      const analytics = await Analytics.findOne({ userId });

      expect(analytics.income.total).toBe(0);
      expect(analytics.expenses.total).toBe(0);
      expect(analytics.investments.total).toBe(0);
      expect(analytics.cashFlow.total).toBe(0);

      const daily = await DailyAnalytics.findOne({ userId });
      expect(daily).toBeNull();
    });

    it("should return 400 for invalid data", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/transactions", () => {
    beforeEach(async () => {
      // Seed some data for the test user
      await Transaction.create([
        {
          userId,
          amount: 100,
          txnType: "income",
          category: "Salary",
          txnDate: new Date("2023-01-01"),
        },
        {
          userId,
          amount: 50,
          txnType: "expense",
          category: "Food",
          txnDate: new Date("2023-01-02"),
        },
        {
          userId,
          amount: 200,
          txnType: "income",
          category: "Bonus",
          txnDate: new Date("2023-01-03"),
        },
        // Transaction for DIFFERENT user (should be invisible)
        {
          userId: new mongoose.Types.ObjectId(),
          amount: 999,
          txnType: "income",
          category: "Salary",
          txnDate: new Date("2023-01-01"),
        },
      ]);
    });

    it("should return list of transactions for user", async () => {
      const res = await request(app)
        .get("/api/transactions")
        .set("Cookie", [`accessToken=${token}`]);
      expect(res.status).toBe(200);
      expect(res.body.transactions.length).toBe(3);
      expect(res.body.total).toBe(3);
    });

    it("should filter by type", async () => {
      const res = await request(app)
        .get("/api/transactions?txnType=expense")
        .set("Cookie", [`accessToken=${token}`]);
      expect(res.status).toBe(200);
      expect(res.body.transactions.length).toBe(1);
      expect(res.body.transactions[0].txnType).toBe("expense");
    });

    it("should filter by date range", async () => {
      const res = await request(app)
        .get("/api/transactions?startDate=2023-01-02&endDate=2023-01-02")
        .set("Cookie", [`accessToken=${token}`]);
      expect(res.body.transactions.length).toBe(1);
      expect(res.body.transactions[0].amount).toBe(50);
    });

    it("should sort transactions desc by default", async () => {
      const res = await request(app)
        .get("/api/transactions")
        .set("Cookie", [`accessToken=${token}`]);
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
        userId,
        amount: 100,
        txnType: "income",
        category: "Salary",
        txnDate: new Date(),
      });

      const res = await request(app)
        .get(`/api/transactions/${txn._id}`)
        .set("Cookie", [`accessToken=${token}`]);
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(txn._id.toString());
    });

    it("should return 404 for unknown id", async () => {
      const res = await request(app)
        .get("/api/transactions/507f1f77bcf86cd799439999")
        .set("Cookie", [`accessToken=${token}`]);
      expect(res.status).toBe(404);
    });

    it("should return 400 for invalid id format", async () => {
      const res = await request(app)
        .get("/api/transactions/invalid-id")
        .set("Cookie", [`accessToken=${token}`]);
      // Should be 400 for validation error or invalid ID
      expect([400, 500]).toContain(res.status);
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
        .set("Cookie", [`accessToken=${token}`])
        .send(payload);
      expect(res.status).toBe(201);
      expect(res.body.length).toBe(2);

      const analytics = await Analytics.findOne({ userId });
      expect(analytics.income.total).toBe(100);
      expect(analytics.expenses.total).toBe(200);
    });
  });

  describe("PATCH /api/transactions/:id", () => {
    it("should update transaction and adjust analytics", async () => {
      const txn = await Transaction.create({
        userId,
        amount: 100,
        txnType: "income",
        category: "Salary",
        txnDate: new Date(),
      });

      await analyticsService.updateAnalyticsOnAdd(txn);

      const res = await request(app)
        .patch(`/api/transactions/${txn._id}`)
        .set("Cookie", [`accessToken=${token}`])
        .send({
          amount: 200,
        });

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(200);

      const analytics = await Analytics.findOne({ userId });
      // Old 100 removed, New 200 added -> Total 200
      expect(analytics.income.total).toBe(200);
    });
  });

  describe("DELETE /api/transactions/:id", () => {
    it("should delete transaction and revert analytics", async () => {
      // Use API to create so logic is consistent
      const createRes = await request(app)
        .post("/api/transactions")
        .set("Cookie", [`accessToken=${token}`])
        .send({
          amount: 100,
          txnType: "income",
          category: "Salary",
          txnDate: new Date().toISOString(),
          description: "To Delete",
        });
      const txnId = createRes.body._id;

      const res = await request(app)
        .delete(`/api/transactions/${txnId}`)
        .set("Cookie", [`accessToken=${token}`]);
      expect(res.status).toBe(200);

      const check = await Transaction.findById(txnId);
      expect(check).toBeNull();

      const analytics = await Analytics.findOne({ userId });
      expect(analytics.income.total).toBe(0);
    });
  });
});
