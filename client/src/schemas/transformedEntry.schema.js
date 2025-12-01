import { z } from "zod";

export const transformedEntrySchema = z.object({
  txnDate: z.string().min(1, "Transaction Date is required"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(100, "Description must be 100 characters or less"),
  amount: z
    .union([z.string(), z.number()])
    .refine((val) => !isNaN(Number(val)), {
      message: "Amount must be a number",
    }),
  txnType: z.string().optional(),
  category: z
    .string()
    .max(50, "Category must be 50 characters or less")
    .optional(),
});
