const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { app } = require("../../../app");
const { tokenService } = require("../../../lib/jwt/token.service");
const { userService } = require("../../user/user.service");
const { User } = require("../../user/user.model");
const { Analytics } = require("../analytics.model");
const { DailyAnalytics } = require("../dailyAnalytics.model");
const { MonthlyAnalytics } = require("../monthlyAnalytics.model");

describe("Analytics Security Suite", () => {
  let mongoServer;
  let user;
  let token;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    user = await userService.createUser({
      username: "secUser",
      name: "Security Test",
      email: "sec@test.com",
      password: "password123",
      country: "US",
    });
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

  describe("Authentication Enforcement", () => {
    const endpoints = [
      "/api/analytics",
      "/api/analytics/time-series",
      "/api/analytics/distribution",
    ];

    endpoints.forEach((endpoint) => {
      it(`should require authentication for ${endpoint}`, async () => {
        await request(app).get(endpoint).expect(401);
      });

      it(`should reject invalid token for ${endpoint}`, async () => {
        await request(app)
          .get(endpoint)
          .set("Cookie", ["accessToken=invalidtoken"])
          .expect(401);
      });
    });
  });

  describe("Injection Protection", () => {
    it("should block NoSQL injection in txnType parameter", async () => {
      const res = await request(app)
        .get("/api/analytics/distribution")
        .set("Cookie", [`accessToken=${token}`])
        .query({ "txnType[$ne]": "income" });

      expect(res.status).toBe(400);
    });

    it("should block NoSQL injection in date parameters", async () => {
      const res = await request(app)
        .get("/api/analytics/time-series")
        .set("Cookie", [`accessToken=${token}`])
        .query({ "startDate[$gt]": "2020" });

      expect(res.status).toBe(400);
    });

    it("should handle Prototype Pollution attempts by sanitizing", async () => {
      const res = await request(app)
        .get("/api/analytics/distribution")
        .set("Cookie", [`accessToken=${token}`])
        .query({ "__proto__.polluted": "true" });

      expect(res.status).toBe(200);
    });
  });

  describe("Rate Limiting & Headers", () => {
    it("should have secure headers", async () => {
      const res = await request(app)
        .get("/api/analytics")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      // expect(res.headers["x-frame-options"]).toBe("DENY"); // If helmet configured
    });
  });
  describe("Broken Access Control", () => {
    let victim;
    const victimData = {
      income: 1000,
      expense: 500,
    };

    beforeAll(async () => {
      // Create victim user
      victim = await userService.createUser({
        username: "victimUser",
        name: "Victim User",
        email: "victim@test.com",
        password: "password123",
        country: "US",
      });

      // Seed victim data
      await DailyAnalytics.create({
        userId: victim._id,
        date: new Date(),
        totals: {
          income: victimData.income,
          expense: victimData.expense,
        },
        incomeCategories: { Salary: victimData.income },
      });

      await Analytics.create({
        userId: victim._id,
        income: { total: victimData.income, month: victimData.income },
        expenses: { total: victimData.expense, month: victimData.expense },
      });
    });

    it("should preventing accessing another user's analytics summary", async () => {
      const res = await request(app)
        .get("/api/analytics")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      // Should return attacker's data (which is empty/zero), not victim's
      expect(res.body.userId).toBe(user._id.toString());
      expect(res.body.income.total).toBe(0);
      expect(res.body.userId).not.toBe(victim._id.toString());
    });

    it("should prevent accessing another user's time-series data", async () => {
      const res = await request(app)
        .get("/api/analytics/time-series")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      // Should result in empty array for attacker (assuming attacker has no data)
      // or at least NOT contain victim's data
      const victimDataFound = res.body.find(
        (item) => item.userId === victim._id.toString()
      );
      expect(victimDataFound).toBeUndefined();

      // If attacker has no data, body should be empty array
      if (res.body.length > 0) {
        res.body.forEach((item) => {
          // Depending on implementation, userId might not be in response body,
          // but if it is, it must not match victim.
          if (item.userId) {
            expect(item.userId).not.toBe(victim._id.toString());
          }
        });
      } else {
        expect(res.body).toEqual([]);
      }
    });

    it("should prevent accessing another user's distribution data", async () => {
      const res = await request(app)
        .get("/api/analytics/distribution")
        .set("Cookie", [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      // Distribution aggregates data. We expect 0/empty for attacker.
      // If victim has 500 expense, attacker should see 0.
      const totalValue = res.body.reduce((acc, curr) => acc + curr.value, 0);
      expect(totalValue).toBe(0);
    });
  });
});
