const { validateInput } = require("../../middleware/validateInput.middleware");
const { validateToken } = require("../../middleware/validateToken.middleware");
const {
  validateOtpToken,
} = require("../../middleware/validateOtpToken.middleware");
const { authController } = require("./auth.controller");
const { authInputSchema } = require("./auth.inputSchema");

const router = require("express").Router();

router.get("/status", validateToken, authController.authStatus);

router.post(
  "/register",
  validateInput(authInputSchema.registerSchema),
  authController.registerUser
);
router.post(
  "/login",
  validateInput(authInputSchema.loginSchema),
  authController.loginUser
);
router.post(
  "/login/google",
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
  validateInput(authInputSchema.resetPasswordSchema),
  validateOtpToken, // Now using OTP token directly
  authController.resetPassword
);

router.post(
  "/verify-email",
  validateInput(authInputSchema.verifyEmailSchema),
  validateOtpToken,
  authController.verifyEmail
);

router.post("/logout", authController.logoutUser);

module.exports = { authRouter: router };
