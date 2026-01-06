const mongoose = require("mongoose");
const { env } = require("../../config/env");
const { redisService } = require("../redis/redis.service");
const { dbConnectionStatus } = require("../metrics/metrics.service");

async function connectDb() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Database connected successfully");
    dbConnectionStatus.set({ type: "mongo" }, 1);

    await redisService.connect();
  } catch (error) {
    dbConnectionStatus.set({ type: "mongo" }, 0);
    console.log("Database connection failed:", error);
    process.exit(1);
  }
}

module.exports = { connectDb };
