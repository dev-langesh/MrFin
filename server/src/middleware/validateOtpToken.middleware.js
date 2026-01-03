const { tokenService } = require("../lib/jwt/token.service");
const { AppError } = require("../utils/error");
const { AuthErrors } = require("../errors/authErrors");

const validateOtpToken = (req, res, next) => {
  const { otpToken } = req.body;

  if (!otpToken) {
    return next(new AppError(AuthErrors.MISSING_TOKEN));
  }

  try {
    const decoded = tokenService.verifyToken(otpToken, "otp-verification");
    if (!decoded.verified) {
      return next(new AppError(AuthErrors.INVALID_TOKEN));
    }

    // Attach decoded info to request for controller to use
    req.otpPayload = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { validateOtpToken };
