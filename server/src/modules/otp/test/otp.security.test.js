const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { otpRouter } = require("../otp.routes");
const { errorHandler } = require("../../../middleware/errorHandler.middleware");
const { AuthErrors } = require("../../../errors/authErrors");

// 1. Mock env to force NODE_ENV=development BEFORE importing routes
jest.mock("../../../config/env", () => {
  const original = jest.requireActual("../../../config/env");
  return {
    ...original,
    env: {
      ...original.env,
      NODE_ENV: "development",
    },
  };
});

// Mock ioredis
jest.mock("ioredis", () => require("ioredis-mock"));

// Mock email service
jest.mock("../../../lib/notification/email/email.service", () => ({
  emailService: {
    sendEmailWithHtml: jest.fn().mockResolvedValue(true),
  },
}));


const app = express();
app.use(express.json());
app.use("/api/otp", otpRouter);
app.use(errorHandler);

const OTP_PREFIX = "otp:";

describe("OTP Security & Logic Tests", () => {
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
    const { User } = require("../../user/user.model");

    jest.clearAllMocks();
    const Redis = require("ioredis-mock");
    new Redis().flushall();

    await User.deleteMany({});

    await User.create({
      name: "Test User",
      email: "security@example.com",
      verified: false,
      country: "IN",
    });
  });

  describe("Verification Security", () => {
    it("should reject expired OTP (key missing)", async () => {
      const res = await request(app).post("/api/otp/verify").send({
        to: "security@example.com",
        otp: "123456",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(AuthErrors.OTP_INVALID.message);
    });

    it("should reject invalid OTP", async () => {
      const bcrypt = require("bcrypt");
      const hashedOtp = await bcrypt.hash("123456", 10);

      const Redis = require("ioredis-mock");
      const client = new Redis();
      await client.set(
        `${OTP_PREFIX}security@example.com`,
        JSON.stringify({
          otp: hashedOtp,
          notificationType: "email",
        })
      );

      const res = await request(app).post("/api/otp/verify").send({
        to: "security@example.com",
        otp: "000000", // Wrong code
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(AuthErrors.OTP_INVALID.message);
    });
  });

  describe("Rate Limiting", () => {
    it("should limit OTP requests after threshold", async () => {
      const to = "security@example.com";
      const notificationType = "email";

      // Limit is 3 requests per hour
      // Send 3 requests
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/api/otp/send")
          .send({ to, notificationType })
          .expect(200);
      }

      // 4th request should fail
      const res = await request(app)
        .post("/api/otp/send")
        .send({ to, notificationType });

      expect(res.status).toBe(429);
      expect(res.body.message).toMatch(/Too many OTP requests/i);
    });
  });
});
