const asyncHandler = require("express-async-handler");
const { authService } = require("./auth.service");
const { cookieOptions } = require("../../config/cookieOptions");

async function registerUser(req, res) {
  const userData = req.body;
  const sres = await authService.registerUser(userData);

  res
    .status(201)
    .json({ message: "User registered successfully", user: sres.user });
}

async function loginUser(req, res) {
  const userData = req.body;
  const sres = await authService.loginUser(userData);

  res.cookie("accessToken", sres.tokens.accessToken, cookieOptions);
  res.cookie("refreshToken", sres.tokens.refreshToken, cookieOptions);

  res.json({ message: "User logged in successfully", user: sres.user });
}

async function verifyEmail(req, res) {
  const sRes = await authService.verifyEmail(req.otpPayload);

  res.cookie("accessToken", sRes.tokens.accessToken, cookieOptions);
  res.cookie("refreshToken", sRes.tokens.refreshToken, cookieOptions);

  res.json({ message: "Email verified successfully" });
}

async function resetPassword(req, res) {
  const { password } = req.body;
  // req.otpPayload coming from validateOtpToken middleware
  await authService.resetPassword({
    otpPayload: req.otpPayload,
    password,
  });
  res.json({ message: "Password reset successfully" });
}

async function authStatus(req, res) {
  res.json({ user: req.user });
}

async function rotateTokens(req, res) {
  const { refreshToken } = req.cookies;

  const tokens = await authService.rotateTokens(refreshToken);
  res.cookie("accessToken", tokens.accessToken, cookieOptions);
  res.cookie("refreshToken", tokens.refreshToken, cookieOptions);
  res.json({ message: "Tokens rotated successfully" });
}

async function loginUserWithGoogle(req, res) {
  const { code, codeVerifier } = req.body;
  const sres = await authService.loginWithGoogle(code, codeVerifier);

  if (sres.isNew) {
    return res.json({
      message: "Please select your country to complete registration",
      isNew: true,
      registrationToken: sres.registrationToken,
      user: sres.user,
    });
  }

  res.cookie("accessToken", sres.tokens.accessToken, cookieOptions);
  res.cookie("refreshToken", sres.tokens.refreshToken, cookieOptions);

  res.json({ message: "User logged in successfully", user: sres.user });
}

async function completeGoogleLogin(req, res) {
  const { registrationToken, country, currency } = req.body;
  const sres = await authService.completeGoogleLogin({
    registrationToken,
    country,
    currency,
  });

  res.cookie("accessToken", sres.tokens.accessToken, cookieOptions);
  res.cookie("refreshToken", sres.tokens.refreshToken, cookieOptions);

  res.json({ message: "User registered successfully", user: sres.user });
}

async function logoutUser(req, res) {
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
  res.json({ message: "User logged out successfully" });
}

const authController = {
  registerUser: asyncHandler(registerUser),
  loginUser: asyncHandler(loginUser),
  verifyEmail: asyncHandler(verifyEmail),
  authStatus: asyncHandler(authStatus),
  rotateTokens: asyncHandler(rotateTokens),
  logoutUser: asyncHandler(logoutUser),
  loginUserWithGoogle: asyncHandler(loginUserWithGoogle),
  completeGoogleLogin: asyncHandler(completeGoogleLogin),
  resetPassword: asyncHandler(resetPassword),
};

module.exports = { authController };
