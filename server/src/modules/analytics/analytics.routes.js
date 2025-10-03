const { analyticsController } = require("./analytics.controller");

const router = require("express").Router();

router.get("/", analyticsController.getAnalytics);

module.exports = { analyticsRouter: router };
