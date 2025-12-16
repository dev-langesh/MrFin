const { analyticsService } = require("./analytics.service");
const asyncHandler = require("express-async-handler");

async function getAnalytics(req, res) {
  try {
    const analytics = await analyticsService.getAnalytics(req.user._id);
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getTimeSeries(req, res) {
  const result = await analyticsService.getTimeSeries(
    req.user.id,
    req.query.startDate,
    req.query.endDate
  );
  res.json(result);
}

async function getCategoryDistribution(req, res) {
  const result = await analyticsService.getCategoryDistribution(
    req.user.id,
    req.query.startDate,
    req.query.endDate,
    req.query.txnType
  );
  res.json(result);
}

const analyticsController = {
  getAnalytics: asyncHandler(getAnalytics),
  getTimeSeries: asyncHandler(getTimeSeries),
  getCategoryDistribution: asyncHandler(getCategoryDistribution),
};

module.exports = { analyticsController };
