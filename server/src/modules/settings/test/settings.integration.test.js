const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const cookieParser = require("cookie-parser");
const { settingsRouter } = require("../settings.routes");
const { errorHandler } = require("../../../middleware/errorHandler.middleware");
const { User } = require("../../user/user.model");
const { Settings } = require("../settings.model");

// Mock validateToken middleware
jest.mock("../../../middleware/validateToken.middleware", () => ({
  validateToken: async (req, res, next) => {
    if (!req.cookies.accessToken) {
      const error = new Error("Missing token");
      error.statusCode = 401;
      error.errorCode = 1202; // AuthErrors.MISSING_TOKEN
      return next(error);
    }

    // Simulate user found
    req.user = { id: "507f1f77bcf86cd799439011" }; // Valid ObjectID
    next();
  },
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/settings", settingsRouter);
app.use(errorHandler);

describe("Settings Integration", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Settings.deleteMany({});
  });

  describe("GET /api/settings", () => {
    it("should return settings for authenticated user", async () => {
      // Pre-seed settings
      await Settings.create({
        userId: "507f1f77bcf86cd799439011",
        transactionSettings: {
          categories: [{ txnType: "income", category: "PreSeeded" }],
        },
      });

      const res = await request(app)
        .get("/api/settings")
        .set("Cookie", ["accessToken=valid"]);

      expect(res.status).toBe(200);
      expect(res.body.transactionSettings.categories).toHaveLength(1);
      expect(res.body.transactionSettings.categories[0]).toMatchObject({
        txnType: "income",
        category: "PreSeeded",
      });
      expect(res.body.userId).toBe("507f1f77bcf86cd799439011");
    });

    it("should return default settings if none exist", async () => {
      const res = await request(app)
        .get("/api/settings")
        .set("Cookie", ["accessToken=valid"]);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe("507f1f77bcf86cd799439011");
      expect(res.body.transactionSettings.categories).toEqual([]);
    });

    it("should fail 401 if unauthenticated", async () => {
      const res = await request(app).get("/api/settings");
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/settings", () => {
    it("should update settings successfully", async () => {
      const updateData = {
        transactionSettings: {
          categories: [
            { txnType: "expense", category: "Food" },
            { txnType: "expense", category: "Travel" },
          ],
        },
        importTransactionSettings: {
          preProcess: { foo: "bar" },
        },
      };

      const res = await request(app)
        .put("/api/settings")
        .set("Cookie", ["accessToken=valid"])
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.transactionSettings.categories).toHaveLength(2);
      expect(res.body.transactionSettings.categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ txnType: "expense", category: "Food" }),
          expect.objectContaining({ txnType: "expense", category: "Travel" }),
        ])
      );
      expect(res.body.importTransactionSettings.preProcess).toEqual({
        foo: "bar",
      });
    });

    it("should perform upsert if settings do not exist", async () => {
      const updateData = {
        transactionSettings: {
          categories: [{ txnType: "income", category: "New" }],
        },
      };

      const res = await request(app)
        .put("/api/settings")
        .set("Cookie", ["accessToken=valid"])
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe("507f1f77bcf86cd799439011");
      expect(res.body.transactionSettings.categories).toHaveLength(1);
      expect(res.body.transactionSettings.categories[0]).toMatchObject({
        txnType: "income",
        category: "New",
      });
    });
  });
});
