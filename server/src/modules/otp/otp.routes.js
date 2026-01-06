const router = require("express").Router();
const { validateInput } = require("../../middleware/validateInput.middleware");
const { otpLimiter } = require("../../middleware/rateLimiter.middleware");
const { otpController } = require("./otp.controller");
const { otpInputSchema } = require("./otp.inputSchema");

router.post(
  "/send",
  otpLimiter,
  validateInput(otpInputSchema.sendOtpSchema),
  otpController.sendOtp
);

router.post(
  "/verify",
  validateInput(otpInputSchema.verifyOtpSchema),
  otpController.verifyOtp
);

module.exports = { otpRouter: router };
