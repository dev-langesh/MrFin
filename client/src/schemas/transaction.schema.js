import * as z from "zod";

export const entrySchema = z.object({
  txnDate: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Amount must be a number",
  }).refine((val) => Number(val) > 0, {
    message: "Amount must be greater than 0",
  }),
  txnType: z.string({
    required_error: "Transaction type is required",
  }),
  category: z.string().optional(),
});
