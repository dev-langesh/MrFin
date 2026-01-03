const asyncHandler = require("express-async-handler");
const { otpService } = require("./otp.service");

async function sendOtp(req, res) {
  const { notificationType, to, template } = req.body;

  await otpService.sendOTP({
    notificationType,
    to,
    template,
  });

  res.json({ message: "OTP sent successfully" });
}

async function verifyOtp(req, res) {
  const { otp, to } = req.body;

  const sRes = await otpService.verifyOtp({ to, otp });

  res.json({
    message: "OTP verified successfully",
    token: sRes.token,
  });
}

const otpController = {
  sendOtp: asyncHandler(sendOtp),
  verifyOtp: asyncHandler(verifyOtp),
};

module.exports = { otpController };
