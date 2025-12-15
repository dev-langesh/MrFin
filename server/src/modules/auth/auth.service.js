const { env } = require("../../config/env");
const { AuthErrors } = require("../../errors/authErrors");
const { tokenService } = require("../../lib/jwt/token.service");
const { AppError } = require("../../utils/error");
const { userService } = require("../user/user.service");
const bcrypt = require("bcrypt");
const { otpService } = require("../otp/otp.service");
const { generateHash } = require("./utils/hash");
const { analyticsService } = require("../analytics/analytics.service");
const { getGoogleUser } = require("./utils/googleAuth");

async function registerUser(data) {
  const payload = { ...data };

  payload.password = await bcrypt.hash(payload.password, 10);

  const user = await userService.createUser(payload);

  await analyticsService.createAnalytics(user._id);

  return { user };
}

async function loginUser(data) {
  const { email, password } = data;
  const user = await userService.findUserByEmail(email, true);

  if (!user.password && user.provider === "google") {
    throw new AppError(AuthErrors.GOOGLE_LOGIN_REQUIRED);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(AuthErrors.INVALID_CREDENTIALS);
  }

  if (!user.verified) {
    throw new AppError(AuthErrors.USER_NOT_VERIFIED);
  }

  const tokens = tokenService.generateTokens(user);

  return { user, tokens };
}

async function verifyOtp({ to, otp }) {
  await otpService.verifyOtp({ to, otp });

  const user = await userService.verifyUserByEmail(to);

  const tokens = tokenService.generateTokens(user);

  return { user, tokens };
}

async function rotateTokens(refreshToken) {
  if (!refreshToken) {
    throw new AppError(AuthErrors.MISSING_TOKEN);
  }

  try {
    const decoded = tokenService.verifyToken(refreshToken, "refresh");
    const user = await userService.findUserById(decoded.userId);

    const tokens = tokenService.generateTokens(user);

    return tokens;
  } catch (error) {
    throw new AppError(AuthErrors.REFRESH_TOKEN_EXPIRED);
  }
}

async function loginWithGoogle(code) {
  const { googleId, email, name, picture } = await getGoogleUser(code);

  let user = await userService.findUserByEmail(email, false, false);
  //...

  // If user does not exist, create a new one
  if (!user) {
    user = await userService.createUser({
      googleId,
      email,
      name,
      picture,
      provider: "google",
      verified: true,
    });

    await analyticsService.createAnalytics(user._id);
  }

  const tokens = tokenService.generateTokens(user);

  return { user, tokens };
}

async function verifyOtpToResetPassword({ otp, to }) {
  await otpService.verifyOtp({ to, otp });

  const user = await userService.findUserByEmail(to);

  const token = tokenService.generateToken({
    userId: user._id,
    tokenType: "reset-password",
    role: user.role,
  });

  return { token };
}

async function verifyTokenAndResetPassword({ password, token }) {
  const decoded = tokenService.verifyToken(token, "reset-password");

  const hashedPassword = await generateHash(password);
  await userService.resetPassword(decoded.userId, hashedPassword);
}

const authService = {
  registerUser,
  loginUser,
  verifyOtp,
  rotateTokens,
  verifyIdToken: getGoogleUser,
  loginWithGoogle,
  verifyOtpToResetPassword,
  verifyTokenAndResetPassword,
};

module.exports = { authService };
