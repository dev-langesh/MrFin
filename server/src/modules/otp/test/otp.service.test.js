const { otpService } = require("../otp.service");
const { Otp } = require("../otp.model");
const {
  emailService,
} = require("../../../lib/notification/email/email.service");
const { userService } = require("../../user/user.service");
const { AuthErrors } = require("../../../errors/authErrors");
const { config } = require("../../../config/constants");
const { generateHash, compareHash } = require("../../auth/utils/hash");

jest.mock("../otp.model");
jest.mock("../../../lib/notification/email/email.service");
jest.mock("../../user/user.service");
jest.mock("../../auth/utils/hash");

describe("OTP Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("sendOTP", () => {
    it("should create and send new OTP if none exists", async () => {
      Otp.findOne.mockResolvedValue(null);
      generateHash.mockResolvedValue("hashedOtp");
      Otp.create.mockResolvedValue({});
      emailService.sendEmailWithHtml.mockResolvedValue();

      await otpService.sendOTP({
        notificationType: "email",
        to: "test@example.com",
        template: "otp",
      });

      expect(userService.findUserByEmail).toHaveBeenCalled();
      expect(Otp.create).toHaveBeenCalled();
      expect(emailService.sendEmailWithHtml).toHaveBeenCalled();
    });

    it("should resend OTP if allowed", async () => {
      const mockOtp = {
        lastAttempt: new Date(Date.now() - config.otp.resendCooldown - 1000),
        attempts: 0,
        save: jest.fn(),
      };
      Otp.findOne.mockResolvedValue(mockOtp);
      generateHash.mockResolvedValue("hashedOtp");

      await otpService.sendOTP({
        notificationType: "email",
        to: "test@example.com",
        template: "otp",
      });

      expect(mockOtp.save).toHaveBeenCalled();
      expect(emailService.sendEmailWithHtml).toHaveBeenCalled();
    });

    it("should throw error if resend cooldown active", async () => {
      const mockOtp = {
        lastAttempt: new Date(),
        attempts: 0,
      };
      Otp.findOne.mockResolvedValue(mockOtp);

      await expect(
        otpService.sendOTP({
          notificationType: "email",
          to: "test@example.com",
        })
      ).rejects.toThrow(AuthErrors.OTP_RESEND_COOLDOWN.message);
    });

    it("should throw error if max attempts reached", async () => {
      const mockOtp = {
        lastAttempt: new Date(),
        attempts: config.otp.maxAttempts,
        save: jest.fn(),
      };
      Otp.findOne.mockResolvedValue(mockOtp);
      // Mock attemptsExpiry to be very large so we don't reset
      const originalAttemptsExpiry = config.otp.attemptsExpiry;
      // config.otp.attemptsExpiry = 100000;

      await expect(
        otpService.sendOTP({
          notificationType: "email",
          to: "test@example.com",
        })
      ).rejects.toThrow(AuthErrors.MAX_OTP_ATTEMPTS_REACHED.message);
      // config.otp.attemptsExpiry = originalAttemptsExpiry;
    });

    it("should reset attempts if expired", async () => {
      const mockOtp = {
        lastAttempt: new Date(Date.now() - config.otp.attemptsExpiry - 1000),
        attempts: config.otp.maxAttempts,
        save: jest.fn(),
      };
      Otp.findOne.mockResolvedValue(mockOtp);
      generateHash.mockResolvedValue("hashedOtp");

      await otpService.sendOTP({
        notificationType: "email",
        to: "test@example.com",
      });

      expect(mockOtp.attempts).toBe(1); // 0 reset + 1 new
      expect(mockOtp.save).toHaveBeenCalled();
    });

    it("should send SMS OTP (skipping email logic)", async () => {
      Otp.findOne.mockResolvedValue(null);
      generateHash.mockResolvedValue("hashedOtp");
      Otp.create.mockResolvedValue({});

      await otpService.sendOTP({
        notificationType: "sms",
        to: "+1234567890",
        template: "otp",
      });

      expect(userService.findUserByEmail).not.toHaveBeenCalled(); // Should not check user for SMS? logic implies only for email
      expect(Otp.create).toHaveBeenCalled();
      expect(emailService.sendEmailWithHtml).not.toHaveBeenCalled();
    });

    it("should resend SMS OTP (existing record, skipping email logic)", async () => {
      const mockOtp = {
        lastAttempt: new Date(Date.now() - config.otp.resendCooldown - 1000),
        attempts: 0,
        save: jest.fn(),
      };
      Otp.findOne.mockResolvedValue(mockOtp);
      generateHash.mockResolvedValue("hashedOtp");

      await otpService.sendOTP({
        notificationType: "sms",
        to: "+1234567890",
        template: "otp",
      });

      expect(mockOtp.save).toHaveBeenCalled();
      expect(emailService.sendEmailWithHtml).not.toHaveBeenCalled();
    });
  });

  describe("verifyOtp", () => {
    it("should verify valid OTP", async () => {
      const mockOtp = {
        otp: "hashedOtp",
        expiresAt: new Date(Date.now() + 10000),
      };
      Otp.findOne.mockResolvedValue(mockOtp);
      compareHash.mockResolvedValue(true);
      Otp.deleteOne.mockResolvedValue();

      await otpService.verifyOtp({ to: "test@example.com", otp: "123456" });

      expect(Otp.deleteOne).toHaveBeenCalled();
    });

    it("should throw error if OTP not found", async () => {
      Otp.findOne.mockResolvedValue(null);
      await expect(
        otpService.verifyOtp({ to: "test@example.com", otp: "123" })
      ).rejects.toThrow(AuthErrors.OTP_INVALID.message);
    });

    it("should throw error if OTP expired", async () => {
      const mockOtp = {
        otp: "hashedOtp",
        expiresAt: new Date(Date.now() - 10000),
      };
      Otp.findOne.mockResolvedValue(mockOtp);

      await expect(
        otpService.verifyOtp({ to: "test@example.com", otp: "123" })
      ).rejects.toThrow(AuthErrors.OTP_EXPIRED.message);
    });

    it("should throw error if invalid OTP", async () => {
      const mockOtp = {
        otp: "hashedOtp",
        expiresAt: new Date(Date.now() + 10000),
      };
      Otp.findOne.mockResolvedValue(mockOtp);
      compareHash.mockResolvedValue(false);

      await expect(
        otpService.verifyOtp({ to: "test@example.com", otp: "123" })
      ).rejects.toThrow(AuthErrors.OTP_INVALID.message);
    });
  });
});
