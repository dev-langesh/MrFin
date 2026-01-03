const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { otpRouter } = require("../otp.routes");
const { errorHandler } = require("../../../middleware/errorHandler.middleware");
const { Otp } = require("../otp.model");
const { config } = require("../../../config/constants");

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

describe("OTP Integration", () => {
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
    const { User } = require("../../user/user.model");
    await Otp.deleteMany({});
    await User.deleteMany({});
  });

  describe("POST /api/otp/send", () => {
    beforeEach(async () => {
      // Create user for email check
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

      const otp = await Otp.findOne({ to: "test@example.com" });
      expect(otp).toBeTruthy();
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
      await Otp.create({
        to: "test@example.com",
        otp: hashedOtp,
        expiresAt: new Date(Date.now() + 10000),
        notificationType: "email",
      });
    });

    it("should verify otp and return verification token", async () => {
      const res = await request(app).post("/api/otp/verify").send({
        to: "test@example.com",
        otp: "123456",
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("OTP verified successfully");
      expect(res.body.token).toBeDefined();

      // Verify token structure/validity if possible, or assume tokenService works
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
      expect(res.status).toBe(400); // 400 or 401 depending on error mapping, AppError usually maps specific codes
    });
  });
});
