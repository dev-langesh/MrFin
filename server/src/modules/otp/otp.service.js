const { config } = require("../../config/constants");
const { AuthErrors } = require("../../errors/authErrors");
const { emailService } = require("../../lib/notification/email/email.service");
const { generateOtp } = require("../auth/utils/generateOtp");
const { generateHash, compareHash } = require("../auth/utils/hash");
const { AppError } = require("../../utils/error");
const { userService } = require("../user/user.service");
const { redisService } = require("../../lib/redis/redis.service");
const { tokenService } = require("../../lib/jwt/token.service");

const OTP_PREFIX = "otp:";
const getOtpKey = (to) => `${OTP_PREFIX}${to}`;

// Updated to use redisService's built-in stringify/parse
async function saveOtp(to, otpData, duration) {
  await redisService.set(getOtpKey(to), otpData, duration, true);
}

async function getOtp(to) {
  return await redisService.get(getOtpKey(to), true);
}

async function clearOtpData(to) {
  await redisService.del(getOtpKey(to));
}

async function sendEmail(to, otp, template) {
  await emailService.sendEmailWithHtml({
    to,
    subject: "Your OTP Code",
    template,
    data: {
      otp,
      email: to,
    },
  });
}

async function sendOTP({ notificationType, to, template }) {
  if (notificationType === "email") await userService.findUserByEmail(to);

  const otp = generateOtp();
  const hashedOtp = await generateHash(otp);

  await saveOtp(
    to,
    { otp: hashedOtp, notificationType },
    config.otp.expirationTime
  );

  if (notificationType === "email") {
    await sendEmail(to, otp, template);
  }
}

async function verifyOtp({ to, otp }) {
  const otpRecord = await getOtp(to);

  if (!otpRecord) {
    throw new AppError(AuthErrors.OTP_INVALID);
  }

  const isValid = await compareHash(otp, otpRecord.otp);

  if (!isValid) {
    throw new AppError(AuthErrors.OTP_INVALID);
  }

  await clearOtpData(to);

  const otpToken = tokenService.generateToken({
    to,
    purpose: "otp-verification",
    verified: true,
    tokenType: "otp-verification",
  });

  return { token: otpToken };
}

const otpService = {
  sendOTP,
  verifyOtp,
};

module.exports = { otpService };
