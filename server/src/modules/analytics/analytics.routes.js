const { validateToken } = require("../../middleware/validateToken.middleware");
const { analyticsController } = require("./analytics.controller");

const router = require("express").Router();

router.get("/", validateToken, analyticsController.getAnalytics);
router.get("/time-series", validateToken, analyticsController.getTimeSeries);
router.get(
  "/distribution",
  validateToken,
  analyticsController.getCategoryDistribution
);

module.exports = { analyticsRouter: router };
