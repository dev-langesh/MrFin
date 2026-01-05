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
const OTP_ATTEMPTS_PREFIX = "otp_attempts:";

const getOtpKey = (to) => `${OTP_PREFIX}${to}`;
const getAttemptsKey = (to) => `${OTP_ATTEMPTS_PREFIX}${to}`;

// Updated to use redisService's built-in stringify/parse
async function saveOtp(to, otpData, duration) {
  await redisService.set(getOtpKey(to), otpData, duration, true);
}

async function saveAttempts(to, attemptsData, duration) {
  await redisService.set(getAttemptsKey(to), attemptsData, duration, true);
}

async function getOtp(to) {
  return await redisService.get(getOtpKey(to), true);
}

async function getAttempts(to) {
  return await redisService.get(getAttemptsKey(to), true);
}

async function clearOtpData(to) {
  await redisService.del(getOtpKey(to));
  await redisService.del(getAttemptsKey(to));
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
  const attemptsRecord = await getAttempts(to);
  const now = Date.now();

  if (notificationType === "email") await userService.findUserByEmail(to);

  let updatedAttempts = { attempts: 1, lastAttempt: now };

  if (attemptsRecord) {
    if (attemptsRecord.attempts >= config.otp.maxAttempts) {
      throw new AppError(AuthErrors.MAX_OTP_ATTEMPTS_REACHED);
    }

    if (now - attemptsRecord.lastAttempt < config.otp.resendCooldown) {
      throw new AppError(AuthErrors.OTP_RESEND_COOLDOWN);
    }

    updatedAttempts = {
      attempts: attemptsRecord.attempts + 1,
      lastAttempt: now,
    };
  }

  const otp = generateOtp();
  const hashedOtp = await generateHash(otp);

  await saveOtp(
    to,
    { otp: hashedOtp, notificationType },
    config.otp.expirationTime
  );
  await saveAttempts(to, updatedAttempts, config.otp.expirationTime);

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
