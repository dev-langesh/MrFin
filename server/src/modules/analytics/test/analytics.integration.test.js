const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { app } = require("../../../app"); // Use global app
const { Analytics } = require("../analytics.model");
const { userService } = require("../../user/user.service");
const { tokenService } = require("../../../lib/jwt/token.service");
const { DailyAnalytics } = require("../dailyAnalytics.model");
const { MonthlyAnalytics } = require("../monthlyAnalytics.model");

describe("Analytics Integration", () => {
  let mongoServer;
  let user;
  let token;
  let userId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create a real user
    user = await userService.createUser({
      username: "analyticsUser",
      name: "Analytics Test User",
      email: "analytics@test.com",
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

  describe("GET /api/analytics", () => {
    it("should return analytics for the user", async () => {
      // Create existing analytics
      await Analytics.create({
        userId: user._id,
        income: { total: 500, month: 100 },
        expenses: { total: 200, month: 50 },
      });

      const res = await request(app)
        .get("/api/analytics")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(userId);
      expect(res.body.income.total).toBe(500);
    });

    it("should create and return 200 if analytics not found (lazy init)", async () => {
      // Service auto-creates if missing
      const res = await request(app)
        .get("/api/analytics")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("userId");
      expect(res.body.income.total).toBe(0);
    });
  });

  describe("GET /api/analytics/time-series", () => {
    beforeEach(async () => {
      // Seed Daily Data (Last 30 days usually)
      const now = new Date();
      // Normalize to UTC midnight to match service logic
      const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      );
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      await DailyAnalytics.create([
        {
          userId: user._id,
          date: today,
          totals: { income: 100, expense: 50, investment: 20 },
          incomeCategories: { Salary: 100 },
        },
        {
          userId: user._id,
          date: yesterday,
          totals: { income: 200, expense: 100, investment: 0 },
          expenseCategories: { Food: 100 },
        },
      ]);

      // Seed Monthly Data (for allTime checks)
      await MonthlyAnalytics.create({
        userId: user._id,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        totals: { income: 500, expense: 200, investment: 50 },
      });
    });

    it("should return daily data for default range (last 30 days)", async () => {
      const res = await request(app)
        .get("/api/analytics/time-series")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0]).toHaveProperty("totals.income");
    });

    it("should return monthly data if allTime=true", async () => {
      const res = await request(app)
        .get("/api/analytics/time-series")
        .set("Cookie", [`accessToken=${token}`])
        .query({ allTime: "true" });

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      // Monthly analytics structure check
      expect(res.body[0]).toHaveProperty("month");
      expect(res.body[0]).toHaveProperty("year");
    });

    it("should filter by date range", async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await request(app)
        .get("/api/analytics/time-series")
        .set("Cookie", [`accessToken=${token}`])
        .query({ startDate: today, endDate: today });

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1); // Only today's entry
    });
  });

  describe("GET /api/analytics/distribution", () => {
    beforeEach(async () => {
      // Seed Daily Data
      await DailyAnalytics.create({
        userId: user._id,
        date: new Date(),
        totals: { income: 100, expense: 150 },
        expenseCategories: { Food: 100, Transport: 50 },
        incomeCategories: { Salary: 100 },
      });
    });

    it("should return aggregated category distribution for expenses by default", async () => {
      const res = await request(app)
        .get("/api/analytics/distribution")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const food = res.body.find((i) => i.name === "Food");
      const transport = res.body.find((i) => i.name === "Transport");

      expect(food).toBeDefined();
      expect(food.value).toBe(100);
      expect(transport.value).toBe(50);
    });

    it("should return distribution for income when queried", async () => {
      const res = await request(app)
        .get("/api/analytics/distribution")
        .set("Cookie", [`accessToken=${token}`])
        .query({ txnType: "income" });

      expect(res.status).toBe(200);
      const salary = res.body.find((i) => i.name === "Salary");
      expect(salary.value).toBe(100);
    });
  });
});
