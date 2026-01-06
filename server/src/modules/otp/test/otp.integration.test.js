const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { otpRouter } = require("../otp.routes");
const { errorHandler } = require("../../../middleware/errorHandler.middleware");
const { redisService } = require("../../../lib/redis/redis.service");
const { config } = require("../../../config/constants");

// Mock email service
jest.mock("../../../lib/notification/email/email.service", () => ({
  emailService: {
    sendEmailWithHtml: jest.fn().mockResolvedValue(true),
  },
}));

// Mock ioredis
jest.mock("ioredis", () => require("ioredis-mock"));

const app = express();
app.use(express.json());
app.use("/api/otp", otpRouter);
app.use(errorHandler);

const OTP_PREFIX = "otp:";

describe("OTP Integration", () => {
  let mongoServer;
  let redisStore = {};

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
    const { User } = require("../../user/user.model");

    jest.clearAllMocks();
    const Redis = require("ioredis-mock");
    new Redis().flushall();

    await User.deleteMany({});
  });

  describe("POST /api/otp/send", () => {
    beforeEach(async () => {
      const { User } = require("../../user/user.model");
      await User.create({
        name: "Test User",
        email: "test@example.com",
        verified: false,
        country: "IN",
      });
    });

    it("should send otp via email", async () => {
      const res = await request(app).post("/api/otp/send").send({
        to: "test@example.com",
        notificationType: "email",
        template: "otp",
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("OTP sent successfully");

      const Redis = require("ioredis-mock");
      const client = new Redis();
      const otpVal = await client.get(`${OTP_PREFIX}test@example.com`);
      expect(otpVal).toBeDefined();
    });

    it("should fail with invalid input", async () => {
      const res = await request(app).post("/api/otp/send").send({
        to: "", // Invalid
        notificationType: "email",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/otp/verify", () => {
    beforeEach(async () => {
      const bcrypt = require("bcrypt");
      const hashedOtp = await bcrypt.hash("123456", 10);

      const Redis = require("ioredis-mock");
      const client = new Redis();
      // redisService stringifies objects, so we should store it properly if we were using it directly
      // But here we want to PRE-POPULATE redis. Since we are using ioredis-mock, we can verify by using the service or client.
      // But to populate, we can use the client.

      // IMPORTANT: The real service stringifies values unless raw.
      // The service method 'saveOtp' calls set with stringify=true.
      // So to match what verifyOtp expects, we should store a JSON string?
      // verifyOtp calls getOtp(..., true) which parses it.
      // So yes, we should store JSON string.

      await client.set(
        `${OTP_PREFIX}test@example.com`,
        JSON.stringify({
          otp: hashedOtp,
          notificationType: "email",
        })
      );
    });

    it("should verify otp and return verification token", async () => {
      const res = await request(app).post("/api/otp/verify").send({
        to: "test@example.com",
        otp: "123456",
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("OTP verified successfully");
      expect(res.body.token).toBeDefined();

      const jwt = require("jsonwebtoken");
      const decoded = jwt.decode(res.body.token);
      expect(decoded.purpose).toBe("otp-verification");
      expect(decoded.verified).toBe(true);
      expect(decoded.to).toBe("test@example.com");
    });

    it("should fail with invalid otp", async () => {
      const res = await request(app).post("/api/otp/verify").send({
        to: "test@example.com",
        otp: "654321",
      });
      expect(res.status).toBe(400);
    });
  });
});
