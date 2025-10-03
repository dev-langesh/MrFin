const { authRouter } = require("./modules/auth/auth.routes");
const { fileRouter } = require("./modules/file/file.routes");
const { revenueRouter } = require("./modules/revenue/revenue.routes");
const { userRouter } = require("./modules/user/user.routes");

const router = require("express").Router();

router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/files", fileRouter);
router.use("/revenues", revenueRouter);

module.exports = { apiRouter: router };
