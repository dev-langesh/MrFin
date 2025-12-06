import { z } from "zod";

export const transactionSchema = z.object({
  txnDate: z
    .string({ required_error: "Date is required" })
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  txnType: z
    .string({
      required_error: "Transaction Type is required",
    })
    .max(25, "Transaction Type must be 25 characters or less")
    .min(2, "Transaction Type must be at least 2 characters long"),
  description: z
    .string()
    .max(100, "Description must be 100 characters or less")
    .optional(),
  category: z
    .string()
    .max(25, "Category must be 25 characters or less")
    .min(2, "Category must be at least 2 characters long")
    .optional(),
  amount: z
    .number({ required_error: "Amount is required" })
    .refine((val) => val > 0, {
      message: "Amount must be positive greater than 0",
    }),
});

export const transactionArraySchema = z.array(transactionSchema);
