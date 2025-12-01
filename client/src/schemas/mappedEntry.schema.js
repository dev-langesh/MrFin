import * as z from "zod";

export const createMappedEntrySchema = (mappedFields) => {
  const { txnDate, description, credit, debit } = mappedFields;

  return z
    .object({
      [txnDate]: z.string().min(1, "Date is required"),
      [description]: z.string().min(1, "Description is required"),
      [credit]: z.string().optional(),
      [debit]: z.string().optional(),
    })
    .passthrough() // Allow other fields like id, _originalIndex, etc.
    .superRefine((data, ctx) => {
      const creditVal = data[credit];
      const debitVal = data[debit];

      // Helper to check if value is a valid number
      const isNumber = (val) =>
        !isNaN(Number(val)) && val !== "" && val !== null && val !== undefined;

      // Check if values are numbers if they exist
      if (creditVal && !isNumber(creditVal)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Credit must be a number",
          path: [credit],
        });
      }
      if (debitVal && !isNumber(debitVal)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debit must be a number",
          path: [debit],
        });
      }

      const hasCredit = isNumber(creditVal) && Number(creditVal) > 0;
      const hasDebit = isNumber(debitVal) && Number(debitVal) > 0;

      // Check for positive numbers
      if (isNumber(creditVal) && Number(creditVal) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Credit must be greater than 0",
          path: [credit],
        });
      }
      if (isNumber(debitVal) && Number(debitVal) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debit must be greater than 0",
          path: [debit],
        });
      }

      // "credit or debit value should exists"
      if (!hasCredit && !hasDebit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Either Credit or Debit is required",
          path: [credit],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Either Credit or Debit is required",
          path: [debit],
        });
      }

      // "not both credit and debit have values"
      if (hasCredit && hasDebit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cannot have both Credit and Debit",
          path: [credit],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cannot have both Credit and Debit",
          path: [debit],
        });
      }
    });
};
