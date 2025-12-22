const { validateToken } = require("../../middleware/validateToken.middleware");
const { validateInput } = require("../../middleware/validateInput.middleware");
const { analyticsController } = require("./analytics.controller");
const { analyticsInputSchema } = require("./analytics.inputSchema");

const router = require("express").Router();

router.get("/", validateToken, analyticsController.getAnalytics);

router.get(
  "/time-series",
  validateToken,
  validateInput(analyticsInputSchema.getTimeSeriesSchema),
  analyticsController.getTimeSeries
);

router.get(
  "/distribution",
  validateToken,
  validateInput(analyticsInputSchema.getCategoryDistributionSchema),
  analyticsController.getCategoryDistribution
);

module.exports = { analyticsRouter: router };
