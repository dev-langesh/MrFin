const { otpService } = require("../otp.service");
const { redisService } = require("../../../lib/redis/redis.service");
const {
  emailService,
} = require("../../../lib/notification/email/email.service");
const { userService } = require("../../user/user.service");
const { AuthErrors } = require("../../../errors/authErrors");
const { config } = require("../../../config/constants");
const { generateHash, compareHash } = require("../../auth/utils/hash");

// Mock ioredis
jest.mock("ioredis", () => require("ioredis-mock"));

jest.mock("../../../lib/notification/email/email.service");
jest.mock("../../user/user.service");
jest.mock("../../auth/utils/hash");

const OTP_PREFIX = "otp:";

describe("OTP Service", () => {
  let redisStore = {};

  beforeEach(() => {
    jest.clearAllMocks();
    redisStore = {};

    // Clear redis mock
    const Redis = require("ioredis-mock");
    new Redis().flushall();
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

      const Redis = require("ioredis-mock");
      const client = new Redis();
      const keys = await client.keys("otp:*");
      expect(keys.length).toBeGreaterThan(0);
      expect(emailService.sendEmailWithHtml).toHaveBeenCalled();
    });

    it("should send SMS OTP (skipping email logic)", async () => {
      generateHash.mockResolvedValue("hashedOtp");

      await otpService.sendOTP({
        notificationType: "sms",
        to: "+1234567890",
        template: "otp",
      });

      expect(userService.findUserByEmail).not.toHaveBeenCalled();

      const Redis = require("ioredis-mock");
      const client = new Redis();
      const keys = await client.keys("otp:*");
      expect(keys.length).toBeGreaterThan(0);
      expect(emailService.sendEmailWithHtml).not.toHaveBeenCalled();
    });
  });

  describe("verifyOtp", () => {
    it("should verify valid OTP", async () => {
      const mockOtpRecord = {
        otp: "hashedOtp",
        notificationType: "email",
      };

      const Redis = require("ioredis-mock");
      const client = new Redis();
      await client.set(
        `${OTP_PREFIX}test@example.com`,
        JSON.stringify(mockOtpRecord)
      );

      compareHash.mockResolvedValue(true);

      await otpService.verifyOtp({ to: "test@example.com", otp: "123456" });

      const keys = await client.keys("otp:*");
      expect(keys.length).toBe(0);
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

      const Redis = require("ioredis-mock");
      const client = new Redis();
      await client.set(
        `${OTP_PREFIX}test@example.com`,
        JSON.stringify(mockOtpRecord)
      );

      compareHash.mockResolvedValue(false);

      await expect(
        otpService.verifyOtp({ to: "test@example.com", otp: "123" })
      ).rejects.toThrow(AuthErrors.OTP_INVALID.message);
    });
  });
});
