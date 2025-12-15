const express = require("express");
const router = express.Router();
const { transactionController } = require("./transaction.controller");
const { validateToken } = require("../../middleware/validateToken.middleware");
const { validateInput } = require("../../middleware/validateInput.middleware");
const { transactionInputSchema } = require("./transaction.inputSchema");

// Single transaction routes
router.post(
  "/",
  validateToken,
  validateInput(transactionInputSchema.createTransactionSchema),
  transactionController.createTransaction
);

router.get("/", validateToken, transactionController.getTransactions);
router.get(
  "/visualize",
  validateToken,
  transactionController.getTransactionsToVisualize
);
router.get(
  "/distribution",
  validateToken,
  transactionController.getTransactionsDistribution
);

router.get("/:id", validateToken, transactionController.getTransaction);

router.put(
  "/:id",
  validateToken,
  validateInput(transactionInputSchema.updateTransactionSchema),
  transactionController.updateTransaction
);

router.delete("/:id", validateToken, transactionController.deleteTransaction);

// Bulk transactions
router.post(
  "/bulk",
  validateToken,
  validateInput(transactionInputSchema.createTransactionsSchema),
  transactionController.createTransactions
);

module.exports = { transactionRouter: router };
