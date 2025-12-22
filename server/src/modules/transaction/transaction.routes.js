const express = require("express");
const router = express.Router();
const { transactionController } = require("./transaction.controller");
const { validateToken } = require("../../middleware/validateToken.middleware");
const { validateInput } = require("../../middleware/validateInput.middleware");
const { transactionInputSchema } = require("./transaction.inputSchema");

router.get(
  "/",
  validateToken,
  validateInput(transactionInputSchema.getTransactionsSchema),
  transactionController.getTransactions
);

router.get("/:id", validateToken, transactionController.getTransaction);

router.post(
  "/",
  validateToken,
  validateInput(transactionInputSchema.createTransactionSchema),
  transactionController.createTransaction
);

router.post(
  "/bulk",
  validateToken,
  validateInput(transactionInputSchema.createTransactionsSchema),
  transactionController.createTransactions
);

router.patch(
  "/:id",
  validateToken,
  validateInput(transactionInputSchema.updateTransactionSchema),
  transactionController.updateTransaction
);

router.delete("/:id", validateToken, transactionController.deleteTransaction);

module.exports = { transactionRouter: router };
