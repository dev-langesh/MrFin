const jwt = require("jsonwebtoken");
const { tokenService } = require("./token.service");
const { env } = require("../../config/env");
const { AppError } = require("../../utils/error");
const { AuthErrors } = require("../../errors/authErrors");

describe("Token Service", () => {
  const mockUser = {
    _id: "user123",
    role: "user",
  };

  describe("generateToken", () => {
    it("should generate a valid access token", () => {
      const token = tokenService.generateToken({
        userId: mockUser._id,
        role: mockUser.role,
        tokenType: "access",
      });

      const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);
      expect(decoded.userId).toBe(mockUser._id);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.tokenType).toBe("access");
    });

    it("should generate a valid refresh token", () => {
      const token = tokenService.generateToken({
        userId: mockUser._id,
        role: mockUser.role,
        tokenType: "refresh",
      });

      const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET);
      expect(decoded.userId).toBe(mockUser._id);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.tokenType).toBe("refresh");
    });

    it("should generate a valid reset-password token", () => {
      const token = tokenService.generateToken({
        userId: mockUser._id,
        role: mockUser.role,
        tokenType: "reset-password",
      });

      const decoded = jwt.verify(token, env.RESET_PASSWORD_TOKEN_SECRET);
      expect(decoded.userId).toBe(mockUser._id);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.tokenType).toBe("reset-password");
    });

    it("should throw error for invalid token type", () => {
      expect(() => {
        tokenService.generateToken({
          userId: mockUser._id,
          role: mockUser.role,
          tokenType: "invalid",
        });
      }).toThrow(AppError);

      try {
        tokenService.generateToken({
          userId: mockUser._id,
          role: mockUser.role,
          tokenType: "invalid",
        });
      } catch (error) {
        expect(error.errorCode).toBe(AuthErrors.INVALID_TOKEN_TYPE.errorCode);
      }
    });
  });

  describe("generateTokens", () => {
    it("should generate both access and refresh tokens", () => {
      const tokens = tokenService.generateTokens(mockUser);
      expect(tokens).toHaveProperty("accessToken");
      expect(tokens).toHaveProperty("refreshToken");

      const decodedAccess = jwt.verify(
        tokens.accessToken,
        env.ACCESS_TOKEN_SECRET
      );
      expect(decodedAccess.tokenType).toBe("access");

      const decodedRefresh = jwt.verify(
        tokens.refreshToken,
        env.REFRESH_TOKEN_SECRET
      );
      expect(decodedRefresh.tokenType).toBe("refresh");
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid token", () => {
      const token = tokenService.generateToken({
        userId: mockUser._id,
        role: mockUser.role,
        tokenType: "access",
      });

      const decoded = tokenService.verifyToken(token, "access");
      expect(decoded.userId).toBe(mockUser._id);
    });

    it("should throw error for expired access token", () => {
      // Mock jwt.verify to throw TokenExpiredError
      jest.spyOn(jwt, "verify").mockImplementationOnce(() => {
        const error = new Error("jwt expired");
        error.name = "TokenExpiredError";
        throw error;
      });

      try {
        tokenService.verifyToken("expiredToken", "access");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.errorCode).toBe(AuthErrors.ACCESS_TOKEN_EXPIRED.errorCode);
      }
    });

    it("should throw error for expired refresh token", () => {
      // Mock jwt.verify to throw TokenExpiredError
      jest.spyOn(jwt, "verify").mockImplementationOnce(() => {
        const error = new Error("jwt expired");
        error.name = "TokenExpiredError";
        throw error;
      });

      try {
        tokenService.verifyToken("expiredToken", "refresh");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.errorCode).toBe(
          AuthErrors.REFRESH_TOKEN_EXPIRED.errorCode
        );
      }
    });

    it("should throw error for other expired token types", () => {
      // Mock jwt.verify to throw TokenExpiredError
      jest.spyOn(jwt, "verify").mockImplementationOnce(() => {
        const error = new Error("jwt expired");
        error.name = "TokenExpiredError";
        throw error;
      });

      try {
        tokenService.verifyToken("expiredToken", "reset-password");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.errorCode).toBe(AuthErrors.TOKEN_EXPIRED.errorCode);
      }
    });

    it("should throw error for invalid token", () => {
      // Mock jwt.verify to throw JsonWebTokenError
      jest.spyOn(jwt, "verify").mockImplementationOnce(() => {
        const error = new Error("invalid token");
        error.name = "JsonWebTokenError";
        throw error;
      });

      try {
        tokenService.verifyToken("invalidToken", "access");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.errorCode).toBe(AuthErrors.INVALID_TOKEN.errorCode);
      }
    });
  });
});
