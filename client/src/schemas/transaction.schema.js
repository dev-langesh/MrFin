import { z } from "zod";

export const transactionSchema = z.object({
  txnDate: z
    .string({ required_error: "Date is required" })
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  txnType: z.enum(["expense", "revenue"], {
    required_error: "Type is required",
    invalid_type_error: "Type must be 'expense' or 'revenue'",
  }),
  description: z.string().optional(),
  category: z.string().optional(),
  amount: z
    .number({ required_error: "Amount is required" })
    .refine((val) => val > 0, {
      message: "Amount must be positive greater than 0",
    }),
});

export const transactionArraySchema = z.array(transactionSchema);
