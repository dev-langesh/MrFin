const { analyticsService } = require("../../modules/analytics/analytics.service");

async function migrateDb() {
    const analytics = await analyticsService.getAnalytics();
    if (!analytics) {
        await analyticsService.createAnalytics();
        console.log("Analytics document created.");
    } else {
        console.log("Analytics document already exists. No action taken.");
    }
}

module.exports = { migrateDb };