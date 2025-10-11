const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    // Earnings
    earnings: {
      month: { type: Number, default: 0 },
      quarter: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    previousEarnings: {
      month: { type: Number, default: 0 },
      quarter: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
    },
    earningsChange: {
      month: { type: Number, default: 0 },
      quarter: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
    },

    // Expenses
    expenses: {
      month: { type: Number, default: 0 },
      quarter: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    previousExpenses: {
      month: { type: Number, default: 0 },
      quarter: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
    },
    expensesChange: {
      month: { type: Number, default: 0 },
      quarter: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
    },

    // Cash flow = earnings - expenses
    cashFlow: {
      month: { type: Number, default: 0 },
      quarter: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    previousCashFlow: {
      month: { type: Number, default: 0 },
      quarter: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
    },
    cashFlowChange: {
      month: { type: Number, default: 0 },
      quarter: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
    },

    // Track last updated period for rollover
    lastUpdated: {
      month: { type: Date },
      quarter: { type: Date },
      year: { type: Date },
    },
  },
  { timestamps: true }
);

const Analytics = mongoose.model("Analytics", analyticsSchema);
module.exports = { Analytics };
