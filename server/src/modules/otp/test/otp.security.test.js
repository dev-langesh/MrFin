const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { otpRouter } = require("../otp.routes");
const { errorHandler } = require("../../../middleware/errorHandler.middleware");
const { redisService } = require("../../../lib/redis/redis.service");
const { config } = require("../../../config/constants");
const { AuthErrors } = require("../../../errors/authErrors");

// Mock email service
jest.mock("../../../lib/notification/email/email.service", () => ({
  emailService: {
    sendEmailWithHtml: jest.fn().mockResolvedValue(true),
  },
}));

// Mock Redis Service
jest.mock("../../../lib/redis/redis.service", () => ({
  redisService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    connect: jest.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use("/api/otp", otpRouter);
app.use(errorHandler);

const OTP_PREFIX = "otp:";
const OTP_ATTEMPTS_PREFIX = "otp_attempts:";

describe("OTP Security & Logic Tests", () => {
  let mongoServer;
  let redisStore = {};

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

    redisStore = {};
    jest.clearAllMocks();

    redisService.get.mockImplementation((key) =>
      Promise.resolve(redisStore[key] || null)
    );
    redisService.set.mockImplementation((key, val) => {
      redisStore[key] = val;
      return Promise.resolve("OK");
    });
    redisService.del.mockImplementation((key) => {
      delete redisStore[key];
      return Promise.resolve(1);
    });

    await User.deleteMany({});

    await User.create({
      name: "Test User",
      email: "security@example.com",
      verified: false,
      country: "IN",
    });
  });

  describe("Rate Limiting & Cooldowns", () => {
    it("should prevent excessive resends (Cooldown)", async () => {
      // 1. First Send
      await request(app)
        .post("/api/otp/send")
        .send({
          to: "security@example.com",
          notificationType: "email",
        })
        .expect(200);

      // 2. Immediate Second Send (Should fail)
      const res = await request(app).post("/api/otp/send").send({
        to: "security@example.com",
        notificationType: "email",
      });

      expect(res.status).toBe(429);
      expect(res.body.message).toContain(
        AuthErrors.OTP_RESEND_COOLDOWN.message
      );
    });

    it("should allow request after cooldown period", async () => {
      redisStore[`${OTP_ATTEMPTS_PREFIX}security@example.com`] = {
        attempts: 1,
        lastAttempt: Date.now() - config.otp.resendCooldown - 5000,
      };

      const res = await request(app).post("/api/otp/send").send({
        to: "security@example.com",
        notificationType: "email",
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("OTP sent successfully");
    });

    it("should enforce max attempts limit", async () => {
      redisStore[`${OTP_ATTEMPTS_PREFIX}security@example.com`] = {
        attempts: config.otp.maxAttempts,
        lastAttempt: Date.now(),
      };

      const res = await request(app).post("/api/otp/send").send({
        to: "security@example.com",
        notificationType: "email",
      });

      expect(res.status).toBe(429);
      expect(res.body.message).toContain(
        AuthErrors.MAX_OTP_ATTEMPTS_REACHED.message
      );
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

    it("should reject bruteforce attempts/invalid OTP", async () => {
      const bcrypt = require("bcrypt");
      const hashedOtp = await bcrypt.hash("123456", 10);

      redisStore[`${OTP_PREFIX}security@example.com`] = {
        otp: hashedOtp,
        notificationType: "email",
      };

      const res = await request(app).post("/api/otp/verify").send({
        to: "security@example.com",
        otp: "000000", // Wrong code
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(AuthErrors.OTP_INVALID.message);
    });
  });
});
