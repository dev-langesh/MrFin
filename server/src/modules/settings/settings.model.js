const mongoose = require("mongoose");
const { config } = require("../../config/constants");

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    importTransactionSettings: {
      preProcess: { type: Object, default: {} },
      mapFields: { type: Object, default: {} },
      rules: { type: Array, default: [] },
    },
    transactionSettings: {
      categories: {
        type: [
          {
            txnType: { type: String, required: true, enum: config.txnTypes },
            category: { type: String, required: true },
          },
        ],
        default: [],
      },
    },
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = { Settings };
