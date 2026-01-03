const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { otpRouter } = require("../otp.routes");
const { errorHandler } = require("../../../middleware/errorHandler.middleware");
const { Otp } = require("../otp.model");
const { config } = require("../../../config/constants");
const { AuthErrors } = require("../../../errors/authErrors");

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
    await Otp.deleteMany({});
    await User.deleteMany({}); // Clear users before creating new one

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

      expect(res.status).toBe(429); // Assuming mapError maps OTP_RESEND_COOLDOWN to 429, otherwise check error message
      expect(res.body.message).toContain(
        AuthErrors.OTP_RESEND_COOLDOWN.message
      );
    });

    it("should enforce max attempts limit", async () => {
      // Manually create record near limit
      await Otp.create({
        to: "security@example.com",
        otp: "hashed",
        attempts: config.otp.maxAttempts,
        lastAttempt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        notificationType: "email",
      });

      const res = await request(app).post("/api/otp/send").send({
        to: "security@example.com",
        notificationType: "email",
      });

      expect(res.status).toBe(429); // Or 400 depending on mapping
      expect(res.body.message).toContain(
        AuthErrors.MAX_OTP_ATTEMPTS_REACHED.message
      );
    });
  });

  describe("Verification Security", () => {
    it("should reject expired OTP", async () => {
      const bcrypt = require("bcrypt");
      const hashedOtp = await bcrypt.hash("123456", 10);

      await Otp.create({
        to: "security@example.com",
        otp: hashedOtp,
        expiresAt: new Date(Date.now() - 5000), // Expired
        notificationType: "email",
      });

      const res = await request(app).post("/api/otp/verify").send({
        to: "security@example.com",
        otp: "123456",
      });

      expect(res.status).toBe(410); // OTP_EXPIRED is 410
      expect(res.body.message).toBe(AuthErrors.OTP_EXPIRED.message);
    });

    it("should reject bruteforce attempts/invalid OTP", async () => {
      const bcrypt = require("bcrypt");
      const hashedOtp = await bcrypt.hash("123456", 10);
      await Otp.create({
        to: "security@example.com",
        otp: hashedOtp,
        expiresAt: new Date(Date.now() + 60000),
        notificationType: "email",
      });

      const res = await request(app).post("/api/otp/verify").send({
        to: "security@example.com",
        otp: "000000", // Wrong code
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(AuthErrors.OTP_INVALID.message);
    });
  });
});
