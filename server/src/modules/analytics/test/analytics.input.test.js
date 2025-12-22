const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { app } = require("../../../app");
const { tokenService } = require("../../../lib/jwt/token.service");
const { userService } = require("../../user/user.service");
const { User } = require("../../user/user.model");

describe("Analytics Input Validation", () => {
  let mongoServer;
  let user;
  let token;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    user = await userService.createUser({
      username: "inputUser",
      name: "Input Test",
      email: "input@test.com",
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

  describe("GET /api/analytics/time-series", () => {
    it("should accept valid query params", async () => {
      await request(app)
        .get("/api/analytics/time-series")
        .set("Cookie", [`accessToken=${token}`])
        .query({
          startDate: "2023-01-01",
          endDate: "2023-12-31",
          allTime: "false",
        })
        .expect(200);
    });

    it("should reject invalid date format", async () => {
      const res = await request(app)
        .get("/api/analytics/time-series")
        .set("Cookie", [`accessToken=${token}`])
        .query({ startDate: "not-a-date" });

      expect(res.status).toBe(400);
      expect(res.body.validationErrors[0]).toMatch(/Invalid date format/);
    });

    it("should reject if startDate > endDate", async () => {
      const res = await request(app)
        .get("/api/analytics/time-series")
        .set("Cookie", [`accessToken=${token}`])
        .query({
          startDate: "2023-12-31",
          endDate: "2023-01-01",
        });

      expect(res.status).toBe(400);
      expect(res.body.validationErrors[0]).toMatch(
        /startDate must be before or equal to endDate/
      );
    });

    it("should reject unknown query parameters (Strict Mode)", async () => {
      const res = await request(app)
        .get("/api/analytics/time-series")
        .set("Cookie", [`accessToken=${token}`])
        .query({ unknownParam: "malicious" });

      expect(res.status).toBe(400);
      expect(res.body.validationErrors[0]).toContain("Unrecognized key");
    });

    it("should reject invalid allTime boolean string", async () => {
      const res = await request(app)
        .get("/api/analytics/time-series")
        .set("Cookie", [`accessToken=${token}`])
        .query({ allTime: "yes" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/analytics/distribution", () => {
    it("should accept valid txnType", async () => {
      await request(app)
        .get("/api/analytics/distribution")
        .set("Cookie", [`accessToken=${token}`])
        .query({ txnType: "income" })
        .expect(200);
    });

    it("should reject invalid txnType", async () => {
      const res = await request(app)
        .get("/api/analytics/distribution")
        .set("Cookie", [`accessToken=${token}`])
        .query({ txnType: "invalidType" });

      expect(res.status).toBe(400);
      expect(res.body.validationErrors[0]).toContain("Invalid enum value");
    });

    it("should enforce strict query params", async () => {
      const res = await request(app)
        .get("/api/analytics/distribution")
        .set("Cookie", [`accessToken=${token}`])
        .query({ extra: "field" });

      expect(res.status).toBe(400);
    });
  });
});
