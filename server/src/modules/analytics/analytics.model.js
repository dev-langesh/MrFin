const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Income
    income: {
      month: { type: Number, default: 0 },
      quarter: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    previousIncome: {
      month: { type: Number, default: 0 },
      quarter: { type: Number, default: 0 },
      annual: { type: Number, default: 0 },
    },
    incomeChange: {
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

    // Cash flow = income - expenses
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
