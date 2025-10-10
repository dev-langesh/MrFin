const {
  analyticsService,
} = require("../../modules/analytics/analytics.service");

async function migrateDb() {
  const analytics = await analyticsService.getAnalytics();
  if (!analytics) {
    await analyticsService.createAnalytics();
  }
}

module.exports = { migrateDb };
