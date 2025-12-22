const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { app } = require("../../../app"); // Use global app
const { Analytics } = require("../analytics.model");
const { userService } = require("../../user/user.service");
const { tokenService } = require("../../../lib/jwt/token.service");
const { User } = require("../../user/user.model");

describe("Analytics Integration", () => {
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
    await Analytics.deleteMany({});
    await User.deleteMany({});

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
});
