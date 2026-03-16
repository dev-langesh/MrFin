const mongoose = require("mongoose");
const { DailyAnalytics } = require("./dailyAnalytics.model");
const { MonthlyAnalytics } = require("./monthlyAnalytics.model");

/**
 * Get Time Series Data
 * Returns Monthly data if range > 1 year, else Daily
 */
async function getTimeSeries(userId, startDate, endDate, allTime = false) {
  // Default to last 30 days if not provided
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(new Date().setDate(end.getDate() - 30));

  const oneYear = 365 * 24 * 60 * 60 * 1000;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date range provided");
  }

  // Use Monthly if range > 1 year OR explicit allTime request
  if (end - start > oneYear || allTime) {
    const pipeline = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $addFields: {
          date: {
            $dateFromParts: { year: "$year", month: "$month", day: 1 },
          },
        },
      },
    ];

    // Optimize: Skip date filter if allTime is requested
    if (!allTime) {
      pipeline.push({
        $match: {
          date: { $gte: start, $lte: end },
        },
      });
    }

    pipeline.push({ $sort: { date: 1 } });

    return await MonthlyAnalytics.aggregate(pipeline);
  } else {
    // Return Daily Series
    const query = { userId };

    if (!allTime) {
      query.date = { $gte: start, $lte: end };
    }
    return await DailyAnalytics.find(query).sort({ date: 1 });
  }
}

/**
 * Get Category Distribution
 */
async function getCategoryDistribution(
  userId,
  startDate,
  endDate,
  type = "expense",
  allTime = false
) {
  // Default to last 30 days if not provided
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(new Date().setDate(end.getDate() - 30));

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date range provided");
  }

  // Return empty for transfer type as we don't track analytics for it
  if (type === "transfer") return [];

  // Map type to correct field
  let categoryField = "expenseCategories";
  if (type === "income") categoryField = "incomeCategories";

  const oneYear = 365 * 24 * 60 * 60 * 1000;
  const isLongRange = end - start > oneYear;

  const pipeline = [];

  // Match Stage
  pipeline.push({
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
    },
  });

  if (isLongRange || allTime) {
    // For Monthly: Add date, then match
    pipeline.push({
      $addFields: {
        date: {
          $dateFromParts: { year: "$year", month: "$month", day: 1 },
        },
      },
    });
  }

  // Filter by Date (Optimize: Skip if All Time)
  if (!allTime) {
    pipeline.push({
      $match: {
        date: { $gte: start, $lte: end },
      },
    });
  }

  // Project Categories
  pipeline.push({
    $project: {
      byCategory: { $objectToArray: `$${categoryField}` },
    },
  });

  // Unwind & Group
  pipeline.push(
    { $unwind: "$byCategory" },
    {
      $group: {
        _id: "$byCategory.k",
        value: { $sum: "$byCategory.v" },
      },
    },
    {
      $project: {
        name: "$_id",
        value: 1,
        _id: 0,
      },
    },
    {
      $sort: { value: -1 },
    }
  );

  if (isLongRange || allTime) {
    return await MonthlyAnalytics.aggregate(pipeline);
  } else {
    return await DailyAnalytics.aggregate(pipeline);
  }
}

const timeSeriesService = {
  getTimeSeries,
  getCategoryDistribution,
};

module.exports = { timeSeriesService };
