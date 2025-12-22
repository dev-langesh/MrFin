const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { app } = require("../../../app");
const { tokenService } = require("../../../lib/jwt/token.service");
const { userService } = require("../../user/user.service");

describe("Analytics Input Validation Exhaustive Suite", () => {
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

  const expect400 = async (promise) => {
    const res = await promise;
    if (res.status !== 400) {
      console.log(
        `[DEBUG] Expected 400, got ${res.status}. Body:`,
        JSON.stringify(res.body, null, 2)
      );
    }
    expect(res.status).toBe(400);
    expect(res.body.validationErrors).toBeDefined();
  };

  describe("GET /api/analytics/time-series", () => {
    // Schema: startDate (date), endDate (date), allTime (enum: true, false)
    // Refine: startDate <= endDate
    // Strict mode

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

    test.each([
      ["invalid startDate", { startDate: "not-a-date" }],
      ["invalid endDate", { endDate: "bad-date" }],
      [
        "startDate > endDate",
        { startDate: "2023-12-31", endDate: "2023-01-01" },
      ],
      ["invalid allTime enum", { allTime: "yes" }],
      ["unknown param", { unknown: "1" }],
    ])("should return 400 when %s", async (_, query) => {
      await expect400(
        request(app)
          .get("/api/analytics/time-series")
          .set("Cookie", [`accessToken=${token}`])
          .query(query)
      );
    });
  });

  describe("GET /api/analytics/distribution", () => {
    // Schema: startDate, endDate, txnType, allTime
    // Strict mode, same date refine logic

    it("should accept valid txnType", async () => {
      await request(app)
        .get("/api/analytics/distribution")
        .set("Cookie", [`accessToken=${token}`])
        .query({ txnType: "income" })
        .expect(200);
    });

    test.each([
      ["invalid txnType", { txnType: "invalid_type_enum" }],
      ["invalid startDate", { startDate: "bad" }],
      [
        "startDate > endDate",
        { startDate: "2025-01-01", endDate: "2024-01-01" },
      ],
      ["unknown param", { extra: "field" }],
    ])("should return 400 when %s", async (_, query) => {
      await expect400(
        request(app)
          .get("/api/analytics/distribution")
          .set("Cookie", [`accessToken=${token}`])
          .query(query)
      );
    });
  });
});
