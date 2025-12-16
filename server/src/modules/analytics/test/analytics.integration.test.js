const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { analyticsRouter } = require("../analytics.routes");
const { errorHandler } = require("../../../middleware/errorHandler.middleware");
const { Analytics } = require("../analytics.model");

// Mock validateToken
jest.mock("../../../middleware/validateToken.middleware", () => ({
  validateToken: (req, res, next) => {
    req.user = {
      id: "507f1f77bcf86cd799439011",
      _id: "507f1f77bcf86cd799439011",
    };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use("/api/analytics", analyticsRouter);
app.use(errorHandler);

describe("Analytics Integration", () => {
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
    await Analytics.deleteMany({});
  });

  describe("GET /api/analytics", () => {
    it("should return analytics for the user", async () => {
      await Analytics.create({
        userId: "507f1f77bcf86cd799439011",
        income: { total: 500, month: 100 },
        expenses: { total: 200, month: 50 },
      });

      const res = await request(app).get("/api/analytics");
      expect(res.status).toBe(200);
      expect(res.body.userId).toBe("507f1f77bcf86cd799439011");
      expect(res.body.income.total).toBe(500);
    });

    it("should return 404/500 if analytics not found", async () => {
      // Service throws NOT_FOUND which is mapped to error code.
      const res = await request(app).get("/api/analytics");
      expect(res.status).not.toBe(200);
    });
  });
});
