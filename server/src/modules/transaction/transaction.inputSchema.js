const { z } = require("zod");
const { config } = require("../../config/constants");

// Single transaction schema (body)
const createTransactionSchema = z.object({
  body: z.object({
    txnDate: z
      .string({ required_error: "Transaction date is required" })
      .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
    txnType: z.enum(config.txnTypes, {
      required_error: "Transaction type is required",
    }),
    description: z.string().optional(),
    category: z.string().optional(),
    amount: z
      .number({ required_error: "Amount is required" })
      .positive({ message: "Amount must be positive" }),
  }),
});

// Bulk transaction schema (body)
const createTransactionsSchema = z.object({
  body: z.array(
    z.object({
      txnDate: z
        .string({ required_error: "Transaction date is required" })
        .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
      txnType: z.enum(config.txnTypes, {
        required_error: "Transaction type is required",
      }),
      description: z.string().optional(),
      category: z.string().optional(),
      amount: z
        .number({ required_error: "Amount is required" })
        .positive({ message: "Amount must be positive" }),
    })
  ),
});

// Update transaction schema (body, partial allowed)
const updateTransactionSchema = z.object({
  body: z.object({
    txnDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" })
      .optional(),
    txnType: z.enum(config.txnTypes),
    description: z.string().optional(),
    category: z.string().optional(),
    amount: z
      .number()
      .positive({ message: "Amount must be positive" })
      .optional(),
  }),
});

const transactionInputSchema = {
  createTransactionSchema,
  createTransactionsSchema,
  updateTransactionSchema,
};

module.exports = { transactionInputSchema };
