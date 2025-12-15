const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const cookieParser = require("cookie-parser");
const { authRouter } = require("../auth.routes");
const { errorHandler } = require("../../../middleware/errorHandler.middleware");
const { User } = require("../../user/user.model");
const { Otp } = require("../../otp/otp.model");
const { getGoogleUser } = require("../utils/googleAuth");

jest.mock("../utils/googleAuth", () => ({
  getGoogleUser: jest.fn().mockResolvedValue({
    googleId: "google123",
    email: "google@example.com",
    name: "Google User",
    picture: "pic.jpg",
  }),
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use(errorHandler);

describe("Auth Integration", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    getGoogleUser.mockResolvedValue({
      googleId: "google123",
      email: "google@example.com",
      name: "Google User",
      picture: "pic.jpg",
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Otp.deleteMany({});

    getGoogleUser.mockResolvedValue({
      googleId: "google123",
      email: "google@example.com",
      name: "Google User",
      picture: "pic.jpg",
    });
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "Password123!",
      });

      expect(res.status).toBe(201);

      const user = await User.findOne({ email: "test@example.com" });
      expect(user).toBeTruthy();
      expect(user.verified).toBe(false); // Should be false initially
    });

    it("should return 400 for invalid input", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "invalid-email",
        password: "Password123!",
      });
      expect(res.status).toBe(400); // validation error
    });

    it("should return 409 if user already exists", async () => {
      await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "Password123!",
        verified: true,
      });

      const res = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "Password123!",
      });

      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Create a verified user
      const hashedPassword = "$2b$10$hashedpassword"; // Mock or use bcrypt in tests but prefer seed
      // Using simple setup helper might be better but inline is explicit
      // We need to use service to hash password or mock bcrypt?
      // Integration test should ideally use real bcrypt.
      // Let's create user via register then update verification

      await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "Password123!",
      });

      await User.updateOne({ email: "test@example.com" }, { verified: true });
    });

    it("should login successfully", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "Password123!",
      });

      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.body.message).toBe("User logged in successfully");
    });

    it("should fail for wrong password", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "WrongPassword!",
      });
      expect(res.status).toBe(401);
    });

    it("should fail if user not verified", async () => {
      await User.updateOne({ email: "test@example.com" }, { verified: false });

      const res = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "Password123!",
      });
      expect(res.status).toBe(403);
    });
  });

  // Testing OTP endpoints here as well for integrated flow
  describe("POST /api/auth/send-otp", () => {
    beforeEach(async () => {
      await User.create({
        name: "Test User",
        email: "test@example.com",
        verified: true,
      });
    });

    it("should send otp", async () => {
      const res = await request(app).post("/api/auth/send-otp").send({
        to: "test@example.com",
        notificationType: "email",
        template: "otp",
      });

      expect(res.status).toBe(200);

      const otp = await Otp.findOne({ to: "test@example.com" });
      expect(otp).toBeTruthy();
    });
  });
  describe("POST /api/auth/verify-otp", () => {
    beforeEach(async () => {
      // Create user
      await User.create({
        name: "Test User",
        email: "test@example.com",
        verified: false,
      });
      // Create OTP
      await Otp.create({
        to: "test@example.com",
        otp: "$2b$10$hashedotp",
        expiresAt: new Date(Date.now() + 10000),
        notificationType: "email",
      });
    });

    it("should verify otp and return tokens", async () => {
      const bcrypt = require("bcrypt");
      const hashedOtp = await bcrypt.hash("123456", 10);
      await Otp.updateOne({ to: "test@example.com" }, { otp: hashedOtp });

      const res = await request(app).post("/api/auth/verify-otp").send({
        to: "test@example.com",
        otp: "123456",
      });

      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();

      // Check if user is verified
      const user = await User.findOne({ email: "test@example.com" });
      expect(user.verified).toBe(true);
    });
  });

  describe("POST /api/auth/rotate-tokens", () => {
    let refreshToken;

    beforeEach(async () => {
      // Register and login to get tokens
      await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "Password123!",
      });
      await User.updateOne({ email: "test@example.com" }, { verified: true });

      const res = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "Password123!",
      });

      // Extract refresh token from cookies
      const cookies = res.headers["set-cookie"];
      const refreshTokenCookie = cookies.find((c) =>
        c.startsWith("refreshToken=")
      );
      refreshToken = refreshTokenCookie.split(";")[0].split("=")[1];
    });

    it("should rotate tokens with valid refresh token", async () => {
      const res = await request(app)
        .post("/api/auth/rotate-tokens")
        .set("Cookie", [`refreshToken=${refreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should fail without refresh token", async () => {
      const res = await request(app).post("/api/auth/rotate-tokens");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should clear cookies", async () => {
      const res = await request(app).post("/api/auth/logout");
      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
      // Check if cookies are expired/cleared
      const cookies = res.headers["set-cookie"];
      cookies.forEach((cookie) => {
        expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970 00:00:00 GMT/);
      });
    });
  });

  describe("GET /api/auth/status", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "Password123!",
      });
      await User.updateOne({ email: "test@example.com" }, { verified: true });
    });

    it("should return user status if authenticated", async () => {
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "Password123!",
      });
      const cookies = loginRes.headers["set-cookie"];

      const res = await request(app)
        .get("/api/auth/status")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("test@example.com");
    });

    it("should return 401 if missing token with correct error code", async () => {
      const res = await request(app).get("/api/auth/status");
      expect(res.status).toBe(401);

      // Error: MISSING_TOKEN (1202) - Assuming validateToken throws MISSING_TOKEN
      // Wait, let's check validateToken middleware logic. It might throw MISSING_TOKEN.
      expect(res.body.errorCode).toBe(1202);
    });

    it("should return 401 if access token expired", async () => {
      // Create user to get ID
      const user = await User.findOne({ email: "test@example.com" });
      const jwt = require("jsonwebtoken");
      const { env } = require("../../../config/env");

      // Generate expired access token
      const expiredAccessToken = jwt.sign(
        { userId: user._id, role: user.role, tokenType: "access" },
        env.ACCESS_TOKEN_SECRET,
        { expiresIn: "-1s" } // Expired 1s ago
      );

      // Just send access token, assuming refresh token logic might auto-refresh?
      // If we send ONLY expired access token, validateToken tries to refresh if refresh token present.
      // If NO refresh token, it should fail with ACCESS_TOKEN_EXPIRED (1201).

      const res = await request(app)
        .get("/api/auth/status")
        .set("Cookie", [`accessToken=${expiredAccessToken}`]);

      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe(1201); // ACCESS_TOKEN_EXPIRED
    });

    it("should return 401 if token is invalid", async () => {
      const res = await request(app)
        .get("/api/auth/status")
        .set("Cookie", ["accessToken=invalidtoken"]);

      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe(1203); // INVALID_TOKEN
    });
  });

  describe("POST /api/auth/login/google", () => {
    it("should login with google mock", async () => {
      const res = await request(app).post("/api/auth/login/google").send({
        code: "valid_google_code",
      });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("google@example.com");
    });
  });

  describe("Password Reset Flow", () => {
    beforeEach(async () => {
      await User.create({
        name: "Test User",
        email: "test@example.com",
        password: "OldPassword123",
        verified: true,
      });

      // Seed OTP
      const bcrypt = require("bcrypt");
      const hashedOtp = await bcrypt.hash("123456", 10);
      await Otp.create({
        to: "test@example.com",
        otp: hashedOtp,
        expiresAt: new Date(Date.now() + 10000),
        notificationType: "email",
      });
    });

    it("should verify otp for reset and return token", async () => {
      const res = await request(app)
        .post("/api/auth/verify-otp-reset-password")
        .send({
          to: "test@example.com",
          otp: "123456",
        });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it("should reset password with valid token", async () => {
      // Get reset token first
      const otpRes = await request(app)
        .post("/api/auth/verify-otp-reset-password")
        .send({
          to: "test@example.com",
          otp: "123456",
        });
      const token = otpRes.body.token;

      const res = await request(app).post("/api/auth/reset-password").send({
        token,
        password: "NewPassword123!",
      });

      expect(res.status).toBe(200);

      // Verify new password works
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "NewPassword123!",
      });
      expect(loginRes.status).toBe(200);
    });
  });
});

jest.mock("../../../lib/notification/email/email.service", () => ({
  emailService: {
    sendEmailWithHtml: jest.fn().mockResolvedValue(true),
  },
}));
