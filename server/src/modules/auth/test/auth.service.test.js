const { userService } = require("../../user/user.service");
const { otpService } = require("../../otp/otp.service");
const { tokenService } = require("../../../lib/jwt/token.service");
const { analyticsService } = require("../../analytics/analytics.service");
const { settingsService } = require("../../settings/settings.service");
const bcrypt = require("bcrypt");
const { AppError } = require("../../../utils/error");
const { AuthErrors } = require("../../../errors/authErrors");
const { getGoogleUser } = require("../utils/googleAuth");

jest.mock("../../user/user.service");
jest.mock("../../otp/otp.service");
jest.mock("../../../lib/jwt/token.service");
jest.mock("../../analytics/analytics.service");
jest.mock("../../settings/settings.service");
jest.mock("../utils/googleAuth");

// Require authService AFTER mocks are set up
const { authService } = require("../auth.service");

describe("Auth Service", () => {
  // Generate a real hash for the mock user
  const password = "password";
  const hashedPassword = bcrypt.hashSync(password, 10);

  const mockUser = {
    _id: "user123",
    email: "test@example.com",
    password: hashedPassword,
    verified: true,
    role: "user",
    provider: "email",
  };

  const mockTokens = {
    accessToken: "access",
    refreshToken: "refresh",
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should register a new user", async () => {
      const userData = { email: "test@example.com", password: "password" };
      // bcrypt.hash is real now, so we don't mock it
      userService.createUser.mockResolvedValue(mockUser);
      analyticsService.createAnalytics.mockResolvedValue();

      const result = await authService.registerUser(userData);

      // We can't strict equal check hashing since it's random salt, but we verify createUser is called
      expect(userService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
        })
      );
      // Verify password in call arguments is hashed (not plain text)
      const createUserArgs = userService.createUser.mock.calls[0][0];
      expect(createUserArgs.password).not.toBe(userData.password);
      expect(createUserArgs.password).toMatch(/^\$2b\$/); // basic bcrypt check

      expect(analyticsService.createAnalytics).toHaveBeenCalledWith(
        mockUser._id
      );
      expect(result).toEqual({ user: mockUser });
    });
  });

  describe("loginUser", () => {
    it("should login user with valid credentials", async () => {
      userService.findUserByEmail.mockResolvedValue(mockUser); // Valid hash in mockUser
      tokenService.generateTokens.mockReturnValue(mockTokens);

      const result = await authService.loginUser({
        email: "test@example.com",
        password: "password",
      });

      expect(userService.findUserByEmail).toHaveBeenCalledWith(
        "test@example.com",
        true
      );
      // bcrypt.compare is real, so it verifies "password" against mockUser.password
      expect(result).toEqual({ user: mockUser, tokens: mockTokens });
    });

    it("should throw error if google login required", async () => {
      userService.findUserByEmail.mockResolvedValue({
        ...mockUser,
        provider: "google",
        password: null,
      });

      await expect(
        authService.loginUser({
          email: "test@example.com",
          password: "password",
        })
      ).rejects.toThrow(AuthErrors.GOOGLE_LOGIN_REQUIRED.message);
    });

    it("should throw error for invalid password", async () => {
      userService.findUserByEmail.mockResolvedValue(mockUser);
      // Real bcrypt.compare will return false for wrong password

      await expect(
        authService.loginUser({
          email: "test@example.com",
          password: "wrongPassword",
        })
      ).rejects.toThrow(AuthErrors.INVALID_CREDENTIALS.message);
    });

    it("should throw error if user not verified", async () => {
      userService.findUserByEmail.mockResolvedValue({
        ...mockUser,
        verified: false,
      });
      // Real bcrypt compare passes

      await expect(
        authService.loginUser({
          email: "test@example.com",
          password: "password",
        })
      ).rejects.toThrow(AuthErrors.USER_NOT_VERIFIED.message);
    });
  });

  describe("verifyOtp", () => {
    it("should verify OTP and return tokens", async () => {
      otpService.verifyOtp.mockResolvedValue();
      userService.verifyUserByEmail.mockResolvedValue(mockUser);
      tokenService.generateTokens.mockReturnValue(mockTokens);

      const result = await authService.verifyOtp({
        to: "test@example.com",
        otp: "123456",
      });

      expect(otpService.verifyOtp).toHaveBeenCalledWith({
        to: "test@example.com",
        otp: "123456",
      });
      expect(userService.verifyUserByEmail).toHaveBeenCalledWith(
        "test@example.com"
      );
      expect(result).toEqual({ user: mockUser, tokens: mockTokens });
    });
  });

  describe("rotateTokens", () => {
    it("should rotate tokens", async () => {
      tokenService.verifyToken.mockReturnValue({ userId: mockUser._id });
      userService.findUserById.mockResolvedValue(mockUser);
      tokenService.generateTokens.mockReturnValue(mockTokens);

      const result = await authService.rotateTokens("validRefreshToken");

      expect(userService.findUserById).toHaveBeenCalledWith(mockUser._id);
      expect(result).toEqual(mockTokens);
    });

    it("should throw error if token missing", async () => {
      await expect(authService.rotateTokens(null)).rejects.toThrow(
        AuthErrors.MISSING_TOKEN.message
      );
    });

    it("should catch verify errors and throw REFRESH_TOKEN_EXPIRED", async () => {
      tokenService.verifyToken.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(
        authService.rotateTokens("invalidRefreshToken")
      ).rejects.toThrow(AuthErrors.REFRESH_TOKEN_EXPIRED.message);
    });
  });

  describe("Google Auth", () => {
    const mockGoogleUser = {
      googleId: "google123",
      email: "test@example.com",
      name: "Test User",
      picture: "pic.jpg",
    };

    it("should login with google (new user)", async () => {
      getGoogleUser.mockResolvedValue(mockGoogleUser);
      userService.findUserByEmail.mockResolvedValue(null);
      tokenService.generateToken.mockReturnValue("regToken");

      const result = await authService.loginWithGoogle("code");

      expect(getGoogleUser).toHaveBeenCalledWith("code");
      expect(userService.createUser).not.toHaveBeenCalled();
      expect(analyticsService.createAnalytics).not.toHaveBeenCalled();
      expect(result).toEqual({
        isNew: true,
        registrationToken: "regToken",
        user: {
          name: mockGoogleUser.name,
          email: mockGoogleUser.email,
          picture: mockGoogleUser.picture,
        },
      });
    });

    it("should complete google login", async () => {
      tokenService.verifyToken.mockReturnValue(mockGoogleUser);
      userService.findUserByEmail.mockResolvedValue(null);
      userService.createUser.mockResolvedValue({
        _id: "userId",
        ...mockGoogleUser,
      });
      tokenService.generateTokens.mockReturnValue(mockTokens);
      settingsService.updateSettings.mockResolvedValue();

      const result = await authService.completeGoogleLogin({
        registrationToken: "regToken",
        country: "IN",
        currency: "INR",
      });

      expect(tokenService.verifyToken).toHaveBeenCalledWith(
        "regToken",
        "registration"
      );
      expect(userService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockGoogleUser.email,
          country: "IN",
        })
      );
      expect(settingsService.updateSettings).toHaveBeenCalledWith("userId", {
        general: { currency: "INR" },
      });
      expect(result).toEqual({
        user: expect.objectContaining({ _id: "userId" }),
        tokens: mockTokens,
      });
    });

    it("should login with google (existing user)", async () => {
      getGoogleUser.mockResolvedValue(mockGoogleUser);
      userService.findUserByEmail.mockResolvedValue({
        _id: "userId",
        ...mockGoogleUser,
      });
      tokenService.generateTokens.mockReturnValue({
        accessToken: "access",
        refreshToken: "refresh",
      });

      await authService.loginWithGoogle("code");

      expect(userService.createUser).not.toHaveBeenCalled();
      expect(analyticsService.createAnalytics).not.toHaveBeenCalled();
    });
  });

  describe("Password Reset", () => {
    it("should verify otp and generate reset token", async () => {
      otpService.verifyOtp.mockResolvedValue();
      userService.findUserByEmail.mockResolvedValue(mockUser);
      tokenService.generateToken.mockReturnValue("resetToken");

      const result = await authService.verifyOtpToResetPassword({
        otp: "123",
        to: "test@example.com",
      });

      expect(result).toEqual({ token: "resetToken" });
    });

    it("should verify token and reset password", async () => {
      tokenService.verifyToken.mockReturnValue({ userId: mockUser._id });

      userService.resetPassword.mockResolvedValue();

      await authService.verifyTokenAndResetPassword({
        password: "newPassword",
        token: "resetToken",
      });

      const resetArgs = userService.resetPassword.mock.calls[0];
      expect(resetArgs[0]).toBe(mockUser._id);
      expect(resetArgs[1]).not.toBe("newPassword"); // Should be hashed
      expect(resetArgs[1]).toMatch(/^\$2b\$/);
    });
  });
});
