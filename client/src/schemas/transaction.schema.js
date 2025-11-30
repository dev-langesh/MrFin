import * as z from "zod";

export const entrySchema = z.object({
  txnDate: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().refine((val) => !isNaN(Number(val)), {
    message: "Amount must be a number",
  }),
  txnType: z.string().optional(),
  category: z.string().optional(),
});
