const { analyticsRouter } = require("./modules/analytics/analytics.routes");
const { authRouter } = require("./modules/auth/auth.routes");
const { fileRouter } = require("./modules/file/file.routes");
const {
  transactionRouter,
} = require("./modules/transaction/transaction.routes");
const { userRouter } = require("./modules/user/user.routes");
const { otpRouter } = require("./modules/otp/otp.routes");
const { settingsRouter } = require("./modules/settings/settings.routes");

const router = require("express").Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/files", fileRouter);
router.use("/transactions", transactionRouter);
router.use("/analytics", analyticsRouter);
router.use("/settings", settingsRouter);
router.use("/otp", otpRouter);

module.exports = { apiRouter: router };
