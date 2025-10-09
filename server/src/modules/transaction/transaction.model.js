const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    txnDate: { type: Date, required: true },
    txnType: { type: String, enum: ["expense", "revenue"], required: true },
    description: { type: String },
    source: { type: String },
    paymentGateway: { type: String },
    expenseCategory: { type: String },
    amount: { type: Number, required: true }, 
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = { Transaction };
