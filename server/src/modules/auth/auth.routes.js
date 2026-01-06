const { validateInput } = require("../../middleware/validateInput.middleware");
const { validateToken } = require("../../middleware/validateToken.middleware");
const {
  validateOtpToken,
} = require("../../middleware/validateOtpToken.middleware");
const { authLimiter } = require("../../middleware/rateLimiter.middleware");
const { authController } = require("./auth.controller");
const { authInputSchema } = require("./auth.inputSchema");

const router = require("express").Router();

router.get("/status", validateToken, authController.authStatus);

router.post(
  "/register",
  authLimiter,
  validateInput(authInputSchema.registerSchema),
  authController.registerUser
);
router.post(
  "/login",
  authLimiter,
  validateInput(authInputSchema.loginSchema),
  authController.loginUser
);
router.post(
  "/login/google",
  authLimiter,
  validateInput(authInputSchema.googleLoginSchema),
  authController.loginUserWithGoogle
);
router.post(
  "/login/google/complete",
  validateInput(authInputSchema.googleCompleteSchema),
  authController.completeGoogleLogin
);
router.post("/rotate-tokens", authController.rotateTokens);
router.post(
  "/reset-password",
  authLimiter,
  validateInput(authInputSchema.resetPasswordSchema),
  validateOtpToken, // Now using OTP token directly
  authController.resetPassword
);

router.post(
  "/verify-email",
  authLimiter,
  validateInput(authInputSchema.verifyEmailSchema),
  validateOtpToken,
  authController.verifyEmail
);

router.post("/logout", authController.logoutUser);

module.exports = { authRouter: router };
