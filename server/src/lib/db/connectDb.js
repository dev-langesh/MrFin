const mongoose = require("mongoose");
const { env } = require("../../config/env");
const { redisService } = require("../redis/redis.service");

async function connectDb() {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("Database connected successfully");

    await redisService.connect();
  } catch (error) {
    console.log("Database connection failed:", error);
    process.exit(1);
  }
}

module.exports = { connectDb };
