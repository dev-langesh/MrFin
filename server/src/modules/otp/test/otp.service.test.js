const { otpService } = require("../otp.service");
const { redisService } = require("../../../lib/redis/redis.service");
const {
  emailService,
} = require("../../../lib/notification/email/email.service");
const { userService } = require("../../user/user.service");
const { AuthErrors } = require("../../../errors/authErrors");
const { config } = require("../../../config/constants");
const { generateHash, compareHash } = require("../../auth/utils/hash");

// Mock redisService
jest.mock("../../../lib/redis/redis.service", () => ({
  redisService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock("../../../lib/notification/email/email.service");
jest.mock("../../user/user.service");
jest.mock("../../auth/utils/hash");

const OTP_PREFIX = "otp:";
const OTP_ATTEMPTS_PREFIX = "otp_attempts:";

describe("OTP Service", () => {
  let redisStore = {};

  beforeEach(() => {
    jest.clearAllMocks();
    redisStore = {};

    // Mock implementation for redisService
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
  });

  describe("sendOTP", () => {
    it("should create and send new OTP if none exists", async () => {
      generateHash.mockResolvedValue("hashedOtp");
      emailService.sendEmailWithHtml.mockResolvedValue();

      await otpService.sendOTP({
        notificationType: "email",
        to: "test@example.com",
        template: "otp",
      });

      expect(userService.findUserByEmail).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalledTimes(2); // OTP + Attempts
      expect(emailService.sendEmailWithHtml).toHaveBeenCalled();
    });

    it("should resend OTP if allowed", async () => {
      const mockAttempts = {
        lastAttempt: Date.now() - config.otp.resendCooldown - 1000,
        attempts: 1,
      };
      redisStore[`${OTP_ATTEMPTS_PREFIX}test@example.com`] = mockAttempts;

      generateHash.mockResolvedValue("hashedOtp");

      await otpService.sendOTP({
        notificationType: "email",
        to: "test@example.com",
        template: "otp",
      });

      expect(redisService.set).toHaveBeenCalled();
      expect(emailService.sendEmailWithHtml).toHaveBeenCalled();
    });

    it("should throw error if resend cooldown active", async () => {
      const mockAttempts = {
        lastAttempt: Date.now(),
        attempts: 1,
      };
      redisStore[`${OTP_ATTEMPTS_PREFIX}test@example.com`] = mockAttempts;

      await expect(
        otpService.sendOTP({
          notificationType: "email",
          to: "test@example.com",
        })
      ).rejects.toThrow(AuthErrors.OTP_RESEND_COOLDOWN.message);
    });

    it("should throw error if max attempts reached", async () => {
      const mockAttempts = {
        lastAttempt: Date.now(),
        attempts: config.otp.maxAttempts,
      };
      redisStore[`${OTP_ATTEMPTS_PREFIX}test@example.com`] = mockAttempts;

      await expect(
        otpService.sendOTP({
          notificationType: "email",
          to: "test@example.com",
        })
      ).rejects.toThrow(AuthErrors.MAX_OTP_ATTEMPTS_REACHED.message);
    });

    it("should allow sending new OTP if max attempts record has expired (key missing)", async () => {
      redisStore[`${OTP_ATTEMPTS_PREFIX}test@example.com`] = undefined;
      generateHash.mockResolvedValue("hashedOtp");

      await otpService.sendOTP({
        notificationType: "email",
        to: "test@example.com",
        template: "otp",
      });

      expect(redisService.set).toHaveBeenCalledTimes(2);
      const attemptsVal = redisStore[`${OTP_ATTEMPTS_PREFIX}test@example.com`];
      expect(attemptsVal.attempts).toBe(1);
    });

    it("should allow resend after cooldown period has passed", async () => {
      const mockAttempts = {
        lastAttempt: Date.now() - config.otp.resendCooldown - 1000,
        attempts: 2,
      };
      redisStore[`${OTP_ATTEMPTS_PREFIX}test@example.com`] = mockAttempts;
      generateHash.mockResolvedValue("hashedOtp");

      await otpService.sendOTP({
        notificationType: "email",
        to: "test@example.com",
        template: "otp",
      });

      expect(redisService.set).toHaveBeenCalled();
      const attemptsVal = redisStore[`${OTP_ATTEMPTS_PREFIX}test@example.com`];
      expect(attemptsVal.attempts).toBe(3);
    });

    it("should send SMS OTP (skipping email logic)", async () => {
      generateHash.mockResolvedValue("hashedOtp");

      await otpService.sendOTP({
        notificationType: "sms",
        to: "+1234567890",
        template: "otp",
      });

      expect(userService.findUserByEmail).not.toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
      expect(emailService.sendEmailWithHtml).not.toHaveBeenCalled();
    });
  });

  describe("verifyOtp", () => {
    it("should verify valid OTP", async () => {
      const mockOtpRecord = {
        otp: "hashedOtp",
        notificationType: "email",
      };
      redisStore[`${OTP_PREFIX}test@example.com`] = mockOtpRecord;

      compareHash.mockResolvedValue(true);

      await otpService.verifyOtp({ to: "test@example.com", otp: "123456" });

      expect(redisService.del).toHaveBeenCalledTimes(2); // OTP + Attempts
    });

    it("should throw error if OTP not found (expired/invalid key)", async () => {
      await expect(
        otpService.verifyOtp({ to: "test@example.com", otp: "123" })
      ).rejects.toThrow(AuthErrors.OTP_INVALID.message);
    });

    it("should throw error if invalid OTP", async () => {
      const mockOtpRecord = {
        otp: "hashedOtp",
        notificationType: "email",
      };
      redisStore[`${OTP_PREFIX}test@example.com`] = mockOtpRecord;
      compareHash.mockResolvedValue(false);

      await expect(
        otpService.verifyOtp({ to: "test@example.com", otp: "123" })
      ).rejects.toThrow(AuthErrors.OTP_INVALID.message);
    });
  });
});
