import * as z from "zod";

export const ruleSchema = z
  .object({
    name: z
      .string()
      .min(1, "Rule name is required")
      .max(40, "Rule name must be 40 characters or less"),
    source: z.string().min(1, "Source field is required"),
    operation: z.string().min(1, "Operation is required"),
    operationValue: z.string().optional(),
    action: z.string().min(1, "Action is required"),
    target: z.string().optional(),
    targetValue: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      !["exists", "not-exists"].includes(data.operation) &&
      (!data.operationValue || data.operationValue.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Value is required",
        path: ["operationValue"],
      });
    }

    if (data.action === "update") {
      if (!data.target) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Target field is required",
          path: ["target"],
        });
      }
      if (!data.targetValue || data.targetValue.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Target value is required",
          path: ["targetValue"],
        });
      }
    }
  });
