const { z } = require("zod");
const { config } = require("../../config/constants");

// Reusable strict schemas

const categoryString = (maxLen = 50) =>
  z
    .string()
    .trim()
    .max(maxLen, { message: `Must be ${maxLen} characters or less` })
    .regex(/^[a-zA-Z0-9\s\-_]*$/, {
      message: "Only alphanumeric, spaces, hyphens and underscores allowed",
    });

// Reusable date schema
const dateSchema = z
  .string({ required_error: "Transaction date is required" })
  .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" })
  .refine(
    (val) => {
      const date = new Date(val);
      const now = new Date();
      // Reset time to end of day for comparison to allow current date
      now.setHours(23, 59, 59, 999);
      return date <= now;
    },
    { message: "Transaction date cannot be in the future" }
  );

// Single transaction schema (body)
const createTransactionSchema = z.object({
  body: z
    .object({
      txnDate: dateSchema,
      txnType: z.enum(config.txnTypes, {
        required_error: "Transaction type is required",
      }),
      description: z.string().trim().max(200).optional(),
      category: categoryString(30).optional(),
      amount: z
        .number({ required_error: "Amount is required" })
        .positive({ message: "Amount must be positive" }),
    })
    .strict(),
});

// Bulk transaction schema (body)
const createTransactionsSchema = z.object({
  body: z.array(
    z.object({
      txnDate: dateSchema,
      txnType: z.enum(config.txnTypes, {
        required_error: "Transaction type is required",
      }),
      description: z.string().trim().max(200).optional(),
      category: categoryString(30).optional(),
      amount: z
        .number({ required_error: "Amount is required" })
        .positive({ message: "Amount must be positive" }),
    })
  ),
});

const getTransactionsSchema = z.object({
  query: z
    .object({
      page: z.string().regex(/^\d+$/).transform(Number).optional(),
      limit: z
        .string()
        .regex(/^(\d+|all)$/, { message: "Limit must be a number or 'all'" })
        .optional(),
      txnType: z.enum(config.txnTypes).optional(),
      category: categoryString(30).optional(),
      startDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)))
        .optional(),
      endDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)))
        .optional(),
      description: z.string().max(25).optional(),
      // sortBy: z.enum(["date", "amount"]).optional(),
      // sortOrder: z.enum(["asc", "desc"]).optional(),
      sort: z.enum(["asc", "desc"]).optional(),
    })
    .strict(),
});

const updateTransactionSchema = z.object({
  body: z
    .object({
      txnDate: dateSchema.optional(),
      txnType: z.enum(config.txnTypes).optional(),
      description: z.string().trim().max(200).optional(),
      category: categoryString(30).optional(),
      amount: z
        .number()
        .positive({ message: "Amount must be positive" })
        .optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

const transactionInputSchema = {
  createTransactionSchema,
  createTransactionsSchema,
  updateTransactionSchema,
  getTransactionsSchema,
};

module.exports = { transactionInputSchema };
