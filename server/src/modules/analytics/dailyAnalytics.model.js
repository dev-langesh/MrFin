const mongoose = require("mongoose");

const dailyAnalyticsSchema = new mongoose.Schema(
  {
    // owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // date bucket (start of day, UTC)
    date: {
      type: Date,
      required: true,
      index: true,
    },

    // aggregated totals
    totals: {
      income: { type: Number, default: 0 },
      expense: { type: Number, default: 0 },
      investment: { type: Number, default: 0 },
    },

    // category level aggregation
    incomeCategories: {
      type: Map,
      of: Number,
      default: {},
    },
    expenseCategories: {
      type: Map,
      of: Number,
      default: {},
    },
    investmentCategories: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// 1 document per user per day
dailyAnalyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyAnalytics = mongoose.model("DailyAnalytics", dailyAnalyticsSchema);

module.exports = { DailyAnalytics };
