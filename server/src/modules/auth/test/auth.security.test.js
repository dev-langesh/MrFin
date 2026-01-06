const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { app } = require("../../../app");
const { User } = require("../../user/user.model");
const { tokenService } = require("../../../lib/jwt/token.service");

// 1. Mock env to force NODE_ENV=development (so rate limiting works)
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

// 2. Mock ioredis
jest.mock("ioredis", () => require("ioredis-mock"));

// Mock otp service
jest.mock("../../otp/otp.service", () => ({
  otpService: {
    sendOTP: jest.fn().mockResolvedValue(true),
    verifyOtp: jest.fn().mockResolvedValue(true),
  },
}));

describe("Auth Module Security Tests (OWASP)", () => {
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
    await User.deleteMany({});

    // Clear redis mock
    const Redis = require("ioredis-mock");
    new Redis().flushall();
  });

  describe("Injection Attacks", () => {
    it("should prevent NoSQL Injection in Login (Email)", async () => {
      // Create a user first
      await User.create({
        name: "Injection Target",
        email: "target@example.com",
        password: "Password123!",
        verified: true,
        country: "US",
      });

      // Attempt injection: Email $ne null (matches all documents)
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: { $ne: null },
          password: "Password123!",
        });

      expect(res.status).not.toBe(200);
      if (res.status === 400) {
        expect(res.body.validationErrors).toBeDefined();
      }
    });

    it("should prevent NoSQL Injection in Login (Password)", async () => {
      await User.create({
        name: "Injection Target",
        email: "target@example.com",
        password: "Password123!",
        verified: true,
        country: "US",
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "target@example.com",
          password: { $ne: null },
        });

      // Zod usually blocks this
      expect(res.status).toBe(400);
    });
  });

  describe("Mass Assignment / Parameter Tampering", () => {
    it("should ignore 'role' field during registration", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Attacker",
        email: "attacker@example.com",
        password: "Password123!",
        country: "US",
        role: "admin", // malicious attempt
      });

      expect(res.status).toBe(201);
      const user = await User.findOne({ email: "attacker@example.com" });
      expect(user).toBeDefined();
      expect(user.role).toBe("user"); // Should default to user
      expect(user.role).not.toBe("admin");
    });

    it("should ignore 'verified' field during registration", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Unverified Attacker",
        email: "unverified@example.com",
        password: "Password123!",
        country: "US",
        verified: true, // malicious attempt
      });

      expect(res.status).toBe(201);
      const user = await User.findOne({ email: "unverified@example.com" });
      expect(user.verified).toBe(false); // Should default to false
    });
  });

  describe("Sensitive Data Exposure", () => {
    it("should not return password hash in register response", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Sensitive Data",
        email: "sensitive@example.com",
        password: "Password123!",
        country: "US",
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it("should not return password hash in login response", async () => {
      // Register first
      await request(app).post("/api/auth/register").send({
        name: "Login User",
        email: "login@example.com",
        password: "Password123!",
        country: "US",
      });

      // Manually verify safely
      await User.updateOne({ email: "login@example.com" }, { verified: true });

      const res = await request(app).post("/api/auth/login").send({
        email: "login@example.com",
        password: "Password123!",
      });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
    });
  });

  describe("XSS Prevention (Persistent)", () => {
    it("should sanitize or allow HTML but not execute it (Storage Check)", async () => {
      const maliciousName = "<script>alert('xss')</script>User";

      const res = await request(app).post("/api/auth/register").send({
        name: maliciousName,
        email: "xss@example.com",
        password: "Password123!",
        country: "US",
      });

      expect(res.status).toBe(201);
      const user = await User.findOne({ email: "xss@example.com" });
      expect(user.name).toBe(maliciousName.trim());
    });
  });

  describe("Broken Authentication / Error Handling", () => {
    it("should return generic error message for invalid email", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "Password123!",
      });
      // Expect 401 Invalid Credentials (no enumeration)
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Check your credentials/i);
    });

    it("should return generic error message for invalid password", async () => {
      // Register user
      await request(app).post("/api/auth/register").send({
        name: "Valid User",
        email: "valid@example.com",
        password: "Password123!",
        country: "US",
      });

      await User.updateOne({ email: "valid@example.com" }, { verified: true });

      const res = await request(app).post("/api/auth/login").send({
        email: "valid@example.com",
        password: "WrongPassword!",
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Check your credentials/i);
    });
  });

  describe("Rate Limiting", () => {
    it("should limit login attempts after threshold exceeded", async () => {
      const email = "rate-limit@example.com";
      const password = "Password123!";

      // Consume 20 attempts
      const attempts = [];
      for (let i = 0; i < 20; i++) {
        attempts.push(
          request(app).post("/api/auth/login").send({ email, password })
        );
      }
      await Promise.all(attempts);

      // 21st attempt should fail with 429
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password });

      expect(res.status).toBe(429);
      expect(res.body.message).toMatch(/Too many login\/register attempts/i);
    });
  });
});
