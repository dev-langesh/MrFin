import { TXN_TYPES } from "@/components/dashboard/config";
import { z } from "zod";

export const transactionSchema = z.object({
  txnDate: z.coerce.date({
    required_error: "Date is required",
    invalid_type_error: "Invalid date format",
  }),
  txnType: z.enum(
    TXN_TYPES.map((type) => type.value),
    {
      errorMap: () => ({ message: "Transaction Type is required" }),
    }
  ),
  description: z
    .string()
    .trim()
    .max(100, "Description must be 100 characters or less")
    .regex(
      /^$|^[a-zA-Z0-9\s\-_]+$/, // Allows empty string or the specified characters
      "Only alphanumeric characters, spaces, hyphens and underscores are allowed"
    )
    .optional(),
  category: z
    .string()
    .trim()
    .max(25, "Category must be 25 characters or less")
    .regex(
      /^$|^[a-zA-Z0-9\s\-_]+$/, // Allows empty string or the specified characters
      "Only alphanumeric characters, spaces, hyphens and underscores are allowed"
    )
    .optional(),
  amount: z.coerce
    .number({ required_error: "Amount is required" })
    .refine((val) => val > 0, {
      message: "Amount must be greater than 0",
    }),
});

export const transactionArraySchema = z.array(transactionSchema);
