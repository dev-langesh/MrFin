const request = require("supertest");
const { app } = require("../../../app");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { User } = require("../../user/user.model");

// Mock otp service with correct structure
jest.mock("../../otp/otp.service", () => ({
  otpService: {
    sendOTP: jest.fn().mockResolvedValue(true),
    verifyOtp: jest.fn().mockResolvedValue(true),
  },
}));

describe("Auth Input Validation Exhaustive Suite", () => {
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
  });

  // Helper to test validation error
  const expectValidationError = async (res, fieldName) => {
    if (res.status !== 400) {
      console.log(
        `[DEBUG] Method: ${res.req.method} Path: ${res.req.path} Status: ${res.status}. Expected 400 for ${fieldName}. Body:`,
        JSON.stringify(res.body, null, 2)
      );
    }
    expect(res.status).toBe(400);
    expect(res.body.validationErrors).toBeDefined();
  };

  describe("POST /api/auth/register", () => {
    const validUser = {
      name: "Test User",
      email: "test@example.com",
      password: "Password123!",
      country: "US",
      currency: "USD",
    };

    it("should register successfully with valid data", async () => {
      const res = await request(app).post("/api/auth/register").send(validUser);
      expect(res.status).toBe(201);
    });

    it("should trim name, email, country, currency", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "  Test Name  ",
        email: "  TeSt@ExAmPlE.CoM  ",
        password: "Password123!",
        country: "  US  ",
        currency: "  USD  ",
      });
      expect(res.status).toBe(201);
      const user = await User.findOne({ email: "test@example.com" });
      expect(user.name).toBe("Test Name");
      expect(user.email).toBe("test@example.com");
      expect(user.country).toBe("US");
    });

    // Helper to remove key safely
    const withoutKey = (obj, key) => {
      const newObj = { ...obj };
      delete newObj[key];
      return newObj;
    };

    test.each([
      ["missing name", withoutKey(validUser, "name")],
      ["empty name", { ...validUser, name: "" }],
      ["short name", { ...validUser, name: "A" }], // min 2
      ["long name", { ...validUser, name: "a".repeat(51) }], // max 50
      ["missing email", withoutKey(validUser, "email")],
      ["invalid email", { ...validUser, email: "invalid-email" }],
      ["missing password", withoutKey(validUser, "password")],
      ["short password", { ...validUser, password: "Pass1!" }], // min 8
      ["long password", { ...validUser, password: "a".repeat(21) }], // max 20
      ["weak password (no number)", { ...validUser, password: "Password!" }],
      ["weak password (no special)", { ...validUser, password: "Password123" }],
      ["weak password (no upper)", { ...validUser, password: "password123!" }],
      ["weak password (no lower)", { ...validUser, password: "PASSWORD123!" }],
      ["missing country", withoutKey(validUser, "country")],
      ["empty country", { ...validUser, country: "" }],
    ])("should return 400 when %s", async (_, payload) => {
      const res = await request(app).post("/api/auth/register").send(payload);
      expectValidationError(res, _);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await User.create({
        name: "Test",
        email: "test@example.com",
        password: "Password123!",
        country: "US",
        verified: true,
      });
    });

    const validLogin = {
      email: "test@example.com",
      password: "Password123!",
    };

    const withoutKey = (obj, key) => {
      const newObj = { ...obj };
      delete newObj[key];
      return newObj;
    };

    test.each([
      ["missing email", withoutKey(validLogin, "email")],
      ["empty email", { ...validLogin, email: "" }],
      ["invalid email format", { ...validLogin, email: "not-an-email" }],
      ["missing password", withoutKey(validLogin, "password")],
      ["empty password", { ...validLogin, password: "" }],
      [
        "short password (validation check)",
        { ...validLogin, password: "short" },
      ], // Schema enforces min 8
    ])("should return 400 when %s", async (_, payload) => {
      const res = await request(app).post("/api/auth/login").send(payload);
      expectValidationError(res, _);
    });
  });

  describe("POST /api/auth/login/google", () => {
    test.each([
      ["missing code", {}],
      ["empty code", { code: "" }],
      ["whitespace only code", { code: "   " }],
    ])("should return 400 when %s", async (_, payload) => {
      const res = await request(app)
        .post("/api/auth/login/google")
        .send(payload);
      expectValidationError(res, _);
    });

    it("should accept valid code (validation pass)", async () => {
      // Validation check only. Expected logic failure is fine.
      const res = await request(app)
        .post("/api/auth/login/google")
        .send({ code: "valid-code" });
      // It might be 500 or 400 from controller, but NOT Zod error about 'code is required'.
      if (res.status === 400 && res.body.validationErrors) {
        console.log("Validation failed valid code:", res.body);
        fail("Should not have validation errors");
      }
    });
  });

  describe("POST /api/auth/login/google/complete", () => {
    const validComplete = {
      registrationToken: "token",
      country: "US",
      currency: "USD",
    };

    const withoutKey = (obj, key) => {
      const newObj = { ...obj };
      delete newObj[key];
      return newObj;
    };

    test.each([
      ["missing token", withoutKey(validComplete, "registrationToken")],
      ["empty token", { ...validComplete, registrationToken: "" }],
      ["missing country", withoutKey(validComplete, "country")],
      ["missing currency", withoutKey(validComplete, "currency")],
    ])("should return 400 when %s", async (_, payload) => {
      const res = await request(app)
        .post("/api/auth/login/google/complete")
        .send(payload);
      expectValidationError(res, _);
    });
  });

  describe("POST /api/auth/send-otp", () => {
    const validOtp = {
      notificationType: "email",
      to: "test@example.com",
    };

    const withoutKey = (obj, key) => {
      const newObj = { ...obj };
      delete newObj[key];
      return newObj;
    };

    test.each([
      ["missing type", withoutKey(validOtp, "notificationType")],
      ["invalid type", { ...validOtp, notificationType: "push" }], // enum: email, sms
      ["missing to", withoutKey(validOtp, "to")],
      ["empty to", { ...validOtp, to: "" }],
    ])("should return 400 when %s", async (_, payload) => {
      const res = await request(app).post("/api/auth/send-otp").send(payload);
      expectValidationError(res, _);
    });

    it("should accept valid payload", async () => {
      const res = await request(app).post("/api/auth/send-otp").send(validOtp);
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/auth/verify-otp", () => {
    const validVerify = {
      otp: "123456",
      to: "test@example.com",
    };

    const withoutKey = (obj, key) => {
      const newObj = { ...obj };
      delete newObj[key];
      return newObj;
    };

    test.each([
      ["missing otp", withoutKey(validVerify, "otp")],
      ["short otp", { ...validVerify, otp: "12345" }],
      ["long otp", { ...validVerify, otp: "1234567" }],
      ["missing to", withoutKey(validVerify, "to")],
    ])("should return 400 when %s", async (_, payload) => {
      const res = await request(app).post("/api/auth/verify-otp").send(payload);
      expectValidationError(res, _);
    });

    it("should trim inputs", async () => {
      const res = await request(app).post("/api/auth/verify-otp").send({
        otp: " 123456 ",
        to: " test@example.com ",
      });
      // Assuming service mock accepts any 6 digits
      if (res.status === 400 && res.body.validationErrors) {
        fail("Validation should pass after trim");
      }
    });
  });

  describe("POST /api/auth/reset-password", () => {
    const validReset = {
      token: "reset-token-123",
      password: "Password123!",
    };

    const withoutKey = (obj, key) => {
      const newObj = { ...obj };
      delete newObj[key];
      return newObj;
    };

    test.each([
      ["missing token", withoutKey(validReset, "token")],
      ["empty token", { ...validReset, token: "" }],
      ["missing password", withoutKey(validReset, "password")],
      ["weak password", { ...validReset, password: "weak" }],
    ])("should return 400 when %s", async (_, payload) => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send(payload);
      expectValidationError(res, _);
    });
  });
});
