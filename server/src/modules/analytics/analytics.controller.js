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

const analyticsController = {
  getAnalytics: asyncHandler(getAnalytics),
};

module.exports = { analyticsController };
