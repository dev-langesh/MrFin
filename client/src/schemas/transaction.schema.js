import { z } from "zod";

export const transactionSchema = z.object({
  txnDate: z.coerce.date({
    required_error: "Date is required",
    invalid_type_error: "Invalid date format",
  }),
  txnType: z
    .string({
      required_error: "Transaction Type is required",
    })
    .max(25, "Transaction Type must be 25 characters or less")
    .min(2, "Transaction Type must be at least 2 characters long")
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Only alphanumeric characters, spaces, hyphens and underscores are allowed"
    ),
  description: z
    .string()
    .max(100, "Description must be 100 characters or less")
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Only alphanumeric characters, spaces, hyphens and underscores are allowed"
    )
    .optional(),
  category: z
    .string()
    .max(25, "Category must be 25 characters or less")
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Only alphanumeric characters, spaces, hyphens and underscores are allowed"
    )
    .optional(),
  amount: z.coerce
    .number({ required_error: "Amount is required" })
    .refine((val) => val > 0, {
      message: "Amount must be positive greater than 0",
    }),
});

export const transactionArraySchema = z.array(transactionSchema);
