const { validateToken } = require("../../middleware/validateToken.middleware");
const { analyticsController } = require("./analytics.controller");

const router = require("express").Router();

router.get("/", validateToken, analyticsController.getAnalytics);

module.exports = { analyticsRouter: router };
