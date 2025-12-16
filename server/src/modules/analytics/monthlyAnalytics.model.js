const mongoose = require("mongoose");

const monthlyAnalyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    year: {
      type: Number,
      required: true,
      index: true,
    },

    month: {
      type: Number, // 0-11 to match JS Date.getMonth(), OR 1-12? User said 1-12 in prompt comments, but let's check JS Date conventions used elsewhere.
      // User prompt said "month: { type: Number, // 1–12" in comment.
      // However, usually we use 0-11 in JS.
      // Let's stick to 1-12 as explicitly requested in the prompt schema example to avoid confusion with user's specific request.
      required: true,
      index: true,
    },

    totals: {
      income: { type: Number, default: 0 },
      expense: { type: Number, default: 0 },
      investment: { type: Number, default: 0 },
      transfer: { type: Number, default: 0 },
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

monthlyAnalyticsSchema.index(
  { userId: 1, year: 1, month: 1 },
  { unique: true }
);

const MonthlyAnalytics = mongoose.model(
  "MonthlyAnalytics",
  monthlyAnalyticsSchema
);

module.exports = { MonthlyAnalytics };
