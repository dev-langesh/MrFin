const mongoose = require("mongoose");

const revenueSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    source: {
      type: String,
      enum: ["Fiverr", "Freelance"],
      required: true,
    },
    description: { type: String, default: "" },
    paymentGateway: {
      type: String,
      enum: ["Payoneer", "PayPal", "GPay", "Bank Transfer"],
      required: true,
    },
  },
  { timestamps: true }
);

const Revenue = mongoose.model("Revenue", revenueSchema);
module.exports = { Revenue };
