const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    txnDate: { type: Date, required: true },
    txnType: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    amount: { type: Number, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = { Transaction };
