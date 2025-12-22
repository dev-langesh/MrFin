const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { authService } = require("../auth.service");
const { User } = require("../../user/user.model");
const { AuthErrors } = require("../../../errors/authErrors");
const { getGoogleUser } = require("../utils/googleAuth");
const { analyticsService } = require("../../analytics/analytics.service");
const { settingsService } = require("../../settings/settings.service");
const { otpService } = require("../../otp/otp.service");
const { tokenService } = require("../../../lib/jwt/token.service");

// Mock dependencies that involve external calls or secondary modules
jest.mock("../utils/googleAuth");
jest.mock("../../analytics/analytics.service");
jest.mock("../../settings/settings.service");
jest.mock("../../otp/otp.service", () => ({
  otpService: {
    verifyOtp: jest.fn(),
  },
}));

describe("Auth Service Integration", () => {
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
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should register a new user and return stripped user object", async () => {
      analyticsService.createAnalytics.mockResolvedValue(true);
      settingsService.updateSettings.mockResolvedValue(true);

      const data = {
        name: "Test User",
        email: "register@example.com",
        password: "password123",
        country: "US",
      };

      const result = await authService.registerUser(data);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(data.email);
      expect(result.user.password).toBeUndefined(); // Verify password stripping
      expect(result.user.passwordHash).toBeUndefined();

      // Verify DB
      const userInDb = await User.findOne({ email: data.email });
      expect(userInDb).toBeDefined();
      expect(userInDb.password).not.toBe(data.password); // Should be hashed
      expect(userInDb.password).toMatch(/^\$2b\$/);

      expect(analyticsService.createAnalytics).toHaveBeenCalledWith(
        userInDb._id
      );
    });
  });

  describe("loginUser", () => {
    it("should login with valid credentials and return tokens", async () => {
      // Register first to create hash correctly
      const data = {
        name: "Login User",
        email: "login@example.com",
        password: "password123",
        country: "US",
      };
      // We can use authService.registerUser setup, but verified:false by default
      // We must manually create or register+verify
      await authService.registerUser(data);
      await User.updateOne({ email: data.email }, { verified: true });

      const result = await authService.loginUser({
        email: data.email,
        password: data.password,
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(data.email);
      expect(result.user.password).toBeUndefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it("should throw INVALID_CREDENTIALS for wrong password", async () => {
      await authService.registerUser({
        name: "Wrong Pwd",
        email: "wrong@example.com",
        password: "password123",
        country: "US",
      });
      await User.updateOne({ email: "wrong@example.com" }, { verified: true });

      await expect(
        authService.loginUser({
          email: "wrong@example.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow(AuthErrors.INVALID_CREDENTIALS.message);
    });

    it("should throw INVALID_CREDENTIALS (generic) for missing user", async () => {
      // Prevents enumeration
      await expect(
        authService.loginUser({
          email: "missing@example.com",
          password: "password123",
        })
      ).rejects.toThrow(AuthErrors.INVALID_CREDENTIALS.message);
    });

    it("should throw USER_NOT_VERIFIED if verified is false", async () => {
      await authService.registerUser({
        name: "Unverified",
        email: "unverified@example.com",
        password: "password123",
        country: "US",
      });
      // Do not verify

      await expect(
        authService.loginUser({
          email: "unverified@example.com",
          password: "password123",
        })
      ).rejects.toThrow(AuthErrors.USER_NOT_VERIFIED.message);
    });
  });

  describe("verifyOtp", () => {
    it("should verify otp, mark user verified, and return tokens", async () => {
      otpService.verifyOtp.mockResolvedValue(true);

      const user = await User.create({
        name: "Otp User",
        email: "otp@example.com",
        country: "US",
        verified: false,
      });

      const result = await authService.verifyOtp({
        to: "otp@example.com",
        otp: "123456",
      });

      expect(otpService.verifyOtp).toHaveBeenCalledWith({
        to: "otp@example.com",
        otp: "123456",
      });

      const updatedUser = await User.findOne({ email: "otp@example.com" });
      expect(updatedUser.verified).toBe(true);
      expect(result.tokens).toBeDefined();
    });
  });

  describe("rotateTokens", () => {
    it("should rotate tokens with valid refresh token", async () => {
      const user = await User.create({
        name: "Rotate User",
        email: "rotate@example.com",
        country: "US",
        verified: true,
      });

      const token = tokenService.generateToken({
        userId: user._id,
        role: "user",
        tokenType: "refresh",
      });

      const result = await authService.rotateTokens(token);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("should throw REFRESH_TOKEN_EXPIRED if invalid", async () => {
      await expect(authService.rotateTokens("invalid-token")).rejects.toThrow(
        AuthErrors.REFRESH_TOKEN_EXPIRED.message
      );
    });
  });

  describe("Google Auth", () => {
    it("should login new google user (isNew: true)", async () => {
      getGoogleUser.mockResolvedValue({
        googleId: "g1",
        email: "google@new.com",
        name: "Google New",
        picture: "pic.jpg",
      });

      const result = await authService.loginWithGoogle("code");
      expect(result.isNew).toBe(true);
      expect(result.registrationToken).toBeDefined();
      expect(result.user.email).toBe("google@new.com");
    });

    it("should login existing google user", async () => {
      await User.create({
        googleId: "g2",
        email: "google@existing.com",
        name: "Google Existing",
        country: "US",
        provider: "google",
        verified: true,
      });

      getGoogleUser.mockResolvedValue({
        googleId: "g2",
        email: "google@existing.com",
        name: "Google Existing",
        picture: "pic.jpg",
      });

      const result = await authService.loginWithGoogle("code");
      expect(result.isNew).toBeUndefined();
      expect(result.tokens).toBeDefined();
      expect(result.user._id).toBeDefined();
    });

    it("should complete google login", async () => {
      const regToken = tokenService.generateToken({
        googleId: "g3",
        email: "google@complete.com",
        name: "Google Complete",
        picture: "pic.jpg",
        tokenType: "registration",
      });

      analyticsService.createAnalytics.mockResolvedValue(true);
      settingsService.updateSettings.mockResolvedValue(true);

      const result = await authService.completeGoogleLogin({
        registrationToken: regToken,
        country: "GB",
        currency: "GBP",
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("google@complete.com");
      expect(result.user.country).toBe("GB");
      expect(result.tokens).toBeDefined();

      const dbUser = await User.findOne({ email: "google@complete.com" });
      expect(dbUser).toBeDefined();
    });
  });
});
